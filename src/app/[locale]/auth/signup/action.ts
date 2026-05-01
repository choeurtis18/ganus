'use server'

import { createClient } from '@/lib/supabase-server'
import { syncUserToDB } from '@/lib/supabase-server'

export type SignupErrorCode = 'email_exists' | 'signup_failed' | 'unknown'

export async function signUpAction(
  email: string,
  password: string,
): Promise<{ error?: SignupErrorCode }> {
  try {
    const supabase = await createClient()

    // Call Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (error) {
      if (error.message.toLowerCase().includes('already registered') || error.message.toLowerCase().includes('exists')) {
        return { error: 'email_exists' }
      }
      return { error: 'signup_failed' }
    }
    if (!data.user) {
      return { error: 'signup_failed' }
    }

    // Sync user to our Prisma DB
    try {
      await syncUserToDB(data.user.id, email)
    } catch (dbError) {
      console.error('Failed to sync user to DB:', dbError)
      // Don't fail signup if DB sync fails
    }

    return {}
  } catch (err) {
    console.error('Signup error:', err)
    return { error: 'unknown' }
  }
}
