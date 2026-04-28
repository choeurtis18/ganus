import { checkRateLimit, getRateLimitHeaders } from '@/lib/rate-limit'

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    lLMLog: {
      count: jest.fn(),
    },
  },
}))

import { prisma } from '@/lib/db'

describe('Rate Limiting', () => {
  const userId = 'test-user-123'
  const mockPrismaCount = prisma.lLMLog.count as jest.MockedFunction<typeof prisma.lLMLog.count>

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-24T12:00:00Z').getTime())
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('checkRateLimit', () => {
    it('should allow when count is below limit', async () => {
      mockPrismaCount.mockResolvedValue(5)
      process.env.RATE_LIMIT_MESSAGES_PER_HOUR = '20'

      const result = await checkRateLimit(userId)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(15)
    })

    it('should reject when count reaches limit', async () => {
      mockPrismaCount.mockResolvedValue(20)
      process.env.RATE_LIMIT_MESSAGES_PER_HOUR = '20'

      const result = await checkRateLimit(userId)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should reject when count exceeds limit', async () => {
      mockPrismaCount.mockResolvedValue(25)
      process.env.RATE_LIMIT_MESSAGES_PER_HOUR = '20'

      const result = await checkRateLimit(userId)

      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
    })

    it('should use custom env limit', async () => {
      mockPrismaCount.mockResolvedValue(4)
      process.env.RATE_LIMIT_MESSAGES_PER_HOUR = '5'

      const result = await checkRateLimit(userId)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(1)
    })

    it('should fall back to 20 if env var is invalid', async () => {
      mockPrismaCount.mockResolvedValue(10)
      process.env.RATE_LIMIT_MESSAGES_PER_HOUR = 'invalid'

      const result = await checkRateLimit(userId)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(10)
    })

    it('should fail open if Prisma throws', async () => {
      mockPrismaCount.mockRejectedValue(new Error('DB error'))
      process.env.RATE_LIMIT_MESSAGES_PER_HOUR = '20'

      const result = await checkRateLimit(userId)

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(20)
    })

    it('should query for messages in the last hour', async () => {
      mockPrismaCount.mockResolvedValue(0)
      process.env.RATE_LIMIT_MESSAGES_PER_HOUR = '20'

      await checkRateLimit(userId)

      expect(mockPrismaCount).toHaveBeenCalledWith({
        where: {
          userId,
          feature: 'chat_turn',
          createdAt: {
            gte: expect.any(Date),
          },
        },
      })

      const callArgs = mockPrismaCount.mock.calls[0]?.[0]
      if (!callArgs) throw new Error('No calls to mockPrismaCount')
      const gteDate = (callArgs.where as any).createdAt.gte
      const hourAgo = new Date(Date.now() - 3600000)

      expect(gteDate.getTime()).toBeGreaterThanOrEqual(hourAgo.getTime() - 1000)
      expect(gteDate.getTime()).toBeLessThanOrEqual(hourAgo.getTime() + 1000)
    })
  })

  describe('getRateLimitHeaders', () => {
    it('should return correct header format', () => {
      const headers = getRateLimitHeaders(15)

      expect(headers['X-RateLimit-Remaining']).toBe('15')
      expect(headers['X-RateLimit-Limit']).toBeDefined()
    })

    it('should handle zero remaining', () => {
      const headers = getRateLimitHeaders(0)

      expect(headers['X-RateLimit-Remaining']).toBe('0')
    })
  })
})
