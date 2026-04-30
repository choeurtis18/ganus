import { openai, calculateCost, type LLMModel } from '@/lib/openai'
import { prisma } from '@/lib/db'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

const SUMMARY_THRESHOLD = 10
const RECENT_MESSAGES_COUNT = 5

export interface ScoreBreakdown {
  pertinence: number        // Réponse à la question posée (0-30)
  clarté: number            // Clarté & structure (0-20)
  exemples: number          // Exemples concrets (0-20)
  profondeur: number        // Profondeur & détail (0-20)
  communication: number     // Confiance & communication (0-10)
}

export interface FeedbackData {
  score: number
  analysis: string
  strengths: string[]
  improvements: string[]
  breakdown?: ScoreBreakdown
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  type?: 'feedback+question' | 'regular'
  feedback?: FeedbackData
}

export interface LLMCallResult {
  inputTokens: number
  outputTokens: number
  costUSD: number
  model: LLMModel
}

export interface UserContext {
  prenom?: string | null
  domaine?: string | null
  sousDomaine?: string | null
  niveau?: string | null
  postesRecherches?: string[] | null
  cvStrengths?: string[] | null
}

const BASE_SYSTEM_PROMPT = `Tu es Ganus, un coach IA spécialisé dans la préparation aux entretiens professionnels pour les françophones.
Tu mènes un entretien simulé : pose des questions réalistes de recruteur, une à la fois.
RÈGLES IMPORTANTES :
- Si la réponse du candidat ne correspond pas à la question posée (hors sujet, réponse évasive, réponse qui parle d'autre chose), signale-le clairement et redemande-lui de répondre à la question initiale.
- Si la réponse est trop courte ou vague mais sur le bon sujet, redemande-lui de développer ou de donner un exemple concret.
- Ne donne PAS de feedback structuré écrit (pas de "Points forts :", "À améliorer :") : ce feedback est géré automatiquement par le système.
Réponds toujours en français. Sois direct, naturel, comme un vrai recruteur.`

function buildSystemPrompt(userContext?: UserContext): string {
  if (!userContext) return BASE_SYSTEM_PROMPT
  const lines = [
    userContext.prenom ? `Candidat : ${userContext.prenom}` : null,
    userContext.domaine ? `Domaine : ${userContext.domaine}${userContext.sousDomaine ? ` / ${userContext.sousDomaine}` : ''}` : null,
    userContext.niveau ? `Niveau : ${userContext.niveau}` : null,
    userContext.postesRecherches?.length ? `Postes cibles : ${userContext.postesRecherches.join(', ')}` : null,
    userContext.cvStrengths?.length ? `Points forts CV : ${userContext.cvStrengths.join(', ')}` : null,
  ].filter(Boolean)
  if (lines.length === 0) return BASE_SYSTEM_PROMPT
  return `${BASE_SYSTEM_PROMPT}\n\nContexte du candidat :\n${lines.join('\n')}\nAdapte tes questions à ce profil.`
}

const NEXT_QUESTION_SYSTEM_PROMPT = `Tu es Ganus, un coach IA spécialisé dans la préparation aux entretiens professionnels pour les françophones.
Tu viens d'évaluer la réponse du candidat et le feedback structuré a déjà été affiché séparément.
Ta SEULE tâche maintenant : poser UNE nouvelle question d'entretien pertinente.
RÈGLES ABSOLUES :
- NE donne PAS de feedback, NE récapitule PAS les points forts ou à améliorer
- NE commence PAS par "Merci", "Bien", "Super" ou tout compliment sur la réponse précédente
- Commence DIRECTEMENT par la question ou une très courte transition vers la question
- La question doit être concise et réaliste pour un entretien professionnel
- Réponds en français.`

const SCORING_SYSTEM_PROMPT = `Tu es un évaluateur d'entretien professionnel spécialisé dans le scoring objectif.
Évalue la réponse du candidat selon cette rubric précise (total = 100 points) :
- Pertinence (répond-elle à la question ?) : 0-30 pts
- Clarté & structure (bien organisée ?) : 0-20 pts
- Exemples concrets (exemples donnés ?) : 0-20 pts
- Profondeur & détail (assez développée ?) : 0-20 pts
- Confiance & communication (bien communiquée ?) : 0-10 pts

Réponds UNIQUEMENT en JSON valide :
{"pertinence":<0-30>,"clarté":<0-20>,"exemples":<0-20>,"profondeur":<0-20>,"communication":<0-10>}
Sois objectif et cohérent. En français.`

