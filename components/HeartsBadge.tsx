'use client'

interface HeartsBadgeProps {
    heartsRemaining: number
    className?: string
}

export default function HeartsBadge({ heartsRemaining, className = '' }: HeartsBadgeProps) {
    // Color based on hearts remaining
    const getColor = () => {
        if (heartsRemaining <= 0) return 'text-red-400 bg-red-500/10 border-red-500/20'
        if (heartsRemaining <= 10) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
        return 'text-pink-400 bg-pink-500/10 border-pink-500/20'
    }

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${getColor()} ${className}`}>
            <span className="text-sm">❤️</span>
            <span className="text-sm font-medium">{heartsRemaining}</span>
        </div>
    )
}
