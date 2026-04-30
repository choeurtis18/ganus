import { openai, calculateCost } from '@/lib/openai'
import { prisma } from '@/lib/db'

export type SupportedMimeType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'

export interface CvCriterion {
  score: number
  max: number
  comment: string
}

export interface CvAnalysis {
  score: number
  summary: string  // Paragraphe narratif descriptif du profil et recommandations
  criteria: {
    presentation: CvCriterion   // /20 — mise en page, lisibilité, structure
    experience:   CvCriterion   // /25 — expériences, projets, résultats chiffrés
    competences:  CvCriterion   // /25 — compétences techniques et outils
    coherence:    CvCriterion   // /20 — cohérence profil ↔ postes cibles
    soft_skills:  CvCriterion   // /10 — qualités, engagements, langues
  }
  strengths: string[]
  improvements: string[]
  suggestions: string[]
}

function buildSystemPrompt(
  postesRecherches: string[],
  domaine?: string | null,
  niveau?: string | null
): string {
  const postesLine = postesRecherches.length > 0
    ? `Postes cibles : ${postesRecherches.join(', ')}.`
    : 'Postes cibles : non précisés (évaluation générale).'
  const domaineLine = domaine ? `Domaine : ${domaine}${niveau ? ` — Niveau : ${niveau}` : ''}.` : ''

  return `Tu es un expert RH et coach carrière spécialisé dans les français cherchant un stage, alternance, un CDD ou CDI.
${postesLine}
${domaineLine}

Évalue le CV selon 5 critères et retourne UNIQUEMENT un JSON valide, sans aucun texte supplémentaire.

CRITÈRES DE NOTATION (total = 100 pts) :
1. presentation (max 20) : mise en page, lisibilité, longueur adaptée, absence de fautes, structure claire
2. experience (max 25) : pertinence DIRECTE des expériences/projets par rapport aux postes cibles — les expériences sans lien doivent avoir des scores faibles même si bien décrites. Bonus pour résultats chiffrés et progression. ⚠️ STRICT : une expérience en restaurant/coaching n'est PAS pertinente pour un poste tech/web.
3. competences (max 25) : compétences techniques maîtrisées, outils maîtrisés, adéquation avec les postes cibles
4. coherence (max 20) : cohérence entre le profil, les études, les expériences et les postes visés
5. soft_skills (max 10) : qualités personnelles démontrées, engagements associatifs/sportifs, langues

FORMAT JSON ATTENDU (strict) :
{
  "score": <somme des 5 scores, 0-100>,
  "summary": "<paragraphe narratif 3-4 phrases décrivant le profil global, points forts principaux, axes critiques d'amélioration et conseils généraux>",
  "criteria": {
    "presentation": { "score": <0-20>, "max": 20, "comment": "<explication courte en 1-2 phrases>" },
    "experience":   { "score": <0-25>, "max": 25, "comment": "<explication courte en 1-2 phrases>" },
    "competences":  { "score": <0-25>, "max": 25, "comment": "<explication courte en 1-2 phrases>" },
    "coherence":    { "score": <0-20>, "max": 20, "comment": "<explication courte en 1-2 phrases>" },
    "soft_skills":  { "score": <0-10>, "max": 10, "comment": "<explication courte en 1-2 phrases>" }
  },
  "strengths":    ["<point fort spécifique 1>", "<point fort 2>", "<point fort 3>"],
  "improvements": ["<amélioration concrète 1>", "<amélioration 2>"],
  "suggestions":  ["<conseil personnalisé par rapport aux postes cibles 1>", "<conseil 2>", "<conseil 3>"]
}

Règles :
- Sois précis et factuel, cite des éléments concrets du CV
- Le summary doit être un paragraphe narratif (prose) descriptif et constructif, pas une liste
- Les suggestions doivent être DIRECTEMENT liées aux postes cibles
- Score = somme exacte des 5 sous-scores
- IMPORTANT : Sois CRITIQUE sur la pertinence des expériences — une expérience hors domaine (restaurant, coaching) ne doit PAS avoir un bon score même si bien présentée
- Tout en français`
}

function parseAnalysis(raw: Record<string, unknown>): CvAnalysis {
  const parseCriterion = (v: unknown, max: number): CvCriterion => {
    if (v && typeof v === 'object') {
      const c = v as Record<string, unknown>
      return {
        score: Math.max(0, Math.min(max, typeof c.score === 'number' ? c.score : 0)),
        max,
        comment: typeof c.comment === 'string' ? c.comment : '',
      }
    }
    return { score: 0, max, comment: '' }
  }

  const criteria = raw.criteria as Record<string, unknown> | undefined ?? {}
  const pres  = parseCriterion(criteria.presentation, 20)
  const exp   = parseCriterion(criteria.experience,   25)
  const comp  = parseCriterion(criteria.competences,  25)
  const coher = parseCriterion(criteria.coherence,    20)
  const soft  = parseCriterion(criteria.soft_skills,  10)
  const computedScore = pres.score + exp.score + comp.score + coher.score + soft.score

  return {
    score: typeof raw.score === 'number' ? Math.max(0, Math.min(100, raw.score)) : computedScore,
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    criteria: { presentation: pres, experience: exp, competences: comp, coherence: coher, soft_skills: soft },
    strengths:    Array.isArray(raw.strengths)    ? raw.strengths.filter((s): s is string => typeof s === 'string')    : [],
    improvements: Array.isArray(raw.improvements) ? raw.improvements.filter((s): s is string => typeof s === 'string') : [],
    suggestions:  Array.isArray(raw.suggestions)  ? raw.suggestions.filter((s): s is string => typeof s === 'string')  : [],
  }
}

export async function analyzeCv(
  cvText: string,
  postesRecherches: string[],
  userId: string,
  domaine?: string | null,
  niveau?: string | null
): Promise<CvAnalysis> {
  const systemPrompt = buildSystemPrompt(postesRecherches, domaine, niveau)
  const userMessage = `CV du candidat :\n${cvText.slice(0, 8000)}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  })

  const usage = response.usage!
  const costUSD = calculateCost('gpt-4o-mini', usage.prompt_tokens, usage.completion_tokens)
  await prisma.lLMLog.create({
    data: { userId, model: 'gpt-4o-mini', feature: 'cv_analysis', inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, costUSD },
  })

  return parseAnalysis(JSON.parse(response.choices[0].message.content ?? '{}') as Record<string, unknown>)
}

export async function analyzeCvFromImage(
  base64Image: string,
  mimeType: SupportedMimeType,
  postesRecherches: string[],
  userId: string,
  domaine?: string | null,
  niveau?: string | null
): Promise<CvAnalysis> {
  const systemPrompt = buildSystemPrompt(postesRecherches, domaine, niveau)

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: 'high' } },
          { type: 'text', text: 'Analyse ce CV en image.' },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 1200,
  })

  const usage = response.usage!
  const costUSD = calculateCost('gpt-4o', usage.prompt_tokens, usage.completion_tokens)
  await prisma.lLMLog.create({
    data: { userId, model: 'gpt-4o', feature: 'cv_analysis', inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens, costUSD },
  })

  return parseAnalysis(JSON.parse(response.choices[0].message.content ?? '{}') as Record<string, unknown>)
}
