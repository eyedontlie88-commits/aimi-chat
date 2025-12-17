const { PrismaClient } = require('@prisma/client')

async function main() {
  console.log('Connecting to database...')
  const prisma = new PrismaClient()

  console.log('Checking characters...')
  const characters = await prisma.character.findMany({
    select: { id: true, name: true, isDevOnly: true }
  })
  
  console.log('Found:', characters.map(c => `${c.name} (isDevOnly: ${c.isDevOnly})`))

  // Update test characters
  const result = await prisma.character.updateMany({
    where: {
      name: { in: ['Koo Bon Hyuk', 'Minh'] }
    },
    data: {
      isDevOnly: true
    }
  })
  
  console.log(`✅ Updated ${result.count} characters to isDevOnly=true`)
  
  // Verify
  const updated = await prisma.character.findMany({
    where: { name: { in: ['Koo Bon Hyuk', 'Minh'] } },
    select: { name: true, isDevOnly: true }
  })
  console.log('Verified:', updated)
}

main()
  .catch(console.error)
  .finally(() => process.exit(0))