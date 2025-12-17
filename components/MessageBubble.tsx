import { formatRelativeTime } from '@/lib/utils'
import NarrativeContent from '@/components/NarrativeContent'

interface ReplyToData {
    id: string
    role: string
    content: string
}

interface ThemeColors {
    userBubbleBg: string
    userBubbleText: string
    aiBubbleBg: string
    aiBubbleText: string
    replyBg: string
    replyBorder: string
    replyText: string
}

interface MessageBubbleProps {
    role: 'user' | 'assistant'
    content: string
    createdAt?: Date
    characterName?: string
    onSaveMemory?: () => void
    onReply?: () => void
    replyTo?: ReplyToData | null
    theme?: ThemeColors
    onScrollToMessage?: (id: string) => void
    reactionType?: string | null // NONE | LIKE | HEARTBEAT
    userName?: string // For narrative placeholder replacement
}

export default function MessageBubble({
    role,
    content,
    createdAt,
    characterName,
    onSaveMemory,
    onReply,
    replyTo,
    theme,
    onScrollToMessage,
    reactionType,
    userName = 'Bạn',
}: MessageBubbleProps) {
    const isUser = role === 'user'

    // Theme-based or default colors
    const bubbleClasses = theme
        ? isUser
            ? `${theme.userBubbleBg} ${theme.userBubbleText} rounded-br-sm`
            : `${theme.aiBubbleBg} ${theme.aiBubbleText} rounded-bl-sm`
        : isUser
            ? 'message-user rounded-br-sm'
            : 'message-assistant rounded-bl-sm'

    // Reply quote classes
    const replyClasses = theme
        ? `${theme.replyBg} ${theme.replyBorder} ${theme.replyText}`
        : 'bg-white/10 border-white/20 text-gray-300'

    return (
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-slide-up`}>
            <div className={`max-w-[85%] sm:max-w-[75%] space-y-1 break-words min-w-0`}>
                {/* Quoted reply block - Messenger/ChatGPT style */}
                {replyTo && (
                    <button
                        type="button"
                        onClick={() => onScrollToMessage?.(replyTo.id)}
                        className={`mb-1 w-full text-left rounded-xl px-3 py-2 transition cursor-pointer border ${replyClasses}`}
                    >
                        <div className="flex items-center gap-1 text-[11px] opacity-70">
                            <span>↩</span>
                            <span>
                                {isUser ? 'Bạn đã trả lời' : `${characterName} đã trả lời`}{' '}
                                {replyTo.role === 'user' ? 'tin nhắn của bạn' : characterName}
                            </span>
                        </div>
                        <div className="mt-1 text-xs line-clamp-2 whitespace-pre-wrap opacity-90">
                            {replyTo.content}
                        </div>
                    </button>
                )}

                {/* Message bubble */}
                <div className="relative">
                    <div className={`px-4 py-3 rounded-2xl ${bubbleClasses}`}>
                        {!isUser && characterName && (
                            <p className="text-xs opacity-70 mb-1 font-medium">{characterName}</p>
                        )}
                        <p className="text-sm sm:text-base whitespace-pre-wrap break-words">
                            <NarrativeContent
                                content={content}
                                userName={userName}
                                characterName={characterName}
                            />
                        </p>
                    </div>

                    {/* Heart reaction icon (Messenger-style) - only for user messages */}
                    {isUser && (reactionType === 'HEARTBEAT' || reactionType === 'LIKE') && (
                        <div className="absolute -bottom-2 left-2">
                            <span
                                className={`text-lg drop-shadow-md ${reactionType === 'HEARTBEAT' ? 'animate-heartbeat' : ''}`}
                                title={reactionType === 'HEARTBEAT' ? 'Thình thịch!' : 'Thích'}
                            >
                                {reactionType === 'HEARTBEAT' ? '❤️' : '💕'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Metadata & Actions */}
                <div className={`flex items-center gap-2 px-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <span className="text-xs opacity-50">
                        {createdAt && !isNaN(createdAt.getTime()) ? formatRelativeTime(createdAt) : ''}
                    </span>

                    {onReply && (
                        <button
                            onClick={onReply}
                            className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                            title="Trả lời"
                        >
                            ↩ Trả lời
                        </button>
                    )}

                    {!isUser && onSaveMemory && (
                        <button
                            onClick={onSaveMemory}
                            className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                            title="Save as memory"
                        >
                            💾 Save
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}
