import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { errorResponse, successResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

export async function POST() {
  const requestId = generateRequestId()
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)

    await prisma.user.update({
      where: { supabaseId: authUser.id },
      data: { onboardingCompletedAt: new Date() },
    })

    return successResponse({ ok: true }, requestId)
  } catch (error) {
    console.error('[onboarding POST]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
