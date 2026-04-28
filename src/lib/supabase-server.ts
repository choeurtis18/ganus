import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Cookies can't be set on client-side, ignore
          }
        },
      },
    },
  )
}

export async function getServerUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user
}

export async function getServerUserId(): Promise<string | null> {
  const user = await getServerUser()
  return user?.id ?? null
}

// Create or update User in our Prisma DB after Supabase auth
export async function syncUserToDB(supabaseUserId: string, email: string) {
  const { prisma } = await import('@/lib/db')

  return prisma.user.upsert({
    where: { supabaseId: supabaseUserId },
    create: {
      supabaseId: supabaseUserId,
      email,
    },
    update: {
      email,
    },
  })
}