const ANALYSIS_SYSTEM_PROMPT = `Tu es un coach d'entretien professionnel qui analyse les réponses.
Tu reçois une réponse de candidat, la question posée, et un score détaillé.
Génère une évaluation en JSON valide UNIQUEMENT, sans texte supplémentaire :
{"analysis":"<2-3 phrases d'analyse globale>","strengths":["<point fort 1>","<point fort 2>"],"improvements":["<point à améliorer 1>","<point à améliorer 2>"]}
Basé sur le score et la réponse fournis. Constructif, honnête. En français.`

// Summarize history when >= SUMMARY_THRESHOLD messages (gpt-4o-mini)
async function summarizeHistory(messages: ChatMessage[]): Promise<{ summary: string } & LLMCallResult> {
  const model: LLMModel = 'gpt-4o-mini'

  const historyText = messages
    .map((m) => `${m.role === 'user' ? 'Candidat' : 'Coach'}: ${m.content}`)
    .join('\n')

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'user',
        content: `Résume cette conversation d'entraînement aux entretiens en 3-5 phrases clés. Inclus les thèmes abordés, les points forts et les axes d'amélioration du candidat:\n\n${historyText}`,
      },
    ],
    max_tokens: 300,
  })

  const inputTokens = response.usage?.prompt_tokens ?? 0
  const outputTokens = response.usage?.completion_tokens ?? 0

  return {
    summary: response.choices[0].message.content ?? '',
    inputTokens,
    outputTokens,
    costUSD: calculateCost(model, inputTokens, outputTokens),
    model,
  }
}

// Build messages array for OpenAI based on history length
async function buildMessages(
  history: ChatMessage[],
  newMessage: string,
  userContext?: UserContext,
): Promise<{ messages: ChatCompletionMessageParam[]; needsSummary: boolean; summaryResult?: { summary: string } & LLMCallResult }> {
  const systemMessage: ChatCompletionMessageParam = { role: 'system', content: buildSystemPrompt(userContext) }

  if (history.length < SUMMARY_THRESHOLD) {
    const messages: ChatCompletionMessageParam[] = [
      systemMessage,
      ...history.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user', content: newMessage },
    ]
    return { messages, needsSummary: false }
  }

  const oldHistory = history.slice(0, history.length - RECENT_MESSAGES_COUNT)
  const recentHistory = history.slice(-RECENT_MESSAGES_COUNT)

  const summaryResult = await summarizeHistory(oldHistory)

  const messages: ChatCompletionMessageParam[] = [
    systemMessage,
    { role: 'system', content: `Résumé de la conversation précédente: ${summaryResult.summary}` },
    ...recentHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: newMessage },
  ]

  return { messages, needsSummary: true, summaryResult }
}

// Build messages for next question with feedback context injected
function buildNextQuestionMessages(
  history: ChatMessage[],
  userMessage: string,
  feedback: FeedbackData,
  userContext?: UserContext,
): ChatCompletionMessageParam[] {
  const recentHistory = history.length > RECENT_MESSAGES_COUNT
    ? history.slice(-RECENT_MESSAGES_COUNT)
    : history

  const feedbackContext = `Le feedback structuré sur la dernière réponse du candidat a déjà été envoyé séparément (score: ${feedback.score}/100). NE répète PAS le feedback dans ta réponse. Pose UNIQUEMENT une nouvelle question d'entretien pertinente, courte et directe, en tenant compte des axes d'amélioration : ${feedback.improvements.join(', ') || 'aucun'}. Pas de préambule, pas de récapitulatif du feedback.`

  const contextLines = userContext
    ? [
        userContext.postesRecherches?.length ? `Postes cibles : ${userContext.postesRecherches.join(', ')}` : null,
        userContext.niveau ? `Niveau : ${userContext.niveau}` : null,
      ].filter(Boolean).join('\n')
    : ''

  return [
    { role: 'system', content: contextLines ? `${NEXT_QUESTION_SYSTEM_PROMPT}\n${contextLines}` : NEXT_QUESTION_SYSTEM_PROMPT },
    ...recentHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
    { role: 'system', content: feedbackContext },
  ]
}

// Step 1: Score response using rubric (gpt-4o-mini, JSON mode)
async function scoreResponse(
  lastQuestion: string,
  userMessage: string,
): Promise<{ breakdown: ScoreBreakdown; llmCall: LLMCallResult }> {
  const model: LLMModel = 'gpt-4o-mini'

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: SCORING_SYSTEM_PROMPT },
    { role: 'user', content: `Question: ${lastQuestion}\n\nRéponse du candidat: ${userMessage}` },
  ]

  const response = await openai.chat.completions.create({
    model,
    messages,
    response_format: { type: 'json_object' },
    max_tokens: 200,
  })

  const inputTokens = response.usage?.prompt_tokens ?? 0
  const outputTokens = response.usage?.completion_tokens ?? 0

  let breakdown: ScoreBreakdown = { pertinence: 15, clarté: 10, exemples: 10, profondeur: 10, communication: 5 }
  try {
    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    breakdown = {
      pertinence: Math.max(0, Math.min(30, Number(parsed.pertinence) || 15)),
      clarté: Math.max(0, Math.min(20, Number(parsed.clarté) || 10)),
      exemples: Math.max(0, Math.min(20, Number(parsed.exemples) || 10)),
      profondeur: Math.max(0, Math.min(20, Number(parsed.profondeur) || 10)),
      communication: Math.max(0, Math.min(10, Number(parsed.communication) || 5)),
    }
  } catch { /* keep defaults */ }

  return {
    breakdown,
    llmCall: { model, inputTokens, outputTokens, costUSD: calculateCost(model, inputTokens, outputTokens) },
  }
}

