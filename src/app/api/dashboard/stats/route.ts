import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'
import type { CvAnalysis } from '@/lib/llm-cv'

export async function GET(_request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true, prenom: true, cvAnalysis: true, cvAnalysisAt: true },
    })
    if (!user) return errorResponse(getErrorMessage(ERROR_CODES.USER_NOT_FOUND), requestId, 404)

    const threeMonthsAgo = new Date()
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

    const [sessions, totalMessages, breakdowns, chatReports] = await Promise.all([
      prisma.chatSession.findMany({
        where: { userId: user.id, deletedAt: null },
        select: { id: true, title: true, createdAt: true, averageScore: true, totalTurns: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.chatSession.aggregate({
        where: { userId: user.id, deletedAt: null },
        _sum: { totalTurns: true },
      }),
      prisma.scoreBreakdown.findMany({
        where: { session: { userId: user.id } },
        select: { clarte: true, pertinence: true, exemples: true, profondeur: true, communication: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.chatReport.findMany({
        where: { userId: user.id, createdAt: { gte: threeMonthsAgo }, averageScore: { not: null } },
        select: { createdAt: true, averageScore: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const scoredSessions = sessions.filter((s) => s.averageScore !== null)
    const avgScore = scoredSessions.length > 0
      ? scoredSessions.reduce((sum, s) => sum + (s.averageScore ?? 0), 0) / scoredSessions.length
      : 0

    // Monthly trends
    const now2 = new Date()
    const oneMonthAgo = new Date(now2); oneMonthAgo.setMonth(now2.getMonth() - 1)
    const twoMonthsAgo = new Date(now2); twoMonthsAgo.setMonth(now2.getMonth() - 2)

    const curBreakdowns = breakdowns.filter((b) => b.createdAt >= oneMonthAgo)
    const prevBreakdowns2 = breakdowns.filter((b) => b.createdAt >= twoMonthsAgo && b.createdAt < oneMonthAgo)
    const calcAvg = (bs: typeof breakdowns) =>
      bs.length > 0 ? Math.round(bs.reduce((s, b) => s + b.pertinence + b.clarte + b.exemples + b.profondeur + b.communication, 0) / bs.length) : null
    const curAvg = calcAvg(curBreakdowns)
    const prevAvg2 = calcAvg(prevBreakdowns2)
    const scoreTrend = curAvg !== null && prevAvg2 !== null && prevAvg2 > 0
      ? Math.round(((curAvg - prevAvg2) / prevAvg2) * 100)
      : null

    const curSessions = sessions.filter((s) => s.createdAt >= oneMonthAgo).length
    const prevSessions2 = sessions.filter((s) => s.createdAt >= twoMonthsAgo && s.createdAt < oneMonthAgo).length
    const sessionsTrend = prevSessions2 > 0 ? Math.round(((curSessions - prevSessions2) / prevSessions2) * 100) : null

    // Chart data: individual analyses with dates (last 3 months)
    type ChartDataPoint = { date: string; score: number; type: 'chat' | 'cv' }
    const chartData: ChartDataPoint[] = []

    // Add chat report scores (one entry per explicit report generation)
    for (const r of chatReports) {
      if (r.averageScore === null) continue
      chartData.push({
        date: r.createdAt.toISOString().split('T')[0],
        score: Math.round(r.averageScore),
        type: 'chat',
      })
    }

    // Add CV analysis history
    const cvAnalyses = await prisma.cVAnalysis.findMany({
      where: { userId: user.id, createdAt: { gte: threeMonthsAgo } },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, score: true },
    })
    for (const cv of cvAnalyses) {
      chartData.push({
        date: cv.createdAt.toISOString().split('T')[0],
        score: cv.score,
        type: 'cv',
      })
    }

    // Also add the latest CV analysis from User if it exists and is recent (will define cvData later)
    const userCvScore = user.cvAnalysis as CvAnalysis | null
    if (userCvScore?.score && user.cvAnalysisAt && user.cvAnalysisAt >= threeMonthsAgo) {
      // Check if this date is not already in the history
      const dateStr = user.cvAnalysisAt.toISOString().split('T')[0]
      const exists = cvAnalyses.some((cv) => cv.createdAt.toISOString().split('T')[0] === dateStr)
      if (!exists) {
        chartData.push({
          date: dateStr,
          score: userCvScore.score,
          type: 'cv',
        })
      }
    }

    // Sort by date descending (most recent first)
    chartData.sort((a, b) => b.date.localeCompare(a.date))
    // Keep last 15 analyses for display
    const scoreProgression = chartData.slice(0, 15).reverse()

    // Top improvements from lowest-scoring criteria
    const criteriaAvg = breakdowns.length > 0 ? {
      pertinence: breakdowns.reduce((s, b) => s + b.pertinence / 30, 0) / breakdowns.length,
      clarté: breakdowns.reduce((s, b) => s + b.clarte / 20, 0) / breakdowns.length,
      exemples: breakdowns.reduce((s, b) => s + b.exemples / 20, 0) / breakdowns.length,
      profondeur: breakdowns.reduce((s, b) => s + b.profondeur / 20, 0) / breakdowns.length,
      communication: breakdowns.reduce((s, b) => s + b.communication / 10, 0) / breakdowns.length,
    } : null

    const topImprovements: string[] = []
    if (criteriaAvg) {
      const sorted = Object.entries(criteriaAvg).sort(([, a], [, b]) => a - b)
      if (sorted[0][1] < 0.7) topImprovements.push(`Travailler votre ${sorted[0][0]}`)
      if (sorted[1]?.[1] < 0.7) topImprovements.push(`Améliorer votre ${sorted[1][0]}`)
    }

    const cvData = user.cvAnalysis as CvAnalysis | null
    const personalizedTips = cvData?.suggestions ?? []

    return successResponse({
      prenom: user.prenom,
      messageCount: totalMessages._sum.totalTurns ?? 0,
      avgScore: Math.round(avgScore),
      cvScore: cvData?.score ?? null,
      scoreProgression,
      topImprovements,
      personalizedTips,
      trends: { score: scoreTrend, sessions: sessionsTrend },
      recentSessions: sessions.slice(0, 5).map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        averageScore: s.averageScore,
      })),
    }, requestId)
  } catch (error) {
    console.error('[dashboard/stats GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
