'use client';

import { useRouter } from 'next/navigation';

interface MissingInfoWarningPopupProps {
    onClose: () => void;
}

export function MissingInfoWarningPopup({ onClose }: MissingInfoWarningPopupProps) {
    const router = useRouter();

    const handleUpdate = () => {
        router.push('/settings');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 md:p-6 max-w-[90vw] md:max-w-md mx-4 shadow-xl">
                <div className="flex items-start gap-3 mb-4">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <h3 className="font-bold text-lg mb-2 text-gray-900 dark:text-white">
                            Thiếu thông tin quan trọng
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                            Để AI xưng hô chính xác, bạn cần cung cấp:
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1 mb-3">
                            <li>Tuổi của bạn (trong User Settings)</li>
                            <li>Tuổi của nhân vật (trong Character Settings)</li>
                        </ul>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                            <strong>Hoặc ít nhất:</strong>
                        </p>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 list-disc list-inside space-y-1 mb-3">
                            <li>Giới tính của bạn</li>
                            <li>Giới tính của nhân vật</li>
                        </ul>
                        <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">
                            Hiện tại AI sẽ sử dụng xưng hô trung tính (mình/bạn).
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
                    >
                        Tiếp tục
                    </button>
                    <button
                        onClick={handleUpdate}
                        className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition font-medium"
                    >
                        Cập nhật thông tin
                    </button>
                </div>
            </div>
        </div>
    );
}
