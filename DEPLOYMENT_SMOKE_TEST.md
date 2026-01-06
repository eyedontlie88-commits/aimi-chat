# Vercel Deployment & Smoke Test Guide

**Date**: 2026-01-05
**Purpose**: Deploy LLM fallback fixes and verify production behavior

---

## 📋 Pre-Deployment Checklist

### 1. Review Changes
```bash
# See what will be deployed
git status
git diff lib/llm/router.ts
git diff app/api/chat/route.ts
```

**Files modified:**
- `lib/llm/router.ts` - Enhanced error detection and logging
- `app/api/chat/route.ts` - Improved error messages
- `app/api/admin/llm-status/route.ts` - Secured diagnostic endpoint
- `lib/llm/types.ts` - Added 'deepseek' to type
- `lib/llm/fallback.ts` - Added DeepSeek support
- `app/api/admin/keys/health/route.ts` - Added DeepSeek check

---

### 2. Verify Vercel Environment Variables

**Go to:** Vercel Dashboard → Your Project → Settings → Environment Variables

**Required Variables:**
```env
# LLM Configuration
LLM_ENABLE_FALLBACK=true
LLM_DEFAULT_PROVIDER=gemini
LLM_FALLBACK_PROVIDERS=silicon,moonshot

# Provider API Keys
GEMINI_API_KEY=<your-key>
SILICON_API_KEY=<your-key>
MOONSHOT_API_KEY=<your-key>
ZHIPU_API_KEY=<your-key>
OPENROUTER_API_KEY=<your-key>

# Optional
DEEPSEEK_API_KEY=<your-key-if-available>

# Admin
DEV_ADMIN_SECRET=<your-secret>
APP_ENV=production

# Database
DATABASE_URL=<your-connection-string>
DIRECT_URL=<your-direct-connection>

# Firebase
FIREBASE_SERVICE_ACCOUNT_JSON=<your-service-account>
NEXT_PUBLIC_FIREBASE_API_KEY=<your-key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<your-domain>
NEXT_PUBLIC_FIREBASE_PROJECT_ID=<your-project>
NEXT_PUBLIC_FIREBASE_APP_ID=<your-app-id>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<your-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-key>
SUPABASE_SERVICE_ROLE_KEY=<your-key>

# App URL (IMPORTANT - set this!)
NEXT_PUBLIC_APP_URL=https://aimi-chat-yig9.vercel.app
```

---

## 🚀 Deployment Steps

### Step 1: Commit Changes
```bash
# Stage all changes
git add .

# Commit with descriptive message
git commit -m "Fix LLM fallback system: handle 5xx errors, add structured logging, improve error messages"

# Push to main (triggers auto-deploy)
git push origin main
```

---

### Step 2: Monitor Deployment

**Option A: Vercel Dashboard**
1. Go to Vercel Dashboard
2. Click on your project
3. Click "Deployments" tab
4. Watch the latest deployment build
5. Wait for "Ready" status (usually 1-2 minutes)

**Option B: Vercel CLI**
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Check deployment status
vercel ls

# Follow logs
vercel logs --follow
```

---

## 🧪 Smoke Test Suite

### Test 1: Normal Chat (Gemini Available)

**Purpose**: Verify basic chat works with primary provider

```bash
# Replace with your actual auth token and character ID
export AUTH_TOKEN="your-firebase-id-token"
export CHARACTER_ID="your-test-character-id"
export BASE_URL="https://aimi-chat-yig9.vercel.app"

curl -X POST "$BASE_URL/api/chat" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"characterId\": \"$CHARACTER_ID\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Hello, how are you?\"}]
  }"
```

**Expected Response:**
```json
{
  "reply": "AI generated response...",
  "providerUsed": "gemini",
  "modelUsed": "gemini-2.5-flash",
  "attemptCount": 1,
  "fallbackUsed": false
}
```

**Expected Logs (in Vercel):**
```
[LLM Router] Selected default provider: gemini (env: gemini)
[LLM Router] Fallback providers (key-filtered): silicon, moonshot
[LLM Router] Trying provider: gemini (preferred: gemini)
[LLM Router] ✅ Success with gemini
```

**✅ Success Criteria:**
- HTTP 200 response
- `providerUsed: "gemini"`
- `fallbackUsed: false`

---

### Test 2: Check Provider Status

**Purpose**: Verify all providers are configured

```bash
export ADMIN_SECRET="your-dev-admin-secret"

