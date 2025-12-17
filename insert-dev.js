// D:\doki\insert-dev.js
const { PrismaClient } = require('@prisma/client')
const data = require('./koo_bon_data.json')

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  })

  await prisma.character.create({
    data: {
      ...data,
      id: 'cmj5f3azw00042ftes4xbhu5h', // Keep same ID
      isDevOnly: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  })
  
  console.log('✅ Inserted Koo Bon Hyuk into dev schema')
}

main().catch(console.error).finally(() => process.exit(0))