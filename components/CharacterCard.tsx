'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useModal } from '@/contexts/ModalContext'

interface CharacterCardProps {
    id: string
    name: string
    avatarUrl: string
    shortDescription: string
    tags: string
    relationshipStatus?: string
    onDelete?: (id: string) => void
}

/**
 * Character Card - Mobile-First Design
 * 
 * STRICT LAYOUT (No Overlap):
 * ┌──────────────────────────┐
 * │                   [✏️][🗑️] │  ← TOP-RIGHT (absolute)
 * │                          │
 * │      [AVATAR]            │  ← CENTER
 * │      Name                │
 * │      Status              │
 * │                          │
 * │  [ 💬 CHAT NGAY ]        │  ← BOTTOM (absolute)
 * └──────────────────────────┘
 */
export default function CharacterCard({
    id,
    name,
    avatarUrl,
    shortDescription,
    tags,
    relationshipStatus,
    onDelete,
}: CharacterCardProps) {
    const router = useRouter()
    const { user, openLogin } = useModal()
    const [isDeleting, setIsDeleting] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Navigate to chat - AUTH GATEKEEPER
    const handleChatClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()

        // Gatekeeper: If not logged in, show login modal instead of navigating
        if (!user) {
            openLogin()
            return
        }

        router.push(`/chat/${id}`)
    }

    // Navigate to edit page
    const handleEditClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        router.push(`/characters/${id}`)
    }

    // Show delete confirmation - ONLY shows modal, does NOT delete
    const handleDeleteClick = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setShowDeleteConfirm(true)
    }

    // Actually perform delete (ONLY after user clicks confirm button)
    const confirmDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setIsDeleting(true)
        setShowDeleteConfirm(false)
        if (onDelete) {
            onDelete(id)
        }
    }

    // Cancel delete
    const cancelDelete = (e: React.MouseEvent) => {
        e.stopPropagation()
        e.preventDefault()
        setShowDeleteConfirm(false)
    }

    return (
        <>
            {/* ══════════════════════════════════════════════════════════════
                CARD CONTAINER
                - position: relative (so children can be absolute)
                - aspect-square for 1:1 ratio
            ══════════════════════════════════════════════════════════════ */}
            <div
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 to-pink-900/50"
                style={{
                    position: 'relative',
                    aspectRatio: '1 / 1',
                }}
            >
                {/* Background Avatar (blurred) - z-0 */}
                <div className="absolute inset-0" style={{ zIndex: 0 }}>
                    <Image
                        src={avatarUrl}
                        alt=""
                        fill
                        className="object-cover opacity-30 blur-sm scale-110"
                        unoptimized
                    />
                </div>

                {/* Gradient Overlay - z-1 */}
                <div
                    className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20"
                    style={{ zIndex: 1 }}
                />

                {/* ════════════════════════════════════════════════════════
                    TOP-RIGHT CORNER: Edit + Delete Buttons
                    - Forced absolute positioning
                    - High z-index (50)
                    - Gap between buttons
                ════════════════════════════════════════════════════════ */}
                <div
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 50,
                        display: 'flex',
                        flexDirection: 'row',
                        gap: '12px',
                    }}
                >
                    {/* EDIT Button */}
                    <button
                        onClick={handleEditClick}
                        type="button"
                        title="Chỉnh sửa"
                        style={{
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            borderRadius: '50%',
                            border: '1px solid rgba(255,255,255,0.2)',
                            cursor: 'pointer',
                            fontSize: '16px',
                        }}
                    >
                        ✏️
                    </button>

                    {/* DELETE Button */}
                    <button
                        onClick={handleDeleteClick}
                        disabled={isDeleting}
                        type="button"
                        title="Xóa vĩnh viễn"
                        style={{
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: isDeleting ? 'rgba(100,0,0,0.5)' : 'rgba(150,0,0,0.7)',
                            borderRadius: '50%',
                            border: '1px solid rgba(255,100,100,0.3)',
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                            fontSize: '16px',
                            opacity: isDeleting ? 0.5 : 1,
                        }}
                    >
                        {isDeleting ? '⏳' : '🗑️'}
                    </button>
                </div>

                {/* ════════════════════════════════════════════════════════
                    CENTER: Avatar + Name + Status
                    - z-index: 10
                ════════════════════════════════════════════════════════ */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center p-4"
                    style={{ zIndex: 10, paddingTop: '48px', paddingBottom: '56px' }}
                >
                    {/* Circle Avatar */}
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden ring-2 ring-white/30 shadow-xl">
                        <Image
                            src={avatarUrl}
                            alt={name}
                            fill
                            className="object-cover"
                            unoptimized
                        />
                    </div>

                    {/* Name */}
                    <h3 className="mt-2 text-base sm:text-lg font-bold text-white drop-shadow-lg text-center line-clamp-1">
                        {name}
                    </h3>

                    {/* Status */}
                    {relationshipStatus && (
                        <p className="text-xs text-pink-300/80 mt-0.5 font-medium text-center">
                            {relationshipStatus}
                        </p>
                    )}
                </div>

                {/* ════════════════════════════════════════════════════════
                    BOTTOM: Chat Button (Primary Action)
                    - Forced absolute bottom
                    - Full width
                    - z-index: 40 (below management buttons)
                ════════════════════════════════════════════════════════ */}
                <div
                    style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        right: '12px',
                        zIndex: 40,
                    }}
                >
                    <button
                        onClick={handleChatClick}
                        type="button"
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-center py-2.5 rounded-xl font-semibold text-sm shadow-lg transition-all active:scale-95"
                    >
                        💬 Chat ngay
                    </button>
                </div>
            </div>

            {/* ══════════════════════════════════════════════════════════════
                DELETE CONFIRMATION MODAL
                - Fixed overlay covering entire screen
                - z-index: 9999 (above everything)
                - User MUST click confirm to delete
            ══════════════════════════════════════════════════════════════ */}
            {showDeleteConfirm && (
                <div
                    onClick={cancelDelete}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 9999,
                        backgroundColor: 'rgba(0,0,0,0.8)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            backgroundColor: '#1a1a2e',
                            border: '1px solid rgba(239,68,68,0.5)',
                            borderRadius: '16px',
                            padding: '24px',
                            maxWidth: '320px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        }}
                    >
                        {/* Warning Icon */}
                        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                            <span style={{ fontSize: '48px' }}>⚠️</span>
                        </div>

                        {/* Title */}
                        <h3 style={{
                            fontSize: '20px',
                            fontWeight: 'bold',
                            color: 'white',
                            textAlign: 'center',
                            marginBottom: '8px'
                        }}>
                            Xóa vĩnh viễn?
                        </h3>

                        {/* Character Name */}
                        <p style={{
                            textAlign: 'center',
                            color: '#f472b6',
                            fontWeight: '600',
                            marginBottom: '16px'
                        }}>
                            "{name}"
                        </p>

                        {/* Warning Box */}
                        <div style={{
                            backgroundColor: 'rgba(127,29,29,0.3)',
                            border: '1px solid rgba(239,68,68,0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '24px',
                        }}>
                            <p style={{
                                fontSize: '14px',
                                color: '#fecaca',
                                textAlign: 'center',
                                lineHeight: '1.6'
                            }}>
                                ❌ Tất cả tin nhắn chat<br />
                                ❌ Tất cả ký ức AI<br />
                                ❌ Dữ liệu điện thoại<br />
                                <strong style={{ color: '#f87171' }}>Không thể hoàn tác!</strong>
                            </p>
                        </div>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={cancelDelete}
                                type="button"
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    backgroundColor: '#374151',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                Hủy
                            </button>
                            <button
                                onClick={confirmDelete}
                                type="button"
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    backgroundColor: '#dc2626',
                                    color: 'white',
                                    fontWeight: '600',
                                    borderRadius: '12px',
                                    border: 'none',
                                    cursor: 'pointer',
                                }}
                            >
                                🗑️ Xóa luôn
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
