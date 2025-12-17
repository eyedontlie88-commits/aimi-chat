/**
 * Narrative Syntax Parser
 * Parses interactive storytelling syntax:
 * - [narrator] → Scene setup/direction
 * - *action* → Physical action/expression
 * - (thought) → Hidden inner monologue
 * - {user} / {char} → Name placeholders
 * - Plain text → Direct dialogue
 */

export type NarrativeTokenType = 'narrator' | 'action' | 'thought' | 'placeholder' | 'dialogue'

export interface NarrativeToken {
    type: NarrativeTokenType
    content: string
    raw: string // Original text including markers
}

export interface ParsedNarrative {
    tokens: NarrativeToken[]
    hasNarrative: boolean
    narrativeTypes: NarrativeTokenType[]
}

/**
 * Parse narrative content into tokens
 * Handles: [narrator], *action*, (thought), {user}, {char}, and plain text
 */
export function parseNarrativeContent(text: string): ParsedNarrative {
    if (!text || typeof text !== 'string') {
        return {
            tokens: [{ type: 'dialogue', content: text || '', raw: text || '' }],
            hasNarrative: false,
            narrativeTypes: []
        }
    }

    const tokens: NarrativeToken[] = []
    const narrativeTypes = new Set<NarrativeTokenType>()

    // Combined regex to match all narrative patterns
    // Order: brackets, double asterisks (markdown bold), single asterisks, parentheses, placeholders
    // Note: **text** and *text* are both treated as actions
    const pattern = /(\[[^\]]+\])|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\([^)]+\))|(\{user\}|\{char\})/g

    let lastIndex = 0
    let match: RegExpExecArray | null

    while ((match = pattern.exec(text)) !== null) {
        // Add any plain text before this match
        if (match.index > lastIndex) {
            const plainText = text.slice(lastIndex, match.index)
            if (plainText.trim()) {
                tokens.push({
                    type: 'dialogue',
                    content: plainText,
                    raw: plainText
                })
            }
        }

        const matchedText = match[0]

        if (match[1]) {
            // [narrator] - scene/direction
            tokens.push({
                type: 'narrator',
                content: matchedText.slice(1, -1), // Remove [ ]
                raw: matchedText
            })
            narrativeTypes.add('narrator')
        } else if (match[2]) {
            // **bold** - treat as action (markdown style)
            tokens.push({
                type: 'action',
                content: matchedText.slice(2, -2), // Remove ** **
                raw: matchedText
            })
            narrativeTypes.add('action')
        } else if (match[3]) {
            // *action* - physical action
            tokens.push({
                type: 'action',
                content: matchedText.slice(1, -1), // Remove * *
                raw: matchedText
            })
            narrativeTypes.add('action')
        } else if (match[4]) {
            // (thought) - inner monologue
            tokens.push({
                type: 'thought',
                content: matchedText.slice(1, -1), // Remove ( )
                raw: matchedText
            })
            narrativeTypes.add('thought')
        } else if (match[5]) {
            // {user} or {char} - placeholder
            tokens.push({
                type: 'placeholder',
                content: matchedText.slice(1, -1), // Remove { }
                raw: matchedText
            })
            narrativeTypes.add('placeholder')
        }

        lastIndex = pattern.lastIndex
    }

    // Add any remaining plain text
    if (lastIndex < text.length) {
        const remainingText = text.slice(lastIndex)
        if (remainingText.trim()) {
            tokens.push({
                type: 'dialogue',
                content: remainingText,
                raw: remainingText
            })
        }
    }

    // If no tokens found, treat entire text as dialogue
    if (tokens.length === 0) {
        tokens.push({
            type: 'dialogue',
            content: text,
            raw: text
        })
    }

    return {
        tokens,
        hasNarrative: narrativeTypes.size > 0,
        narrativeTypes: Array.from(narrativeTypes)
    }
}

/**
 * Replace {user} and {char} placeholders with actual names
 */
export function replaceNarrativePlaceholders(
    text: string,
    userName: string,
    characterName: string
): string {
    if (!text) return text
    return text
        .replace(/\{user\}/gi, userName)
        .replace(/\{char\}/gi, characterName)
}

/**
 * Extract narrative context for AI prompt
 * Returns scene setup and hidden thoughts for AI to process
 */
export function extractNarrativeContext(text: string): {
    scene: string | null
    actions: string[]
    thoughts: string | null
    dialogue: string
} {
    const parsed = parseNarrativeContent(text)

    const scene = parsed.tokens.find(t => t.type === 'narrator')?.content || null
    const actions = parsed.tokens.filter(t => t.type === 'action').map(t => t.content)
    const thoughts = parsed.tokens.find(t => t.type === 'thought')?.content || null
    const dialogue = parsed.tokens
        .filter(t => t.type === 'dialogue')
        .map(t => t.content)
        .join(' ')
        .trim()

    return { scene, actions, thoughts, dialogue }
}

/**
 * Check if text contains any narrative syntax
 */
export function hasNarrativeSyntax(text: string): boolean {
    if (!text) return false
    return /\[[^\]]+\]|\*[^*]+\*|\([^)]+\)|\{user\}|\{char\}/i.test(text)
}
