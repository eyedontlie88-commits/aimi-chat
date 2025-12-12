'use client'

import { useState, useEffect } from 'react'
import { chatThemes, TEXT_MODE_OPTIONS, ChatThemeId, ChatTextMode } from '@/lib/ui/chatThemes'

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
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [relationships, setRelationships] = useState<RelationshipConfig[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [expandedCharacterId, setExpandedCharacterId] = useState<string | null>(null)

    useEffect(() => {
        loadProfile()
        loadRelationships()
    }, [])

    const loadProfile = async () => {
        try {
            const res = await fetch('/api/user-profile')
            const data = await res.json()
            setProfile(data.profile)
        } catch (error) {
            console.error('Error loading profile:', error)
        }
    }

    const loadRelationships = async () => {
        try {
            const res = await fetch('/api/relationship')
            const data = await res.json()
            setRelationships(data.configs)
        } catch (error) {
            console.error('Error loading relationships:', error)
        }
    }

    const saveProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!profile) return

        setIsLoading(true)
        try {
            await fetch('/api/user-profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            })
            alert('Profile saved successfully!')
        } catch (error) {
            console.error('Error saving profile:', error)
            alert('Failed to save profile')
        } finally {
            setIsLoading(false)
        }
    }

    const saveRelationship = async (config: RelationshipConfig) => {
        try {
            await fetch('/api/relationship', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId: config.characterId,
                    status: config.status,
                    startDate: config.startDate,
                    specialNotes: config.specialNotes,
                }),
            })
            alert('Relationship updated!')
            await loadRelationships()
        } catch (error) {
            console.error('Error updating relationship:', error)
            alert('Failed to update relationship')
        }
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
        )
    }

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <h1 className="text-3xl font-bold gradient-text mb-8">Settings</h1>

            {/* User Profile */}
            <div className="card mb-8">
                <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
                <p className="text-sm text-gray-400 mb-6">
                    This information helps characters understand and relate to you better.
                </p>

                <form onSubmit={saveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Display Name</label>
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
                                Nickname (how they call you)
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
                            <label className="block text-sm font-medium mb-2">Gender</label>
                            <select
                                value={profile.gender || ''}
                                onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                                className="input-field"
                            >
                                <option value="">Prefer not to say</option>
                                <option value="male">Male</option>
                                <option value="female">Female</option>
                                <option value="non-binary">Non-binary</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Age</label>
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
                        <label className="block text-sm font-medium mb-2">Occupation</label>
                        <input
                            type="text"
                            value={profile.occupation || ''}
                            onChange={(e) => setProfile({ ...profile, occupation: e.target.value })}
                            className="input-field"
                            placeholder="e.g., Student, Software Engineer, etc."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Personality Description</label>
                        <textarea
                            value={profile.personalityDescription || ''}
                            onChange={(e) => setProfile({ ...profile, personalityDescription: e.target.value })}
                            className="input-field min-h-[80px] resize-none"
                            placeholder="Describe yourself in a few words..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Likes</label>
                        <textarea
                            value={profile.likes || ''}
                            onChange={(e) => setProfile({ ...profile, likes: e.target.value })}
                            className="input-field min-h-[60px] resize-none"
                            placeholder="Things you enjoy..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Dislikes</label>
                        <textarea
                            value={profile.dislikes || ''}
                            onChange={(e) => setProfile({ ...profile, dislikes: e.target.value })}
                            className="input-field min-h-[60px] resize-none"
                            placeholder="Things you don't like..."
                        />
                    </div>

                    <button type="submit" disabled={isLoading} className="btn-primary w-full">
                        {isLoading ? 'Saving...' : 'Save Profile'}
                    </button>
                </form>
            </div>

            {/* Chat Theme */}
            <div className="card mb-8">
                <h2 className="text-xl font-semibold mb-4">🎨 Giao diện Chat</h2>
                <p className="text-sm text-gray-400 mb-6">
                    Chọn theme cho trang chat của bạn.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.values(chatThemes).map((theme) => (
                        <button
                            key={theme.id}
                            onClick={async () => {
                                const updatedProfile = { ...profile, chatTheme: theme.id }
                                setProfile(updatedProfile)
                                try {
                                    const res = await fetch('/api/user-profile', {
                                        method: 'PUT',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(updatedProfile),
                                    })
                                    if (res.ok) {
                                        console.log('[Settings] Updated chatTheme to', theme.id)
                                    }
                                } catch (error) {
                                    console.error('Error saving theme:', error)
                                }
                            }}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${profile.chatTheme === theme.id
                                    ? 'border-primary ring-2 ring-primary/30'
                                    : 'border-white/10 hover:border-white/30'
                                }`}
                        >
                            {/* Preview colors */}
                            <div className="flex gap-1 mb-3">
                                {theme.previewColors.map((color: string, i: number) => (
                                    <div
                                        key={i}
                                        className="w-6 h-6 rounded-full border border-white/20"
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                            <h3 className="font-medium text-sm mb-1">{theme.name}</h3>
                            <p className="text-xs text-gray-400">{theme.description}</p>
                        </button>
                    ))}
                </div>

                {/* Text Tone Selector */}
                <div className="mt-6 pt-6 border-t border-white/10">
                    <h3 className="font-medium text-sm mb-3">📝 Màu chữ trong chat</h3>
                    <div className="flex flex-wrap gap-3">
                        {TEXT_MODE_OPTIONS.map((option) => (
                            <label
                                key={option.value}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl border cursor-pointer transition ${profile.chatTextTone === option.value || (!profile.chatTextTone && option.value === 'auto')
                                    ? 'border-primary bg-primary/10'
                                    : 'border-white/10 hover:border-white/30'
                                    }`}
                            >
                                <input
                                    type="radio"
                                    name="chatTextTone"
                                    value={option.value}
                                    checked={profile.chatTextTone === option.value || (!profile.chatTextTone && option.value === 'auto')}
                                    onChange={async (e) => {
                                        const updatedProfile = { ...profile, chatTextTone: e.target.value }
                                        setProfile(updatedProfile)
                                        try {
                                            const res = await fetch('/api/user-profile', {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify(updatedProfile),
                                            })
                                            if (res.ok) {
                                                console.log('[Settings] Updated chatTextTone to', e.target.value)
                                            }
                                        } catch (error) {
                                            console.error('Error saving text tone:', error)
                                        }
                                    }}
                                    className="hidden"
                                />
                                <span className="text-sm">{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>

            {/* Relationships */}
            <div className="card">
                <h2 className="text-xl font-semibold mb-4">Relationship Settings</h2>
                <p className="text-sm text-gray-400 mb-6">
                    Configure your relationship with each character.
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
                                        <p className="text-sm text-gray-400">{rel.status}</p>
                                    </div>
                                </div>
                                <span className="text-gray-400">{expandedCharacterId === rel.characterId ? '▼' : '▶'}</span>
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
            </div>
        </div>
    )
}
