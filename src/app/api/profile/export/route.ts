import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { errorResponse, generateRequestId } from '@/lib/api-response'
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

    const sessions = await prisma.chatSession.findMany({
      where: { userId: authUser.id, deletedAt: null },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        totalTurns: true,
        messages: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    const exportData = {
      exportedAt: new Date().toISOString(),
      user: {
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
      sessions: sessions.map((s) => ({
        id: s.id,
        title: s.title,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        totalTurns: s.totalTurns,
        messages: s.messages,
      })),
    }

    const jsonString = JSON.stringify(exportData, null, 2)
    const filename = `ganus-export-${new Date().toISOString().split('T')[0]}.json`

    return new Response(jsonString, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Request-Id': requestId,
      },
    })
  } catch (error) {
    console.error('[profile/export GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
