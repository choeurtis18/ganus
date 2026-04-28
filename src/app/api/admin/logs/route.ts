import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

function checkAdminSecret(request: NextRequest): boolean {
  return request.headers.get('x-admin-secret') === process.env.ADMIN_SECRET
}

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    if (!checkAdminSecret(request)) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const feature = searchParams.get('feature') ?? ''
    const email = searchParams.get('email') ?? ''
    const limit = 25

    const emailFilter = email
      ? { user: { email: { contains: email, mode: 'insensitive' as const } } }
      : {}
    const featureFilter = feature ? { feature } : {}
    const where = { ...emailFilter, ...featureFilter }

    const [logs, total] = await Promise.all([
      prisma.lLMLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { user: { select: { email: true } } },
      }),
      prisma.lLMLog.count({ where }),
    ])

    return successResponse({
      logs: logs.map((log) => ({
        id: log.id,
        email: log.user.email,
        model: log.model,
        feature: log.feature,
        inputTokens: log.inputTokens,
        outputTokens: log.outputTokens,
        costUSD: log.costUSD,
        createdAt: log.createdAt,
      })),
      total,
      page,
      pages: Math.ceil(total / limit),
    }, requestId)
  } catch (error) {
    console.error('[admin/logs GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
