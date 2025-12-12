# DokiChat Deployment Guide

## PostgreSQL Migration Summary

### Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Changed `provider` from `sqlite` to `postgresql`, added `directUrl` |
| `package.json` | Added `postinstall`, `vercel-build`, `db:migrate` scripts |
| `.env.example` | Updated to PostgreSQL connection string format |

---

## Vercel Environment Variables

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...?pgbouncer=true` | With connection pooler |
| `DIRECT_URL` | `postgresql://...` | Without pooler (for migrations) |
| `SILICON_API_KEY` | `sk-...` | SiliconFlow API key |
| `GEMINI_API_KEY` | `...` | Google Gemini API key |
| `LLM_DEFAULT_PROVIDER` | `gemini` or `silicon` | Primary LLM provider |
| `NODE_ENV` | `production` | Auto-set by Vercel |

### Recommended: Vercel Postgres

1. Go to Vercel Dashboard → Storage → Create Database → Postgres
2. Copy connection strings to environment variables
3. `DATABASE_URL` = Pooled connection (with `?pgbouncer=true`)
4. `DIRECT_URL` = Direct connection (for migrations)

### Alternative: Neon / Supabase

Same format, just use their connection strings.

---

## Vercel Build Settings

| Setting | Value |
|---------|-------|
| Framework Preset | Next.js |
| Build Command | `npm run vercel-build` |
| Output Directory | `.next` |
| Install Command | `npm install` |

The `vercel-build` script runs:
```bash
prisma generate && prisma migrate deploy && next build
```

---

## Local Development Commands

### First Time Setup (with PostgreSQL)

```bash
# 1. Create .env file with your Postgres connection
cp .env.example .env
# Edit .env with your DATABASE_URL and DIRECT_URL

# 2. Generate Prisma client
npx prisma generate

# 3. Create initial migration
npx prisma migrate dev --name init

# 4. (Optional) Seed database
npm run db:seed

# 5. Start dev server
npm run dev
```

### Using Local Postgres (Docker)

```bash
# Start Postgres container
docker run --name doki-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=doki -p 5432:5432 -d postgres:15

# .env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/doki"
DIRECT_URL="postgresql://postgres:postgres@localhost:5432/doki"
```

### Daily Development

```bash
npm run dev          # Start dev server
npm run db:studio    # Open Prisma Studio
npm run db:migrate   # Create new migration
```

---

## Deployment Checklist

- [ ] Create Postgres database (Vercel/Neon/Supabase)
- [ ] Set `DATABASE_URL` and `DIRECT_URL` in Vercel env vars
- [ ] Set LLM API keys in Vercel env vars
- [ ] Push to GitHub (triggers auto-deploy)
- [ ] Verify build logs show `prisma migrate deploy` success
- [ ] Test API endpoints work (create character, send message)

---

## Troubleshooting

### "Table does not exist" on first deploy

Migrations haven't run. Check:
1. `DIRECT_URL` is set (not just `DATABASE_URL`)
2. Build command is `npm run vercel-build`
3. Check build logs for migration errors

### Connection timeout

1. Check `DATABASE_URL` has `?pgbouncer=true` if using pooler
2. Ensure `DIRECT_URL` is direct connection (no pooler)

### Schema changes not applying

```bash
# Local: create migration
npx prisma migrate dev --name your_change_name

# Push to Git → Vercel runs `prisma migrate deploy`
```

---

## Data Migration (from existing SQLite)

If you have existing data in SQLite:

```bash
# 1. Export from SQLite (manual or use tool)
# 2. Set up new Postgres database
# 3. Run migrations
npx prisma migrate deploy

# 4. Import data via Prisma Studio or SQL scripts
npx prisma studio
```

---

*Updated: 2024-12-12*
