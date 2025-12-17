// D:\doki\extract-public.js
const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  })

  const character = await prisma.character.findFirst({
    where: { name: 'Koo Bon Hyuk' },
    select: {
      id: true, name: true, avatarUrl: true, gender: true, shortDescription: true,
      persona: true, speakingStyle: true, boundaries: true, tags: true, provider: true,
      isDevOnly: true
    }
  })
  
  console.log('FOUND:', JSON.stringify(character, null, 2))
}

main().finally(() => process.exit(0))