import { PrismaClient } from '@prisma/client'

/**
 * Simplified Prisma Client
 * 
 * NO SCHEMA ROUTING - uses DATABASE_URL directly.
 * Environment determines which database:
 * - Local/dev: DATABASE_URL → Supabase DEV
 * - Production: DATABASE_URL → Supabase PROD
 */

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
    return new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })
}

// Singleton Prisma client
export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma
}

export default prisma
