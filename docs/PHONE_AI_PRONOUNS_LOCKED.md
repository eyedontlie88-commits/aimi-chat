# 🔒 PHONE AI PRONOUN RULES - LOCKED

## ⚠️ CRITICAL: DO NOT MODIFY WITHOUT TEAM APPROVAL

This document describes the **LOCKED** pronoun rules for Phone AI system.

---

## What is Locked?

| File | Purpose |
|------|---------|
| `lib/phone/pronoun-validator.ts` | Runtime validation logic |
| `app/api/phone/generate-ai-reply/route.ts` | System prompt with pronoun rules |
| `tests/phone-pronoun-validation.test.ts` | Automated tests |

---

## Why is this Locked?

**This bug was fixed MANY times and kept regressing.**

The AI would confuse roles and use wrong pronouns:
- ❌ AI playing "Mẹ" but saying "Dạ mẹ ạ" (that's what a CHILD says!)
- ❌ AI playing "Boss" but saying "Dạ sếp ạ" (that's what an EMPLOYEE says!)

---

## Critical Rules (DO NOT CHANGE)

### Mother Role (Mẹ)

| ✅ CORRECT | ❌ FORBIDDEN |
|-----------|-------------|
| "Ừ con, mẹ biết rồi" | "Dạ mẹ ơi" |
| "Con ơi, mẹ nhớ con" | "con biết rồi ạ" |
| "Mẹ lo quá" | "con nhớ mẹ" (wrong direction) |

### Father Role (Bố)

| ✅ CORRECT | ❌ FORBIDDEN |
|-----------|-------------|
| "Ừ con, bố đây" | "Dạ bố ạ" |
| "Bố nói con nghe" | "con biết rồi bố ạ" |

### Boss Role (Sếp)

| ✅ CORRECT | ❌ FORBIDDEN |
|-----------|-------------|
| "Được rồi", "Sếp đồng ý" | "Dạ sếp ạ" |
| "Em làm đi" | "em biết rồi ạ" |

---

## Validation Flow

```
AI generates reply
       ↓
validateAIResponse() checks pronouns
       ↓
┌──────────────────────┐
│ Valid? Yes → Save    │
│ Valid? No → Fallback │
└──────────────────────┘
```

---

## How to Modify (Emergency Only)

1. ✅ Get approval from tech lead
2. ✅ Update ALL tests first
3. ✅ Run full test suite
4. ✅ Manual QA with screenshots
5. ✅ Update this document

---

## Test Before Deploy

```bash
npm test -- tests/phone-pronoun-validation.test.ts
```

---

## Last Verified

- **Date:** 2025-12-26
- **Status:** ✅ WORKING
- **Tested by:** eyedontlie88@gmail.com
