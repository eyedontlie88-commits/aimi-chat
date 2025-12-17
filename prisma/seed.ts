import { PrismaClient } from '@prisma/client'

// Dev schema URL
const devSchemaUrl = process.env.DATABASE_URL?.includes('?')
    ? `${process.env.DATABASE_URL}&schema=dev`
    : `${process.env.DATABASE_URL}?schema=dev`

const prisma = new PrismaClient({
    datasources: {
        db: { url: devSchemaUrl }
    },
    log: ['error', 'warn']
})

// Test user ID for dev schema
const DEV_USER_ID = 'dev-test-user'

// Character data
const testCharacter = {
    name: 'Test Character',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=TestCharacter',
    gender: 'female',
    shortDescription: 'Nhân vật test cho môi trường dev',
    persona: `Bạn là Test Character, một nhân vật AI được tạo để test hệ thống.
Bạn thân thiện, vui vẻ và luôn sẵn sàng giúp đỡ.
Bạn nói chuyện tự nhiên, thỉnh thoảng dùng emoji.`,
    speakingStyle: `- Nói chuyện thân thiện, gần gũi
- Dùng ngôn ngữ đơn giản
- Thỉnh thoảng dùng emoji 😊`,
    boundaries: `- Không nói chuyện quá thân mật
- Giữ khoảng cách lịch sự
- Tập trung vào việc test`,
    tags: 'test, dev, friendly',
    provider: 'default',
    modelName: null,
    isDevOnly: true,
}

async function main() {
    console.log('🌱 Starting seed for dev schema...')
    console.log(`📍 Using schema URL: ${devSchemaUrl?.substring(0, 50)}...`)

    try {
        // 1. Ensure UserProfile exists for dev test user
        const userProfile = await prisma.userProfile.upsert({
            where: { id: DEV_USER_ID },
            create: {
                id: DEV_USER_ID,
                displayName: 'Dev Tester',
                nicknameForUser: 'bạn',
            },
            update: {},
        })
        console.log(`✅ UserProfile ready: ${userProfile.id}`)

        // 2. Check if Test Character already exists
        const existingCharacter = await prisma.character.findFirst({
            where: { name: testCharacter.name }
        })

        if (existingCharacter) {
            console.log(`⏭️  Character "${testCharacter.name}" already exists (id: ${existingCharacter.id})`)

            // Ensure relationshipConfig exists
            const existingRelation = await prisma.relationshipConfig.findFirst({
                where: { characterId: existingCharacter.id, userId: DEV_USER_ID }
            })

            if (!existingRelation) {
                await prisma.relationshipConfig.create({
                    data: {
                        characterId: existingCharacter.id,
                        userId: DEV_USER_ID,
                        status: 'Test Relationship',
                        stage: 'STRANGER',
                    }
                })
                console.log(`✅ RelationshipConfig created for existing character`)
            }

            return
        }

        // 3. Create new Test Character with RelationshipConfig
        const character = await prisma.character.create({
            data: {
                ...testCharacter,
                relationshipConfig: {
                    create: {
                        userId: DEV_USER_ID,
                        status: 'Test Relationship',
                        stage: 'STRANGER',
                    }
                }
            },
            include: {
                relationshipConfig: true
            }
        })

        console.log(`✅ Character created: ${character.name} (id: ${character.id})`)
        console.log(`✅ RelationshipConfig: ${character.relationshipConfig?.id}`)

        // 4. Log all characters in dev schema
        const allCharacters = await prisma.character.findMany({
            select: { id: true, name: true, isDevOnly: true }
        })
        console.log(`\n📋 All characters in dev schema:`)
        allCharacters.forEach(c => {
            console.log(`   - ${c.name} (isDevOnly: ${c.isDevOnly})`)
        })

    } catch (error) {
        console.error('❌ Seed failed:', error)
        throw error
    } finally {
        await prisma.$disconnect()
    }

    console.log('\n🎉 Seed completed successfully!')
}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
