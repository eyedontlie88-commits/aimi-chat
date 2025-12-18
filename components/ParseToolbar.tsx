'use client'

import { useState, useEffect, useRef } from 'react'

interface ThemeBubbles {
    userBg: string
    userText: string
    aiBg: string
    aiText: string
}

interface ParseToolbarProps {
    textareaRef: React.RefObject<HTMLTextAreaElement>
    textValue: string
    onChange: (newValue: string) => void
    theme?: {
        bubbles: ThemeBubbles
    }
}

export default function ParseToolbar({ textareaRef, textValue, onChange, theme }: ParseToolbarProps) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside (only if textarea has text)
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                // Only close if textarea has text (not locked)
                if (textValue.trim().length > 0) {
                    setIsOpen(false)
                }
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
        }
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [isOpen, textValue])

    // Close on Escape (only if textarea has text)
    useEffect(() => {
        const handleEsc = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // Only close if textarea has text (not locked)
                if (textValue.trim().length > 0) {
                    setIsOpen(false)
                }
            }
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEsc)
        }
        return () => document.removeEventListener('keydown', handleEsc)
    }, [isOpen, textValue])

    const handleWrap = (syntax: 'bracket' | 'action' | 'thought' | 'user' | 'char') => {
        if (!textareaRef.current) return

        const textarea = textareaRef.current
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = textValue.substring(start, end)
        const beforeText = textValue.substring(0, start)
        const afterText = textValue.substring(end)

        let newText = ''
        let cursorPos = start

        if (selectedText.length > 0) {
            // If text selected → wrap selection
            switch (syntax) {
                case 'bracket':
                    newText = beforeText + `[${selectedText}]` + afterText
                    cursorPos = start + selectedText.length + 2
                    break
                case 'action':
                    newText = beforeText + `*${selectedText}*` + afterText
                    cursorPos = start + selectedText.length + 2
                    break
                case 'thought':
                    newText = beforeText + `(${selectedText})` + afterText
                    cursorPos = start + selectedText.length + 2
                    break
                case 'user':
                    newText = beforeText + `{user}` + afterText
                    cursorPos = start + 6
                    break
                case 'char':
                    newText = beforeText + `{char}` + afterText
                    cursorPos = start + 6
                    break
            }
        } else {
            // If NO selection → insert empty markers at cursor
            switch (syntax) {
                case 'bracket':
                    newText = beforeText + '[]' + afterText
                    cursorPos = start + 1
                    break
                case 'action':
                    newText = beforeText + '**' + afterText
                    cursorPos = start + 1
                    break
                case 'thought':
                    newText = beforeText + '()' + afterText
                    cursorPos = start + 1
                    break
                case 'user':
                    newText = beforeText + '{user}' + afterText
                    cursorPos = start + 6
                    break
                case 'char':
                    newText = beforeText + '{char}' + afterText
                    cursorPos = start + 6
                    break
            }
        }

        onChange(newText)

        // Close dropdown after insert - user has added markers, can type now
        setIsOpen(false)

        // Set cursor position after render
        setTimeout(() => {
            if (textareaRef.current) {
                textareaRef.current.focus()
                textareaRef.current.setSelectionRange(cursorPos, cursorPos)
            }
        }, 0)
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Pen Icon Button - ALWAYS ENABLED */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center justify-center w-10 h-10 rounded-xl transition bg-white/10 hover:bg-white/20 ${isOpen ? 'bg-white/20' : ''}`}
                title="Thêm format văn bản"
            >
                <span className="text-lg">✏️</span>
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={`absolute bottom-full right-0 mb-2 min-w-[140px] rounded-xl shadow-xl border overflow-hidden z-50 ${theme ? `${theme.bubbles.aiBg} border-white/20` : 'bg-slate-800 border-slate-600/50'}`}>
                    <button
                        type="button"
                        onClick={() => handleWrap('bracket')}
                        className={`flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm transition ${theme ? `${theme.bubbles.aiText} hover:opacity-80` : 'text-gray-200 hover:bg-slate-700'}`}
                    >
                        <span className="text-gray-400 font-mono">[ ]</span>
                        <span>Narrator</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleWrap('action')}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-slate-700 text-sm text-gray-200 transition"
                    >
                        <span className="text-purple-400 font-mono">* *</span>
                        <span>Action</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleWrap('thought')}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-slate-700 text-sm text-gray-200 transition"
                    >
                        <span className="text-gray-400 font-mono">( )</span>
                        <span>Thought</span>
                    </button>
                    <hr className="border-slate-600/50 mx-2" />
                    <button
                        type="button"
                        onClick={() => handleWrap('user')}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-slate-700 text-sm text-gray-200 transition"
                    >
                        <span className="text-yellow-400 font-mono text-xs bg-yellow-500/20 px-1 rounded">{'{user}'}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => handleWrap('char')}
                        className="flex items-center gap-2 w-full text-left px-4 py-2.5 hover:bg-slate-700 text-sm text-gray-200 transition"
                    >
                        <span className="text-pink-400 font-mono text-xs bg-pink-500/20 px-1 rounded">{'{char}'}</span>
                    </button>
                </div>
            )}
        </div>
    )
}
