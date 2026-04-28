import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

function checkAdminSecret(request: NextRequest): boolean {
  const secret = request.headers.get('x-admin-secret')
  return secret === process.env.ADMIN_SECRET
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()
  try {
    if (!checkAdminSecret(request)) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    const { id } = await params
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, email: true, role: true, createdAt: true },
    })
    if (!user) return errorResponse(getErrorMessage(ERROR_CODES.USER_NOT_FOUND), requestId, 404)

    const [sessionCount, costByFeature, recentLogs] = await Promise.all([
      prisma.chatSession.count({ where: { userId: id, deletedAt: null } }),
      prisma.lLMLog.groupBy({
        by: ['feature'],
        where: { userId: id },
        _sum: { costUSD: true },
        _count: { id: true },
      }),
      prisma.lLMLog.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: { id: true, model: true, feature: true, inputTokens: true, outputTokens: true, costUSD: true, createdAt: true },
      }),
    ])

    const totalCost = costByFeature.reduce((acc, r) => acc + (r._sum.costUSD ?? 0), 0)

    return successResponse({
      user,
      stats: {
        sessionCount,
        totalCost,
        costByFeature: costByFeature.map((r) => ({
          feature: r.feature,
          cost: r._sum.costUSD ?? 0,
          calls: r._count.id,
        })),
      },
      recentLogs,
    }, requestId)
  } catch (error) {
    console.error('[admin/users/:id GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()

  try {
    if (!checkAdminSecret(request)) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    const { id } = await params
    const body = await request.json() as { role?: string }
    const { role } = body

    if (!role || !['user', 'admin'].includes(role)) {
      return errorResponse('Rôle invalide', requestId, 400)
    }

    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } })
    if (!user) {
      return errorResponse(getErrorMessage(ERROR_CODES.USER_NOT_FOUND), requestId, 404)
    }

    await prisma.user.update({ where: { id }, data: { role } })

    return successResponse({ updated: true }, requestId)
  } catch (error) {
    console.error('[admin/users/:id PATCH]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()

  try {
    if (!checkAdminSecret(request)) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    const { id } = await params

    const user = await prisma.user.findFirst({ where: { id, deletedAt: null } })
    if (!user) {
      return errorResponse(getErrorMessage(ERROR_CODES.USER_NOT_FOUND), requestId, 404)
    }

    const now = new Date()
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          email: `deleted-${id}@deleted.invalid`,
          profile: Prisma.DbNull,
          deletedAt: now,
        },
      }),
      prisma.chatSession.updateMany({
        where: { userId: id },
        data: { deletedAt: now, messages: [], title: 'Deleted chat' },
      }),
    ])

    return successResponse({ deleted: true }, requestId)
  } catch (error) {
    console.error('[admin/users/:id DELETE]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
