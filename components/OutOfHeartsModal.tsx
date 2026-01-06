'use client'

interface OutOfHeartsModalProps {
    isOpen: boolean
    onClose: () => void
    heartsResetAt: string | null
}

export default function OutOfHeartsModal({ isOpen, onClose, heartsResetAt }: OutOfHeartsModalProps) {
    if (!isOpen) return null

    // Format reset time to local time
    const getResetTimeText = () => {
        if (!heartsResetAt) return 'sớm'

        try {
            const resetDate = new Date(heartsResetAt)
            const now = new Date()
            const diffMs = resetDate.getTime() - now.getTime()
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
            const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

            if (diffHours > 0) {
                return `${diffHours} giờ ${diffMins} phút nữa`
            } else if (diffMins > 0) {
                return `${diffMins} phút nữa`
            } else {
                return 'ngay bây giờ'
            }
        } catch (error) {
            return 'sớm'
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 rounded-2xl p-6 max-w-sm w-full border border-gray-800 shadow-2xl">
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                        <span className="text-4xl">💔</span>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-white text-center mb-2">
                    Bạn đã hết tim hôm nay
                </h2>

                {/* Message */}
                <p className="text-gray-400 text-center mb-6">
                    Hearts sẽ được reset vào <span className="text-pink-400 font-medium">{getResetTimeText()}</span>
                </p>

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="w-full py-3 bg-gradient-to-r from-pink-500 to-red-500 hover:from-pink-600 hover:to-red-600 text-white font-medium rounded-lg transition-all"
                >
                    Đã hiểu
                </button>
            </div>
        </div>
    )
}
