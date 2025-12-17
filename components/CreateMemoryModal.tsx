'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n'

interface CreateMemoryModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: MemoryData) => void
    messageContent: string
}

export interface MemoryData {
    type: string
    content: string
    importanceScore: number
}

export default function CreateMemoryModal({
    isOpen,
    onClose,
    onSubmit,
    messageContent,
}: CreateMemoryModalProps) {
    const { t } = useLanguage()
    const [type, setType] = useState('fact')
    const [content, setContent] = useState('')
    const [importanceScore, setImportanceScore] = useState(5)

    // Dynamic memory types with translations
    const memoryTypes = [
        { value: 'fact', label: t.memory.types.fact, description: t.memory.types.factDesc },
        { value: 'event', label: t.memory.types.event, description: t.memory.types.eventDesc },
        { value: 'preference', label: t.memory.types.preference, description: t.memory.types.preferenceDesc },
        { value: 'anniversary', label: t.memory.types.anniversary, description: t.memory.types.anniversaryDesc },
        { value: 'promise', label: t.memory.types.promise, description: t.memory.types.promiseDesc },
        { value: 'other', label: t.memory.types.other, description: t.memory.types.otherDesc },
    ]

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!content) return

        onSubmit({ type, content, importanceScore })

        // Reset form
        setType('fact')
        setContent('')
        setImportanceScore(5)
    }

    if (!isOpen) return null

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="card max-w-lg w-full animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold gradient-text">{t.memory.title}</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <p className="text-sm text-gray-300 mb-4">
                    {t.memory.description}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">{t.memory.type}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {memoryTypes.map((memType) => (
                                <button
                                    key={memType.value}
                                    type="button"
                                    onClick={() => setType(memType.value)}
                                    className={`p-3 rounded-lg text-left transition-all ${type === memType.value
                                        ? 'bg-primary-600 border-2 border-primary-400'
                                        : 'glass glass-hover'
                                        }`}
                                >
                                    <div className="text-sm font-medium">{memType.label}</div>
                                    <div className="text-xs text-gray-400 mt-1">{memType.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">{t.memory.content}</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder={t.memory.contentPlaceholder}
                            className="input-field min-h-[100px] resize-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            {t.memory.importance}: {importanceScore}/10
                        </label>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={importanceScore}
                            onChange={(e) => setImportanceScore(parseInt(e.target.value))}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>{t.memory.minor}</span>
                            <span>{t.memory.veryImportant}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            {t.common.cancel}
                        </button>
                        <button type="submit" className="btn-primary flex-1">
                            {t.memory.saveMemory}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
