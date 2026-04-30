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

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const limit = 15

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { chatSessions: { where: { deletedAt: null } } } },
        },
      }),
      prisma.user.count({ where: { deletedAt: null } }),
    ])

    const userIds = users.map((u) => u.id)
    const costs = await prisma.lLMLog.groupBy({
      by: ['userId'],
      where: { userId: { in: userIds } },
      _sum: { costUSD: true },
    })
    const costMap = Object.fromEntries(costs.map((c) => [c.userId, c._sum.costUSD ?? 0]))

    return successResponse(
      {
        users: users.map((u) => ({
          id: u.id,
          email: u.email,
          role: u.role,
          createdAt: u.createdAt,
          sessionCount: u._count.chatSessions,
          totalCost: costMap[u.id] ?? 0,
        })),
        total,
        page,
        pages: Math.ceil(total / limit),
      },
      requestId
    )
  } catch (error) {
    console.error('[admin/users GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
