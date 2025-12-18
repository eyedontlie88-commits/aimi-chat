'use client'

import { ChevronLeft } from 'lucide-react'

interface MessagesAppProps {
    onBack: () => void
}

// Mock conversation data
const mockConversations = [
    {
        id: 1,
        name: 'Mẹ yêu 💕',
        avatar: '👩',
        lastMessage: 'Con nhớ về sớm nhé, nay có canh chua.',
        time: '14:00',
        unread: 2,
    },
    {
        id: 2,
        name: 'Sếp',
        avatar: '👔',
        lastMessage: 'Deadline slide gửi chưa em?',
        time: 'Hôm qua',
        unread: 0,
    },
    {
        id: 3,
        name: 'Bank Notification',
        avatar: '🏦',
        lastMessage: 'TK ****1234 +5,000,000 VND từ NGUYEN...',
        time: 'Hôm qua',
        unread: 0,
    },
    {
        id: 4,
        name: 'Nhóm Bạn Thân',
        avatar: '👥',
        lastMessage: 'Cuối tuần đi cafe không?',
        time: 'T6',
        unread: 5,
    },
    {
        id: 5,
        name: 'Shopee',
        avatar: '🛒',
        lastMessage: 'Đơn hàng của bạn đang được giao...',
        time: 'T5',
        unread: 0,
    },
    {
        id: 6,
        name: 'Em gái',
        avatar: '👧',
        lastMessage: 'Anh/chị ơi cho em mượn tiền 🥺',
        time: 'T4',
        unread: 1,
    },
]

export default function MessagesApp({ onBack }: MessagesAppProps) {
    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center gap-2 px-2 py-3 border-b border-gray-100 bg-[#FFF9F0]">
                <button
                    onClick={onBack}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/50 transition-colors"
                >
                    <ChevronLeft className="w-6 h-6 text-gray-600" />
                </button>
                <h2 className="text-lg font-semibold text-gray-800">Tin nhắn</h2>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
                {mockConversations.map((conv) => (
                    <button
                        key={conv.id}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-50"
                    >
                        {/* Avatar */}
                        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-2xl shrink-0">
                            {conv.avatar}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 text-left">
                            <div className="flex items-center justify-between gap-2">
                                <span className="font-medium text-gray-900 truncate">
                                    {conv.name}
                                </span>
                                <span className="text-xs text-gray-400 shrink-0">
                                    {conv.time}
                                </span>
                            </div>
                            <p className="text-sm text-gray-500 truncate mt-0.5">
                                {conv.lastMessage}
                            </p>
                        </div>

                        {/* Unread badge */}
                        {conv.unread > 0 && (
                            <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                <span className="text-[10px] font-bold text-white">
                                    {conv.unread}
                                </span>
                            </div>
                        )}
                    </button>
                ))}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t border-gray-100 text-center bg-[#FFF9F0]">
                <p className="text-[10px] text-gray-400">
                    Đây là tin nhắn mô phỏng trong điện thoại của nhân vật
                </p>
            </div>
        </div>
    )
}
