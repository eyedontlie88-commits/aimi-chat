'use client'

import { useState } from 'react'

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

const MEMORY_TYPES = [
    { value: 'fact', label: '📝 Fact', description: 'Information about the user' },
    { value: 'event', label: '🎉 Event', description: 'Something that happened' },
    { value: 'preference', label: '❤️ Preference', description: 'Likes or dislikes' },
    { value: 'anniversary', label: '🎂 Anniversary', description: 'Important date' },
    { value: 'promise', label: '🤝 Promise', description: 'Commitment made' },
    { value: 'other', label: '💭 Other', description: 'Other memory' },
]

export default function CreateMemoryModal({
    isOpen,
    onClose,
    onSubmit,
    messageContent,
}: CreateMemoryModalProps) {
    const [type, setType] = useState('fact')
    const [content, setContent] = useState('')
    const [importanceScore, setImportanceScore] = useState(5)

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="card max-w-lg w-full animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold gradient-text">💾 Save as Memory</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <p className="text-sm text-gray-300 mb-4">
                    Create a memory from this conversation for the character to remember.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Memory Type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {MEMORY_TYPES.map((memType) => (
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
                        <label className="block text-sm font-medium mb-2">Memory Content</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="What should the character remember? (e.g., 'User loves rainy days')"
                            className="input-field min-h-[100px] resize-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Importance: {importanceScore}/10
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
                            <span>Minor</span>
                            <span>Very Important</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary flex-1">
                            Save Memory
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