// Step 2: Generate analysis & feedback based on breakdown (gpt-4o-mini)
async function generateAnalysis(
  lastQuestion: string,
  userMessage: string,
  breakdown: ScoreBreakdown,
  score: number,
): Promise<{ analysis: string; strengths: string[]; improvements: string[]; llmCall: LLMCallResult }> {
  const model: LLMModel = 'gpt-4o-mini'

  const breakdownStr = `Pertinence: ${breakdown.pertinence}/30, Clarté: ${breakdown.clarté}/20, Exemples: ${breakdown.exemples}/20, Profondeur: ${breakdown.profondeur}/20, Communication: ${breakdown.communication}/10`

  const messages: ChatCompletionMessageParam[] = [
    { role: 'system', content: ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: `Question: ${lastQuestion}\n\nRéponse: ${userMessage}\n\nScore: ${score}/100\nDétail: ${breakdownStr}\n\nGénère une analyse, les points forts et les points à améliorer en JSON.` },
  ]

  const response = await openai.chat.completions.create({
    model,
    messages,
    response_format: { type: 'json_object' },
    max_tokens: 400,
  })

  const inputTokens = response.usage?.prompt_tokens ?? 0
  const outputTokens = response.usage?.completion_tokens ?? 0

  let analysis = ''
  let strengths: string[] = []
  let improvements: string[] = []

  try {
    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    analysis = String(parsed.analysis || '')
    strengths = Array.isArray(parsed.strengths) ? parsed.strengths.map(String).filter(Boolean) : []
    improvements = Array.isArray(parsed.improvements) ? parsed.improvements.map(String).filter(Boolean) : []
  } catch { /* keep defaults */ }

  return {
    analysis,
    strengths,
    improvements,
    llmCall: { model, inputTokens, outputTokens, costUSD: calculateCost(model, inputTokens, outputTokens) },
  }
}

// Main: Evaluate user response with two-step process
export async function evaluateResponse(
  history: ChatMessage[],
  userMessage: string,
): Promise<{ feedback: FeedbackData; llmCall: LLMCallResult[] }> {
  const lastQuestion = [...history].reverse().find((m) => m.role === 'assistant')?.content || 'N/A'
  const llmCalls: LLMCallResult[] = []

  // Step 1: Score
  const { breakdown, llmCall: scoreCall } = await scoreResponse(lastQuestion, userMessage)
  llmCalls.push(scoreCall)
  const score = breakdown.pertinence + breakdown.clarté + breakdown.exemples + breakdown.profondeur + breakdown.communication

  // Step 2: Analysis
  const { analysis, strengths, improvements, llmCall: analysisCall } = await generateAnalysis(
    lastQuestion,
    userMessage,
    breakdown,
    score,
  )
  llmCalls.push(analysisCall)

  return {
    feedback: {
      score,
      analysis,
      strengths,
      improvements,
      breakdown,
    },
    llmCall: llmCalls,
  }
}

// Stream chat response — returns a ReadableStream of text chunks + metadata via callback
export async function streamChatResponse(
  history: ChatMessage[],
  newMessage: string,
  onComplete: (result: { fullResponse: string; llmCalls: LLMCallResult[]; feedback?: FeedbackData }) => void,
  userContext?: UserContext,
): Promise<ReadableStream<Uint8Array>> {
  const { messages, needsSummary, summaryResult } = await buildMessages(history, newMessage, userContext)
  const model: LLMModel = needsSummary ? 'gpt-4o' : 'gpt-4o-mini'
  const llmCalls: LLMCallResult[] = []

  if (needsSummary && summaryResult) {
    llmCalls.push(summaryResult)
  }

  const stream = await openai.chat.completions.create({
    model,
    messages,
    stream: true,
    max_tokens: 800,
  })

  const encoder = new TextEncoder()
  let fullResponse = ''
  let inputTokens = 0
  let outputTokens = 0

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            fullResponse += text
            controller.enqueue(encoder.encode(text))
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0
            outputTokens = chunk.usage.completion_tokens ?? 0
          }
        }

        llmCalls.push({
          model,
          inputTokens,
          outputTokens,
          costUSD: calculateCost(model, inputTokens, outputTokens),
        })

        onComplete({ fullResponse, llmCalls })
      } finally {
        controller.close()
      }
    },
  })
}

