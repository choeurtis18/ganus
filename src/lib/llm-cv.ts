import { openai, calculateCost } from '@/lib/openai'
import { prisma } from '@/lib/db'

export type SupportedMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

export interface CvAnalysis {
  score: number
  strengths: string[]
  improvements: string[]
  suggestions: string[]
}

const CV_ANALYSIS_SYSTEM_PROMPT = `Tu es un expert RH et coach carrière spécialisé dans les étudiants français cherchant un stage, alternance ou CDI.
Tu analyses un CV et génères une évaluation en JSON valide UNIQUEMENT, sans texte supplémentaire.
Format attendu :
{"score":<0-100>,"strengths":["<point fort 1>","<point fort 2>","<point fort 3>"],"improvements":["<à améliorer 1>","<à améliorer 2>"],"suggestions":["<conseil pour le poste cible 1>","<conseil 2>","<conseil 3>"]}
- score : note globale du CV sur 100
- strengths : 2-4 points forts du CV
- improvements : 2-3 choses à améliorer
- suggestions : 2-4 conseils personnalisés par rapport aux postes cibles
Sois constructif, précis et en français.`

export async function analyzeCv(
  cvText: string,
  postesRecherches: string[],
  userId: string
): Promise<CvAnalysis> {
  const postesContext = postesRecherches.length > 0
    ? `\nPostes cibles du candidat : ${postesRecherches.join(', ')}`
    : ''

  const userMessage = `CV du candidat :\n${cvText.slice(0, 8000)}${postesContext}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: CV_ANALYSIS_SYSTEM_PROMPT },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const usage = response.usage!
  const inputTokens = usage.prompt_tokens
  const outputTokens = usage.completion_tokens
  const costUSD = calculateCost('gpt-4o-mini', inputTokens, outputTokens)

  await prisma.lLMLog.create({
    data: { userId, model: 'gpt-4o-mini', feature: 'cv_analysis', inputTokens, outputTokens, costUSD },
  })

  const raw = JSON.parse(response.choices[0].message.content ?? '{}') as Record<string, unknown>

  return {
    score: typeof raw.score === 'number' ? Math.max(0, Math.min(100, raw.score)) : 0,
    strengths: Array.isArray(raw.strengths) ? raw.strengths.filter((s): s is string => typeof s === 'string') : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements.filter((s): s is string => typeof s === 'string') : [],
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.filter((s): s is string => typeof s === 'string') : [],
  }
}

export async function analyzeCvFromImage(
  base64Image: string,
  mimeType: SupportedMimeType,
  postesRecherches: string[],
  userId: string
): Promise<CvAnalysis> {
  const postesContext = postesRecherches.length > 0
    ? `\nPostes cibles du candidat : ${postesRecherches.join(', ')}`
    : ''

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: CV_ANALYSIS_SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'high' },
          },
          {
            type: 'text',
            text: `Analyse ce CV en image.${postesContext}`,
          },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1000,
  })

  const usage = response.usage!
  const costUSD = calculateCost('gpt-4o', usage.prompt_tokens, usage.completion_tokens)

  await prisma.lLMLog.create({
    data: { userId, model: 'gpt-4o', feature: 'cv_analysis', inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, costUSD },
  })

  const raw = JSON.parse(response.choices[0].message.content ?? '{}') as Record<string, unknown>

  return {
    score: typeof raw.score === 'number' ? Math.max(0, Math.min(100, raw.score)) : 0,
    strengths: Array.isArray(raw.strengths) ? raw.strengths.filter((s): s is string => typeof s === 'string') : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements.filter((s): s is string => typeof s === 'string') : [],
    suggestions: Array.isArray(raw.suggestions) ? raw.suggestions.filter((s): s is string => typeof s === 'string') : [],
  }
}
