'use client'

import { useState, useEffect } from 'react'
import { chatThemes, TEXT_MODE_OPTIONS, ChatThemeId, ChatTextMode } from '@/lib/ui/chatThemes'
import { authFetch } from '@/lib/firebase/auth-fetch'
import { setGlobalTheme, setGlobalTextMode, THEME_STORAGE_KEY, TEXT_MODE_STORAGE_KEY } from '@/components/ThemeProvider'
import BackButton from '@/components/BackButton'
import { useLanguage, Language } from '@/lib/i18n'
import { useColors } from '@/lib/ColorContext'

// Language Button Component
function LanguageButton({ lang, icon, label }: { lang: Language; icon: string; label: string }) {
    const { lang: currentLang, setLang } = useLanguage()
    const isActive = currentLang === lang

    return (
        <button
            type="button"
            onClick={() => setLang(lang)}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${isActive
                ? 'bg-primary-600 border-2 border-primary-400 text-white'
                : 'glass glass-hover border-2 border-transparent'
                }`}
        >
            <span className="text-xl">{icon}</span>
            <span className="font-medium">{label}</span>
            {isActive && <span className="ml-1">✓</span>}
        </button>
    )
}

interface UserProfile {
    id: string
    displayName: string
    nicknameForUser: string
    gender: string | null
    age: number | null
    occupation: string | null
    personalityDescription: string | null
    likes: string | null
    dislikes: string | null
    chatTheme: string | null
    chatTextTone: string | null
    textColor: string | null
    backgroundColor: string | null
}

interface RelationshipConfig {
    id: string
    characterId: string
    status: string
    startDate: string | null
    specialNotes: string | null
    character: {
        id: string
        name: string
        avatarUrl: string
    }
}

const RELATIONSHIP_STATUSES = ['crush', 'dating', 'engaged', 'married', 'living_together']

export default function SettingsPage() {
    const { t } = useLanguage()
    const { setColors } = useColors()
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [relationships, setRelationships] = useState<RelationshipConfig[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [loadError, setLoadError] = useState(false)
    const [expandedCharacterId, setExpandedCharacterId] = useState<string | null>(null)
    const [showAIColorPopup, setShowAIColorPopup] = useState(false)

    // Helper to map DB status values (Vietnamese/English) to localized strings
    const getLocalizedStatus = (status: string): string => {
        const statusMap: Record<string, string> = {
            'crush': 'crush',
            'đang hẹn hò': 'dating', 'dating': 'dating',
            'yêu nhau': 'lover', 'lover': 'lover',
            'đính hôn': 'engaged', 'engaged': 'engaged',
            'kết hôn': 'married', 'married': 'married',
            'sống chung': 'livingTogether', 'living_together': 'livingTogether',
        }
        const key = statusMap[status.toLowerCase()] || statusMap[status]
        return key ? (t.relationship as any)[key] || status : status
    }

    // Default profile for graceful fallback
    const defaultProfile: UserProfile = {
        id: '',
        displayName: 'Bạn',
        nicknameForUser: 'em',
        gender: null,
        age: null,
        occupation: null,
        personalityDescription: null,
        likes: null,
        dislikes: null,
        chatTheme: null,
        chatTextTone: null,
        textColor: '#F9D47E',
        backgroundColor: '#1A1A1A',
    }

    useEffect(() => {
        loadProfile()
        loadRelationships()
    }, [])

    const loadProfile = async () => {
        try {
            const res = await authFetch('/api/user-profile')
            if (!res.ok) {
                console.error('Failed to load profile:', res.status)
                setProfile(defaultProfile)
                setLoadError(true)
                return
            }
            const data = await res.json()
            const loadedProfile = data.profile || defaultProfile
            setProfile(loadedProfile)

            // Sync profile theme/textMode to localStorage for global application
            if (loadedProfile.chatTheme) {
                setGlobalTheme(loadedProfile.chatTheme)
            }
            if (loadedProfile.chatTextTone) {
                setGlobalTextMode(loadedProfile.chatTextTone)
            }
        } catch (error) {
            console.error('Error loading profile:', error)
            setProfile(defaultProfile)
            setLoadError(true)
        }
    }

    const loadRelationships = async () => {
        try {
            const res = await authFetch('/api/relationship')
            if (!res.ok) {
                console.error('Failed to load relationships:', res.status)
                setRelationships([])
                return
            }
            const data = await res.json()
            setRelationships(data.configs || [])
        } catch (error) {
            console.error('Error loading relationships:', error)
            setRelationships([])
        }
    }

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile) return

        setIsLoading(true)
        try {
            const res = await authFetch('/api/user-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            })
            if (res.ok) {
                alert('Profile saved successfully!')
            } else {
                alert('Failed to save profile')
            }
        } catch (error) {
            console.error('Error saving profile:', error)
            alert('Failed to save profile')
        } finally {
            setIsLoading(false)
        }
    }

    const saveRelationship = async (config: RelationshipConfig) => {
        try {
            const res = await authFetch('/api/relationship', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId: config.characterId,
                    status: config.status,
                    startDate: config.startDate,
                    specialNotes: config.specialNotes,
                }),
            })
            if (res.ok) {
                alert('Relationship updated!')
                await loadRelationships()
            } else {
                alert('Failed to update relationship')
            }
        } catch (error) {
            console.error('Error updating relationship:', error)
            alert('Failed to update relationship')
        }
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-secondary">Loading...</div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Back Button */}
            <div className="mb-4">
                <BackButton fallbackUrl="/characters" />
            </div>

            <h1 className="text-3xl font-bold gradient-text mb-8">{t.settings.title}</h1>

            {/* Language Selector */}
            <div className="card mb-8">
                <h2 className="text-xl font-semibold mb-4">🌐 {t.settings.language}</h2>
                <p className="text-sm text-secondary mb-4">
                    {t.settings.languageDesc}
                </p>
                <div className="flex gap-3">
                    <LanguageButton lang="en" icon="🇬🇧" label="English" />
                    <LanguageButton lang="vi" icon="🇻🇳" label="Tiếng Việt" />
                </div>
            </div>

            {/* User Profile */}
            <div className="card mb-8">
                <h2 className="text-xl font-semibold mb-4">{t.settings.profile}</h2>
                <p className="text-sm text-secondary mb-6">
                    {t.settings.profileDesc}
                </p>

                <form onSubmit={saveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">{t.settings.displayName}</label>
                            <input
                                type="text"
                                value={profile.displayName}
                                onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                                className="input-field"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">
                                {t.settings.nickname}
                            </label>
                            <input
                                type="text"
                                value={profile.nicknameForUser}
                                onChange={(e) => setProfile({ ...profile, nicknameForUser: e.target.value })}
                                className="input-field"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">{t.settings.gender}</label>
                            <select
                                value={profile.gender || ''}
                                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                className="input-field"
                            >
                                <option value="">{t.settings.genderOptions.none}</option>
                                <option value="male">{t.settings.genderOptions.male}</option>
                                <option value="female">{t.settings.genderOptions.female}</option>
                                <option value="non-binary">{t.settings.genderOptions.nonBinary}</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">{t.settings.age}</label>
                            <input
                                type="number"
                                value={profile.age || ''}
                                onChange={(e) =>
                                    setProfile({ ...profile, age: e.target.value ? parseInt(e.target.value) : null })
                                }
                                className="input-field"
                                min="13"
                                max="120"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.occupation}</label>
                        <input
                            type="text"
                            value={profile.occupation || ''}
                            onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                            className="input-field"
                            placeholder={t.settings.occupationPlaceholder}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.personality}</label>
                        <textarea
                            value={profile.personalityDescription || ''}
                            onChange={(e) => setProfile({ ...profile, personalityDescription: e.target.value })}
                            className="input-field min-h-[80px] resize-none"
                            placeholder={t.settings.personalityPlaceholder}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.likes}</label>
                        <textarea
                            value={profile.likes || ''}
                            onChange={(e) => setProfile({ ...profile, likes: e.target.value })}
                            className="input-field min-h-[60px] resize-none"
                            placeholder={t.settings.likesPlaceholder}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.dislikes}</label>
                        <textarea
                            value={profile.dislikes || ''}
                            onChange={(e) => setProfile({ ...profile, dislikes: e.target.value })}
                            className="input-field min-h-[60px] resize-none"
                            placeholder={t.settings.dislikesPlaceholder}
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="btn-primary w-full">
                        {isLoading ? t.settings.saving : t.settings.saveProfile}
                    </button>
                </form>
            </div>

            {/* Custom Color Picker */}
            <div className="card mb-8">
                <h2 className="text-xl font-semibold mb-4">{t.settings.colorTitle}</h2>
                <p className="text-sm text-secondary mb-6">
                    {t.settings.colorDesc}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Text Color */}
                    <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.textColor}</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={profile.textColor || '#F9D47E'}
                                onChange={async (e) => {
                                    const newTextColor = e.target.value
                                    const updatedProfile = { ...profile, textColor: newTextColor }
                                    setProfile(updatedProfile)
                                    // Update global colors immediately
                                    setColors(newTextColor, profile.backgroundColor || '#1A1A1A')
                                    try {
                                        await authFetch('/api/user-profile', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(updatedProfile),
                                        })
                                    } catch (error) {
                                        console.error('Error saving text color:', error)
                                    }
                                }}
                                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                            />
                            <span className="font-mono text-sm bg-white/10 px-3 py-1.5 rounded-lg">
                                {profile.textColor || '#F9D47E'}
                            </span>
                        </div>
                    </div>

                    {/* Background Color */}
                    <div>
                        <label className="block text-sm font-medium mb-2">{t.settings.bgColor}</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={profile.backgroundColor || '#1A1A1A'}
                                onChange={async (e) => {
                                    const newBgColor = e.target.value
                                    const updatedProfile = { ...profile, backgroundColor: newBgColor }
                                    setProfile(updatedProfile)
                                    // Update global colors immediately
                                    setColors(profile.textColor || '#F9D47E', newBgColor)
                                    try {
                                        await authFetch('/api/user-profile', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify(updatedProfile),
                                        })
                                    } catch (error) {
                                        console.error('Error saving background color:', error)
                                    }
                                }}
                                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-white/20"
                            />
                            <span className="font-mono text-sm bg-white/10 px-3 py-1.5 rounded-lg">
                                {profile.backgroundColor || '#1A1A1A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Live Preview */}
                <div className="mt-6">
                    <label className="block text-sm font-medium mb-2">{t.settings.preview}</label>
                    <div
                        className="p-6 rounded-xl border border-white/20 text-center"
                        style={{
                            backgroundColor: profile.backgroundColor || '#1A1A1A',
                            color: profile.textColor || '#F9D47E',
                        }}
                    >
                        <p className="text-lg font-medium mb-2">{t.settings.sampleText}</p>
                        <p className="text-sm opacity-80">The quick brown fox jumps over the lazy dog</p>
                    </div>
                </div>

                {/* AI Suggestion Button */}
                <div className="mt-6">
                    <button
                        type="button"
                        onClick={() => setShowAIColorPopup(true)}
                        className="btn-primary w-full md:w-auto"
                    >
                        {t.settings.aiSuggestColors}
                    </button>
                </div>

                {/* AI Color Suggestion Popup */}
                {showAIColorPopup && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="glass rounded-2xl p-6 max-w-md w-full">
                            <h3 className="text-xl font-semibold mb-4">{t.settings.aiColorTitle}</h3>
                            <p className="text-sm text-secondary mb-6">
                                {t.settings.aiColorDesc}
                            </p>

                            <div className="space-y-4">
                                {/* Suggestion 1: Light Mode */}
                                <div className="p-4 rounded-xl border border-white/20 hover:border-primary/50 transition cursor-pointer">
                                    <h4 className="font-medium text-sm mb-2">{t.settings.optimizedLight}</h4>
                                    <div
                                        className="p-4 rounded-lg mb-3 text-center"
                                        style={{ backgroundColor: '#F5F5F5', color: '#1A1A1A' }}
                                    >
                                        <p className="text-sm font-medium">Preview Text</p>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-secondary mb-3">
                                        <span>{t.settings.textColorLabel} #1A1A1A</span>
                                        <span>{t.settings.bgColorLabel} #F5F5F5</span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const updatedProfile = { ...profile, textColor: '#1A1A1A', backgroundColor: '#F5F5F5' }
                                            setProfile(updatedProfile)
                                            setColors('#1A1A1A', '#F5F5F5') // Update global colors
                                            setShowAIColorPopup(false)
                                            try {
                                                await authFetch('/api/user-profile', {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(updatedProfile),
                                                })
                                            } catch (error) {
                                                console.error('Error saving colors:', error)
                                            }
                                        }}
                                        className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition"
                                    >
                                        {t.settings.select}
                                    </button>
                                </div>

                                {/* Suggestion 2: Dark Mode */}
                                <div className="p-4 rounded-xl border border-white/20 hover:border-primary/50 transition cursor-pointer">
                                    <h4 className="font-medium text-sm mb-2">{t.settings.optimizedDark}</h4>
                                    <div
                                        className="p-4 rounded-lg mb-3 text-center"
                                        style={{ backgroundColor: '#1A1A1A', color: '#F9D47E' }}
                                    >
                                        <p className="text-sm font-medium">Preview Text</p>
                                    </div>
                                    <div className="flex justify-between items-center text-xs text-secondary mb-3">
                                        <span>{t.settings.textColorLabel} #F9D47E</span>
                                        <span>{t.settings.bgColorLabel} #1A1A1A</span>
                                    </div>
                                    <button
                                        onClick={async () => {
                                            const updatedProfile = { ...profile, textColor: '#F9D47E', backgroundColor: '#1A1A1A' }
                                            setProfile(updatedProfile)
                                            setColors('#F9D47E', '#1A1A1A') // Update global colors
                                            setShowAIColorPopup(false)
                                            try {
                                                await authFetch('/api/user-profile', {
                                                    method: 'PUT',
                                                    headers: { 'Content-Type': 'application/json' },
                                                    body: JSON.stringify(updatedProfile),
                                                })
                                            } catch (error) {
                                                console.error('Error saving colors:', error)
                                            }
                                        }}
                                        className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm transition"
                                    >
                                        {t.settings.select}
                                    </button>
                                </div>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setShowAIColorPopup(false)}
                                className="w-full mt-6 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-sm transition"
                            >
                                {t.common.close}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Relationships */}
            <div className="card">
                <h2 className="text-xl font-semibold mb-4">{t.settings.relationships}</h2>
                <p className="text-sm text-secondary mb-6">
                    {t.settings.relationshipsDesc}
                </p>

                <div className="space-y-3">
                    {relationships.map((rel) => (
                        <div key={rel.id} className="glass rounded-lg overflow-hidden">
                            <button
                                onClick={() =>
                                    setExpandedCharacterId(
                                        expandedCharacterId === rel.characterId ? null : rel.characterId
                                    )
                                }
                                className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full overflow-hidden">
                                        <img
                                            src={rel.character.avatarUrl}
                                            alt={rel.character.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-medium">{rel.character.name}</p>
                                        <p className="text-sm text-secondary">
                                            {getLocalizedStatus(rel.status)}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-secondary">{expandedCharacterId === rel.characterId ? '▼' : '▶'}</span>
                            </button>

                            {expandedCharacterId === rel.characterId && (
                                <div className="p-4 border-t border-white/10 space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Relationship Status</label>
                                        <select
                                            value={rel.status}
                                            onChange={(e) => {
                                                const updated = { ...rel, status: e.target.value }
                                                setRelationships(relationships.map((r) => (r.id === rel.id ? updated : r)))
                                            }}
                                            className="input-field"
                                        >
                                            {RELATIONSHIP_STATUSES.map((status) => (
                                                <option key={status} value={status}>
                                                    {status.replace('_', ' ')}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Started Dating</label>
                                        <input
                                            type="date"
                                            value={rel.startDate ? rel.startDate.split('T')[0] : ''}
                                            onChange={(e) => {
                                                const updated = {
                                                    ...rel,
                                                    startDate: e.target.value ? new Date(e.target.value).toISOString() : null,
                                                }
                                                setRelationships(relationships.map((r) => (r.id === rel.id ? updated : r)))
                                            }}
                                            className="input-field"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium mb-2">Special Notes</label>
                                        <textarea
                                            value={rel.specialNotes || ''}
                                            onChange={(e) => {
                                                const updated = { ...rel, specialNotes: e.target.value }
                                                setRelationships(relationships.map((r) => (r.id === rel.id ? updated : r)))
                                            }}
                                            className="input-field min-h-[60px] resize-none"
                                            placeholder="Any special context about your relationship..."
                                        />
                                    </div>

                                    <button onClick={() => saveRelationship(rel)} className="btn-primary w-full">
                                        Save Changes
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div >
        </div >
    )
}
