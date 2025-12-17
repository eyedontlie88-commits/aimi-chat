'use client'

import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase client for storage operations
 * Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Only create client if credentials are available
let supabase: SupabaseClient | null = null
if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Upload an avatar image to Supabase Storage
 * @param file - The image file to upload
 * @param characterId - Character ID to organize uploads (or 'user' for user avatars)
 * @returns Public URL of the uploaded image, or null on error
 */
export async function uploadAvatar(file: File, characterId: string): Promise<string | null> {
    // Check if credentials are configured
    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('[Storage] ❌ Supabase credentials not configured!')
        console.error('[Storage] Please add to .env:')
        console.error('[Storage]   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co')
        console.error('[Storage]   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key')
        return null
    }

    if (!supabase) {
        console.error('[Storage] ❌ Supabase client failed to initialize')
        return null
    }

    // Generate unique filename with timestamp
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fileName = `${characterId}/${Date.now()}.${fileExt}`

    console.log('[Storage] Uploading:', fileName, 'Size:', file.size, 'Type:', file.type)

    try {
        // Upload file to 'avatars' bucket (path is relative to bucket root)
        const { data, error } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: true, // Allow overwriting
                contentType: file.type,
            })

        if (error) {
            console.error('[Storage] ❌ Upload error:', error.message, error)
            // Common errors:
            // - "Bucket not found" → create 'avatars' bucket in Supabase
            // - "new row violates row-level security policy" → make bucket public or add RLS policy
            // - "The resource already exists" → change upsert to true
            return null
        }

        console.log('[Storage] ✅ Upload success:', data)

        // Get public URL
        const { data: urlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName)
        // Handle both v1 (publicURL) and v2 (publicUrl) API
        const publicUrl = (urlData as any)?.publicUrl || (urlData as any)?.publicURL
        if (!publicUrl) {
            console.error('[Storage] Failed to get public URL')
            return null
        }

        console.log('[Storage] Avatar uploaded:', publicUrl)
        return publicUrl
    } catch (err) {
        console.error('[Storage] Unexpected error:', err)
        return null
    }
}

/**
 * Delete an avatar from Supabase Storage
 * @param avatarUrl - The full public URL of the avatar to delete
 * @returns true if deleted successfully, false otherwise
 */
export async function deleteAvatar(avatarUrl: string): Promise<boolean> {
    if (!supabase) {
        console.error('[Storage] Supabase client not initialized')
        return false
    }

    try {
        // Extract path from URL (after /avatars/)
        const match = avatarUrl.match(/\/avatars\/(.+)$/)
        if (!match) {
            console.error('[Storage] Invalid avatar URL format')
            return false
        }

        const filePath = match[1]
        const { error } = await supabase.storage
            .from('avatars')
            .remove([filePath])

        if (error) {
            console.error('[Storage] Delete error:', error.message)
            return false
        }

        return true
    } catch (err) {
        console.error('[Storage] Unexpected error:', err)
        return false
    }
}

/**
 * Check if Supabase Storage is configured
 */
export function isStorageConfigured(): boolean {
    return !!supabase
}
