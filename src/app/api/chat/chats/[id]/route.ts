import { NextRequest, NextResponse } from 'next/server'
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
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()

  try {
    const { id } = await params
    const ownerData = await getChatOwner(id)
    if (!ownerData) {
      return errorResponse(getErrorMessage(ERROR_CODES.CHAT_NOT_FOUND), requestId, 404)
    }

    const chat = await prisma.chatSession.findUnique({ where: { id } })
    if (!chat || chat.deletedAt) {
      return errorResponse(getErrorMessage(ERROR_CODES.CHAT_NOT_FOUND), requestId, 404)
    }

    const messages = (chat.messages as unknown as any[]) || []

    return successResponse({
      id: chat.id,
      title: chat.title,
      messages,
      totalTurns: chat.totalTurns,
      createdAt: chat.createdAt,
    }, requestId)
  } catch (error) {
    console.error('[chat/chats/[id] GET] error:', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()

  try {
    const { id } = await params
    const ownerData = await getChatOwner(id)
    if (!ownerData) {
      return errorResponse(getErrorMessage(ERROR_CODES.CHAT_NOT_FOUND), requestId, 404)
    }

    const { title } = await request.json()

    if (!title || typeof title !== 'string') {
      return errorResponse(getErrorMessage(ERROR_CODES.INVALID_TITLE), requestId, 400)
    }

    const trimmed = title.trim()
    if (trimmed.length === 0 || trimmed.length > 100) {
      return errorResponse(getErrorMessage(ERROR_CODES.TITLE_LENGTH), requestId, 400)
    }

    const updatedChat = await prisma.chatSession.update({
      where: { id },
      data: { title: trimmed, updatedAt: new Date() },
    })

    return successResponse({
      id: updatedChat.id,
      title: updatedChat.title,
      updatedAt: updatedChat.updatedAt,
    }, requestId)
  } catch (error) {
    console.error('[chat/chats/[id] PATCH] error:', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()

  try {
    const { id } = await params
    const ownerData = await getChatOwner(id)
    if (!ownerData) {
      return errorResponse(getErrorMessage(ERROR_CODES.CHAT_NOT_FOUND), requestId, 404)
    }

    await prisma.chatSession.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    return successResponse({ success: true }, requestId)
  } catch (error) {
    console.error('[chat/chats/[id] DELETE] error:', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
