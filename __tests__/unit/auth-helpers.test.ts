import { getServerUser, getServerUserId, syncUserToDB } from '@/lib/supabase-server'

// Mock Supabase
jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn(),
    },
  })),
}))

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

// Mock Prisma
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      upsert: jest.fn(),
    },
  },
}))

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/db'

describe('Auth Helpers', () => {
  const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>
  const mockCookies = cookies as jest.MockedFunction<typeof cookies>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getServerUser', () => {
    it('should return user when authenticated', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
      }

      mockCookies.mockResolvedValue({
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      } as any)

      mockCreateServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser },
            error: null,
          }),
        },
      } as any)

      const result = await getServerUser()

      expect(result).toEqual(mockUser)
    })

    it('should return null when not authenticated', async () => {
      mockCookies.mockResolvedValue({
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      } as any)

      mockCreateServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'JWT expired' },
          }),
        },
      } as any)

      const result = await getServerUser()

      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      mockCookies.mockResolvedValue({
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      } as any)

      mockCreateServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Network error'),
          }),
        },
      } as any)

      const result = await getServerUser()

      expect(result).toBeNull()
    })
  })

  describe('getServerUserId', () => {
    it('should return user id when authenticated', async () => {
      mockCookies.mockResolvedValue({
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      } as any)

      mockCreateServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: { id: 'user-123', email: 'test@example.com' } },
            error: null,
          }),
        },
      } as any)

      const result = await getServerUserId()

      expect(result).toBe('user-123')
    })

    it('should return null when not authenticated', async () => {
      mockCookies.mockResolvedValue({
        getAll: jest.fn().mockReturnValue([]),
        set: jest.fn(),
      } as any)

      mockCreateServerClient.mockReturnValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: new Error('Unauthorized'),
          }),
        },
      } as any)

      const result = await getServerUserId()

      expect(result).toBeNull()
    })
  })

  describe('syncUserToDB', () => {
    it('should upsert user with correct args', async () => {
      const mockPrismaUpsert = prisma.user.upsert as jest.MockedFunction<typeof prisma.user.upsert>
      mockPrismaUpsert.mockResolvedValue({
        id: 'db-user-1',
        supabaseId: 'sup-123',
        email: 'test@example.com',
        profile: null,
        role: 'user',
        nom: null,
        prenom: null,
        age: null,
        domaine: null,
        sousDomaine: null,
        niveau: null,
        postesRecherches: null,
        profileCompletedAt: null,
        cvUrl: null,
        cvText: null,
        cvAnalysis: null,
        cvAnalysisAt: null,
        cvAnalysisCount: 0,
        chatReportCount: 0,
        suspendedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      })

      const result = await syncUserToDB('sup-123', 'test@example.com')

      expect(mockPrismaUpsert).toHaveBeenCalledWith({
        where: { supabaseId: 'sup-123' },
        create: {
          supabaseId: 'sup-123',
          email: 'test@example.com',
        },
        update: {
          email: 'test@example.com',
        },
      })

      expect(result.supabaseId).toBe('sup-123')
      expect(result.email).toBe('test@example.com')
    })

    it('should not log email in error handling', async () => {
      const mockPrismaUpsert = prisma.user.upsert as jest.MockedFunction<typeof prisma.user.upsert>
      mockPrismaUpsert.mockRejectedValue(new Error('DB constraint error'))

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      try {
        await syncUserToDB('sup-123', 'test@example.com')
      } catch {
        // Expected to throw
      }

      // Verify that email is not logged
      if (consoleErrorSpy.mock.calls.length > 0) {
        const errorLog = consoleErrorSpy.mock.calls[0][0]
        expect(String(errorLog)).not.toContain('test@example.com')
      }

      consoleErrorSpy.mockRestore()
    })
  })
})
