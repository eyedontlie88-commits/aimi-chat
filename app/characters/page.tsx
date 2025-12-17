'use client'

import { useState, useEffect } from 'react'
import CharacterCard from '@/components/CharacterCard'
import CharacterFormModal from '@/components/CharacterFormModal'
import { authFetch } from '@/lib/firebase/auth-fetch'
import type { SiliconPresetModel } from '@/lib/llm/silicon-presets'

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

    const characterCount = characters.length
    const hasReachedLimit = characterCount >= MAX_CHARACTERS

    useEffect(() => {
        loadCharacters()
        loadSiliconPresets()
    }, [])

    const loadCharacters = async () => {
        try {
            const res = await authFetch('/api/characters')
            const data = await res.json()
            setCharacters(data.characters || [])
        } catch (error) {
            console.error('Error loading characters:', error)
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

    return (
        <>
            <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 overflow-hidden">
                {/* Header */}
                <div className="text-center mb-6 sm:mb-12">
                    <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold mb-2 sm:mb-4">
                        <span className="gradient-text">Nhân Vật Của Bạn</span>
                    </h1>
                    <p className="text-sm sm:text-lg text-gray-300 max-w-2xl mx-auto mb-4 sm:mb-6 px-2">
                        Tạo và tùy chỉnh người yêu AI của riêng bạn. Mỗi nhân vật đều có tính cách, cách nói chuyện và ranh giới độc đáo.
                    </p>
                </div>

                {isLoading ? (
                    <div className="text-center py-20 text-gray-400">
                        <div className="animate-pulse">Đang tải...</div>
                    </div>
                ) : characters.length === 0 ? (
                    /* Empty State */
                    <div className="max-w-lg mx-auto text-center py-16">
                        <div className="card glass p-8">
                            <div className="text-6xl mb-4">🥺</div>
                            <h2 className="text-2xl font-bold text-white mb-4">Bạn chưa có nhân vật nào</h2>
                            <p className="text-gray-300 mb-6">
                                Bắt đầu bằng cách tạo người yêu AI đầu tiên của bạn.
                                Hãy mô tả tính cách, cách nói chuyện và ranh giới để AI hiểu đúng con người đó.
                            </p>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-3"
                            >
                                ✨ Tạo nhân vật mới
                            </button>
                            <p className="text-xs text-gray-500 mt-6">
                                Bạn có thể tạo tối đa {MAX_CHARACTERS} nhân vật.
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Has Characters */
                    <>
                        {/* Counter Bar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 sm:mb-8 glass rounded-lg px-4 sm:px-6 py-3 sm:py-4">
                            <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                                <span className="text-gray-500 text-xs sm:text-sm">
                                    Nhân vật của bạn: <span className="font-medium">{characterCount} / {MAX_CHARACTERS}</span>
                                </span>
                                {hasReachedLimit && (
                                    <span className="text-xs text-yellow-400">
                                        Đã đạt giới hạn
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setIsCreateModalOpen(true)}
                                disabled={hasReachedLimit}
                                className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                title={hasReachedLimit ? 'Xoá bớt hoặc chỉnh sửa nhân vật cũ nếu muốn thay đổi.' : 'Tạo nhân vật mới'}
                            >
                                ✨ Tạo nhân vật mới
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
                                />
                            ))}
                        </div>

                        {/* Limit Info */}
                        {hasReachedLimit && (
                            <div className="text-center mt-8 text-sm text-gray-400">
                                <p>Giới hạn này chỉ áp dụng cho bản cá nhân. Sau này mở rộng, chúng ta sẽ nâng giới hạn lên.</p>
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
            />
        </>
    )
}
