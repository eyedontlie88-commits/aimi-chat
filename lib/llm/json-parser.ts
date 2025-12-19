// lib/llm/json-parser.ts

/**
 * Robust JSON Parser for LLM Outputs
 * 
 * Handles common issues with LLM-generated JSON:
 * 1. Markdown code blocks (```json ... ```)
 * 2. Conversational filler before/after JSON
 * 3. Missing quotes or structural issues
 */

export interface ParseResult<T> {
    success: boolean
    data: T | null
    error?: string
    rawText: string
    cleanedText?: string
}

/**
 * Clean raw LLM output to extract JSON
 * 
 * Steps:
 * 1. Remove markdown code blocks
 * 2. Find first { or [ and last } or ]
 * 3. Extract that substring
 */
export function cleanJsonString(raw: string): string {
    let text = raw.trim()

    // Step 1: Remove markdown code blocks (```json, ```, etc.)
    text = text.replace(/```(?:json|JSON)?\s*/g, '')
    text = text.replace(/```\s*/g, '')

    // Step 2: Remove common LLM prefixes
    const prefixPatterns = [
        /^Here(?:'s| is) (?:the )?(?:JSON|response|result):\s*/i,
        /^(?:The )?(?:JSON|response|result):\s*/i,
        /^Output:\s*/i,
        /^Response:\s*/i,
    ]
    for (const pattern of prefixPatterns) {
        text = text.replace(pattern, '')
    }

    // Step 3: Find JSON boundaries
    // For objects: { ... }
    // For arrays: [ ... ]
    const firstBrace = text.indexOf('{')
    const firstBracket = text.indexOf('[')

    let startChar: '{' | '[' | null = null
    let endChar: '}' | ']' | null = null
    let startIndex = -1

    if (firstBrace === -1 && firstBracket === -1) {
        // No JSON structure found
        return text
    } else if (firstBrace === -1) {
        startChar = '['
        endChar = ']'
        startIndex = firstBracket
    } else if (firstBracket === -1) {
        startChar = '{'
        endChar = '}'
        startIndex = firstBrace
    } else {
        // Both found, use the first one
        if (firstBrace < firstBracket) {
            startChar = '{'
            endChar = '}'
            startIndex = firstBrace
        } else {
            startChar = '['
            endChar = ']'
            startIndex = firstBracket
        }
    }

    // Find the matching closing bracket/brace
    const lastEnd = text.lastIndexOf(endChar)
    if (lastEnd > startIndex) {
        text = text.substring(startIndex, lastEnd + 1)
    }

    return text.trim()
}

/**
 * Parse JSON with cleaning and fallback
 * 
 * @param raw - Raw LLM output string
 * @param fallback - Default value if parsing fails
 */
export function parseJsonSafe<T>(raw: string, fallback: T): ParseResult<T> {
    const rawText = raw

    if (!raw || typeof raw !== 'string') {
        return {
            success: false,
            data: fallback,
            error: 'Empty or invalid input',
            rawText: String(raw),
        }
    }

    // Clean the string first
    const cleanedText = cleanJsonString(raw)

    // Attempt 1: Parse cleaned text
    try {
        const parsed = JSON.parse(cleanedText)
        return {
            success: true,
            data: parsed as T,
            rawText,
            cleanedText,
        }
    } catch (e1) {
        // Attempt 2: Try with some common fixes
        let fixedText = cleanedText
            // Fix trailing commas
            .replace(/,\s*([}\]])/g, '$1')
            // Fix unquoted property names (simple cases)
            .replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3')

        try {
            const parsed = JSON.parse(fixedText)
            return {
                success: true,
                data: parsed as T,
                rawText,
                cleanedText: fixedText,
            }
        } catch (e2) {
            // All attempts failed
            console.warn('[JSON Parser] Failed to parse:', {
                originalLength: raw.length,
                cleanedLength: cleanedText.length,
                firstChars: cleanedText.substring(0, 100),
                error: e2 instanceof Error ? e2.message : 'Unknown error',
            })

            return {
                success: false,
                data: fallback,
                error: e2 instanceof Error ? e2.message : 'JSON parse error',
                rawText,
                cleanedText,
            }
        }
    }
}

/**
 * Parse JSON array from LLM output
 * Returns empty array on failure
 */
export function parseJsonArray<T>(raw: string): T[] {
    const result = parseJsonSafe<T[]>(raw, [])
    if (result.success && Array.isArray(result.data)) {
        return result.data
    }
    return []
}

/**
 * Parse JSON object from LLM output
 * Returns fallback object on failure
 */
export function parseJsonObject<T extends object>(raw: string, fallback: T): T {
    const result = parseJsonSafe<T>(raw, fallback)
    if (result.success && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) {
        return result.data
    }
    return fallback
}
