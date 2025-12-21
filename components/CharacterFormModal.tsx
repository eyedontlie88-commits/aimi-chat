'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { authFetch } from '@/lib/firebase/auth-fetch'
import { uploadAvatar } from '@/lib/supabase/storage'
import { useLanguage } from '@/lib/i18n'
import type { SiliconPresetModel } from '@/lib/llm/silicon-presets'
import type { GooglePresetModel } from '@/lib/llm/google-presets'

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
    googlePresets?: GooglePresetModel[]
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
    googlePresets = [],
}: CharacterFormModalProps) {
    const router = useRouter()
    const { t } = useLanguage()  // i18n hook - ready for use in Step 2
    const [isLoading, setIsLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
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

    // Handle avatar file upload
    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert(t.characterForm.pleaseSelectImage)
            return
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            alert(t.characterForm.maxFileSize)
            return
        }

        setIsUploading(true)
        try {
            // Use characterId if editing, or 'new' for new character
            const uploadId = characterId || 'new-' + Date.now()
            const publicUrl = await uploadAvatar(file, uploadId)

            if (publicUrl) {
                updateField('avatarUrl', publicUrl)
            } else {
                alert(t.characterForm.uploadFailed)
            }
        } catch (error) {
            console.error('Avatar upload error:', error)
            alert(t.characterForm.uploadError)
        } finally {
            setIsUploading(false)
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = ''
            }
        }
    }

    // Determine initial preset state
    const initialIsPreset = () => {
        const currentModel = initialData?.modelName || ''
        const currentProvider = initialData?.provider || 'default'

        if (currentProvider === 'silicon') {
            if (!currentModel || currentModel === 'default') return true
            return siliconPresets.some(p => p.id === currentModel)
        }
        if (currentProvider === 'gemini') {
            if (!currentModel || currentModel === 'default') return true
            return googlePresets.some(p => p.id === currentModel)
        }
        return true // Default view state
    }

    const [usePresetModel, setUsePresetModel] = useState<boolean>(initialIsPreset())
    const [selectedPresetId, setSelectedPresetId] = useState<string>(
        (initialData?.provider === 'silicon' && initialData?.modelName && siliconPresets.some(p => p.id === initialData.modelName))
            ? initialData.modelName
            : ''
    )
    const [selectedGooglePresetId, setSelectedGooglePresetId] = useState<string>(
        (initialData?.provider === 'gemini' && initialData?.modelName && googlePresets.some(p => p.id === initialData.modelName))
            ? initialData.modelName
            : ''
    )

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            if (mode === 'create' || mode === 'duplicate') {
                // Create new character
                const res = await authFetch('/api/characters', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData),
                })

                const data = await res.json()

                if (!res.ok) {
                    if (data.error === 'MAX_CHARACTERS_REACHED') {
                        alert(t.characterForm.maxCharactersReached)
                        return
                    }
                    throw new Error(data.message || 'Failed to create character')
                }

                router.push(`/characters/${data.character.id}`)
                router.refresh()
            } else if (mode === 'edit' && characterId) {
                // Update existing character
                const res = await authFetch(`/api/characters/${characterId}`, {
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
            alert(`${t.characterForm.saveError}: ${error?.message || ''}`)
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
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="card max-w-3xl w-full max-h-[90vh] flex flex-col animate-slide-up">
                    {/* Sticky Header */}
                    <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
                        <h2 className="text-xl sm:text-2xl font-bold gradient-text">
                            {mode === 'create' ? t.characterForm.createTitle : mode === 'duplicate' ? t.characterForm.duplicateTitle : t.characterForm.editTitle}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors text-3xl leading-none"
                        >
                            ×
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <form id="character-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-5 min-h-0">
                        {/* Avatar Section - FIRST for visibility */}
                        <div className="bg-white/5 rounded-xl p-4">
                            <label className="block text-sm font-semibold mb-3">🖼️ Avatar</label>

                            {/* Avatar Preview + Upload */}
                            <div className="flex flex-col sm:flex-row gap-4 items-center">
                                {/* Preview */}
                                <div className="w-24 h-24 rounded-full overflow-hidden ring-2 ring-primary bg-gray-800 shrink-0">
                                    <img
                                        src={formData.avatarUrl}
                                        alt="Avatar preview"
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_AVATARS[0] }}
                                    />
                                </div>

                                <div className="flex-1 space-y-3 w-full">
                                    {/* Preset avatars */}
                                    <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
                                        {DEFAULT_AVATARS.map((url) => (
                                            <button
                                                key={url}
                                                type="button"
                                                onClick={() => updateField('avatarUrl', url)}
                                                className={`w-10 h-10 rounded-full overflow-hidden ring-2 transition-all ${formData.avatarUrl === url ? 'ring-primary scale-110' : 'ring-gray-600 hover:ring-primary/50'
                                                    }`}
                                            >
                                                <img src={url} alt="Avatar" className="w-full h-full object-cover" />
                                            </button>
                                        ))}
                                    </div>

                                    {/* Upload + URL input */}
                                    <div className="flex gap-2">
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept="image/*"
                                            onChange={handleAvatarUpload}
                                            className="hidden"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isUploading}
                                            className="px-3 py-2 text-sm rounded-lg border border-dashed border-gray-500 hover:border-primary hover:bg-primary/10 transition-colors disabled:opacity-50 shrink-0"
                                        >
                                            {isUploading ? '⏳' : '📷'} Upload
                                        </button>
                                        <input
                                            type="text"
                                            value={formData.avatarUrl}
                                            onChange={(e) => updateField('avatarUrl', e.target.value)}
                                            className="input-field text-sm flex-1 min-w-0"
                                            placeholder={t.characterForm.avatarUrlPlaceholder}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">{t.characterForm.name} *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => updateField('name', e.target.value)}
                                    className="input-field"
                                    required
                                    placeholder={t.characterForm.namePlaceholder}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">{t.characterForm.gender} *</label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => updateField('gender', e.target.value)}
                                    className="input-field"
                                    required
                                >
                                    <option value="female">{t.characterForm.genderFemale}</option>
                                    <option value="male">{t.characterForm.genderMale}</option>
                                    <option value="non-binary">{t.characterForm.genderNonBinary}</option>
                                </select>
                            </div>
                        </div>

                        {/* Short Description */}
                        <div>
                            <label className="block text-sm font-medium mb-2">{t.characterForm.shortDesc} *</label>
                            <input
                                type="text"
                                value={formData.shortDescription}
                                onChange={(e) => updateField('shortDescription', e.target.value)}
                                className="input-field"
                                required
                                placeholder={t.characterForm.shortDescPlaceholder}
                                maxLength={100}
                            />
                        </div>

                        {/* Persona */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {t.characterForm.persona} * <span className="text-xs text-gray-400">{t.characterForm.personaHelper}</span>
                            </label>
                            <textarea
                                value={formData.persona}
                                onChange={(e) => updateField('persona', e.target.value)}
                                className="input-field min-h-[150px] resize-none"
                                required
                                placeholder={t.characterForm.personaPlaceholder}
                            />
                        </div>

                        {/* Speaking Style */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {t.characterForm.speakingStyle} * <span className="text-xs text-gray-400">{t.characterForm.speakingStyleHelper}</span>
                            </label>
                            <textarea
                                value={formData.speakingStyle}
                                onChange={(e) => updateField('speakingStyle', e.target.value)}
                                className="input-field min-h-[100px] resize-none"
                                required
                                placeholder={t.characterForm.speakingStylePlaceholder}
                            />
                        </div>

                        {/* Boundaries */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {t.characterForm.boundaries} * <span className="text-xs text-gray-400">{t.characterForm.boundariesHelper}</span>
                            </label>
                            <textarea
                                value={formData.boundaries}
                                onChange={(e) => updateField('boundaries', e.target.value)}
                                className="input-field min-h-[80px] resize-none"
                                required
                                placeholder={t.characterForm.boundariesPlaceholder}
                            />
                        </div>

                        {/* Tags and Relationship */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    {t.characterForm.tags} <span className="text-xs text-gray-400">{t.characterForm.tagsHelper}</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.tags}
                                    onChange={(e) => updateField('tags', e.target.value)}
                                    className="input-field"
                                    placeholder={t.characterForm.tagsPlaceholder}
                                />
                            </div>

                            {(mode === 'create' || mode === 'duplicate') && (
                                <div>
                                    <label className="block text-sm font-medium mb-2">{t.characterForm.initialRelationship}</label>
                                    <select
                                        value={formData.relationshipStatus}
                                        onChange={(e) => updateField('relationshipStatus', e.target.value)}
                                        className="input-field"
                                    >
                                        <option value="crush">{t.characterForm.relationshipCrush}</option>
                                        <option value="đang hẹn hò">{t.characterForm.relationshipDating}</option>
                                        <option value="yêu nhau">{t.characterForm.relationshipInLove}</option>
                                        <option value="đính hôn">{t.characterForm.relationshipEngaged}</option>
                                        <option value="kết hôn">{t.characterForm.relationshipMarried}</option>
                                        <option value="ở chung">{t.characterForm.relationshipLivingTogether}</option>
                                    </select>
                                </div>
                            )}
                        </div>

                        {/* Provider Selection */}
                        <div className="pt-4 border-t border-white/10">
                            <label className="block text-sm font-medium mb-2">
                                {t.characterForm.aiProvider}
                            </label>
                            <select
                                value={formData.provider || 'default'}
                                onChange={(e) => updateField('provider', e.target.value)}
                                className="input-field mb-4"
                            >
                                <option value="default">{t.characterForm.defaultProvider}</option>
                                <option value="silicon">SiliconFlow</option>
                                <option value="gemini">Gemini (Google AI)</option>
                                <option value="zhipu">Zhipu AI (GLM-4 Flash)</option>
                            </select>
                        </div>

                        {/* Model Selection */}
                        <div className="pt-4 border-t border-white/10">
                            <label className="block text-sm font-medium mb-2">
                                {t.characterForm.aiModel} <span className="text-xs text-gray-400">{t.characterForm.aiModelHelper}</span>
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
                                            <span>{t.characterForm.presetModel}</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={!usePresetModel}
                                                onChange={() => setUsePresetModel(false)}
                                                className="radio-input"
                                            />
                                            <span>{t.characterForm.customModelId}</span>
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
                                            <option value="">{t.characterForm.selectSiliconModel}</option>

                                            {/* Recommended models first */}
                                            {siliconPresets.filter(p => p.recommended).map(preset => (
                                                <option key={preset.key} value={preset.id}>
                                                    {preset.label}
                                                </option>
                                            ))}

                                            {/* Divider and other models */}
                                            {siliconPresets.some(p => !p.recommended) && (
                                                <optgroup label={t.characterForm.otherModels}>
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
                            ) : formData.provider === 'gemini' ? (
                                /* ========== GOOGLE GEMINI DROPDOWN ========== */
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
                                            <span>{t.characterForm.presetModel}</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                checked={!usePresetModel}
                                                onChange={() => setUsePresetModel(false)}
                                                className="radio-input"
                                            />
                                            <span>{t.characterForm.customModelId}</span>
                                        </label>
                                    </div>

                                    {usePresetModel ? (
                                        <select
                                            value={selectedGooglePresetId}
                                            onChange={(e) => {
                                                const newId = e.target.value
                                                setSelectedGooglePresetId(newId)
                                                updateField('modelName', newId)
                                            }}
                                            className="input-field mb-1"
                                        >
                                            <option value="">{t.characterForm.selectGeminiModel}</option>

                                            {/* Recommended models first */}
                                            {googlePresets.filter(p => p.recommended).map(preset => (
                                                <option key={preset.key} value={preset.id}>
                                                    {preset.label}
                                                </option>
                                            ))}

                                            {/* Divider and other models */}
                                            {googlePresets.some(p => !p.recommended) && (
                                                <optgroup label={t.characterForm.otherModels}>
                                                    {googlePresets.filter(p => !p.recommended).map(preset => (
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
                                            placeholder="Ví dụ: gemini-2.5-flash"
                                        />
                                    )}
                                </div>
                            ) : formData.provider === 'zhipu' ? (
                                /* ========== ZHIPU AI DROPDOWN ========== */
                                <div className="space-y-3">
                                    <select
                                        value={formData.modelName || 'glm-4-flash'}
                                        onChange={(e) => updateField('modelName', e.target.value)}
                                        className="input-field mb-1"
                                    >
                                        <optgroup label="🚀 Speed (Text Generation)">
                                            <option value="glm-4-flash">🚀 GLM-4 Flash (Speed - Default)</option>
                                            <option value="glm-4-flash-250414">🛡️ GLM-4 Flash (Stable)</option>
                                        </optgroup>
                                        <optgroup label="🧠 Deep Thinking">
                                            <option value="glm-4.5-flash">🧠 GLM-4.5 Flash (Reasoning)</option>
                                        </optgroup>
                                        <optgroup label="🎭 Character/Roleplay (Dating Sim!)">
                                            <option value="charglm-4">🎭 CharGLM-4 (Roleplay Special)</option>
                                            <option value="emohaa">❤️ Emohaa (Emotional/Therapy)</option>
                                        </optgroup>
                                        <optgroup label="👁️ Vision (Multimodal)">
                                            <option value="glm-4v-flash">👁️ GLM-4V Flash (Vision)</option>
                                            <option value="glm-4.6v-flash">👁️ GLM-4.6V Flash (Latest Vision)</option>
                                        </optgroup>
                                    </select>
                                    <p className="text-xs text-green-400">
                                        💡 Tip: CharGLM-4 & Emohaa are optimized for Dating Sim roleplay!
                                    </p>
                                </div>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.modelName || ''}
                                    onChange={(e) => updateField('modelName', e.target.value)}
                                    className="input-field mb-1"
                                    placeholder={t.characterForm.defaultProvider}
                                />
                            )}

                            <p className="text-xs text-gray-400 mt-2">
                                {(formData.provider === 'silicon' || formData.provider === 'gemini') && usePresetModel
                                    ? `Select from configured ${formData.provider === 'silicon' ? 'SiliconFlow' : 'Gemini'} models.`
                                    : "Enter specific model ID or leave empty for default."}
                                <br />
                                <span className="text-primary">
                                    {t.characterForm.modelNote}
                                </span>
                            </p>
                        </div>
                    </form>

                    {/* Sticky Footer Actions */}
                    <div className="flex gap-3 pt-4 border-t border-white/10 shrink-0 bg-inherit">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1" disabled={isLoading || isUploading}>
                            {t.characterForm.cancel}
                        </button>
                        <button
                            type="submit"
                            form="character-form"
                            className="btn-primary flex-1"
                            disabled={isLoading || isUploading}
                        >
                            {isLoading ? t.characterForm.creating : mode === 'create' ? t.characterForm.createCharacter : mode === 'duplicate' ? t.characterForm.createCopy : t.characterForm.saveChanges}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
