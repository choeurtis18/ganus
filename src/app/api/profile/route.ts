import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

export async function GET(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { email: true, createdAt: true },
    })

    if (!user) {
      return errorResponse(getErrorMessage(ERROR_CODES.USER_NOT_FOUND), requestId, 404)
    }

    const chatCount = await prisma.chatSession.count({
      where: { userId: authUser.id, deletedAt: null },
    })

    return successResponse({
      email: user.email,
      createdAt: user.createdAt,
      chatCount,
    }, requestId)
  } catch (error) {
    console.error('[profile GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}

export async function PATCH(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    const { password } = await request.json()

    if (!password || typeof password !== 'string' || password.length < 8) {
      return errorResponse(getErrorMessage(ERROR_CODES.INVALID_PASSWORD), requestId, 400)
    }

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return errorResponse(error.message || getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 400)
    }

    return successResponse({ updated: true }, requestId)
  } catch (error) {
    console.error('[profile PATCH]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
