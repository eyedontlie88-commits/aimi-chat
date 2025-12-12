'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { SiliconPresetModel } from '@/lib/llm/silicon-presets'

interface CharacterFormData {
    name: string
    avatarUrl: string
    gender: string
    shortDescription: string
    persona: string
    speakingStyle: string
    boundaries: string
    tags: string
    provider?: string
    modelName?: string
    relationshipStatus?: string
}

interface CharacterFormModalProps {
    isOpen: boolean
    onClose: () => void
    initialData?: CharacterFormData
    characterId?: string
    mode: 'create' | 'edit' | 'duplicate'
    siliconPresets?: SiliconPresetModel[]
}

const DEFAULT_AVATARS = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Felix',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Princess',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Midnight',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=Angel',
]

export default function CharacterFormModal({
    isOpen,
    onClose,
    initialData,
    characterId,
    mode,
    siliconPresets = [],
}: CharacterFormModalProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [formData, setFormData] = useState<CharacterFormData>(
        initialData || {
            name: '',
            avatarUrl: DEFAULT_AVATARS[0],
            gender: 'female',
            shortDescription: '',
            persona: '',
            speakingStyle: '',
            boundaries: '',
            tags: '',
            provider: 'default',
            modelName: '',
            relationshipStatus: 'đang hẹn hò',
        }
    )

    // Determine initial preset state
    const initialIsPreset = () => {
        const currentModel = initialData?.modelName || ''
        const currentProvider = initialData?.provider || 'default'

        if (currentProvider !== 'silicon') return true // Default view state

        // If silicon and model matches a preset (or empty/default), use preset mode
        if (!currentModel || currentModel === 'default') return true
        return siliconPresets.some(p => p.id === currentModel)
    }

    const [usePresetModel, setUsePresetModel] = useState<boolean>(initialIsPreset())
    const [selectedPresetId, setSelectedPresetId] = useState<string>(
        (initialData?.provider === 'silicon' && initialData?.modelName && siliconPresets.some(p => p.id === initialData.modelName))
            ? initialData.modelName
            : ''
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (mode === 'create' || mode === 'duplicate') {
                // Create new character
                const res = await fetch('/api/characters', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                })

                const data = await res.json()

                if (!res.ok) {
                    if (data.error === 'MAX_CHARACTERS_REACHED') {
                        alert('Bạn đã đạt giới hạn 10 nhân vật. Xoá bớt nhân vật cũ nếu muốn tạo mới.')
                        return
                    }
                    throw new Error(data.message || 'Failed to create character')
                }

                router.push(`/characters/${data.character.id}`)
                router.refresh()
            } else if (mode === 'edit' && characterId) {
                // Update existing character
                const res = await fetch(`/api/characters/${characterId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                })

                if (!res.ok) throw new Error('Failed to update character')

                router.refresh()
                onClose()
            }
        } catch (error: any) {
            console.error('Error saving character:', error)
            alert(`Không lưu được nhân vật: ${error?.message || 'Vui lòng thử lại.'}`)
        } finally {
            setIsLoading(false)
        }
    }

    const updateField = (field: keyof CharacterFormData, value: string) => {
        const newFormData = { ...formData, [field]: value }
        setFormData(newFormData)

        // Reset/Update preset state when provider changes
        if (field === 'provider') {
            if (value === 'silicon') {
                // If switching to silicon, check if current model is a preset
                const isPreset = !newFormData.modelName || newFormData.modelName === 'default' || siliconPresets.some(p => p.id === newFormData.modelName)
                setUsePresetModel(isPreset)
                if (isPreset) {
                    setSelectedPresetId(
                        siliconPresets.some(p => p.id === newFormData.modelName)
                            ? newFormData.modelName || ''
                            : ''
                    )
                }
            }
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="min-h-screen px-4 py-8 flex items-center justify-center">
                <div className="card max-w-3xl w-full animate-slide-up">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold gradient-text">
                            {mode === 'create' ? '✨ Tạo Nhân Vật Mới' : mode === 'duplicate' ? '📋 Nhân bản Nhân Vật' : '✏️ Chỉnh sửa Nhân Vật'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors text-3xl leading-none"
                        >
                            ×
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Tên nhân vật *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className="input-field"
                                    required
                                    placeholder="Ví dụ: Minh Anh, Tuấn Kiệt..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Giới tính *</label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => updateField('gender', e.target.value)}
                                    className="input-field"
                                    required
                                >
                                    <option value="female">Nữ</option>
                                    <option value="male">Nam</option>
                                    <option value="non-binary">Phi nhị nguyên</option>
                                </select>
                            </div>
                        </div>

                        {/* Avatar */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Avatar</label>
                            <div className="flex gap-3 mb-2">
                                {DEFAULT_AVATARS.map((url) => (
                                    <button
                                        key={url}
                                        type="button"
                                        onClick={() => updateField('avatarUrl', url)}
                                        className={`w-16 h-16 rounded-full overflow-hidden ring-2 transition-all ${formData.avatarUrl === url ? 'ring-primary' : 'ring-gray-600 hover:ring-primary/50'
                                            }`}
                                    >
                                        <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={formData.avatarUrl}
                                onChange={(e) => updateField('avatarUrl', e.target.value)}
                                className="input-field text-sm"
                                placeholder="Hoặc dán URL hình ảnh tùy chỉnh"
                            />
                        </div>

                        {/* Short Description */}
                        <div>
                            <label className="block text-sm font-medium mb-2">Mô tả ngắn *</label>
                            <input
                                type="text"
                                value={formData.shortDescription}
                                onChange={(e) => updateField('shortDescription', e.target.value)}
                                className="input-field"
                                required
                                placeholder="Một dòng mô tả hiển thị trên thẻ nhân vật"
                                maxLength={100}
                            />
                        </div>

                        {/* Persona */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Nhân dạng (Persona) * <span className="text-xs text-gray-400">(Họ là ai, nền tảng, tính cách)</span>
                            </label>
                            <textarea
                                value={formData.persona}
                                onChange={(e) => updateField('persona', e.target.value)}
                                className="input-field min-h-[150px] resize-none"
                                required
                                placeholder="Ví dụ: Cách hai người gặp nhau, nghề nghiệp, tính cách chi tiết, điểm yếu, cách thể hiện tình cảm... Càng cụ thể, AI càng giống người thật."
                            />
                        </div>

                        {/* Speaking Style */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Phong cách nói chuyện * <span className="text-xs text-gray-400">(Cách họ nói, emoji, giọng điệu)</span>
                            </label>
                            <textarea
                                value={formData.speakingStyle}
                                onChange={(e) => updateField('speakingStyle', e.target.value)}
                                className="input-field min-h-[100px] resize-none"
                                required
                                placeholder="Ví dụ: Xưng hô anh/em, giọng trêu ghẹo hay dịu dàng, hay dùng emoji gì, nói câu ngắn hay dài, có hay cà khịa không..."
                            />
                        </div>

                        {/* Boundaries */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Ranh giới (Boundaries) * <span className="text-xs text-gray-400">(Những điều cần tránh)</span>
                            </label>
                            <textarea
                                value={formData.boundaries}
                                onChange={(e) => updateField('boundaries', e.target.value)}
                                className="input-field min-h-[80px] resize-none"
                                required
                                placeholder="Những điều nhân vật sẽ KHÔNG làm hoặc không nói đến (ví dụ: không chửi thề nặng, không nhắc chuyện công việc, không nói về chủ đề nhạy cảm...)."
                            />
                        </div>

                        {/* Tags and Relationship */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    Tags <span className="text-xs text-gray-400">(phân cách bằng dấu phẩy)</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={(e) => updateField('tags', e.target.value)}
                                    className="input-field"
                                    placeholder="Ví dụ: dịu dàng, quan tâm, tsundere"
                                />
                            </div>

                            {(mode === 'create' || mode === 'duplicate') && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">Mối quan hệ ban đầu</label>
                                    <select
                                        value={formData.relationshipStatus}
                                        onChange={(e) => updateField('relationshipStatus', e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="crush">Đang thích</option>
                                        <option value="đang hẹn hò">Đang hẹn hò</option>
                                        <option value="yêu nhau">Yêu nhau</option>
                                        <option value="đính hôn">Đính hôn</option>
                                        <option value="kết hôn">Kết hôn</option>
                                        <option value="ở chung">Ở chung</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Provider Selection */}
                        <div className="pt-4 border-t border-white/10">
                            <label className="block text-sm font-medium mb-2">
                                AI Provider
                            </label>
                            <select
                                value={formData.provider || 'default'}
                                onChange={(e) => updateField('provider', e.target.value)}
                                className="input-field mb-4"
                            >
                                <option value="default">Mặc định (theo hệ thống)</option>
                                <option value="silicon">SiliconFlow</option>
                                <option value="gemini">Gemini (Google AI)</option>
                            </select>
                        </div>

                        {/* Model Selection */}
                        <div className="pt-4 border-t border-white/10">
                            <label className="block text-sm font-medium mb-2">
                                AI Model <span className="text-xs text-gray-400">(Tùy chọn - nâng cao)</span>
                            </label>

                            {formData.provider === 'silicon' ? (
                                <div className="space-y-3">
                                    <div className="flex gap-4 text-sm">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={usePresetModel}
                                                onChange={() => {
                                                    setUsePresetModel(true)
                                                }}
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
                                            className="input-field mb-1"
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
                                            value={formData.modelName || ''}
                                            onChange={(e) => updateField('modelName', e.target.value)}
                                            className="input-field mb-1"
                                            placeholder="Ví dụ: deepseek-ai/DeepSeek-V3"
                                        />
                                    )}
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.modelName || ''}
                                    onChange={(e) => updateField('modelName', e.target.value)}
                                    className="input-field mb-1"
                                    placeholder="mặc định (dùng cài đặt hệ thống)"
                                />
                            )}

                            <p className="text-xs text-gray-400 mt-2">
                                {formData.provider === 'silicon' && usePresetModel
                                    ? "Chọn từ các model SiliconFlow đã cấu hình."
                                    : "Nhập model ID cụ thể hoặc để trống để dùng mặc định."}
                                <br />
                                <span className="text-primary">
                                    Lưu ý: Nhân vật sẽ giữ ký ức và mối quan hệ, nhưng giọng điệu có thể thay đổi nhẹ nếu đổi model.
                                </span>
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-white/10">
                            <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={isLoading}>
                                Hủy
                            </button>
                            <button type="submit" className="btn-primary flex-1" disabled={isLoading}>
                                {isLoading ? 'Đang lưu...' : mode === 'create' ? 'Tạo nhân vật' : mode === 'duplicate' ? 'Tạo bản sao' : 'Lưu thay đổi'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