curl "$BASE_URL/api/admin/llm-status" \
  -H "x-admin-secret: $ADMIN_SECRET"
```

**Expected Response:**
```json
{
  "summary": {
    "total": 6,
    "configured": 5,
    "missing": 1,
    "status": "operational"
  },
  "providers": {
    "gemini": { "configured": true, "keyName": "GEMINI_API_KEY" },
    "silicon": { "configured": true, "keyName": "SILICON_API_KEY" },
    "deepseek": { "configured": false, "keyName": "DEEPSEEK_API_KEY" },
    "moonshot": { "configured": true, "keyName": "MOONSHOT_API_KEY" },
    "zhipu": { "configured": true, "keyName": "ZHIPU_API_KEY" },
    "openrouter": { "configured": true, "keyName": "OPENROUTER_API_KEY" }
  },
  "config": {
    "defaultProvider": "gemini",
    "fallbackEnabled": true,
    "fallbackProviders": "silicon,moonshot"
  }
}
```

**✅ Success Criteria:**
- Shows at least 3 providers configured (gemini, silicon, moonshot)
- `fallbackEnabled: true`
- Correct `defaultProvider`

---

### Test 3: Simulate Gemini Failure (Fallback Test)

**Purpose**: Verify fallback works when primary provider fails

**Method A: Use Vercel Preview Environment (Recommended)**

1. Create a new branch:
```bash
git checkout -b test-fallback
```

2. Temporarily modify environment in Vercel Preview:
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Find `GEMINI_API_KEY`
   - Add override for Preview: `invalid-key-for-testing`
   - Deploy preview branch

3. Test against preview URL:
```bash
export BASE_URL="https://aimi-chat-preview-xxx.vercel.app"

curl -X POST "$BASE_URL/api/chat" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"characterId\": \"$CHARACTER_ID\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Test fallback\"}]
  }"
```

**Expected Response:**
```json
{
  "reply": "AI response from Silicon...",
  "providerUsed": "silicon",
  "modelUsed": "Qwen/Qwen2.5-14B-Instruct",
  "attemptCount": 2,
  "fallbackUsed": true
}
```

**Expected Logs:**
```
[LLM Router] Selected default provider: gemini (env: gemini)
[LLM Router] Fallback providers (key-filtered): silicon, moonshot
[LLM Router] Trying provider: gemini (preferred: gemini)
[LLM Router] ❌ Provider gemini failed: {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    status: 401,
    category: 'invalid_key',
    message: 'API key not valid. Please pass a valid API key.'
}
[LLM Router] Error is retriable, trying next provider...
[LLM Router] Trying provider: silicon (preferred: gemini)
[LLM Router] ✅ Success with silicon
```

**✅ Success Criteria:**
- HTTP 200 response
- `providerUsed: "silicon"` (not gemini)
- `fallbackUsed: true`
- `attemptCount: 2`

4. **IMPORTANT**: Restore environment after test:
   - Remove invalid key override
   - Delete test branch
   - Return to main branch

---

**Method B: Test in Production (Use Carefully)**

**⚠️ WARNING**: This will temporarily break Gemini for all users!

1. In Vercel Dashboard → Settings → Environment Variables (Production):
   - Edit `GEMINI_API_KEY`
   - Change to: `invalid-key-testing-fallback`
   - Save

2. Wait 30 seconds for deployment

3. Run test request (same as Method A)

4. **IMMEDIATELY** restore correct key:
   - Edit `GEMINI_API_KEY` back to correct value
   - Save
   - Wait for redeploy

**Only use this method during low-traffic periods!**

---

### Test 4: Monitor Real User Traffic

**Purpose**: Verify system works under real load

```bash
# Follow live logs
vercel logs --follow

