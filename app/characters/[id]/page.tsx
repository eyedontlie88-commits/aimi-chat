'use client'

import { use, useState, useEffect } from 'react'
import { useRouter, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSiliconPresets } from '@/lib/llm/silicon-presets'
import Image from 'next/image'
import CharacterFormModal from '@/components/CharacterFormModal'
import { authFetch } from '@/lib/firebase/auth-fetch'
import BackButton from '@/components/BackButton'

interface Character {
    id: string
    name: string
    avatarUrl: string
    gender: string
    shortDescription: string
    persona: string
    speakingStyle: string
    boundaries: string
    tags: string
    modelName?: string
    provider?: string
    _count: {
        messages: number
        memories: number
    }
    relationshipConfig?: {
        status: string
    }
}

export default function CharacterPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params Promise (Next.js 16 requirement)
    const { id } = use(params)

    const router = useRouter()
    const [character, setCharacter] = useState<Character | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [siliconPresets, setSiliconPresets] = useState<any[]>([])

    useEffect(() => {
        loadCharacter()
    }, [id])

    const loadCharacter = async () => {
        try {
            const [charRes, presetsRes] = await Promise.all([
                authFetch(`/api/characters/${id}`),
                authFetch('/api/config/presets')
            ])

            const charData = await charRes.json()
            const presetsData = await presetsRes.json()

            setCharacter(charData.character)
            if (presetsData.presets) {
                setSiliconPresets(presetsData.presets)
            }
        } catch (error) {
            console.error('Error loading data:', error)
        }
    }

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete ${character?.name}? This will also delete all messages and memories.`)) {
            return
        }

        setIsDeleting(true)
        try {
            await authFetch(`/api/characters/${id}`, { method: 'DELETE' })
            router.push('/characters')
            router.refresh()
        } catch (error) {
            console.error('Error deleting character:', error)
            alert('Failed to delete character')
            setIsDeleting(false)
        }
    }

    if (!character) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        )
    }

    const tagList = character.tags.split(',').map((t) => t.trim()).filter(Boolean)

    return (
        <>
            <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 min-w-0">
                {/* Back Button */}
                <div className="mb-4">
                    <BackButton fallbackUrl="/characters" />
                </div>

                <div className="card overflow-hidden min-w-0">
                    <div className="flex flex-col md:flex-row gap-4 sm:gap-8 min-w-0">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                            <div className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-full overflow-hidden ring-4 ring-primary/50 mx-auto md:mx-0">
                                <Image
                                    src={character.avatarUrl}
                                    alt={character.name}
                                    fill
                                    className="object-cover"
                                    unoptimized
                                />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 space-y-3 sm:space-y-4 min-w-0 overflow-hidden">
                            <div className="min-w-0">
                                <h1 className="text-xl sm:text-3xl font-bold gradient-text mb-1 sm:mb-2 truncate">{character.name}</h1>
                                <p className="text-sm sm:text-base text-gray-300 break-words">{character.shortDescription}</p>
                            </div>

                            {/* Tags */}
                            {tagList.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {tagList.map((tag) => (
                                        <span
                                            key={tag}
                                            className="px-3 py-1 text-sm rounded-full bg-primary/20 text-primary border border-primary/30"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Stats */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
                                <div className="min-w-0">
                                    <span className="text-gray-400">Relationship:</span>{' '}
                                    <span className="text-primary font-medium truncate">
                                        {character.relationshipConfig?.status || 'Not set'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Messages:</span>{' '}
                                    <span className="text-white font-medium">{character._count.messages}</span>
                                </div>
                                <div>
                                    <span className="text-gray-400">Memories:</span>{' '}
                                    <span className="text-white font-medium">{character._count.memories}</span>
                                </div>
                                {character.modelName && (
                                    <div className="col-span-2 sm:col-span-1 truncate min-w-0">
                                        <span className="text-gray-400">Model:</span>{' '}
                                        <span className="text-primary font-mono text-xs truncate">{character.modelName}</span>
                                    </div>
                                )}
                                {character.provider && character.provider !== 'default' && (
                                    <div>
                                        <span className="text-gray-400">Provider:</span>{' '}
                                        <span className="text-primary font-mono text-xs uppercase">{character.provider}</span>
                                    </div>
                                )}
                            </div>

                            {/* Persona Preview */}
                            <div className="glass p-4 rounded-lg">
                                <h3 className="text-sm font-semibold text-primary mb-2">Persona</h3>
                                <p className="text-sm text-gray-300 line-clamp-6 whitespace-pre-wrap">
                                    {character.persona}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                                <Link
                                    href={`/chat/${character.id}`}
                                    className="btn-primary col-span-2 sm:flex-1 flex items-center justify-center text-sm"
                                >
                                    💬 Start Chat
                                </Link>
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="btn-secondary text-sm"
                                >
                                    ✏️ Edit
                                </button>
                                <button
                                    onClick={() => setIsDuplicateModalOpen(true)}
                                    className="btn-secondary text-sm"
                                >
                                    📋 Duplicate
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                    className="btn-secondary text-red-400 hover:text-red-300 disabled:opacity-50 col-span-2 sm:col-span-1 text-sm"
                                >
                                    🗑️ {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            <CharacterFormModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false)
                    loadCharacter()
                }}
                mode="edit"
                characterId={character.id}
                initialData={{
                    name: character.name,
                    avatarUrl: character.avatarUrl,
                    gender: character.gender,
                    shortDescription: character.shortDescription,
                    persona: character.persona,
                    speakingStyle: character.speakingStyle,
                    boundaries: character.boundaries,
                    tags: character.tags,
                    modelName: character.modelName || '',
                    provider: character.provider || 'default',
                }}
                siliconPresets={siliconPresets}
            />

            {/* Duplicate Modal */}
            <CharacterFormModal
                isOpen={isDuplicateModalOpen}
                onClose={() => {
                    setIsDuplicateModalOpen(false)
                }}
                mode="duplicate"
                initialData={{
                    name: `${character.name} (Copy)`,
                    avatarUrl: character.avatarUrl,
                    gender: character.gender,
                    shortDescription: character.shortDescription,
                    persona: character.persona,
                    speakingStyle: character.speakingStyle,
                    boundaries: character.boundaries,
                    tags: character.tags,
                    modelName: character.modelName || '',
                    provider: character.provider || 'default',
                    relationshipStatus: 'crush',
                }}
                siliconPresets={siliconPresets}
            />
        </>
    )
}
