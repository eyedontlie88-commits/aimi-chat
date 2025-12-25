'use client'

import { useState, useEffect } from 'react'
import CharacterCard from '@/components/CharacterCard'
import CharacterFormModal from '@/components/CharacterFormModal'
import { authFetch } from '@/lib/firebase/auth-fetch'
import { useModal } from '@/contexts/ModalContext'
import { useLanguage } from '@/lib/i18n'
import type { SiliconPresetModel } from '@/lib/llm/silicon-presets'
import type { GooglePresetModel } from '@/lib/llm/google-presets'
import type { MoonshotPresetModel } from '@/lib/llm/moonshot-presets'

const MAX_CHARACTERS = 10

interface Character {
    id: string
    name: string
    avatarUrl: string
    shortDescription: string
    tags: string
    relationshipConfig?: {
        status: string
    }
}

export default function CharactersPage() {
    const [characters, setCharacters] = useState<Character[]>([])
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [siliconPresets, setSiliconPresets] = useState<SiliconPresetModel[]>([])
    const [googlePresets, setGooglePresets] = useState<GooglePresetModel[]>([])
    const [moonshotPresets, setMoonshotPresets] = useState<MoonshotPresetModel[]>([])

    // Get user from ModalContext - data depends on this!
    const { user, loading: authLoading } = useModal()
    const { t } = useLanguage()

    const characterCount = characters.length
    const hasReachedLimit = characterCount >= MAX_CHARACTERS

    // CRITICAL: Depend on user state to clear/reload data on account switch
    useEffect(() => {
        // Clear data immediately when user is null (logged out)
        if (!user) {
            setCharacters([])
            setIsLoading(false)
            return
        }

        // User is logged in - load their data
        setIsLoading(true)
        loadCharacters()
        loadSiliconPresets()
        loadGooglePresets()
        loadMoonshotPresets()
    }, [user]) // Dependency on user ensures reload on account change

    const loadCharacters = async () => {
        try {
            const res = await authFetch('/api/characters')
            const data = await res.json()
            setCharacters(data.characters || [])
        } catch (error) {
            console.error('Error loading characters:', error)
            setCharacters([]) // Clear on error to prevent stale data
        } finally {
            setIsLoading(false)
        }
    }

    const loadSiliconPresets = async () => {
        try {
            const res = await authFetch('/api/silicon-presets')
            const data = await res.json()
            setSiliconPresets(data.presets || [])
        } catch (error) {
            console.error('Error loading silicon presets:', error)
        }
    }

    const loadGooglePresets = async () => {
        try {
            const res = await authFetch('/api/google-presets')
            const data = await res.json()
            setGooglePresets(data.presets || [])
        } catch (error) {
            console.error('Error loading google presets:', error)
        }
    }

    const loadMoonshotPresets = async () => {
        try {
            const res = await authFetch('/api/moonshot-presets')
            const data = await res.json()
            setMoonshotPresets(data.presets || [])
        } catch (error) {
            console.error('Error loading moonshot presets:', error)
        }
    }

    const handleDeleteCharacter = async (characterId: string) => {
        try {
            const res = await authFetch(`/api/characters/${characterId}`, {
                method: 'DELETE'
            })
            if (res.ok) {
                // Remove from local state immediately
                setCharacters(prev => prev.filter(c => c.id !== characterId))
            } else {
                alert(t.characters.deleteError)
            }
        } catch (error) {
            console.error('Error deleting character:', error)
            alert(t.characters.deleteErrorGeneric)
        }
    }

    return (
        <>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 overflow-hidden">
                {/* Header */}
                <div className="text-center mb-6 sm:mb-12">
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">
                        <span className="gradient-text">{t.characters.title}</span>
                    </h1>
                    <p className="text-sm sm:text-lg text-secondary max-w-2xl mx-auto mb-4 sm:mb-6 px-2">
                        {t.characters.subtitle}
                    </p>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 text-secondary">
                        <div className="animate-pulse">{t.common.loading}</div>
                    </div>
                ) : characters.length === 0 ? (
                    /* Empty State */
                    <div className="max-w-lg mx-auto text-center py-16">
                        <div className="card glass p-8">
                            <div className="text-6xl mb-4">🥺</div>
                            <h2 className="text-2xl font-bold text-white mb-4">{t.characters.noCharacters}</h2>
                            <p className="text-secondary mb-6">
                                {t.characters.createFirst}
                            </p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3"
                            >
                                {t.characters.createNew}
                            </button>
                            <p className="text-xs text-hint mt-6">
                                {t.characters.limitHint.replace('{max}', String(MAX_CHARACTERS))}
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Has Characters */
                    <>
                        {/* Counter Bar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8 glass rounded-lg px-4 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                                <span className="text-hint text-xs sm:text-sm">
                                    {t.characters.count} <span className="font-medium">{characterCount} / {MAX_CHARACTERS}</span>
                                </span>
                                {hasReachedLimit && (
                                    <span className="text-xs text-yellow-400">
                                        {t.characters.noCharacters}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                disabled={hasReachedLimit}
                                className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                title={hasReachedLimit ? t.characters.noCharacters : t.characters.createNew}
                            >
                                {t.characters.createNew}
                            </button>
                        </div>

                        {/* Character Grid - Instagram Style */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                            {characters.map((character) => (
                                <CharacterCard
                                    key={character.id}
                                    id={character.id}
                                    name={character.name}
                                    avatarUrl={character.avatarUrl}
                                    shortDescription={character.shortDescription}
                                    tags={character.tags}
                                    relationshipStatus={character.relationshipConfig?.status}
                                    onDelete={handleDeleteCharacter}
                                />
                            ))}
                        </div>

                        {/* Limit Info */}
                        {hasReachedLimit && (
                            <div className="text-center mt-8 text-sm text-secondary">
                                <p>{t.characters.limitReached}</p>
                            </div>
                        )}
                    </>
                )}
            </div>

            <CharacterFormModal
                isOpen={isCreateModalOpen}
                onClose={() => {
                    setIsCreateModalOpen(false)
                    loadCharacters()
                }}
                mode="create"
                siliconPresets={siliconPresets}
                googlePresets={googlePresets}
                moonshotPresets={moonshotPresets}
            />
        </>
    )
}
