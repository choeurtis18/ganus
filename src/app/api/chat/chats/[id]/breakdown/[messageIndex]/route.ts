import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

async function getChatOwner(chatId: string) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  let user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
  if (!user) {
    user = await prisma.user.create({
      data: { supabaseId: authUser.id, email: authUser.email! },
    })
  }

  const chat = await prisma.chatSession.findUnique({ where: { id: chatId } })
  if (!chat || chat.userId !== user.id) return null

  return { user, chat }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; messageIndex: string }> }
) {
  const requestId = generateRequestId()

  try {
    const { id, messageIndex } = await params
    const messageIndexNum = Number(messageIndex)

    if (isNaN(messageIndexNum) || messageIndexNum < 0) {
      return errorResponse(getErrorMessage(ERROR_CODES.INVALID_MESSAGE), requestId, 400)
    }

    const ownerData = await getChatOwner(id)
    if (!ownerData) {
      return errorResponse(getErrorMessage(ERROR_CODES.CHAT_NOT_FOUND), requestId, 404)
    }

    const breakdown = await prisma.scoreBreakdown.findUnique({
      where: {
        sessionId_messageIndex: {
          sessionId: id,
          messageIndex: messageIndexNum,
        },
      },
    })

    if (!breakdown) {
      return errorResponse(getErrorMessage(ERROR_CODES.CHAT_NOT_FOUND), requestId, 404)
    }

    return successResponse({
      id: breakdown.id,
      pertinence: breakdown.pertinence,
      clarte: breakdown.clarte,
      exemples: breakdown.exemples,
      profondeur: breakdown.profondeur,
      communication: breakdown.communication,
      totalScore: breakdown.totalScore,
      createdAt: breakdown.createdAt,
    }, requestId)
  } catch (error) {
    console.error('[chat/chats/[id]/breakdown/[messageIndex] GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
