'use client'

import dynamic from 'next/dynamic'
import { useModal } from '@/contexts/ModalContext'

// Dynamic imports for modals (avoid SSR issues)
const LoginModal = dynamic(() => import('./LoginModal'), { ssr: false })
const UserProfileModal = dynamic(() => import('./UserProfileModal'), { ssr: false })

/**
 * Global Modals Component
 * Renders Login and Profile modals at the app root level
 * Listens to ModalContext for open/close state
 */
export default function GlobalModals() {
    const { isLoginOpen, closeLogin, isProfileOpen, closeProfile, user } = useModal()

    return (
        <>
            {/* Login Modal - always ready */}
            <LoginModal
                isOpen={isLoginOpen}
                onClose={closeLogin}
            />

            {/* User Profile Modal - only when user exists */}
            {user && (
                <UserProfileModal
                    isOpen={isProfileOpen}
                    onClose={closeProfile}
                    user={user}
                />
            )}
        </>
    )
}
