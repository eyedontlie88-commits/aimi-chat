import { PrismaClient } from '@prisma/client'

/**
 * Prisma Client Factory for Per-Request Schema Routing
 * 
 * Supports two modes:
 * 1. Legacy global client (for backward compatibility)
 * 2. Per-request client based on user role
 * 
 * Schema Selection Rules:
 * - APP_ENV=production → ALWAYS 'public' (hard guard)
 * - role='dev' + APP_ENV!=production → 'dev' schema
 * - role='user' or anonymous → 'public' schema
 */

// Cache for schema-specific clients (max 2: public and dev)
const clientCache = new Map<string, PrismaClient>()

/**
 * Get the base DATABASE_URL without schema param
 */
function getBaseUrl(): string {
    const url = process.env.DATABASE_URL
    if (!url) {
        throw new Error('DATABASE_URL is not defined')
    }

    // Remove existing schema param if present
    return url.replace(/([?&])schema=[^&]+(&|$)/, '$1').replace(/[?&]$/, '')
}

/**
 * Add schema param to connection string
 */
function addSchemaToUrl(url: string, schema: string): string {
    const separator = url.includes('?') ? '&' : '?'
    return `${url}${separator}schema=${schema}`
}

/**
 * Determine schema based on role and environment
 * 
 * @param role - User role from Firebase claims ('dev' | 'user')
 * @returns Schema name ('public' | 'dev')
 */
export function getSchemaForRole(role: 'dev' | 'user'): 'public' | 'dev' {
    const appEnv = process.env.APP_ENV || 'dev'

    // HARD GUARD: Production ALWAYS uses public schema
    if (appEnv === 'production') {
        return 'public'
    }

    // Non-production: dev role can use dev schema
    if (role === 'dev') {
        return 'dev'
    }

    // Default to public
    return 'public'
}

/**
 * Get or create Prisma client for a specific schema
 * Clients are cached per schema within the process
 */
export function getPrismaForSchema(schema: 'public' | 'dev'): PrismaClient {
    // Check cache first
    const cached = clientCache.get(schema)
    if (cached) {
        return cached
    }

    // Create new client with schema-specific URL
    const baseUrl = getBaseUrl()
    const schemaUrl = addSchemaToUrl(baseUrl, schema)

    const client = new PrismaClient({
        datasources: {
            db: {
                url: schemaUrl,
            },
        },
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    })

    // Cache the client
    clientCache.set(schema, client)

    console.log(`[Prisma] Created client for schema: "${schema}"`)

    return client
}

/**
 * Get Prisma client based on user role
 * Convenience method combining role → schema → client
 */
export function getPrismaForRole(role: 'dev' | 'user'): PrismaClient {
    const schema = getSchemaForRole(role)
    return getPrismaForSchema(schema)
}

// =============================================================================
// LEGACY: Global client for backward compatibility
// New code should use getAuthContext() from lib/auth/require-auth.ts
// =============================================================================

function getLegacySchema(): string {
    const appEnv = process.env.APP_ENV || 'dev'
    const appSchema = process.env.APP_SCHEMA

    if (appEnv === 'production') {
        if (appSchema && appSchema !== 'public') {
            throw new Error(
                `FATAL: Production environment (APP_ENV=production) cannot use schema "${appSchema}". ` +
                `Production must use "public" schema only.`
            )
        }
        return 'public'
    }

    return appSchema || 'dev'
}

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

// Legacy: Determine schema from environment and create global client
const legacySchema = getLegacySchema()
const legacyUrl = addSchemaToUrl(getBaseUrl(), legacySchema)

// Override DATABASE_URL for legacy compatibility
process.env.DATABASE_URL = legacyUrl

console.log(`[Prisma] Legacy client using schema: "${legacySchema}" (APP_ENV=${process.env.APP_ENV || 'dev'})`)

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Export current schema for reference
export const CURRENT_SCHEMA = legacySchema
