import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

function checkAdminSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-admin-secret')
  return secret === process.env.ADMIN_SECRET
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    if (!checkAdminSecret(request)) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalUsers,
      totalSessions,
      totalLogs,
      costToday,
      costMonth,
      costAllTime,
      recentLogs,
      costPerUser,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.chatSession.count(),
      prisma.lLMLog.count(),

      prisma.lLMLog.aggregate({
        _sum: { costUSD: true },
        where: { createdAt: { gte: startOfDay } },
      }),
      prisma.lLMLog.aggregate({
        _sum: { costUSD: true },
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.lLMLog.aggregate({
        _sum: { costUSD: true },
      }),

      prisma.lLMLog.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true } },
        },
      }),

      prisma.lLMLog.groupBy({
        by: ['userId'],
        _sum: { costUSD: true },
        _count: { id: true },
        orderBy: { _sum: { costUSD: 'desc' } },
        take: 10,
      }),
    ])

    const userIds = costPerUser.map((r) => r.userId)
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    })
    const userMap = Object.fromEntries(users.map((u) => [u.id, u.email]))

    return successResponse(
      {
        overview: {
          totalUsers,
          totalSessions,
          totalLLMCalls: totalLogs,
          costToday: costToday._sum.costUSD ?? 0,
          costMonth: costMonth._sum.costUSD ?? 0,
          costAllTime: costAllTime._sum.costUSD ?? 0,
        },
        recentLogs: recentLogs.map((log) => ({
          id: log.id,
          email: log.user.email,
          model: log.model,
          feature: log.feature,
          inputTokens: log.inputTokens,
          outputTokens: log.outputTokens,
          costUSD: log.costUSD,
          createdAt: log.createdAt,
        })),
        topUsers: costPerUser.map((r) => ({
          email: userMap[r.userId] ?? r.userId,
          totalCost: r._sum.costUSD ?? 0,
          totalCalls: r._count.id,
        })),
      },
      requestId
    )
  } catch (error) {
    console.error('[admin/stats GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
