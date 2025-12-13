'use client'

import { useState } from 'react'

interface PhoneCheckModalProps {
    isOpen: boolean
    onClose: () => void
    onSubmit: (data: PhoneCheckData) => void
    characterName: string
}

export interface PhoneCheckData {
    app: string
    description: string
    isSuspicious: boolean
    // Optional extended fields
    discovery?: string
    context?: string
    additionalInfo?: string
    severity?: number
}

export default function PhoneCheckModal({
    isOpen,
    onClose,
    onSubmit,
    characterName,
}: PhoneCheckModalProps) {
    const [app, setApp] = useState('')
    const [description, setDescription] = useState('')
    const [isSuspicious, setIsSuspicious] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!app || !description) return

        onSubmit({ app, description, isSuspicious })

        // Reset form
        setApp('')
        setDescription('')
        setIsSuspicious(false)
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="card max-w-md w-full animate-slide-up">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold gradient-text">📱 Phone Check</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white transition-colors text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                <p className="text-sm text-gray-300 mb-6">
                    {characterName} wants to check your phone. Describe what they would see...
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Which app are they looking at?
                        </label>
                        <input
                            type="text"
                            value={app}
                            onChange={(e) => setApp(e.target.value)}
                            placeholder="e.g., Instagram, Messenger, WhatsApp..."
                            className="input-field"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">
                            What do they see?
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Describe messages, notifications, or anything they would notice..."
                            className="input-field min-h-[100px] resize-none"
                            required
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            type="checkbox"
                            id="suspicious"
                            checked={isSuspicious}
                            onChange={(e) => setIsSuspicious(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 text-primary-600 focus:ring-primary-500"
                        />
                        <label htmlFor="suspicious" className="text-sm">
                            There's something suspicious 😳
                        </label>
                    </div>

                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} className="btn-secondary flex-1">
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary flex-1">
                            Let them see
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
