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
    age: number | null  // NEW: age for pronoun logic
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
    const [fetchError, setFetchError] = useState<{ code: number; message: string } | null>(null)
    const [isEditModalOpen, setIsEditModalOpen] = useState(false)
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [siliconPresets, setSiliconPresets] = useState<any[]>([])
    const [googlePresets, setGooglePresets] = useState<any[]>([])
    const [moonshotPresets, setMoonshotPresets] = useState<any[]>([])
    const [openrouterPresets, setOpenrouterPresets] = useState<any[]>([])

    useEffect(() => {
        loadCharacter()
    }, [id])

    const loadCharacter = async () => {
        // 1. RESET STATE AT START
        setIsLoading(true)
        setFetchError(null)

        try {
            const [charRes, presetsRes, googlePresetsRes, moonshotPresetsRes, openrouterPresetsRes] = await Promise.all([
                authFetch(`/api/characters/${id}`),
                authFetch('/api/config/presets'),
                authFetch('/api/google-presets'),
                authFetch('/api/moonshot-presets'),
                authFetch('/api/openrouter-presets')
            ])

            // 2. CHECK HTTP ERRORS IMMEDIATELY
            if (!charRes.ok) {
                console.error(`[CharacterPage] Character fetch failed: ${charRes.status}`)
                setFetchError({
                    code: charRes.status,
                    message: charRes.status === 403
                        ? 'Bạn không có quyền truy cập nhân vật này.'
                        : charRes.status === 404
                            ? 'Không tìm thấy nhân vật này.'
                            : `Lỗi server: ${charRes.status}`
                })
                return
            }

            // 3. PARSE DATA
            const charData = await charRes.json()
            const presetsData = await presetsRes.json()
            const googlePresetsData = await googlePresetsRes.json()
            const moonshotPresetsData = await moonshotPresetsRes.json()

            // 4. CHECK FOR EMPTY DATA
            if (!charData.character) {
                setFetchError({
                    code: 404,
                    message: 'Không tìm thấy dữ liệu nhân vật.'
                })
                return
            }

            // 5. SUCCESS
            setCharacter(charData.character)
            setFetchError(null)

            if (presetsData.presets) {
                setSiliconPresets(presetsData.presets)
            }
            if (googlePresetsData.presets) {
                setGooglePresets(googlePresetsData.presets)
            }
            if (moonshotPresetsData.presets) {
                setMoonshotPresets(moonshotPresetsData.presets)
            }
            const openrouterPresetsData = await openrouterPresetsRes.json()
            if (openrouterPresetsData.presets) {
                setOpenrouterPresets(openrouterPresetsData.presets)
            }
        } catch (error) {
            // 6. CATCH NETWORK ERRORS
            console.error('[CharacterPage] Error loading data:', error)
            setFetchError({
                code: 500,
                message: 'Không thể tải dữ liệu. Vui lòng thử lại.'
            })
        } finally {
            // 7. ALWAYS STOP LOADING
            setIsLoading(false)
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

    // RENDER PRIORITY 1: ERROR STATE
    if (fetchError) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
                <div className="glass rounded-2xl p-8 max-w-md text-center">
                    <div className="text-5xl mb-4">
                        {fetchError.code === 403 ? '🔒' : fetchError.code === 404 ? '😔' : '⚠️'}
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">
                        {fetchError.code === 403 ? 'Không có quyền truy cập' : 'Không tìm thấy'}
                    </h2>
                    <p className="text-secondary mb-6">
                        {fetchError.message}
                    </p>
                    <button
                        onClick={() => router.push('/characters')}
                        className="btn-primary px-6 py-3 rounded-xl font-medium"
                    >
                        ← Quay về trang chủ
                    </button>
                </div>
            </div>
        )
    }

    // RENDER PRIORITY 2: LOADING STATE (only when no error)
    if (isLoading || !character) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-secondary">Đang tải...</div>
            </div>
        )
    }

    // RENDER PRIORITY 3: NORMAL CONTENT

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
                                <p className="text-sm sm:text-base text-secondary break-words">{character.shortDescription}</p>
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
                                    <span className="text-secondary">Relationship:</span>{' '}
                                    <span className="text-primary font-medium truncate">
                                        {character.relationshipConfig?.status || 'Not set'}
                                    </span>
                                </div>
                                {/* NEW: Age display */}
                                <div>
                                    <span className="text-secondary">Age:</span>{' '}
                                    <span className="text-white font-medium">
                                        {character.age ?? <span className="text-gray-500 italic">Not set</span>}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-secondary">Messages:</span>{' '}
                                    <span className="text-white font-medium">{character._count.messages}</span>
                                </div>
                                <div>
                                    <span className="text-secondary">Memories:</span>{' '}
                                    <span className="text-white font-medium">{character._count.memories}</span>
                                </div>
                                {character.modelName && (
                                    <div className="col-span-2 sm:col-span-1 truncate min-w-0">
                                        <span className="text-secondary">Model:</span>{' '}
                                        <span className="text-primary font-mono text-xs truncate">{character.modelName}</span>
                                    </div>
                                )}
                                {character.provider && character.provider !== 'default' && (
                                    <div>
                                        <span className="text-secondary">Provider:</span>{' '}
                                        <span className="text-primary font-mono text-xs uppercase">{character.provider}</span>
                                    </div>
                                )}
                            </div>

                            {/* Persona Preview */}
                            <div className="glass p-4 rounded-lg">
                                <h3 className="text-sm font-semibold text-primary mb-2">Persona</h3>
                                <p className="text-sm text-secondary line-clamp-6 whitespace-pre-wrap">
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
                    age: character.age,  // NEW: pass age to edit modal
                    shortDescription: character.shortDescription,
                    persona: character.persona,
                    speakingStyle: character.speakingStyle,
                    boundaries: character.boundaries,
                    tags: character.tags,
                    modelName: character.modelName || '',
                    provider: character.provider || 'default',
                }}
                siliconPresets={siliconPresets}
                googlePresets={googlePresets}
                moonshotPresets={moonshotPresets}
                openrouterPresets={openrouterPresets}
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
                    age: character.age,  // NEW: copy age when duplicating
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
                googlePresets={googlePresets}
                moonshotPresets={moonshotPresets}
                openrouterPresets={openrouterPresets}
            />
        </>
    )
}
