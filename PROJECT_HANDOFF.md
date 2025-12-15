# AImi Chat - Project Handoff Document

> Last updated: 2025-12-15  
> Status: ✅ Core Firebase Auth + Schema Routing complete

---

## 🎯 Project Overview

**AImi chat** là ứng dụng chat với AI companions (nhân vật ảo), hỗ trợ:
- Tạo và tùy chỉnh nhân vật AI
- Chat với relationship progression system
- Memory và emotional momentum
- Multi-platform: Web + Android (Capacitor)

**Trạng thái hiện tại:**
- Guest mode hoạt động tốt (userId="me")
- Firebase Auth (Google + Email) hoàn thành
- Schema routing (public/dev) hoạt động
- Guest data migration khi login hoạt động
- Android WebView cần sync sau mỗi build

---

## 📦 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React 18, TailwindCSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL on Railway, Prisma ORM |
| Auth | Firebase Auth (Client + Admin SDK) |
| Mobile | Capacitor 8 (Android WebView) |
| LLM | Google Gemini (primary), SiliconFlow (fallback) |

---

## 🧠 Core Architecture

### 1. Auth & User Identity

```
Guest (no token) → userId = "me"
Authenticated   → userId = Firebase UID
```

**Custom Claims:**
- `role: "user"` (default)
- `role: "dev"` (assigned via admin endpoint)

### 2. Database Schema Routing

| User Type | APP_ENV | Schema Used |
|-----------|---------|-------------|
| Guest (no token) | any | `public` |
| role=user | any | `public` |
| role=dev | production | `public` ⚠️ |
| role=dev | dev | `dev` |

**Hard Guard:** Production (`APP_ENV=production`) LUÔN dùng `public` schema.

### 3. Prisma Client Rules

```typescript
// ❌ KHÔNG BAO GIỜ làm thế này trong business logic
import { prisma } from '@/lib/prisma'

// ✅ LUÔN lấy từ auth context
const { prisma, uid, role, schema } = await getAuthContext(request)
```

### 4. Guest Data Migration

Khi user login lần đầu:
1. `AuthButton` gọi `POST /api/migrate/guest-to-user`
2. Copy từ `public` schema (userId="me") → target schema (userId=UID)
3. Không xóa guest data (safe rollout)
4. LocalStorage flag `guestMigrated:<uid>` ngăn chạy lại

---

## 📁 Key Files

### Auth & Schema
| File | Purpose |
|------|---------|
| `lib/auth/require-auth.ts` | `getAuthContext()`, schema routing |
| `lib/prisma.ts` | `getPrismaForSchema()`, `getPrismaForRole()` |
| `lib/firebase/client.ts` | Firebase Client SDK |
| `lib/firebase/admin.ts` | Firebase Admin SDK, `verifyIdToken()` |

### API Routes
| File | Purpose |
|------|---------|
| `app/api/migrate/guest-to-user/route.ts` | Guest → User migration |
| `app/api/admin/set-dev/route.ts` | Set dev role (non-prod only) |
| `app/api/chat/route.ts` | Chat with LLM |
| `app/api/characters/route.ts` | CRUD characters |

### UI
| File | Purpose |
|------|---------|
| `components/AuthButton.tsx` | Login UI + auto migration trigger |
| `app/layout.tsx` | Global layout with AuthButton |

---

## 📱 Android (Capacitor)

**QUAN TRỌNG:** Android app là WebView, không tự update!

Mỗi lần thay đổi web code:
```bash
npm run build
npx cap copy android
npx cap open android  # Build lại APK trong Android Studio
```

Config: `capacitor.config.ts`
- `server.url`: Production Railway URL
- `appId`: `com.aidoki.chat`

---

## 🔐 Environment Variables

### Local `.env`
```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# Schema control
APP_ENV=dev           # dev | production
APP_SCHEMA=dev        # Chỉ ảnh hưởng legacy code

# Firebase Client (NEXT_PUBLIC_)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Auth
REQUIRE_AUTH=false    # Không ép login
DEV_ADMIN_SECRET=...  # Cho /api/admin/set-dev

# LLM
GEMINI_API_KEY=...
SILICON_API_KEY=...
```

---

## 🚨 Anti-Patterns

| ❌ Don't | ✅ Do |
|---------|------|
| Import global `prisma` | Use `getAuthContext(request).prisma` |
| Force login on app start | Guest-first, optional login |
| Hardcode schema name | Use `getPrismaForSchema()` |
| Overwrite user data during migration | Check existing before insert |
| Trust client headers for auth | Verify Firebase token server-side |

---

## 📌 Current Status

| Feature | Status |
|---------|--------|
| Guest mode (userId="me") | ✅ Working |
| Firebase Auth (Google/Email) | ✅ Working |
| Schema routing (public/dev) | ✅ Working |
| Guest → User migration | ✅ Working |
| Dev role assignment | ✅ Working |
| Web UI | ✅ Working |
| Android WebView | ⚠️ Needs sync after build |

---

## 📋 Short-term Priorities

1. **Test Android sync** - Verify APK loads latest UI
2. **Test migration flow** - Guest → Login → See migrated data
3. **Monitor logs** - Check `[Auth] guest → schema public` logs

---

## 🔧 Useful Commands

```bash
# Dev server
npm run dev

# Build
npm run build

# Database
npm run db:migrate:dev     # Migrate dev schema
npm run db:migrate:public  # Migrate public schema
npm run db:seed:dev        # Seed dev schema

# Android
npx cap copy android
npx cap open android

# Set dev role (local only)
curl -X POST http://localhost:3000/api/admin/set-dev \
  -H "X-Dev-Admin-Secret: YOUR_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"email": "dev@example.com", "role": "dev"}'
```

---

## 📚 Related Docs

- `DEPLOYMENT.md` - Railway deployment guide
- `QUICKSTART.md` - Local setup guide
- `.env.example` - All env vars with comments
