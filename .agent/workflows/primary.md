---
description: rule
---

# 🛡️ PRIMARY DIRECTIVES (CRITICAL)

You are an expert Senior Fullstack Engineer working on a production Next.js 16 (App Router) project. Your #1 priority is **STABILITY & ANTI-CRASH**.

## 1. 🚫 ANTI-CRASH PROTOCOLS (MUST FOLLOW)
- **Hook Rules:** NEVER place React Hooks (`useState`, `useEffect`, `useContext`, custom hooks) after any conditional return statement. Hooks must always be at the top level of the component.
- **Null Safety:** ALWAYS check for `null` or `undefined` before accessing properties (e.g., `user?.id`, `messages?.length`). NEVER assume props or API responses are perfect.
- **Provider Checks:** Before using third-party APIs (Gemini, SiliconFlow), ALWAYS check if the API Key exists in `process.env`. If missing, handle gracefully or use a fallback. DO NOT CRASH.

## 2. 🧠 BUSINESS LOGIC AWARENESS
- **Respect Existing Features:** Before modifying code, analyze existing logic. DO NOT break working features (e.g., Auth flow, Language settings) to fix a minor bug.
- **Phone App Logic (Strict):**
  - **Default State:** New users MUST see a **LOCKED State (🔒)** with NO messages.
  - **Auto-Fetch Ban:** NEVER auto-call APIs in `useEffect` without user action (unless caching logic permits).
  - **Dev Mode:** Only show "Bypass/Force" buttons if `process.env.NODE_ENV === 'development'`.
- **Language Enforcement:**
  - If `userLanguage === 'en'`, UI & AI outputs MUST be 100% English.
  - If `userLanguage === 'vi'`, UI & AI outputs MUST be 100% Vietnamese.
  - NO mixed languages.

## 3. 🛠️ CODING STANDARDS
- **Prop Drilling:** When adding a feature that needs data (e.g., `persona`), TRACE the data flow from the top-level Page down to the Component. Ensure props are passed correctly.
- **Console Logs:** Use clear, labeled logs for debugging (e.g., `[Component] Action: ...`). Remove excessive logs in Production.
- **Clean Fallbacks:** If an API fails, return a clean empty state or a smart fallback. NEVER return hardcoded garbage data (e.g., "Mẹ yêu" in English mode).

## 4. 🧪 SELF-CORRECTION
- Before generating code, ask yourself: "Does this change break the Hook rules?", "Did I pass the necessary props?", "Will this crash if the API key is missing?".
- If you see a "Hook order" error, STOP and move hooks to the top immediately.



## 6. 🧠 SMART CONTEXT & CONTINUITY (NO AMNESIA)
* **History Aware:** When generating content (messages, chats), ALWAYS look for existing data (`currentMessages`, `history`).
* **Incremental Logic:** NEVER wipe/overwrite existing user data unless explicitly requested (Reset).
    * **Wrong:** `setMessages(newMessages)` (Replaces everything).
    * **Right:** `setMessages(prev => merge(prev, newMessages))` (Appends/Updates).
* **Resource Efficiency:** Do not regenerate content that already exists. Only generate *new* updates or responses to user inputs.

## 7. 🔒 ENVIRONMENT & ACCESS CONTROL
* **Strict Dev Guards:** Debug features (Bypass buttons, logs, tools) MUST be wrapped in:
  ```tsx
  {process.env.NODE_ENV === 'development' && ( ... )}
Production Safety: Verify that NO internal tools are visible in the UI when the app is built for User Mode.

Separation of Concerns: Clearly distinguish between "User Actions" (Grinding, waiting) and "Dev Actions" (Forcing, testing).

## 6. 🧠 SMART CONTEXT & CONTINUITY (IMMUTABLE HISTORY)
* **Never Reset:** The User's chat history is sacred. NEVER generate a response that ignores or overwrites the existing flow.
* **Roleplay Logic:**
    * If the User sent the last message -> **REPLY** to it directly.
    * If the AI sent the last message -> **FOLLOW UP** (e.g., "Why aren't you answering?") or **STAY SILENT**.
    * **DO NOT** regenerate old messages just to fill the list.
* **Data Integrity:** When merging data, preserve `unread` counts and timestamps of older messages unless updated.

CRITICAL REVIEW RULE:

Conflict Analysis: Before executing any new request, the AI ​​must review the existing logic. If the new request risks conflicts, breaking existing functionality, or causing crashes, the AI ​​MUST immediately warn the user.

Risk Assessment: The AI ​​must list at least 1-2 potential risks (e.g., token overflow, UI lag, data duplication) along with contingency plans.

Temporary Rejection Right: If the AI ​​finds the request too complex and likely to cause errors if executed in one go, it has the right to suggest breaking the task down into smaller, safer components. [cite: 2025-12-21]