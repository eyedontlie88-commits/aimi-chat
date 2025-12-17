'use client'

import { useMemo } from 'react'
import { parseNarrativeContent, NarrativeToken } from '@/lib/narrative/parser'

interface NarrativeContentProps {
    content: string
    userName?: string
    characterName?: string
    className?: string
}

/**
 * Renders narrative content with styled tokens
 * - [narrator] → gray, italic
 * - *action* → purple, italic
 * - (thought) → small, gray italic
 * - {user}/{char} → highlighted
 * - Plain text → normal
 */
export default function NarrativeContent({
    content,
    userName = 'Bạn',
    characterName = 'Character',
    className = ''
}: NarrativeContentProps) {
    const parsed = useMemo(() => parseNarrativeContent(content), [content])

    const renderToken = (token: NarrativeToken, index: number) => {
        // Replace placeholders in content
        let displayContent = token.content
            .replace(/\{user\}/gi, userName)
            .replace(/\{char\}/gi, characterName)

        switch (token.type) {
            case 'narrator':
                return (
                    <span
                        key={index}
                        className="narrative-narrator text-gray-400 italic block my-1 py-1 px-2 bg-white/5 rounded"
                        title="Scene/Direction"
                    >
                        {displayContent}
                    </span>
                )

            case 'action':
                return (
                    <span
                        key={index}
                        className="narrative-action text-purple-400 italic"
                        title="Action"
                    >
                        *{displayContent}*
                    </span>
                )

            case 'thought':
                return (
                    <span
                        key={index}
                        className="narrative-thought text-gray-500 italic text-[0.9em]"
                        title="Inner thought"
                    >
                        ({displayContent})
                    </span>
                )

            case 'placeholder':
                // Placeholders should already be replaced, but render specially if not
                const resolvedName = token.content.toLowerCase() === 'user' ? userName : characterName
                return (
                    <span
                        key={index}
                        className="narrative-placeholder bg-yellow-500/20 px-1 rounded font-medium"
                        title={`Placeholder: ${token.content}`}
                    >
                        {resolvedName}
                    </span>
                )

            case 'dialogue':
            default:
                // Plain dialogue - also replace any placeholders in it
                displayContent = token.content
                    .replace(/\{user\}/gi, userName)
                    .replace(/\{char\}/gi, characterName)
                return (
                    <span key={index} className="narrative-dialogue">
                        {displayContent}
                    </span>
                )
        }
    }

    return (
        <span className={`narrative-content ${className}`}>
            {parsed.tokens.map((token, index) => renderToken(token, index))}
        </span>
    )
}
