import { prisma } from '@/lib/db'

function getRateLimit(): number {
  const limit = parseInt(process.env.RATE_LIMIT_MESSAGES_PER_HOUR ?? '20', 10)
  return isNaN(limit) ? 20 : limit
}

export async function checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }> {
  const limit = getRateLimit()

  try {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)

    // Count all LLM calls (chat_turn) for this user in the last hour
    const count = await prisma.lLMLog.count({
      where: {
        userId,
        feature: 'chat_turn',
        createdAt: { gte: oneHourAgo },
      },
    })

    const remaining = Math.max(0, limit - count)
    return { allowed: remaining > 0, remaining }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return { allowed: true, remaining: limit }
  }
}

export function getRateLimitHeaders(remaining: number) {
  return {
    'X-RateLimit-Limit': getRateLimit().toString(),
    'X-RateLimit-Remaining': remaining.toString(),
  }
}
