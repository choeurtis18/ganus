'use server'

import { createClient } from '@/lib/supabase-server'
import { syncUserToDB } from '@/lib/supabase-server'

export type LoginErrorCode = 'invalid_credentials' | 'signin_failed' | 'unknown'
export type ResetErrorCode = 'unknown'

export async function signInAction(
  email: string,
  password: string,
): Promise<{ error?: LoginErrorCode }> {
  try {
    const supabase = await createClient()

    // Call Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('credentials')) {
        return { error: 'invalid_credentials' }
      }
      return { error: 'signin_failed' }
    }
    if (!data.user) {
      return { error: 'signin_failed' }
    }

    // Sync user to DB (in case they didn't go through signup first)
    try {
      await syncUserToDB(data.user.id, email)
    } catch (dbError) {
      console.error('Failed to sync user to DB:', dbError)
    }

    return {}
  } catch (err) {
    console.error('Login error:', err)
    return { error: 'unknown' }
  }
}

export async function resetPasswordAction(email: string): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ganus.vercel.app'
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl}/auth/reset-confirm`,
    })

    if (error) {
      console.error('Reset password error:', error.message)
      return { error: error.message }
    }

    return {}
  } catch (err) {
    console.error('Reset password error:', err)
    return { error: 'Une erreur est survenue' }
  }
}
