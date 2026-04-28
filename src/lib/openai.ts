import OpenAI from 'openai'

const globalForOpenAI = globalThis as unknown as { openai: OpenAI }

export const openai = globalForOpenAI.openai ?? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

if (process.env.NODE_ENV !== 'production') {
  globalForOpenAI.openai = openai
}

export type LLMModel = 'gpt-4o-mini' | 'gpt-4o'

// Pricing per 1M tokens (USD) — updated 2026-04
const PRICING: Record<LLMModel, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o':      { input: 2.50, output: 10.00 },
}

export function calculateCost(
  model: LLMModel,
  inputTokens: number,
  outputTokens: number,
): number {
  const { input, output } = PRICING[model]
  return (inputTokens * input + outputTokens * output) / 1_000_000
}
