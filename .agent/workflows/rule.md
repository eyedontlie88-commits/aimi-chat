---
description: rule
---

You are editing an existing Next.js 16 + TypeScript + Prisma + Supabase project.

## Hard rules (MUST follow)

1. Scope & Safety
- Do NOT create new routes, new pages, or new top-level modules unless explicitly requested.
- Do NOT rename or move existing files, components, or APIs.
- Do NOT remove existing logic (especially breakup flow, phone messages, silent generation, auto-memory, dev tools); only extend or refactor minimally.
- Prefer small, localized patches instead of full-file rewrites.

2. Database & RelationshipConfig
- The relationship table is public."RelationshipConfig".
- Do NOT touch or recreate any legacy table such as relationshipstats.
- Use "RelationshipConfig" for all relationship-related reads/writes.
- The phone unlock boolean is stored in the "phone_unlocked" column. Do NOT change its name or type.
- When querying a single row, never use .single() / .maybeSingle() patterns that can crash on duplicates. Always:
  - Apply an appropriate filter (by userId + characterId).
  - Use `.limit(1)` and then read `[0]` in the result array.
  - This is critical because there may be duplicate rows.

3. Phone API Architecture (MUST NOT break)
- The phone detail API (`/api/phone/get-conversation-detail`) is READ-ONLY. It must ONLY:
  - Read from the database.
  - Return messages + conversation info.
  - It must NOT trigger AI generation or write to the DB.
- AI generation for phone messages is triggered indirectly when saving a user message:
  - The frontend calls "save user message" API only.
  - That API will:
    - Save the message.
    - Fire-and-forget a background call to generate an AI reply if needed.
  - The frontend must NEVER call any "generate" API directly for normal user flow.
- When you see logs referencing phone generation, respect this design. Do not merge read + generate into a single endpoint.

4. Phone unlock logic (current phase)
- Unlock threshold is a hard-coded constant: affection >= 101.
- Unlock is one-way for now:
  - If affection crosses from <101 to >=101 AND phone_unlocked was false:
    - Set phone_unlocked = true in RelationshipConfig.
    - Return "phoneUnlocked: true" and a one-time "phoneJustUnlocked: true" flag in the API response that updates relationship state.
  - Future changes like re-locking or per-character thresholds are out of scope unless explicitly requested.
- Do NOT read any unlock threshold from config or from DB in this phase.

5. Frontend integration rules
- Work inside existing components (e.g. ChatPage, PhoneHomeScreen, modals, etc.).
- Do NOT change the high-level flow:
  - User sends a message -> chat API -> response includes relationship info -> ChatPage updates local state.
  - ChatPage uses that state to:
    - Render affection bar and stage.
    - Control phoneUnlocked / phoneJustUnlocked / showPhoneOS.
- When updating ChatPage:
  - Keep all existing state and effects intact (auth, breakup, micro-feedback, auto-memory, search, dev tools, etc.).
  - Only extend the parts that handle:
    - Relationship updates from the API.
    - Phone unlock popup behavior.
- Phone LOCKED behavior:
  - If phoneUnlocked === false when tapping the Phone icon, keep showing the lock modal as-is.
- Phone UNLOCKED celebration popup:
  - Triggered by phoneJustUnlocked === true.
  - Only change:
    - Text content (when requested).
    - "Open Phone" button to:
      - setPhoneJustUnlocked(false)
      - setShowPhoneOS(true)

6. Patch style & Types
- Use a PATCH-style approach:
  - Show only the minimal diff with enough context around the changed lines.
  - Avoid pasting the entire file unless the human explicitly asks.
- Keep TypeScript strictness:
  - Narrow types carefully (e.g. check for typeof === 'boolean' before using new fields from responses).
  - Reuse existing types/interfaces where possible instead of redefining them.

7. No commands, no infra
- Do NOT write or suggest shell commands (npm, npx, git, prisma, supabase, etc.) inside your answer.
- Do NOT modify env variable names or assume new env keys.
- Assume migrations / DB column creation are handled manually by the human unless explicitly requested as SQL snippets.

8. Acceptance checks before you finish
Before you consider your patch complete, you must verify (by reasoning over the code, not by running it) that:
- You did not introduce any new route or table.
- All relationship reads/writes go through RelationshipConfig, not relationshipstats.
- Phone unlock threshold is fixed at 101 and cannot be configured.
- "get-conversation-detail" APIs remain read-only.
- Frontend still:
  - Sends only user messages.
  - Polls for conversation/phone updates.

🔒 PROTECTED RULE (Dec 28, 2025)

PHONE SYSTEM đã COMPLETE → tuyệt đối không regression.
Mọi task liên quan Phone phải PATCH ONLY, không rewrite/refactor.

1) 🔒 PHONE SYSTEM (DO NOT TOUCH)

Protected logic:

MessagesApp.tsx → DB first, lấy list qua /api/phone/get-conversations

MessageDetail.tsx → input luôn enabled, chỉ disable đúng: disabled={isSending}

app/api/phone/get-conversations/route.ts → READ-ONLY

update-affection-helper.ts → phone_unlocked FORCE, unlock khi affection >= 101

Quick Gen UX → spinner + "Đang tạo 25 tin..."

2) 🔒 SUPABASE RULES

✅ .limit(1) luôn dùng

🚫 không .single() / .maybeSingle()

✅ RLS: Enable all access (dev)

🚫 NO manual commands (npm/SQL/CLI)

3) 🔒 ARCHITECTURE

✅ Fire & Forget: save-user-message chỉ lưu DB → AI trigger async

✅ /api/phone/get-conversation-detail = READ-ONLY

🚫 Frontend không generate AI, chỉ polling

✅ PROTECTED CHECK (bắt buộc trước coding)

Files changed: [LIST]
Protected files touched? [Y/N]
Nếu Y → Copy OLD logic → PATCH nhỏ thôi.
  - Shows lock modal when phoneUnlocked is false.
  - Shows celebration popup + opens Phone OS when phoneJustUnlocked is true.