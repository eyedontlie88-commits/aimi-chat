'use client'

import { useState, useRef, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'

interface NarrativeSyntaxButtonsProps {
    onInsert: (before: string, after: string, content?: string) => void
    disabled?: boolean
    isInputFocused?: boolean
}

type SyntaxType = 'scene' | 'action' | 'thought' | null

/**
 * Quick-insert buttons for narrative syntax with LOCK MODE
 * 
 * Flow:
 * 1. User clicks button → Shows inline content input
 * 2. User MUST type content before proceeding
 * 3. Press Enter or click ✓ to confirm
 * 4. Content inserted with proper syntax
 */
export default function NarrativeSyntaxButtons({
    onInsert,
    disabled = false,
    isInputFocused = false
}: NarrativeSyntaxButtonsProps) {
    const { t } = useLanguage()
    const [showPlaceholders, setShowPlaceholders] = useState(false)
    const [isExpanded, setIsExpanded] = useState(false)

    // Lock mode state
    const [activeSyntax, setActiveSyntax] = useState<SyntaxType>(null)
    const [syntaxContent, setSyntaxContent] = useState('')
    const [showError, setShowError] = useState(false)
    const contentInputRef = useRef<HTMLInputElement>(null)

    // Show buttons if input is focused OR user explicitly expanded
    const showButtons = isInputFocused || isExpanded

    // Focus input when syntax is selected
    useEffect(() => {
        if (activeSyntax && contentInputRef.current) {
            contentInputRef.current.focus()
        }
    }, [activeSyntax])

    const handleSyntaxSelect = (type: SyntaxType) => {
        setActiveSyntax(type)
        setSyntaxContent('')
        setShowError(false)
    }

    const handleConfirm = () => {
        if (!syntaxContent.trim()) {
            setShowError(true)
            contentInputRef.current?.focus()
            return
        }

        // Insert content with proper syntax
        const syntax = getSyntaxMarkers(activeSyntax!)
        onInsert(syntax.before, syntax.after, syntaxContent.trim())

        // Reset
        setActiveSyntax(null)
        setSyntaxContent('')
        setShowError(false)
    }

    const handleCancel = () => {
        setActiveSyntax(null)
        setSyntaxContent('')
        setShowError(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleConfirm()
        } else if (e.key === 'Escape') {
            handleCancel()
        }
    }

    const getSyntaxMarkers = (type: SyntaxType) => {
        switch (type) {
            case 'scene': return { before: '[', after: ']', label: t.narrative.scene }
            case 'action': return { before: '*', after: '*', label: t.narrative.action }
            case 'thought': return { before: '(', after: ')', label: t.narrative.thought }
            default: return { before: '', after: '', label: '' }
        }
    }

    const handlePlaceholderInsert = (placeholder: string) => {
        onInsert(placeholder, '')
        setShowPlaceholders(false)
    }

    const buttonClass = `
        flex flex-col items-center justify-center gap-0.5
        px-2 py-1.5 rounded-lg text-xs
        transition-all duration-200
        disabled:opacity-30 disabled:cursor-not-allowed
        active:scale-95
    `

    const buttonStyle = showButtons
        ? 'bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white opacity-60 hover:opacity-100'
        : 'opacity-0 pointer-events-none'

    // LOCK MODE: Show inline input when syntax is selected
    if (activeSyntax) {
        const syntax = getSyntaxMarkers(activeSyntax)
        return (
            <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="w-full max-w-md bg-slate-800 border-t border-white/20 rounded-t-2xl p-4 space-y-3 animate-in slide-in-from-bottom duration-300">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                            {t.narrative.enterContent} <span className="text-primary font-medium">{syntax.label}</span>
                        </span>
                        <button
                            onClick={handleCancel}
                            className="text-gray-500 hover:text-white transition-colors"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Preview */}
                    <div className="text-sm text-gray-500">
                        <span className="text-primary">{syntax.before}</span>
                        <span className="text-white">{syntaxContent || '...'}</span>
                        <span className="text-primary">{syntax.after}</span>
                    </div>

                    {/* Input */}
                    <div className="relative">
                        <input
                            ref={contentInputRef}
                            type="text"
                            value={syntaxContent}
                            onChange={(e) => {
                                setSyntaxContent(e.target.value)
                                setShowError(false)
                            }}
                            onKeyDown={handleKeyDown}
                            placeholder={`Nhập ${syntax.label.toLowerCase()}...`}
                            className={`w-full px-4 py-3 rounded-xl bg-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 ${showError ? 'ring-2 ring-red-500' : 'focus:ring-primary/50'}`}
                            autoFocus
                        />
                        {showError && (
                            <span className="absolute -bottom-5 left-0 text-xs text-red-400">
                                {t.guest.pleaseEnter}
                            </span>
                        )}
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-2 pt-2">
                        <button
                            onClick={handleCancel}
                            className="flex-1 py-2 px-4 bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition-colors"
                        >
                            {t.common.cancel}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className="flex-1 py-2 px-4 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors font-medium"
                        >
                            {t.narrative.add} {syntax.label}
                        </button>
                    </div>

                    {/* Hint */}
                    <p className="text-xs text-gray-500 text-center">
                        Enter để xác nhận • Esc để hủy
                    </p>
                </div>
            </div>
        )
    }

    // Toggle button (always visible)
    if (!showButtons) {
        return (
            <button
                type="button"
                onClick={() => setIsExpanded(true)}
                disabled={disabled}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all duration-200 shrink-0"
                title="Thêm kỹ thuật kể chuyện"
            >
                <span className="text-sm">✎</span>
            </button>
        )
    }

    return (
        <div className="flex items-center gap-1 shrink-0 animate-in fade-in duration-200">
            {/* Scene/Narrator button [ ] */}
            <button
                type="button"
                onClick={() => handleSyntaxSelect('scene')}
                disabled={disabled}
                className={`${buttonClass} ${buttonStyle}`}
                title="Thêm mô tả cảnh [text]"
            >
                <span className="font-mono text-sm">[ ]</span>
                <span className="text-[10px] text-gray-500">Cảnh</span>
            </button>

            {/* Action button * * */}
            <button
                type="button"
                onClick={() => handleSyntaxSelect('action')}
                disabled={disabled}
                className={`${buttonClass} ${buttonStyle}`}
                title="Thêm hành động *text*"
            >
                <span className="font-mono text-sm">*</span>
                <span className="text-[10px] text-gray-500">Hành động</span>
            </button>

            {/* Thought button ( ) */}
            <button
                type="button"
                onClick={() => handleSyntaxSelect('thought')}
                disabled={disabled}
                className={`${buttonClass} ${buttonStyle}`}
                title="Thêm suy nghĩ (text)"
            >
                <span className="font-mono text-sm">( )</span>
                <span className="text-[10px] text-gray-500">Suy nghĩ</span>
            </button>

            {/* Placeholder dropdown { } */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setShowPlaceholders(!showPlaceholders)}
                    disabled={disabled}
                    className={`${buttonClass} ${buttonStyle}`}
                    title="Chèn tên {user} / {char}"
                >
                    <span className="font-mono text-sm">{ }</span>
                    <span className="text-[10px] text-gray-500">Tên</span>
                </button>

                {/* Dropdown menu */}
                {showPlaceholders && (
                    <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-white/20 rounded-lg shadow-xl overflow-hidden z-50 min-w-[160px]">
                        <button
                            type="button"
                            onClick={() => handlePlaceholderInsert('{user}')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors"
                        >
                            <span className="text-yellow-400">{'{user}'}</span>
                            <span className="text-gray-400 ml-2">Người dùng</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePlaceholderInsert('{char}')}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-white/10 transition-colors border-t border-white/10"
                        >
                            <span className="text-yellow-400">{'{char}'}</span>
                            <span className="text-gray-400 ml-2">Nhân vật</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Collapse button */}
            <button
                type="button"
                onClick={() => {
                    setIsExpanded(false)
                    setShowPlaceholders(false)
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-white hover:bg-white/10 transition-all"
                title="Ẩn"
            >
                <span className="text-xs">✕</span>
            </button>
        </div>
    )
}
