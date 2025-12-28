# 🚨 PROTECTED SYSTEM - DO NOT BREAK

> **Last Updated:** 2025-12-28
> **Purpose:** Prevent regression on stable features

---

## �️ DOUBLE-LAYER PROTECTION SYSTEM

| Layer | Who | Action | Safety |
|-------|-----|--------|--------|
| **Layer 1** | bby | Read PROTECTED.md → Self-check | 70% |
| **Layer 2** | Ki | Force "🚨 PROTECTED CHECK" in every prompt | +29% |
| **Failsafe** | User | `git checkout` if bby rebels | +1% |

**Total: 99% safe!** 🎯

### Ki's Workflow (REQUIRED)
```
User: "Fix bug X"
↓
Ki checks:
1. Read PROTECTED.md → "X touches Phone system?"
2. Safe → Write prompt + remind bby to check
3. Protected → "STOP → suggest git checkout"
↓
Prompt format:
**🚨 PROTECTED CHECK - REQUIRED**
✅ Read PROTECTED.md → No conflicts
✅ Files: X.tsx (NOT protected)
✅ Preserves: Phone system + Supabase rules

TASK: [Fix X]
↓
bby executes → Ki verifies logs/code → Report to User
```

---

## �🔒 PROTECTED FEATURES

### 1. PHONE SYSTEM (COMPLETE ✅)

| File | Protection Level | Notes |
|------|-----------------|-------|
| `components/phone-os/apps/MessagesApp.tsx` | 🔒 **CRITICAL** | DB first via `/api/phone/get-conversations` |
| `components/phone-os/apps/MessageDetail.tsx` | 🔒 **CRITICAL** | Input `disabled={isSending}` ONLY |
| `app/api/phone/get-conversations/route.ts` | 🔒 **READ-ONLY** | Never add AI generation here |
| `app/api/phone/save-user-message/route.ts` | 🔒 **WRITE** | Fire & forget trigger |
| `lib/relationship/update-affection-helper.ts` | 🔒 **CRITICAL** | `phone_unlocked` FORCE logic |

**Phone Flow (DO NOT CHANGE):**
```
User opens Phone → /api/phone/get-conversations (READ DB)
User sends message → /api/phone/save-user-message (WRITE + trigger AI async)
AI reply → Polling via /api/phone/get-conversation-detail
```

### 2. SUPABASE RULES

| ✅ DO | ❌ DON'T |
|-------|----------|
| `.limit(1)` then `[0]` | `.single()` |
| `.limit(1)` then `[0]` | `.maybeSingle()` |
| Check for duplicates | Assume unique rows |

### 3. ARCHITECTURE RULES

| Rule | Description |
|------|-------------|
| **Fire & Forget** | `save-user-message` saves → triggers AI async → returns immediately |
| **READ-ONLY APIs** | `get-conversations`, `get-conversation-detail` never generate |
| **Frontend Polling** | Frontend polls for AI replies, never calls generate directly |

---

## 🛡️ BBY RULE #1: PROTECTED CHECK

**BEFORE CODING - MUST ANSWER:**

```
Files changed: [LIST ALL]
Protected files? [Y/N]
If Y → "🚨 PROTECTED! Copy OLD logic → PATCH only"
```

**Example:**
```
Files: MessagesApp.tsx → 🚨 PROTECTED!
MUST: Copy existing DB first logic → PATCH only
NO: Rewrite entire component
```

---

## 🛡️ BBY RULE #2: PATCH MODE ONLY

- ✅ NO full file rewrite
- ✅ Copy OLD code → Change 5-10 lines MAX
- ✅ Keep existing logic + comments
- ✅ Test: "Preserves Phone system"

---

## 📋 PROTECTED CHECK TEMPLATE

```markdown
## Protected Check (Dec 28, 2025)

**Files changed:**
- [ ] file1.tsx
- [ ] file2.ts

**Protected files touched?** [Y/N]

**If Y, actions taken:**
- Copied OLD logic
- PATCH only (X lines changed)
- Preserved: [list protected features]
```

---

## 🔓 PHONE UNLOCK LOGIC (REFERENCE)

```typescript
// lib/relationship/update-affection-helper.ts
const PHONE_UNLOCK_THRESHOLD = 101;

// FORCE TRUE when points >= 101
const finalPhoneUnlocked = shouldUnlockPhone ? true : wasPhoneUnlocked;

// Frontend fallback (ChatPage.tsx)
const isUnlocked = phoneUnlocked || affectionPoints >= 101;
```

---

> ⚠️ **WARNING:** Breaking these rules = Phone system regression = User cannot send messages
