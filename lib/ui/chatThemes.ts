export type ChatThemeId = 'midnight' | 'twilight' | 'sakura' | 'ocean'
export type ChatTextMode = 'auto' | 'light' | 'dark'

export interface ChatThemeDefinition {
    id: ChatThemeId
    name: string
    description: string
    isDark: boolean // for auto text mode
    layout: {
        pageBg: string
        headerBg: string
        headerBorder: string
        messagesBg: string
        inputBg: string
        inputBorder: string
    }
    bubbles: {
        userBg: string
        userText: string
        aiBg: string
        aiText: string
        replyPreviewBg: string
        replyPreviewBorder: string
        replyPreviewText: string
    }
    helpers: {
        scrollButtonBg: string
        scrollButtonBorder: string
        scrollIcon: string
    }
    buttons: {
        primaryBg: string
        primaryText: string
        primaryHover: string
        dangerBg: string
        dangerText: string
    }
    input: {
        text: string
        placeholder: string
    }
    // Notice/warning banner colors (must contrast with theme background)
    notice: {
        bg: string
        border: string
        text: string
        link: string
    }
    // Preview colors for Settings page
    previewColors: string[]
}

export const chatThemes: Record<ChatThemeId, ChatThemeDefinition> = {
    midnight: {
        id: 'midnight',
        name: 'Midnight',
        description: 'Nền tối, dễ đọc ban đêm 🌙',
        isDark: true,
        layout: {
            pageBg: 'bg-slate-950',
            headerBg: 'bg-slate-900',
            headerBorder: 'border-slate-700',
            messagesBg: 'bg-gradient-to-b from-slate-950 to-slate-900',
            inputBg: 'bg-slate-900',
            inputBorder: 'border-slate-700',
        },
        bubbles: {
            userBg: 'bg-indigo-600',
            userText: 'text-white',
            aiBg: 'bg-slate-800',
            aiText: 'text-slate-100',
            replyPreviewBg: 'bg-slate-800/70',
            replyPreviewBorder: 'border-slate-600',
            replyPreviewText: 'text-slate-200',
        },
        helpers: {
            scrollButtonBg: 'bg-slate-800',
            scrollButtonBorder: 'border-slate-600',
            scrollIcon: 'text-slate-100',
        },
        buttons: {
            primaryBg: 'bg-slate-700',
            primaryText: 'text-slate-100',
            primaryHover: 'hover:bg-slate-600',
            dangerBg: 'bg-red-900/60',
            dangerText: 'text-red-300',
        },
        input: {
            text: 'text-white',
            placeholder: 'placeholder:text-slate-400',
        },
        notice: {
            bg: 'bg-amber-900/90',
            border: 'border border-amber-700',
            text: 'text-amber-100',
            link: 'text-amber-300 hover:text-white underline font-semibold',
        },
        previewColors: ['#0f172a', '#4f46e5', '#1e293b'],
    },
    twilight: {
        id: 'twilight',
        name: 'Twilight',
        description: 'Nền tím nhẹ, aesthetic ✨',
        isDark: true,
        layout: {
            pageBg: 'bg-violet-950',
            headerBg: 'bg-violet-900',
            headerBorder: 'border-violet-700',
            messagesBg: 'bg-gradient-to-b from-violet-950 to-purple-950',
            inputBg: 'bg-violet-900',
            inputBorder: 'border-violet-700',
        },
        bubbles: {
            userBg: 'bg-fuchsia-600',
            userText: 'text-white',
            aiBg: 'bg-violet-800',
            aiText: 'text-violet-100',
            replyPreviewBg: 'bg-violet-800/70',
            replyPreviewBorder: 'border-violet-600',
            replyPreviewText: 'text-violet-200',
        },
        helpers: {
            scrollButtonBg: 'bg-violet-800',
            scrollButtonBorder: 'border-violet-600',
            scrollIcon: 'text-violet-100',
        },
        buttons: {
            primaryBg: 'bg-violet-700',
            primaryText: 'text-violet-100',
            primaryHover: 'hover:bg-violet-600',
            dangerBg: 'bg-red-900/60',
            dangerText: 'text-red-300',
        },
        input: {
            text: 'text-white',
            placeholder: 'placeholder:text-violet-300',
        },
        notice: {
            bg: 'bg-amber-900/90',
            border: 'border border-amber-700',
            text: 'text-amber-100',
            link: 'text-amber-300 hover:text-white underline font-semibold',
        },
        previewColors: ['#2e1065', '#c026d3', '#4c1d95'],
    },
    sakura: {
        id: 'sakura',
        name: 'Sakura',
        description: 'Hồng pastel, ngọt ngào 🌸',
        isDark: false,
        layout: {
            pageBg: 'bg-pink-50',
            headerBg: 'bg-pink-100',
            headerBorder: 'border-pink-200',
            messagesBg: 'bg-gradient-to-b from-pink-50 to-rose-100',
            inputBg: 'bg-white',
            inputBorder: 'border-pink-300',
        },
        bubbles: {
            userBg: 'bg-pink-500',
            userText: 'text-white',
            aiBg: 'bg-white',
            aiText: 'text-pink-900',
            replyPreviewBg: 'bg-pink-200/70',
            replyPreviewBorder: 'border-pink-300',
            replyPreviewText: 'text-pink-800',
        },
        helpers: {
            scrollButtonBg: 'bg-white',
            scrollButtonBorder: 'border-pink-300',
            scrollIcon: 'text-pink-600',
        },
        buttons: {
            primaryBg: 'bg-pink-200',
            primaryText: 'text-pink-800',
            primaryHover: 'hover:bg-pink-300',
            dangerBg: 'bg-red-100',
            dangerText: 'text-red-600',
        },
        input: {
            text: 'text-pink-900',
            placeholder: 'placeholder:text-pink-400',
        },
        notice: {
            bg: 'bg-rose-700',
            border: 'border border-rose-600',
            text: 'text-white',
            link: 'text-rose-200 hover:text-white underline font-semibold',
        },
        previewColors: ['#fdf2f8', '#ec4899', '#ffffff'],
    },
    ocean: {
        id: 'ocean',
        name: 'Ocean',
        description: 'Xanh dương tươi mát 🌊',
        isDark: true,
        layout: {
            pageBg: 'bg-cyan-950',
            headerBg: 'bg-cyan-900',
            headerBorder: 'border-cyan-700',
            messagesBg: 'bg-gradient-to-b from-cyan-950 to-blue-950',
            inputBg: 'bg-cyan-900',
            inputBorder: 'border-cyan-700',
        },
        bubbles: {
            userBg: 'bg-cyan-500',
            userText: 'text-white',
            aiBg: 'bg-blue-900',
            aiText: 'text-cyan-100',
            replyPreviewBg: 'bg-cyan-800/70',
            replyPreviewBorder: 'border-cyan-600',
            replyPreviewText: 'text-cyan-200',
        },
        helpers: {
            scrollButtonBg: 'bg-cyan-800',
            scrollButtonBorder: 'border-cyan-600',
            scrollIcon: 'text-cyan-100',
        },
        buttons: {
            primaryBg: 'bg-cyan-700',
            primaryText: 'text-cyan-100',
            primaryHover: 'hover:bg-cyan-600',
            dangerBg: 'bg-red-900/60',
            dangerText: 'text-red-300',
        },
        input: {
            text: 'text-white',
            placeholder: 'placeholder:text-cyan-300',
        },
        notice: {
            bg: 'bg-amber-900/90',
            border: 'border border-amber-700',
            text: 'text-amber-100',
            link: 'text-amber-300 hover:text-white underline font-semibold',
        },
        previewColors: ['#083344', '#06b6d4', '#1e3a5f'],
    },
}

