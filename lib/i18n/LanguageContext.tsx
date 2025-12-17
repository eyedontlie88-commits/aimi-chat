'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { translations, Language } from './translations'

const LANGUAGE_STORAGE_KEY = 'app-language'

// Extract the translations type for the context
type Translations = typeof translations.en | typeof translations.vi

interface LanguageContextType {
    lang: Language
    setLang: (lang: Language) => void
    t: Translations
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
    children: ReactNode
}

export function LanguageProvider({ children }: LanguageProviderProps) {
    const [lang, setLangState] = useState<Language>('en')
    const [isLoaded, setIsLoaded] = useState(false)

    // Load language from localStorage on mount
    useEffect(() => {
        const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null
        if (savedLang && (savedLang === 'en' || savedLang === 'vi')) {
            setLangState(savedLang)
        }
        setIsLoaded(true)
    }, [])

    // Update language and save to localStorage
    const setLang = (newLang: Language) => {
        setLangState(newLang)
        localStorage.setItem(LANGUAGE_STORAGE_KEY, newLang)
    }

    // Get translations for current language
    const t: Translations = translations[lang]

    // Prevent flash of wrong language
    if (!isLoaded) {
        return null
    }

    return (
        <LanguageContext.Provider value={{ lang, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

/**
 * Hook to access language context
 * Returns: { lang, setLang, t }
 * - lang: current language ('en' | 'vi')
 * - setLang: function to change language
 * - t: translation object for current language
 */
export function useLanguage() {
    const context = useContext(LanguageContext)
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider')
    }
    return context
}

/**
 * Helper function to replace placeholders in translation strings
 * Usage: interpolate(t.guest.message, { character: 'Minh' })
 */
export function interpolate(template: string, values: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`))
}
