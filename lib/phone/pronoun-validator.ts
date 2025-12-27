/**
 * 🔒 CRITICAL: PRONOUN VALIDATION SYSTEM
 * DO NOT REMOVE OR MODIFY WITHOUT APPROVAL
 * 
 * Validates AI responses to prevent pronoun regression bugs
 * Last Updated: 2025-12-26
 */

export interface ValidationResult {
    valid: boolean
    errors: string[]
    warnings: string[]
    fallbackReply?: string
}

export type CharacterRole = 'mother' | 'father' | 'boss' | 'friend'

/**
 * Validate AI response for correct pronoun usage
 */
export function validateAIResponse(
    aiReply: string,
    characterRole: CharacterRole
): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    let fallbackReply: string | undefined

    const lower = aiReply.toLowerCase().trim()

    // 🚨 CRITICAL CHECKS FOR MOTHER ROLE
    if (characterRole === 'mother') {
        // ❌ FATAL ERROR: AI speaking as child
        if (lower.match(/^dạ[\s.,!?]/i) || lower === 'dạ') {
            errors.push('CRITICAL: AI started reply with "Dạ" (mother cannot speak as child!)')
        }

        if (lower.match(/con biết rồi/i)) {
            errors.push('CRITICAL: AI said "con biết rồi" (mother is not "con"!)')
        }

        if (lower.match(/con nhớ mẹ/i)) {
            errors.push('CRITICAL: AI said "con nhớ mẹ" (wrong direction - mother should say "mẹ nhớ con"!)')
        }

        if (lower.match(/con sẽ/i) && !lower.match(/mẹ.*con sẽ/i)) {
            errors.push('CRITICAL: AI used "con sẽ" referring to self (mother is not "con"!)')
        }

        // ⚠️ WARNING: Missing expected maternal language
        if (!lower.match(/mẹ|con ơi|con à|ừ con/i)) {
            warnings.push('WARNING: Reply lacks maternal pronouns ("mẹ", "con ơi", "ừ con")')
        }

        fallbackReply = 'Ừ con, mẹ biết rồi ❤️'
    }

    // Similar checks for father
    if (characterRole === 'father') {
        if (lower.match(/^dạ bố/i) || lower.match(/^dạ[\s.,]/i)) {
            errors.push('CRITICAL: Father cannot start with "Dạ"')
        }

        if (lower.match(/con biết rồi.*ạ/i)) {
            errors.push('CRITICAL: Father cannot say "con biết rồi ạ"')
        }

        fallbackReply = 'Ừ con, bố đây'
    }

    // Boss role
    if (characterRole === 'boss') {
        if (lower.match(/^dạ sếp/i) || lower.match(/^dạ[\s.,]/i)) {
            errors.push('CRITICAL: Boss cannot start with "Dạ"')
        }

        if (lower.match(/em biết rồi.*ạ/i)) {
            errors.push('CRITICAL: Boss cannot say "em biết rồi ạ"')
        }

        fallbackReply = 'Được rồi, sếp đồng ý'
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings,
        fallbackReply: errors.length > 0 ? fallbackReply : undefined
    }
}

/**
 * Auto-detect role from contact name
 */
export function detectRole(contactName: string): CharacterRole {
    const lower = contactName.toLowerCase()

    if (lower.includes('mẹ') || lower.includes('mom') || lower.includes('mother')) {
        return 'mother'
    }
    if (lower.includes('bố') || lower.includes('ba ') || lower.includes('dad') || lower.includes('father')) {
        return 'father'
    }
    if (lower.includes('sếp') || lower.includes('boss') || lower.includes('manager')) {
        return 'boss'
    }

    return 'friend'
}

/**
 * Get correct pronouns for a role (for debugging/display)
 */
export function getCorrectPronouns(role: CharacterRole): {
    selfReference: string[]
    addressOther: string[]
    forbidden: string[]
} {
    switch (role) {
        case 'mother':
            return {
                selfReference: ['mẹ', 'mẹ đây'],
                addressOther: ['con', 'con ơi', 'con à'],
                forbidden: ['Dạ', 'con biết', 'con nhớ mẹ']
            }
        case 'father':
            return {
                selfReference: ['bố', 'bố đây', 'ba'],
                addressOther: ['con', 'con ơi'],
                forbidden: ['Dạ bố', 'con biết rồi ạ']
            }
        case 'boss':
            return {
                selfReference: ['sếp', 'tôi', 'anh/chị'],
                addressOther: ['em', 'bạn'],
                forbidden: ['Dạ sếp', 'em biết rồi ạ']
            }
        default:
            return {
                selfReference: ['tôi', 'mình'],
                addressOther: ['bạn', 'cậu'],
                forbidden: []
            }
    }
}
