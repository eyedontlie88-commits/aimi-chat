# AImi chat Deployment Guide

## Dev/Prod Schema Split

This project uses **Postgres schemas** for dev/prod isolation using the **same physical database**:
- **Production schema:** `public` (enforced when `APP_ENV=production`)  
- **Dev schema:** `dev` (default when `APP_ENV=dev` or not set)

### Environment Variables

| Variable | Controls | Values |
|----------|----------|--------|
| `APP_ENV` | **Schema enforcement** | `production` or `dev` |
| `APP_SCHEMA` | Actual schema name | `public` or `dev` |
| `NODE_ENV` | Next.js build behavior | `production` or `development` |

**Key Point:** `APP_ENV` (not `NODE_ENV`) controls schema enforcement. This allows running **two production builds** with different schemas.

---

## Railway Service Configuration

### Production Service

```
APP_ENV=production
APP_SCHEMA=public
NODE_ENV=production
DATABASE_URL=postgresql://...
```

### Dev Service (same database, production build)

```
APP_ENV=dev
APP_SCHEMA=dev
NODE_ENV=production
DATABASE_URL=postgresql://...
```

**Both services can run `next start` in production mode**, but use different schemas for complete isolation.

---

## Safety Features

**Production Enforcement:**
```typescript
if (APP_ENV === 'production' && APP_SCHEMA !== 'public') {
  throw Error('FATAL: Production must use public schema')
}
```

**Dev Service is NOT enforced:**
- Can use `dev` or `public` schema
- Can run with `NODE_ENV=production` for build mode
- Same database as production, isolated schema

---

## Local Development Setup

### First Time: Create Dev Schema

```bash
# 1. Copy env file
cp .env.example .env

# 2. Set your DATABASE_URL (same database as prod!)
# Edit .env:
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/doki"
APP_ENV=dev
APP_SCHEMA=dev

# 3. Generate Prisma client
npx prisma generate

# 4. Apply migrations to 'dev' schema
npm run db:migrate:dev

# 5. Seed dev schema
npm run db:seed:dev

# 6. Start dev server
npm run dev
```

### Available Scripts

| Script | What it does |
|--------|--------------|
| `npm run db:migrate:dev` | Create/apply migrations to `dev` schema |
| `npm run db:migrate:public` | Create/apply migrations to `public` schema |
| `npm run db:seed:dev` | Seed `dev` schema |
| `npm run db:seed:public` | Seed `public` schema |
| `npm run db:studio:dev` | Open Prisma Studio for `dev` schema |
| `npm run db:studio:public` | Open Prisma Studio for `public` schema |

---

## Deployment Scenarios

### Scenario 1: Single Production Service

```
# Railway Service Config
APP_ENV=production
APP_SCHEMA=public
NODE_ENV=production
```

### Scenario 2: Prod + Dev Services (same DB)

**Production Service:**
```
APP_ENV=production
APP_SCHEMA=public
NODE_ENV=production
```

**Dev Service:** (for staging/testing)
```
APP_ENV=dev
APP_SCHEMA=dev
NODE_ENV=production
```

Both run `next start`, both use same database, **completely isolated schemas**.

---

## Schema Changes

When you modify `prisma/schema.prisma`:

```bash
# 1. Create migration locally (on dev schema)
npm run db:migrate:dev

# 2. Test locally
npm run dev

# 3. Apply to production schema (carefully!)
# Option A: Manually on Railway CLI
APP_SCHEMA=public npx prisma migrate deploy

# Option B: Include in vercel-build (auto-runs on deploy)
# Already configured in package.json
```

---

## Troubleshooting

### "FATAL: Production must use public schema"

You're running with `APP_ENV=production` but `APP_SCHEMA=dev`. Fix:
```bash
# Either use prod schema:
APP_SCHEMA=public

# Or use dev environment:
APP_ENV=dev
```

### Dev service not starting

Check that you set:
```
APP_ENV=dev
APP_SCHEMA=dev
```

NOT:
```
APP_ENV=production  # This enforces public schema
```

### Switching schemas locally

```bash
# Use dev schema (default)
APP_ENV=dev APP_SCHEMA=dev npm run dev

# Use public schema (testing production setup)
APP_ENV=dev APP_SCHEMA=public npm run dev

# Simulate production enforcement
APP_ENV=production APP_SCHEMA=public npm run dev
```

---

*Schema system ensures dev work never touches production data, even when running production builds.*
