'use client';

import { useRouter } from 'next/navigation';

interface AgeReminderPopupProps {
    type: 'character' | 'user';
    characterId?: string;
    characterName?: string;
    onClose: () => void;
    onInputNow?: () => void; // Callback to reopen form for character
}

export function AgeReminderPopup({
    type,
    characterId,
    characterName,
    onClose,
    onInputNow
}: AgeReminderPopupProps) {
    const router = useRouter();

    const handleInputNow = () => {
        if (type === 'character' && onInputNow) {
            // Reopen character form with focus on age field
            onInputNow();
        } else if (type === 'user') {
            // Redirect to settings page
            router.push('/settings?focus=age');
        }

        // Mark as shown in localStorage
        const key = type === 'character'
            ? `character_age_reminder_${characterId}`
            : 'user_age_reminder';
        localStorage.setItem(key, 'true');

        onClose();
    };

    const handleLater = () => {
        // Mark as shown in localStorage
        const key = type === 'character'
            ? `character_age_reminder_${characterId}`
            : 'user_age_reminder';
        localStorage.setItem(key, 'true');

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 max-w-[90vw] md:max-w-md mx-4 shadow-xl">
                <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
                            {type === 'character'
                                ? 'Thiếu thông tin tuổi của nhân vật'
                                : 'Thiếu thông tin tuổi của bạn'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                            {type === 'character'
                                ? `Bạn chưa nhập tuổi cho ${characterName || 'nhân vật này'}. `
                                : 'Bạn chưa nhập tuổi trong User Settings. '}
                            Điều này có thể khiến AI trả lời sai sót về xưng hô (anh/em/chị...).
                        </p>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mt-2">
                            Bạn có muốn nhập tuổi ngay bây giờ không?
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={handleLater}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                        Để sau
                    </button>
                    <button
                        onClick={handleInputNow}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition font-medium"
                    >
                        Nhập luôn
                    </button>
                </div>
            </div>
        </div>
    );
}
