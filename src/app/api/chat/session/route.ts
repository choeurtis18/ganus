import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

export async function GET() {
  const requestId = generateRequestId()

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
    })

    if (!user) {
      return successResponse({ sessionId: null, messages: [] }, requestId)
    }

    const session = await prisma.chatSession.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    if (!session) {
      return successResponse({ sessionId: null, messages: [] }, requestId)
    }

    return successResponse(
      {
        sessionId: session.id,
        messages: session.messages,
      },
      requestId
    )
  } catch (error) {
    console.error('[chat/session GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