// Stream structured response: evaluate first (JSON), then stream next question
// Sends [FEEDBACK]{json}[/FEEDBACK] then streams the question
export async function streamStructuredResponse(
  history: ChatMessage[],
  newMessage: string,
  onComplete: (result: { fullResponse: string; llmCalls: LLMCallResult[]; feedback?: FeedbackData }) => void,
  userContext?: UserContext,
): Promise<ReadableStream<Uint8Array>> {
  const llmCalls: LLMCallResult[] = []

  // Call 1: evaluate response (non-streaming, JSON mode with 2-step process)
  const { feedback, llmCall: evalCalls } = await evaluateResponse(history, newMessage)
  llmCalls.push(...evalCalls)

  // Call 2: stream next question with feedback context
  const messages = buildNextQuestionMessages(history, newMessage, feedback, userContext)
  const model: LLMModel = 'gpt-4o-mini'

  const stream = await openai.chat.completions.create({
    model,
    messages,
    stream: true,
    max_tokens: 400,
  })

  const encoder = new TextEncoder()
  const feedbackChunk = encoder.encode(`[FEEDBACK]${JSON.stringify(feedback)}[/FEEDBACK]`)
  let fullQuestion = ''
  let inputTokens = 0
  let outputTokens = 0

  return new ReadableStream({
    async start(controller) {
      try {
        // Send feedback JSON first (non-streamed)
        controller.enqueue(feedbackChunk)

        // Then stream the next question
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? ''
          if (text) {
            fullQuestion += text
            controller.enqueue(encoder.encode(text))
          }
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0
            outputTokens = chunk.usage.completion_tokens ?? 0
          }
        }

        llmCalls.push({ model, inputTokens, outputTokens, costUSD: calculateCost(model, inputTokens, outputTokens) })
        onComplete({ fullResponse: fullQuestion, llmCalls, feedback })
      } finally {
        controller.close()
      }
    },
  })
}

// Generate comprehensive chat session analysis
export interface ChatAnalysisResult {
  summary: string
  feedback?: object
  strengths: string[]
  improvements: string[]
  suggestions: string[]
}

const CHAT_ANALYSIS_PROMPT = `Tu es un coach d'entretien professionnel qui analyse une session d'entraînement complète.
Tu reçois l'historique complet d'une session d'interview (questions et réponses).
Génère une analyse globale de la performance du candidat.
Réponds UNIQUEMENT en JSON valide, sans texte supplémentaire :
{
  "summary": "<3-4 phrases résumant la performance globale, le profil du candidat et les points clés>",
  "strengths": ["<point fort 1>", "<point fort 2>", "<point fort 3>"],
  "improvements": ["<point à améliorer 1>", "<point à améliorer 2>", "<point à améliorer 3>"],
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<suggestion 3>"]
}
Sois constructif, honnête et basé sur les réponses fournies. En français.`

export async function generateChatAnalysis(
  messages: ChatMessage[],
  sessionTitle: string,
): Promise<ChatAnalysisResult & { llmCall: LLMCallResult }> {
  const model: LLMModel = 'gpt-4o-mini'

  // Build conversation text
  const conversationText = messages
    .map((m) => `${m.role === 'user' ? 'Candidat' : 'Coach'}: ${m.content}`)
    .join('\n')

  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: CHAT_ANALYSIS_PROMPT },
      { role: 'user', content: `Session: "${sessionTitle}"\n\nHistorique de la session:\n${conversationText}` },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 800,
  })

  const inputTokens = response.usage?.prompt_tokens ?? 0
  const outputTokens = response.usage?.completion_tokens ?? 0

  let result: ChatAnalysisResult = {
    summary: '',
    strengths: [],
    improvements: [],
    suggestions: [],
  }

  try {
    const parsed = JSON.parse(response.choices[0].message.content ?? '{}')
    result = {
      summary: String(parsed.summary || ''),
      feedback: parsed.feedback,
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String).filter(Boolean) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String).filter(Boolean) : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String).filter(Boolean) : [],
    }
  } catch { /* keep defaults */ }

  return {
    ...result,
    llmCall: { model, inputTokens, outputTokens, costUSD: calculateCost(model, inputTokens, outputTokens) },
  }
}

// Save all LLM calls to LLMLog
export async function logLLMCalls(userId: string, feature: string, calls: LLMCallResult[]) {
  await prisma.lLMLog.createMany({
    data: calls.map((call) => ({
      userId,
      model: call.model,
      feature,
      inputTokens: call.inputTokens,
      outputTokens: call.outputTokens,
      costUSD: call.costUSD,
    })),
  })
}
