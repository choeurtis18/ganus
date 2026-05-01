import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { errorResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

export async function GET() {
  const requestId = generateRequestId()

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: {
        id: true,
        email: true, createdAt: true, nom: true, prenom: true, age: true,
        domaine: true, sousDomaine: true, niveau: true, postesRecherches: true,
        profileCompletedAt: true, cvAnalysis: true, cvAnalysisAt: true,
      },
    })
    if (!user) return errorResponse(getErrorMessage(ERROR_CODES.USER_NOT_FOUND), requestId, 404)

    const [sessions, llmLogs] = await Promise.all([
      prisma.chatSession.findMany({
        where: { userId: user.id, deletedAt: null },
        select: {
          id: true, title: true, createdAt: true, updatedAt: true,
          totalTurns: true, averageScore: true, messages: true,
          scoreBreakdowns: {
            select: { messageIndex: true, pertinence: true, clarte: true, exemples: true, profondeur: true, communication: true, totalScore: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lLMLog.findMany({
        where: { userId: user.id },
        select: { model: true, feature: true, inputTokens: true, outputTokens: true, costUSD: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 200,
      }),
    ])

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        email: user.email,
        createdAt: user.createdAt,
        prenom: user.prenom,
        nom: user.nom,
        age: user.age,
        domaine: user.domaine,
        sousDomaine: user.sousDomaine,
        niveau: user.niveau,
        postesRecherches: user.postesRecherches,
        profileCompletedAt: user.profileCompletedAt,
      },
      cvAnalysis: user.cvAnalysis ?? null,
      cvAnalysisAt: user.cvAnalysisAt ?? null,
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt,
        totalTurns: s.totalTurns,
        averageScore: s.averageScore,
        messages: s.messages,
        scoreBreakdowns: s.scoreBreakdowns,
      })),
      llmUsage: {
        totalCalls: llmLogs.length,
        totalCostUSD: llmLogs.reduce((sum, l) => sum + l.costUSD, 0),
        logs: llmLogs,
      },
    }

    return new Response(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="ganus-export-${new Date().toISOString().split('T')[0]}.json"`,
        'X-Request-Id': requestId,
      },
    })
  } catch (error) {
    console.error('[profile/export GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
