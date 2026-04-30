import { prisma } from '@/lib/db'

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInSeconds: number
}

function getConfig(feature: string): { limit: number; windowMs: number } {
  switch (feature) {
    case 'chat_turn': {
      const limit = parseInt(process.env.RATE_LIMIT_MESSAGES_PER_HOUR ?? '20', 10)
      return { limit: isNaN(limit) ? 20 : limit, windowMs: 60 * 60 * 1000 }
    }
    case 'chat_report':
      return { limit: 4, windowMs: 24 * 60 * 60 * 1000 }
    case 'cv_analysis':
      return { limit: 2, windowMs: 24 * 60 * 60 * 1000 }
    default:
      return { limit: 10, windowMs: 60 * 60 * 1000 }
  }
}

export async function checkRateLimit(
  userId: string,
  feature: string = 'chat_turn',
  customLimit?: number,
): Promise<RateLimitResult> {
  const config = getConfig(feature)
  const limit = customLimit ?? config.limit

  try {
    const now = new Date()
    const windowStart = new Date(now.getTime() - config.windowMs)

    // Count feature usage in the window
    const count = await prisma.lLMLog.count({
      where: {
        userId,
        feature,
        createdAt: { gte: windowStart },
      },
    })

    const remaining = Math.max(0, limit - count)
    const resetInSeconds = Math.ceil(config.windowMs / 1000)

    return { allowed: remaining > 0, remaining, resetInSeconds }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return { allowed: true, remaining: limit, resetInSeconds: 0 }
  }
}

export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    'X-RateLimit-Limit': result.remaining.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(Date.now() + result.resetInSeconds * 1000).toISOString(),
  }
}
