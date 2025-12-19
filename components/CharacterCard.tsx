'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

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
 * Instagram-style Character Card
 * Square 1:1 aspect ratio with gradient overlay
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
    const [isDeleting, setIsDeleting] = useState(false)

    const handleEditClick = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        router.push(`/characters/${id}`)
    }

    const handleDeleteClick = async (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!confirm(`Bạn có chắc muốn XÓA VĨNH VIỄN nhân vật "${name}"?\n\n⚠️ Hành động này sẽ XÓA:\n- Tất cả tin nhắn chat\n- Tất cả ký ức AI\n- Dữ liệu điện thoại\n\nKhông thể hoàn tác!`)) {
            return
        }

        setIsDeleting(true)
        try {
            if (onDelete) {
                onDelete(id)
            }
        } catch (error) {
            console.error('Delete error:', error)
            setIsDeleting(false)
        }
    }

    return (
        <Link
            href={`/chat/${id}`}
            className="group relative block aspect-square overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-purple-500/20"
        >
            {/* Background Avatar (blurred) */}
            <div className="absolute inset-0">
                <Image
                    src={avatarUrl}
                    alt=""
                    fill
                    className="object-cover opacity-30 blur-sm scale-110"
                    unoptimized
                />
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Content */}
            <div className="relative h-full flex flex-col items-center justify-center p-4">
                {/* Circle Avatar */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden ring-4 ring-white/30 group-hover:ring-pink-400/60 transition-all duration-300 shadow-xl">
                    <Image
                        src={avatarUrl}
                        alt={name}
                        fill
                        className="object-cover"
                        unoptimized
                    />
                </div>

                {/* Name & Status */}
                <div className="mt-4 text-center">
                    <h3 className="text-lg sm:text-xl font-bold text-white drop-shadow-lg group-hover:text-pink-200 transition-colors">
                        {name}
                    </h3>
                    {relationshipStatus && (
                        <p className="text-xs sm:text-sm text-pink-300/80 mt-1 font-medium">
                            {relationshipStatus}
                        </p>
                    )}
                </div>

                {/* Hover Overlay - Chat Button */}
                <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-center py-2.5 rounded-xl font-semibold text-sm shadow-lg">
                        💬 Chat ngay
                    </div>
                </div>
            </div>

            {/* Top-right Action Buttons - Always visible on hover, separated */}
            <div className="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {/* Edit Button */}
                <button
                    onClick={handleEditClick}
                    className="w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                    title="Chỉnh sửa"
                    type="button"
                >
                    <span className="text-sm">✏️</span>
                </button>

                {/* Delete Button */}
                <button
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                    className="w-8 h-8 flex items-center justify-center bg-red-900/50 hover:bg-red-700/70 rounded-full transition-colors disabled:opacity-50"
                    title="Xóa vĩnh viễn"
                    type="button"
                >
                    <span className="text-sm">{isDeleting ? '⏳' : '🗑️'}</span>
                </button>
            </div>
        </Link>
    )
}
