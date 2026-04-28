import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    const userId = authUser.id
    const now = new Date()

    // 1. Anonymize + soft delete in a transaction
    await prisma.$transaction([
      // Anonymize email, wipe profile
      prisma.user.update({
        where: { supabaseId: userId },
        data: {
          email: `deleted-${userId}@deleted.invalid`,
          profile: {},
          deletedAt: now,
        },
      }),
      // Wipe messages and titles from all chat sessions
      prisma.chatSession.updateMany({
        where: { user: { supabaseId: userId }, deletedAt: null },
        data: {
          messages: [],
          title: 'Deleted chat',
          deletedAt: now,
        },
      }),
    ])

    // 2. Delete from Supabase Auth using Admin API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('[profile/delete] Missing Supabase env vars')
      return successResponse({ deleted: true }, requestId)
    }

    const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${serviceRoleKey}`,
        'apikey': serviceRoleKey,
        'Content-Type': 'application/json',
      },
    })

    if (!deleteRes.ok) {
      const errorData = await deleteRes.text()
      console.error('[profile/delete] Supabase delete failed:', deleteRes.status, errorData)
    }

    return successResponse({ deleted: true }, requestId)
  } catch (error) {
    console.error('[profile/delete POST]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
