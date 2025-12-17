import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generatePhoneContent, shouldGenerateContent } from '@/lib/llm/phone-content-generator'

/**
 * POST /api/phone-content/generate
 * Generate phone content for a character based on recent conversation
 */
export async function POST(req: NextRequest) {
    try {
        const { characterId, forceRefresh } = await req.json()

        if (!characterId) {
            return NextResponse.json(
                { error: 'Character ID is required' },
                { status: 400 }
            )
        }

        // Fetch character
        const character = await prisma.character.findUnique({
            where: { id: characterId },
            include: {
                messages: {
                    orderBy: { createdAt: 'desc' },
                    take: 50 // Last 50 messages for context
                }
            }
        })

        if (!character) {
            return NextResponse.json(
                { error: 'Character not found' },
                { status: 404 }
            )
        }

        // Check if auto-update is enabled (unless force refresh)
        if (!forceRefresh && !character.phoneAutoUpdate) {
            return NextResponse.json(
                { error: 'Phone auto-update is disabled for this character' },
                { status: 403 }
            )
        }

        // Check cooldown: don't update if last update was < 5 minutes ago
        if (!forceRefresh && character.phoneLastUpdated) {
            const timeSinceLastUpdate = Date.now() - new Date(character.phoneLastUpdated).getTime()
            const fiveMinutes = 5 * 60 * 1000

            if (timeSinceLastUpdate < fiveMinutes) {
                return NextResponse.json(
                    {
                        error: 'Phone content was updated recently. Please wait a few minutes.',
                        lastUpdated: character.phoneLastUpdated,
                        phoneContent: character.phoneContentJson ? JSON.parse(character.phoneContentJson) : null
                    },
                    { status: 429 }
                )
            }
        }

        // Check if conversation is substantial enough
        const messages = character.messages.reverse() // Oldest first

        // Allow bypassing validation in development mode with forceGenerate
        const isDevelopment = process.env.NODE_ENV === 'development'
        const canBypass = forceRefresh && isDevelopment

        if (!canBypass && !shouldGenerateContent(messages)) {
            return NextResponse.json(
                {
                    error: 'Not enough meaningful conversation to generate phone content',
                    phoneContent: character.phoneContentJson ? JSON.parse(character.phoneContentJson) : null
                },
                { status: 400 }
            )
        }

        // Generate phone content
        console.log(`[PhoneContent] Generating for character: ${character.name}`)

        // Get user name from relationship config -> user profile
        const relationshipConfig = await prisma.relationshipConfig.findFirst({
            where: { characterId }
        })
        let userName = 'Bạn'
        if (relationshipConfig?.userId) {
            const userProfile = await prisma.userProfile.findUnique({
                where: { id: relationshipConfig.userId }
            })
            userName = userProfile?.displayName || userProfile?.nicknameForUser || 'Bạn'
        }
        console.log(`[PhoneContent] User name: ${userName}`)

        const phoneContent = await generatePhoneContent(
            messages,
            character.name,
            character.persona,
            userName
        )

        // Save to database
        await prisma.character.update({
            where: { id: characterId },
            data: {
                phoneContentJson: JSON.stringify(phoneContent),
                phoneLastUpdated: new Date(),
                phoneMessageCount: 0 // Reset counter
            }
        })

        console.log(`[PhoneContent] Generated successfully for ${character.name}`)

        return NextResponse.json({
            success: true,
            phoneContent,
            lastUpdated: new Date().toISOString()
        })

    } catch (error: any) {
        console.error('[PhoneContent] Generation error:', error)
        return NextResponse.json(
            { error: 'Failed to generate phone content', details: error.message },
            { status: 500 }
        )
    }
}

/**
 * GET /api/phone-content/generate?characterId=xxx
 * Get current phone content for a character
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const characterId = searchParams.get('characterId')

        if (!characterId) {
            return NextResponse.json(
                { error: 'Character ID is required' },
                { status: 400 }
            )
        }

        const character = await prisma.character.findUnique({
            where: { id: characterId },
            select: {
                phoneContentJson: true,
                phoneLastUpdated: true,
                phoneMessageCount: true,
                phoneAutoUpdate: true,
                phoneUpdateFrequency: true
            }
        })

        if (!character) {
            return NextResponse.json(
                { error: 'Character not found' },
                { status: 404 }
            )
        }

        return NextResponse.json({
            phoneContent: character.phoneContentJson ? JSON.parse(character.phoneContentJson) : null,
            lastUpdated: character.phoneLastUpdated,
            messageCount: character.phoneMessageCount,
            autoUpdate: character.phoneAutoUpdate,
            updateFrequency: character.phoneUpdateFrequency
        })

    } catch (error: any) {
        console.error('[PhoneContent] Fetch error:', error)
        return NextResponse.json(
            { error: 'Failed to fetch phone content', details: error.message },
            { status: 500 }
        )
    }
}
