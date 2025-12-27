import { describe, it, expect } from '@jest/globals'
import { validateAIResponse, detectRole, getCorrectPronouns } from '../lib/phone/pronoun-validator'

/**
 * 🔒 CRITICAL PRONOUN VALIDATION TESTS
 * These tests MUST pass before any deployment
 * DO NOT MODIFY WITHOUT TEAM APPROVAL
 * 
 * Last Updated: 2025-12-26
 */

describe('Phone AI Pronoun Rules - LOCKED', () => {

    describe('Role Detection', () => {
        it('detects mother role from Vietnamese names', () => {
            expect(detectRole('Mẹ yêu 💕')).toBe('mother')
            expect(detectRole('Mẹ')).toBe('mother')
            expect(detectRole('Me oi')).toBe('mother')
        })

        it('detects mother role from English names', () => {
            expect(detectRole('Mom')).toBe('mother')
            expect(detectRole('Mother')).toBe('mother')
        })

        it('detects father role', () => {
            expect(detectRole('Bố')).toBe('father')
            expect(detectRole('Ba ơi')).toBe('father')
            expect(detectRole('Dad')).toBe('father')
        })

        it('detects boss role', () => {
            expect(detectRole('Sếp')).toBe('boss')
            expect(detectRole('Boss')).toBe('boss')
            expect(detectRole('Manager')).toBe('boss')
        })

        it('defaults to friend for unknown roles', () => {
            expect(detectRole('Bạn thân')).toBe('friend')
            expect(detectRole('Unknown person')).toBe('friend')
        })
    })

    describe('Mother Role Validation (Mẹ)', () => {
        it('PASSES when mother uses correct pronouns', () => {
            const validReplies = [
                'Ừ con, mẹ biết rồi',
                'Con ơi, mẹ nhớ con quá',
                'Mẹ nấu cơm chờ con đây',
                'Con về chưa? Mẹ lo lắm'
            ]

            validReplies.forEach(reply => {
                const result = validateAIResponse(reply, 'mother')
                expect(result.valid).toBe(true)
                expect(result.errors).toHaveLength(0)
            })
        })

        it('FAILS when mother starts with "Dạ"', () => {
            const invalidReplies = [
                'Dạ. Con nhớ ăn nha',
                'Dạ mẹ ơi',
                'Dạ, con biết rồi ạ'
            ]

            invalidReplies.forEach(reply => {
                const result = validateAIResponse(reply, 'mother')
                expect(result.valid).toBe(false)
                expect(result.errors.some(e => e.includes('Dạ'))).toBe(true)
            })
        })

        it('FAILS when mother says "con biết rồi"', () => {
            const result = validateAIResponse('con biết rồi mẹ ạ', 'mother')
            expect(result.valid).toBe(false)
            expect(result.errors.some(e => e.includes('con biết rồi'))).toBe(true)
        })

        it('provides fallback reply when validation fails', () => {
            const result = validateAIResponse('Dạ mẹ ơi', 'mother')
            expect(result.valid).toBe(false)
            expect(result.fallbackReply).toBeDefined()
            expect(result.fallbackReply).toContain('mẹ')
        })
    })

    describe('Father Role Validation (Bố)', () => {
        it('FAILS when father starts with "Dạ"', () => {
            const result = validateAIResponse('Dạ bố ơi', 'father')
            expect(result.valid).toBe(false)
        })

        it('provides fallback reply', () => {
            const result = validateAIResponse('Dạ bố', 'father')
            expect(result.fallbackReply).toBeDefined()
            expect(result.fallbackReply).toContain('bố')
        })
    })

    describe('Boss Role Validation (Sếp)', () => {
        it('FAILS when boss starts with "Dạ"', () => {
            const result = validateAIResponse('Dạ sếp ạ', 'boss')
            expect(result.valid).toBe(false)
        })

        it('provides fallback reply', () => {
            const result = validateAIResponse('Dạ sếp', 'boss')
            expect(result.fallbackReply).toBeDefined()
        })
    })

    describe('Pronoun Reference', () => {
        it('returns correct pronouns for mother', () => {
            const pronouns = getCorrectPronouns('mother')
            expect(pronouns.selfReference).toContain('mẹ')
            expect(pronouns.addressOther).toContain('con')
            expect(pronouns.forbidden).toContain('Dạ')
        })

        it('returns correct pronouns for father', () => {
            const pronouns = getCorrectPronouns('father')
            expect(pronouns.selfReference).toContain('bố')
        })

        it('returns correct pronouns for boss', () => {
            const pronouns = getCorrectPronouns('boss')
            expect(pronouns.selfReference).toContain('sếp')
        })
    })

})
