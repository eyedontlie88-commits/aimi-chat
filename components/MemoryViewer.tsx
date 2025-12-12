'use client'

import { useState } from 'react'
import { Memory } from '@prisma/client'

interface MemoryViewerProps {
    isOpen: boolean
    onClose: () => void
    characterName: string
    memories: Memory[]
    onDelete: (id: string) => void
}

const MEMORY_TYPES = {
    fact: '📝',
    event: '🎉',
    preference: '❤️',
    anniversary: '🎂',
    promise: '🤝',
    other: '💭',
}

export default function MemoryViewer({
    isOpen,
    onClose,
    characterName,
    memories,
    onDelete,
}: MemoryViewerProps) {
    const [deletingId, setDeletingId] = useState<string | null>(null)

    const handleDelete = async (id: string) => {
        setDeletingId(id)
        await onDelete(id)
        setDeletingId(null)
    }

    if (!isOpen) return null

    const groupedMemories = memories.reduce((acc, memory) => {
        const type = memory.type as keyof typeof MEMORY_TYPES
        if (!acc[type]) acc[type] = []
        acc[type].push(memory)
        return acc
    }, {} as Record<string, Memory[]>)

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="card max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold gradient-text">
                        💭 Memories with {characterName}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                    {memories.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <p className="text-lg mb-2">No memories yet</p>
                            <p className="text-sm">
                                Save important moments from your conversations to help {characterName} remember
                            </p>
                        </div>
                    ) : (
                        Object.entries(groupedMemories).map(([type, mems]) => (
                            <div key={type}>
                                <h3 className="text-sm font-semibold text-primary-400 mb-3 flex items-center gap-2">
                                    <span>{MEMORY_TYPES[type as keyof typeof MEMORY_TYPES]}</span>
                                    <span className="uppercase">{type}s</span>
                                </h3>
                                <div className="space-y-2">
                                    {mems.map((memory) => (
                                        <div
                                            key={memory.id}
                                            className="glass p-4 rounded-lg flex items-start justify-between gap-3"
                                        >
                                            <div className="flex-1">
                                                <p className="text-sm">{memory.content}</p>
                                                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                                    <span>
                                                        Importance: {Array(memory.importanceScore).fill('⭐').join('')}
                                                    </span>
                                                    <span>
                                                        {new Date(memory.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(memory.id)}
                                                disabled={deletingId === memory.id}
                                                className="text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                                                title="Delete memory"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/10">
                    <button onClick={onClose} className="btn-secondary w-full">
                        Close
                    </button>
                </div>
            </div>
        </div>
    )
}
