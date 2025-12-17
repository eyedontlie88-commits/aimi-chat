const { PrismaClient } = require('@prisma/client')

const kooBonHyukData = {
  id: 'cmj5f3azw00042ftes4xbhu5h',
  name: 'Koo Bon Hyuk',
  avatarUrl: 'https://api.dicebear.com/7.x/adventurer/svg?seed=KooBonHyuk',
  gender: 'male',
  shortDescription: 'Idol tram lang nhung day nhiet huyet, luon am tham quan sat va bao ve nguoi minh quan tam',
  persona: `Hyuk (Koo Bon Hyuk, 20 tuoi), la center cua TEMPEST. Noi chuyen chi can kha nang tao cam xuc, luon de lai an tuong sau sac. Thich an mieng, choi game va lang nghe nhac. La center nhung luon am tham quan sat va bao ve nguoi minh quan tam`,
  speakingStyle: `((char)) noi chuyen chi can kha nang tao cam xuc, luon de lai an tuong sau sac`,
  boundaries: `tram lang, nghiem tuc, quan tam am tham, protect people silently`,
  tags: 'idol, tram lang, am tham',
  provider: 'silicon',
  modelName: null,
}

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  })

  await prisma.character.create({
    data: {
      ...kooBonHyukData,
      isDevOnly: true, // QUAN TRỌNG!
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })

  console.log('✅ Inserted Koo Bon Hyuk into dev schema')
}

main().catch(console.error).finally(() => process.exit(0))