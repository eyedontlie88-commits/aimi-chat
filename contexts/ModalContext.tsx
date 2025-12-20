'use client'

import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { onAuthChange, type User } from '@/lib/firebase/client'

interface ModalContextType {
    // Login Modal
    isLoginOpen: boolean
    openLogin: () => void
    closeLogin: () => void

    // Profile Modal
    isProfileOpen: boolean
    openProfile: () => void
    closeProfile: () => void

    // User state (shared across app)
    user: User | null
    loading: boolean
}

const ModalContext = createContext<ModalContextType | undefined>(undefined)

/**
 * Global Modal Context Provider
 * Manages Login/Profile modal states and user auth state
 * Can be accessed from anywhere in the app (Header, CharacterCard, etc.)
 */
export function ModalProvider({ children }: { children: ReactNode }) {
    const [isLoginOpen, setIsLoginOpen] = useState(false)
    const [isProfileOpen, setIsProfileOpen] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    // Listen to auth state changes
    useEffect(() => {
        const unsubscribe = onAuthChange((user) => {
            setUser(user)
            setLoading(false)

            // Auto-close login modal when user logs in
            if (user && isLoginOpen) {
                setIsLoginOpen(false)
            }
        })
        return unsubscribe
    }, [isLoginOpen])

    const openLogin = () => {
        setIsProfileOpen(false) // Close profile if open
        setIsLoginOpen(true)
    }

    const closeLogin = () => {
        setIsLoginOpen(false)
    }

    const openProfile = () => {
        setIsLoginOpen(false) // Close login if open
        setIsProfileOpen(true)
    }

    const closeProfile = () => {
        setIsProfileOpen(false)
    }

    return (
        <ModalContext.Provider
            value={{
                isLoginOpen,
                openLogin,
                closeLogin,
                isProfileOpen,
                openProfile,
                closeProfile,
                user,
                loading,
            }}
        >
            {children}
        </ModalContext.Provider>
    )
}

/**
 * Hook to access modal context
 * Use this in any component to open/close modals or check user auth
 */
export function useModal() {
    const context = useContext(ModalContext)
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider')
    }
    return context
}