export const DEFAULT_THEME_ID: ChatThemeId = 'midnight'

export const TEXT_MODE_OPTIONS: { value: ChatTextMode; label: string }[] = [
    { value: 'auto', label: 'Tự động (theo theme)' },
    { value: 'light', label: 'Chữ sáng (trắng)' },
    { value: 'dark', label: 'Chữ đậm (tối)' },
]

/**
 * Get theme by ID with fallback to midnight
 */
export function getThemeById(id: string | null | undefined): ChatThemeDefinition {
    return chatThemes[id as ChatThemeId] || chatThemes.midnight
}

/**
 * Get resolved theme with text mode override applied
 * Returns the theme definition plus resolved text classes for all components
 */
export function getResolvedTheme(
    themeId: ChatThemeId | string | null | undefined,
    textMode: ChatTextMode | string | null | undefined
): ChatThemeDefinition & {
    resolvedHeaderText: string
    resolvedUserText: string
    resolvedAiText: string
    resolvedReplyText: string
    resolvedButtonText: string
    resolvedDangerText: string
    resolvedInputText: string
    resolvedScrollIcon: string
} {
    const theme = getThemeById(themeId)
    const mode = (textMode as ChatTextMode) || 'auto'

    // Determine what text color to use based on mode
    const lightText = 'text-white'
    const darkText = 'text-slate-900'

    // Auto mode uses theme defaults, otherwise override
    const resolveText = (themeDefault: string): string => {
        if (mode === 'light') return lightText
        if (mode === 'dark') return darkText
        return themeDefault
    }

    return {
        ...theme,
        // Resolved text colors (can be overridden by textMode)
        resolvedHeaderText: resolveText(theme.isDark ? lightText : darkText),
        resolvedUserText: theme.bubbles.userText, // User bubble always uses theme (white on colored bg)
        resolvedAiText: resolveText(theme.bubbles.aiText),
        resolvedReplyText: resolveText(theme.bubbles.replyPreviewText),
        resolvedButtonText: resolveText(theme.buttons.primaryText),
        resolvedDangerText: theme.buttons.dangerText, // Danger always uses theme color (red)
        resolvedInputText: resolveText(theme.input.text),
        resolvedScrollIcon: resolveText(theme.helpers.scrollIcon),
    }
}
