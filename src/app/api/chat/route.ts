import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/db'
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'
import { streamChatResponse, streamStructuredResponse, logLLMCalls, type ChatMessage, type UserContext } from '@/lib/llm'
import type { CvAnalysis } from '@/lib/llm-cv'
import { generateTitleFromMessage } from '@/lib/chat-utils'
import { errorResponse, generateRequestId } from '@/lib/api-response'
import { ERROR_CODES, getErrorMessage } from '@/lib/error-messages'

export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    // 1. Auth
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      return errorResponse(getErrorMessage(ERROR_CODES.UNAUTHORIZED), requestId, 401)
    }

    // 2. Get or create user
    let user = await prisma.user.findUnique({
      where: { supabaseId: authUser.id },
      select: {
        id: true, email: true, supabaseId: true,
        prenom: true, domaine: true, sousDomaine: true, niveau: true,
        postesRecherches: true, cvAnalysis: true,
        profile: true, role: true, nom: true, age: true,
        profileCompletedAt: true, cvUrl: true, cvText: true,
        cvAnalysisAt: true, cvAnalysisCount: true,
        createdAt: true, updatedAt: true, deletedAt: true,
      },
    })
    if (!user) {
      user = await prisma.user.create({
        data: { supabaseId: authUser.id, email: authUser.email! },
      })
    }

    // Build user context for personalized system prompt
    const cvData = user.cvAnalysis as CvAnalysis | null
    const userContext: UserContext = {
      prenom: user.prenom,
      domaine: user.domaine,
      sousDomaine: user.sousDomaine,
      niveau: user.niveau,
      postesRecherches: Array.isArray(user.postesRecherches) ? user.postesRecherches as string[] : null,
      cvStrengths: cvData?.strengths ?? null,
    }

    // 3. Rate limit
    const rateLimitResult = await checkRateLimit(user.id, 'chat_turn')
    if (!rateLimitResult.allowed) {
      return errorResponse(getErrorMessage(ERROR_CODES.RATE_LIMITED), requestId, 429)
    }

    // 4. Parse input
    const { message, sessionId } = await request.json()
    if (!message || typeof message !== 'string') {
      return errorResponse(getErrorMessage(ERROR_CODES.INVALID_MESSAGE), requestId, 400)
    }

    // 5. Get or create session
    let chatSession
    if (sessionId) {
      chatSession = await prisma.chatSession.findUnique({ where: { id: sessionId } })
      if (!chatSession || chatSession.userId !== user.id) {
        return errorResponse(getErrorMessage(ERROR_CODES.SESSION_NOT_FOUND), requestId, 404)
      }
    } else {
      chatSession = await prisma.chatSession.create({
        data: { userId: user.id, messages: [] },
      })
    }

    // 6. Build history and add user message
    const history = (chatSession.messages as unknown as ChatMessage[]) || []
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    }
    const updatedHistory = [...history, userMessage]

    // 7. Determine mode: structured (feedback + question) or regular
    const wordCount = message.trim().split(/\s+/).length
    const useStructured = history.length > 0 && wordCount >= 20

    const userId = user.id
    const sessionDbId = chatSession.id
    const currentTurns = chatSession.totalTurns

    const onComplete = async ({ fullResponse, llmCalls, feedback }: {
      fullResponse: string
      llmCalls: Parameters<typeof logLLMCalls>[2]
      feedback?: import('@/lib/llm').FeedbackData
    }) => {
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date().toISOString(),
        ...(feedback ? { type: 'feedback+question' as const, feedback } : {}),
      }
      const finalHistory = [...updatedHistory, assistantMessage]

      // Compute new average score if feedback present
      const scores = finalHistory
        .filter((m) => m.feedback?.score !== undefined)
        .map((m) => m.feedback!.score)
      const averageScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : undefined

      const updateData: Record<string, unknown> = {
        messages: JSON.parse(JSON.stringify(finalHistory)),
        totalTurns: currentTurns + 1,
        ...(averageScore !== undefined ? { averageScore } : {}),
      }

      if (currentTurns === 0) {
        updateData.title = generateTitleFromMessage(message)
      }

      await Promise.all([
        prisma.chatSession.update({ where: { id: sessionDbId }, data: updateData }),
        logLLMCalls(userId, useStructured ? 'chat_feedback' : 'chat_turn', llmCalls),
        ...(feedback?.breakdown ? [
          prisma.scoreBreakdown.create({
            data: {
              sessionId: sessionDbId,
              messageIndex: finalHistory.length - 1,
              pertinence: feedback.breakdown.pertinence,
              clarte: feedback.breakdown.clarté,
              exemples: feedback.breakdown.exemples,
              profondeur: feedback.breakdown.profondeur,
              communication: feedback.breakdown.communication,
              totalScore: feedback.score,
            },
          })
        ] : []),
      ])
    }

    // 8. Stream response
    const stream = useStructured
      ? await streamStructuredResponse(history, message, onComplete, userContext)
      : await streamChatResponse(history, message, onComplete, userContext)

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Session-Id': chatSession.id,
        'X-Request-Id': requestId,
        ...getRateLimitHeaders(rateLimitResult),
      },
    })
  } catch (error) {
    console.error('[chat POST]', error instanceof Error ? error.message : 'unknown')
    return errorResponse(getErrorMessage(ERROR_CODES.SERVER_ERROR), requestId, 500)
  }
}
