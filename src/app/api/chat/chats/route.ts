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

    let user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
    if (!user) {
      user = await prisma.user.create({
        data: { supabaseId: authUser.id, email: authUser.email! },
      })
    }

    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const sort = url.searchParams.get('sort') || 'recent'

    const chats = await prisma.chatSession.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' },
      skip: offset,
      take: limit,
      select: {
        id: true,
        title: true,
        createdAt: true,
        totalTurns: true,
        messages: true,
      },
    })

    const total = await prisma.chatSession.count({
      where: { userId: user.id, deletedAt: null },
    })

    const formattedChats = chats.map((chat) => {
      const messages = (chat.messages as unknown as { role: string; content: string }[]) || []
      const lastMessage = messages.length > 0 ? messages[messages.length - 1].content : ''
      return {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        messageCount: messages.length,
        lastMessage: lastMessage.length > 80 ? lastMessage.slice(0, 80) + '...' : lastMessage,
      }
    })

    return successResponse({
      chats: formattedChats,
      total,
      hasMore: offset + limit < total,
    }, requestId)
  } catch (error) {
    console.error('[chat/chats GET] error:', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    let user = await prisma.user.findUnique({ where: { supabaseId: authUser.id } })
    if (!user) {
      user = await prisma.user.create({
        data: { supabaseId: authUser.id, email: authUser.email! },
      })
    }

    const { title } = await request.json()

    let finalTitle = 'Untitled Chat'
    if (title && typeof title === 'string') {
      const trimmed = title.trim()
      if (trimmed.length > 0 && trimmed.length <= 100) {
        finalTitle = trimmed
      }
    }

    const chat = await prisma.chatSession.create({
      data: {
        userId: user.id,
        title: finalTitle,
        messages: [],
      },
    })

    return successResponse(
      {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        messages: [],
      },
      requestId,
      undefined,
      201
    )
  } catch (error) {
    console.error('[chat/chats POST] error:', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
