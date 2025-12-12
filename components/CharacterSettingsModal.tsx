'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SiliconPresetModel } from '@/lib/llm/silicon-presets'

interface CharacterData {
    id: string
    name: string
    avatarUrl: string
    gender: string
    shortDescription: string
    persona: string
    speakingStyle: string
    boundaries: string
    tags: string
    provider?: string | null
    modelName?: string | null
    relationshipConfig?: {
        specialNotes?: string | null
        stage?: string | null
    } | null
}

interface CharacterSettingsModalProps {
    isOpen: boolean
    onClose: () => void
    character: CharacterData
    siliconPresets?: SiliconPresetModel[]
    onUpdated: () => void
}

export default function CharacterSettingsModal({
    isOpen,
    onClose,
    character,
    siliconPresets = [],
    onUpdated,
}: CharacterSettingsModalProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const [formData, setFormData] = useState({
        name: character.name || '',
        avatarUrl: character.avatarUrl || '',
        gender: character.gender || 'female',
        shortDescription: character.shortDescription || '',
        persona: character.persona || '',
        speakingStyle: character.speakingStyle || '',
        boundaries: character.boundaries || '',
        tags: character.tags || '',
        provider: character.provider || 'default',
        modelName: character.modelName || '',
        meetingContext: character.relationshipConfig?.specialNotes || '',
    })

    // Determine initial preset state
    const initialIsPreset = () => {
        if (formData.provider !== 'silicon') return true
        if (!formData.modelName || formData.modelName === 'default') return true
        return siliconPresets.some(p => p.id === formData.modelName)
    }

    const [usePresetModel, setUsePresetModel] = useState<boolean>(initialIsPreset())
    const [selectedPresetId, setSelectedPresetId] = useState<string>(
        formData.provider === 'silicon' && siliconPresets.some(p => p.id === formData.modelName)
            ? formData.modelName
            : ''
    )

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))

        // Reset model state when provider changes
        if (field === 'provider') {
            if (value === 'silicon') {
                setUsePresetModel(true)
                setSelectedPresetId('')
                setFormData(prev => ({ ...prev, modelName: '' }))
            } else {
                setFormData(prev => ({ ...prev, modelName: '' }))
            }
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const res = await fetch(`/api/characters/${character.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.error || 'Failed to update character')
            }

            onUpdated()
            onClose()
        } catch (error: any) {
            console.error('Error updating character:', error)
            alert('Không thể cập nhật nhân vật: ' + error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        setIsDeleting(true)

        try {
            const res = await fetch(`/api/characters/${character.id}`, {
                method: 'DELETE',
            })

            if (!res.ok) {
                throw new Error('Failed to delete character')
            }

            router.push('/characters')
        } catch (error: any) {
            console.error('Error deleting character:', error)
            alert('Không thể xóa nhân vật: ' + error.message)
            setIsDeleting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative glass rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold gradient-text mb-6">
                    ⚙️ Cài đặt nhân vật
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Tên nhân vật</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            className="input-field"
                            required
                        />
                    </div>

                    {/* Short Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Mô tả ngắn</label>
                        <input
                            type="text"
                            value={formData.shortDescription}
                            onChange={(e) => updateField('shortDescription', e.target.value)}
                            className="input-field"
                            placeholder="VD: Anh trai ấm áp, hay chăm sóc người khác"
                        />
                    </div>

                    {/* Meeting Context - QUAN TRỌNG cho Relationship Stage */}
                    <div className="mt-4 p-4 rounded-xl border-2 border-amber-500/50 bg-amber-500/5">
                        <label className="block text-sm font-semibold mb-2 text-amber-300">
                            📍 Bối cảnh gặp nhau <span className="text-amber-400 text-xs">(quan trọng)</span>
                        </label>
                        <textarea
                            value={formData.meetingContext}
                            onChange={(e) => updateField('meetingContext', e.target.value)}
                            className="input-field min-h-[80px] text-sm"
                            placeholder="VD: Gặp qua app hẹn hò Tinder, mới match 1 tuần / Đồng nghiệp mới vào công ty / Bạn thời đại học, mất liên lạc 5 năm..."
                        />
                        <p className="text-xs text-gray-400 mt-2">
                            💡 Thông tin này giúp AI hiểu mối quan hệ của bạn để xưng hô và cư xử phù hợp.
                            Nếu để trống, AI sẽ không biết nên gọi bạn là "người quen" hay "người lạ".
                        </p>
                    </div>

                    {/* Provider */}
                    <div className="pt-4 border-t border-white/10">
                        <label className="block text-sm font-medium mb-2">
                            AI Provider
                        </label>
                        <select
                            value={formData.provider}
                            onChange={(e) => updateField('provider', e.target.value)}
                            className="input-field"
                        >
                            <option value="default">Mặc định (theo hệ thống)</option>
                            <option value="silicon">SiliconFlow</option>
                            <option value="gemini">Gemini (Google AI)</option>
                        </select>
                    </div>

                    {/* Model Selection */}
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            AI Model
                        </label>

                        {formData.provider === 'silicon' ? (
                            <div className="space-y-3">
                                <div className="flex gap-4 text-sm">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={usePresetModel}
                                            onChange={() => setUsePresetModel(true)}
                                            className="radio-input"
                                        />
                                        <span>Model có sẵn</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            checked={!usePresetModel}
                                            onChange={() => setUsePresetModel(false)}
                                            className="radio-input"
                                        />
                                        <span>Nhập Model ID tùy chỉnh</span>
                                    </label>
                                </div>

                                {usePresetModel ? (
                                    <select
                                        value={selectedPresetId}
                                        onChange={(e) => {
                                            const newId = e.target.value
                                            setSelectedPresetId(newId)
                                            updateField('modelName', newId)
                                        }}
                                        className="input-field"
                                    >
                                        <option value="">-- Chọn model SiliconFlow --</option>

                                        {/* Nhóm đề xuất trước */}
                                        {siliconPresets.filter(p => p.recommended).map(preset => (
                                            <option key={preset.key} value={preset.id}>
                                                {preset.label}
                                            </option>
                                        ))}

                                        {/* Divider và các model khác */}
                                        {siliconPresets.some(p => !p.recommended) && (
                                            <optgroup label="── Các model khác ──">
                                                {siliconPresets.filter(p => !p.recommended).map(preset => (
                                                    <option key={preset.key} value={preset.id}>
                                                        {preset.label}
                                                    </option>
                                                ))}
                                            </optgroup>
                                        )}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        value={formData.modelName}
                                        onChange={(e) => updateField('modelName', e.target.value)}
                                        className="input-field"
                                        placeholder="Ví dụ: deepseek-ai/DeepSeek-V3"
                                    />
                                )}
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={formData.modelName}
                                onChange={(e) => updateField('modelName', e.target.value)}
                                className="input-field"
                                placeholder="mặc định (dùng cài đặt hệ thống)"
                            />
                        )}
                    </div>

                    {/* Persona (collapsed by default) */}
                    <details className="border border-white/10 rounded-lg p-3">
                        <summary className="cursor-pointer text-sm font-medium text-gray-300 hover:text-white">
                            📝 Chỉnh sửa tính cách (nâng cao)
                        </summary>
                        <div className="mt-3 space-y-3">
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Persona</label>
                                <textarea
                                    value={formData.persona}
                                    onChange={(e) => updateField('persona', e.target.value)}
                                    className="input-field min-h-[80px] text-sm"
                                    placeholder="Mô tả chi tiết tính cách, lối sống, sở thích..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Phong cách nói chuyện</label>
                                <textarea
                                    value={formData.speakingStyle}
                                    onChange={(e) => updateField('speakingStyle', e.target.value)}
                                    className="input-field min-h-[60px] text-sm"
                                    placeholder="Cách nhân vật nói chuyện: thân mật, hài hước, nhẹ nhàng..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-400 mb-1">Ranh giới</label>
                                <textarea
                                    value={formData.boundaries}
                                    onChange={(e) => updateField('boundaries', e.target.value)}
                                    className="input-field min-h-[60px] text-sm"
                                    placeholder="Những chủ đề nhân vật không nói về..."
                                />
                            </div>
                        </div>
                    </details>

                    {/* Save Button */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn-secondary flex-1"
                            disabled={isLoading}
                        >
                            Hủy
                        </button>
                        <button
                            type="submit"
                            className="btn-primary flex-1"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Đang lưu...' : '💾 Lưu thay đổi'}
                        </button>
                    </div>
                </form>

                {/* Danger Zone */}
                <div className="mt-6 pt-6 border-t border-red-500/30">
                    <h3 className="text-sm font-medium text-red-400 mb-3">⚠️ Vùng nguy hiểm</h3>

                    {!showDeleteConfirm ? (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="w-full py-2 px-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors text-sm"
                        >
                            🗑️ Xóa nhân vật vĩnh viễn
                        </button>
                    ) : (
                        <div className="space-y-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
                            <p className="text-sm text-red-300">
                                Bạn có chắc chắn muốn xóa <strong>{character.name}</strong>?
                                <br />
                                <span className="text-xs text-red-400">
                                    Tất cả tin nhắn, ký ức và dữ liệu liên quan sẽ bị xóa vĩnh viễn.
                                </span>
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="flex-1 py-2 px-3 rounded-lg bg-white/10 text-sm hover:bg-white/20"
                                    disabled={isDeleting}
                                >
                                    Không, giữ lại
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 py-2 px-3 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600"
                                    disabled={isDeleting}
                                >
                                    {isDeleting ? 'Đang xóa...' : 'Xóa vĩnh viễn'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
