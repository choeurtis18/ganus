'use server'

import { createClient } from '@/lib/supabase-server'
import { syncUserToDB } from '@/lib/supabase-server'

export async function signInAction(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  try {
    const supabase = await createClient()

    // Call Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }
    if (!data.user) {
      return { error: 'Échec de la connexion' }
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
    return { error: 'Une erreur est survenue' }
  }
}
