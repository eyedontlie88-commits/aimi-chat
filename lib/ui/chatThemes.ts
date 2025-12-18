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
            pageBg: 'bg-neutral-950',           // #0a0a0a - Very dark, easy on eyes
            headerBg: 'bg-neutral-900',          // #171717 - Soft dark gray
            headerBorder: 'border-neutral-700',  // #3f3f3f
            messagesBg: 'bg-gradient-to-b from-neutral-950 to-neutral-900',
            inputBg: 'bg-neutral-900',           // #171717
            inputBorder: 'border-neutral-700',   // #3f3f3f
        },
        bubbles: {
            userBg: 'bg-gray-700',               // #383838 - Xám đậm
            userText: 'text-yellow-200',         // #F9D47E - Vàng ấm
            aiBg: 'bg-gray-800',                 // #262626
            aiText: 'text-yellow-200',           // #F9D47E - Vàng ấm
            replyPreviewBg: 'bg-neutral-800/70',
            replyPreviewBorder: 'border-neutral-600',
            replyPreviewText: 'text-gray-200',   // #e5e7eb
        },
        helpers: {
            scrollButtonBg: 'bg-neutral-800',
            scrollButtonBorder: 'border-neutral-600',
            scrollIcon: 'text-gray-100',         // #f3f4f6
        },
        buttons: {
            primaryBg: 'bg-blue-600',            // #2563eb - Primary blue
            primaryText: 'text-gray-50',         // #f9fafb
            primaryHover: 'hover:bg-blue-500',   // Lighter blue on hover
            dangerBg: 'bg-red-900/60',
            dangerText: 'text-red-300',
        },
        input: {
            text: 'text-gray-50',                // #f9fafb - Soft white
            placeholder: 'placeholder:text-gray-500', // #6b7280 - Not too bright
        },
        notice: {
            bg: 'bg-amber-900/90',
            border: 'border border-amber-700',
            text: 'text-amber-100',
            link: 'text-amber-300 hover:text-white underline font-semibold',
        },
        previewColors: ['#0a0a0a', '#2563eb', '#171717'],
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
            userBg: 'bg-purple-700',             // #6A4C93 - Tím đậm
            userText: 'text-gray-100',           // #F5F5F5 - Trắng kem
            aiBg: 'bg-purple-800',
            aiText: 'text-gray-100',             // #F5F5F5 - Trắng kem
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
            pageBg: 'bg-gray-100',               // #f3f4f6 - Soft light gray
            headerBg: 'bg-gray-50',              // #f9fafb - Very light
            headerBorder: 'border-gray-200',     // #e5e7eb
            messagesBg: 'bg-gradient-to-b from-gray-100 to-gray-50',
            inputBg: 'bg-white',
            inputBorder: 'border-gray-300',      // #d1d5db
        },
        bubbles: {
            userBg: 'bg-pink-600',               // #D81B60 - Hồng đậm
            userText: 'text-black',              // #1A1A1A - Đen
            aiBg: 'bg-pink-700',                 // Darker pink for AI
            aiText: 'text-black',                // #1A1A1A - Đen
            replyPreviewBg: 'bg-pink-200/70',
            replyPreviewBorder: 'border-pink-300',
            replyPreviewText: 'text-gray-700',   // #374151
        },
        helpers: {
            scrollButtonBg: 'bg-white',
            scrollButtonBorder: 'border-gray-300',
            scrollIcon: 'text-pink-600',
        },
        buttons: {
            primaryBg: 'bg-blue-600',            // #2563eb - Consistent blue
            primaryText: 'text-white',
            primaryHover: 'hover:bg-blue-500',
            dangerBg: 'bg-red-100',
            dangerText: 'text-red-600',
        },
        input: {
            text: 'text-gray-800',               // #1f2937 - Good contrast
            placeholder: 'placeholder:text-gray-400', // #9ca3af
        },
        notice: {
            bg: 'bg-rose-700',
            border: 'border border-rose-600',
            text: 'text-white',
            link: 'text-rose-200 hover:text-white underline font-semibold',
        },
        previewColors: ['#f3f4f6', '#ec4899', '#ffffff'],
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
            userBg: 'bg-blue-700',               // #1565C0 - Xanh đậm
            userText: 'text-gray-100',           // #F5F5F5 - Trắng kem
            aiBg: 'bg-blue-800',
            aiText: 'text-gray-100',             // #F5F5F5 - Trắng kem
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
