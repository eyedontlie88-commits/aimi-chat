import { createClient } from '@supabase/supabase-js'

/**
 * Server-side Supabase client for database operations
 * Used by API routes for phone messages, etc.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Create client for server-side use
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
    return !!supabase
}

// Type definitions for phone tables
export interface PhoneConversation {
    id: string
    character_id: string
    sender_name: string
    avatar: string
    last_message_preview: string | null
    updated_at: string
}

export interface PhoneMessage {
    id: string
    conversation_id: string
    content: string
    is_from_character: boolean
    created_at: string
}
