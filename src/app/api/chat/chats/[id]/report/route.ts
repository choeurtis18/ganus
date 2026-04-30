import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { generateChatAnalysis, logLLMCalls, type ChatMessage } from '@/lib/llm'
import { successResponse, errorResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()
  const { id: sessionId } = await params

  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    // 2. Get user
    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true, email: true },
    })
    if (!user) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    // 3. Rate limit: max 4 chat reports per day (via LLM log)
    const rateLimitResult = await checkRateLimit(user.id, 'chat_report')
    if (!rateLimitResult.allowed) {
      return errorResponse(
        `Trop d'analyses. Limite: 4 par jour. Prochaine analyse disponible dans ${Math.ceil(rateLimitResult.resetInSeconds / 60)} min`,
        requestId,
        429,
        getRateLimitHeaders(rateLimitResult)
      )
    }

    // 4. Get session and verify ownership
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    })
    if (!session) {
      return errorResponse('Session non trouvée', requestId, 404)
    }
    if (session.userId !== user.id) {
      return errorResponse(getErrorMessage(ERROR_CODES.FORBIDDEN), requestId, 403)
    }

    // 5. Get last report to check if regeneration is needed
    const lastReport = await prisma.chatReport.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    })

    // 6. Extract messages
    const messagesData = Array.isArray(session.messages) ? session.messages : []
    const messages = messagesData.map((m: unknown) => {
      const msg = m as Record<string, unknown>
      return {
        role: msg.role as 'user' | 'assistant',
        content: String(msg.content ?? ''),
        timestamp: String(msg.timestamp ?? new Date().toISOString()),
      }
    }) as ChatMessage[]
    const userMessages = messages.filter((m) => m.role === 'user')
    const messageCount = userMessages.length

    if (messageCount === 0) {
      return errorResponse('Aucun message pour générer une analyse', requestId, 400)
    }

    // 7. Check if analysis can be regenerated
    const canRegenerate = !lastReport || messageCount > (lastReport.messageCount || 0)
    if (!canRegenerate) {
      return errorResponse(
        'Analyse déjà effectuée. Régénérez seulement si vous avez ajouté de nouveaux messages.',
        requestId,
        400
      )
    }

    // 8. Generate analysis using LLM
    const analysis = await generateChatAnalysis(messages, session.title)

    // 9. Log LLM cost
    await logLLMCalls(user.id, 'chat_report', [analysis.llmCall])

    // 10. Save report to DB
    const report = await prisma.chatReport.create({
      data: {
        userId: user.id,
        sessionId: session.id,
        summary: analysis.summary,
        feedback: analysis.feedback,
        strengths: analysis.strengths,
        improvements: analysis.improvements,
        suggestions: analysis.suggestions,
        messageCount,
        averageScore: session.averageScore ?? null,
      },
    })

    return successResponse(report, requestId)
  } catch (error) {
    console.error('[chat/report POST]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.INTERNAL_SERVER_ERROR), requestId, 500)
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId()
  const { id: sessionId } = await params

  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    // 2. Get user
    const user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: { id: true },
    })
    if (!user) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    // 3. Get session and verify ownership
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true },
    })
    if (!session || session.userId !== user.id) {
      return errorResponse(getErrorMessage(ERROR_CODES.FORBIDDEN), requestId, 403)
    }

    // 4. Get latest report
    const report = await prisma.chatReport.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
    })

    return successResponse(report, requestId)
  } catch (error) {
    console.error('[chat/report GET]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.INTERNAL_SERVER_ERROR), requestId, 500)
  }
}