# Or in dashboard: Deployments → Latest → Logs → Real-time
```

**What to look for:**
- ✅ `[LLM Router] ✅ Success with X` - Successful requests
- ❌ `[LLM Router] ❌ Provider X failed` - Failed attempts (should trigger fallback)
- 🔄 `Error is retriable, trying next provider` - Fallback working

**Healthy system should show:**
- Mostly successful first attempts
- Occasional fallbacks (normal during high load)
- No "All providers failed" errors

---

## 📊 Expected Log Patterns

### Pattern 1: Normal Operation (Gemini Works)
```
[Chat API] Processing chat for character: xxx
[LLM Router] Selected default provider: gemini (env: gemini)
[LLM Router] Fallback providers (key-filtered): silicon, moonshot
[LLM Router] Trying provider: gemini (preferred: gemini)
[LLM Router] ✅ Success with gemini
[Chat API] LLM Response received: 1234 chars, provider: gemini
```

---

### Pattern 2: Gemini Fails → Silicon Succeeds
```
[LLM Router] Trying provider: gemini (preferred: gemini)
[LLM Router] ❌ Provider gemini failed: {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    status: 503,
    category: 'quota_exceeded',
    message: 'Resource has been exhausted (e.g. check quota).'
}
[LLM Router] Error is retriable, trying next provider...
[LLM Router] Trying provider: silicon (preferred: gemini)
[LLM Router] ✅ Success with silicon
```

---

### Pattern 3: Multiple Failures → Eventually Succeeds
```
[LLM Router] Trying provider: gemini
[LLM Router] ❌ Provider gemini failed: { status: 503, category: 'service_unavailable' }
[LLM Router] Error is retriable, trying next provider...

[LLM Router] Trying provider: silicon
[LLM Router] ❌ Provider silicon failed: { status: 429, category: 'rate_limit' }
[LLM Router] Error is retriable, trying next provider...

[LLM Router] Trying provider: moonshot
[LLM Router] ✅ Success with moonshot
```

---

### Pattern 4: All Providers Failed (Rare)
```
[LLM Router] All providers failed: [
  { provider: 'gemini', status: 503, category: 'quota_exceeded' },
  { provider: 'silicon', status: 429, category: 'rate_limit' },
  { provider: 'moonshot', status: 500, category: 'server_error' }
]

[Chat API] All providers failed. Attempt details: [
  { provider: 'gemini', model: 'gemini-2.5-flash', status: 503, category: 'quota_exceeded' },
  { provider: 'silicon', model: 'Qwen/Qwen2.5-14B-Instruct', status: 429, category: 'rate_limit' },
  { provider: 'moonshot', model: 'moonshot-v1-32k', status: 500, category: 'server_error' }
]
```

**User sees:**
```
Tất cả mô hình AI đều đang quá tải hoặc hết quota. Bạn thử lại sau một chút nhé. 
(Đã thử: gemini/gemini-2.5-flash, silicon/Qwen/Qwen2.5-14B-Instruct, moonshot/moonshot-v1-32k)
```

---

## 🎯 Success Criteria Summary

| Test | Success Indicator |
|------|------------------|
| **Test 1: Normal Chat** | ✅ Gemini responds, `fallbackUsed: false` |
| **Test 2: Provider Status** | ✅ All providers shown correctly |
| **Test 3: Fallback** | ✅ Silicon/Moonshot used, `fallbackUsed: true` |
| **Test 4: Real Traffic** | ✅ No "all failed" errors, occasional fallbacks |

---

## 🐛 Troubleshooting

### Issue: Deployment fails
**Check:**
- TypeScript errors: `npm run build` locally
- Environment variables set correctly
- No syntax errors in modified files

---

### Issue: Chat returns 500/503 immediately
**Check:**
- `LLM_ENABLE_FALLBACK=true` is set
- At least one provider has valid API key
- Check Vercel logs for actual error

---

### Issue: Fallback doesn't work
**Check:**
- `LLM_FALLBACK_PROVIDERS` is set correctly
- Fallback providers have valid API keys
- Error is actually retriable (check category in logs)

---

### Issue: No logs visible
**Check:**
- Vercel logs may have delay (refresh page)
- Use `vercel logs --follow` for real-time
- Ensure you're looking at correct deployment

---

## 📝 Post-Test Cleanup

After testing:
- [ ] Restore any modified environment variables
- [ ] Delete preview deployments if used
- [ ] Delete test branches
- [ ] Verify production is stable
- [ ] Document any issues found
- [ ] Update team on deployment

---

## 🎉 Deployment Complete!

Once all tests pass, the system is ready for production use with robust fallback handling.

**Next steps:**
- Monitor for 24 hours
- Check error rates in analytics
- Adjust fallback order if needed
- Consider adding more providers
