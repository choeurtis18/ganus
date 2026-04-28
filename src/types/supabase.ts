// Supabase types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          supabase_id: string
          profile: Json | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          email: string
          supabase_id: string
          profile?: Json | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          supabase_id?: string
          profile?: Json | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
      }
      chat_sessions: {
        Row: {
          id: string
          user_id: string
          messages: Json
          total_turns: number
          average_score: number | null
          input_tokens: number
          output_tokens: number
          cost_usd: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          messages?: Json
          total_turns?: number
          average_score?: number | null
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          messages?: Json
          total_turns?: number
          average_score?: number | null
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          created_at?: string
          updated_at?: string
        }
      }
      llm_logs: {
        Row: {
          id: string
          user_id: string
          model: string
          feature: string
          input_tokens: number
          output_tokens: number
          cost_usd: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          model: string
          feature: string
          input_tokens: number
          output_tokens: number
          cost_usd: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          model?: string
          feature?: string
          input_tokens?: number
          output_tokens?: number
          cost_usd?: number
          created_at?: string
        }
      }
    }
  }
}
