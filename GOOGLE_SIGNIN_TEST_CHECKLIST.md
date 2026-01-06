# ✅ GOOGLE SIGN-IN TEST CHECKLIST

## 🎯 PRE-TESTING SETUP (MUST DO FIRST)

### ✅ 1. Add Environment Variable

Add to your `.env` or `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID=647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com
```

### ✅ 2. Add SHA Fingerprints to Google Cloud Console

🔗 Go to: https://console.cloud.google.com/apis/credentials?project=aimi-chat

1. Find OAuth Client: `647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt.apps.googleusercontent.com`
2. Click to edit
3. Add these fingerprints (click "+ ADD FINGERPRINT" for each):

```
Debug SHA-1:
AC:43:14:35:8C:8F:77:20:E5:07:90:DB:7C:20:73:24:09:49:A7:6C

Debug SHA-256:
2C:47:5F:2C:74:4B:0F:23:AD:09:60:57:95:BD:DF:BF:E9:51:D9:1A:8D:3C:1C:C9:DF:F4:36:8F:FE:53:38:BB

Release SHA-256:
EC:0D:C2:0A:8F:4C:57:5A:73:93:0A:C3:21:9F:4B:74:DF:34:66:DF:41:BC:F2:65:5E:5B:BE:78:0F:AA:A6:BA
```

4. Verify package name: `com.aurgilabs.aimichat`
5. Click **SAVE**

### ✅ 3. Verify OAuth Consent Screen

🔗 Go to: https://console.cloud.google.com/apis/credentials/consent?project=aimi-chat

- [ ] Status: **"Published"** OR **"Testing"** (with your email as test user)
- [ ] Scopes include: `email`, `profile`, `openid`

### ✅ 4. Sync and Build

```powershell
# Run from project root
npx cap sync android

cd android
./gradlew clean
./gradlew assembleDebug
```

---

## 📱 TEST 1: ANDROID EMULATOR (Google Play Image)

### Requirements:
- [ ] Emulator with **Google Play Store** icon (System image: "Google APIs" or "Google Play")
- [ ] Play Store is signed in
- [ ] Google Play Services is up to date

### Test Steps:

#### A. Launch App
```powershell
npx cap run android
# Or manually: adb install android/app/build/outputs/apk/debug/app-debug.apk
```

#### B. Monitor Logs
Open new terminal:
```powershell
adb logcat | Select-String -Pattern "GoogleAuth|MainActivity|signInWithGoogle|Firebase"
```

#### C. Expected Logs on App Launch:
```
MainActivity: MainActivity onCreate started
MainActivity: GoogleAuth plugin registered successfully
MainActivity: MainActivity onCreate completed successfully
```

#### D. Test Sign-In Flow

1. [ ] Tap "Sign in with Google" button
2. [ ] Check log: `[GoogleAuth] Initializing plugin...`
3. [ ] Check log: `[GoogleAuth] Plugin initialized successfully`
4. [ ] Check log: `[signInWithGoogle] Calling GoogleAuth.signIn()...`
5. [ ] Google account picker appears
6. [ ] Select account
7. [ ] Check log: `[signInWithGoogle] GoogleAuth.signIn() successful, user: [email]`
8. [ ] Check log: `[signInWithGoogle] Signing in to Firebase...`
9. [ ] Check log: `[signInWithGoogle] Firebase sign-in successful`
10. [ ] User is logged in (UI updates)

#### E. Troubleshooting Emulator

**If account picker doesn't appear:**
```powershell
# Check Google Play Services
adb shell "pm list packages | grep google"

# Should show:
# com.google.android.gms
# com.google.android.gsf
```

**If still failing:**
- Create new emulator with "Google Play" system image
- Sign in to Play Store
- Update Google Play Services in Play Store

---

## 📱 TEST 2: REAL ANDROID DEVICE

### Requirements:
- [ ] USB Debugging enabled
- [ ] Device connected via USB
- [ ] Google Play Services installed
- [ ] At least one Google account signed in on device

### Test Steps:

#### A. Install App
```powershell
cd android
./gradlew installDebug

# Or manually:
adb install app/build/outputs/apk/debug/app-debug.apk
```

#### B. Monitor Logs
```powershell
adb logcat | Select-String -Pattern "GoogleAuth|MainActivity|signInWithGoogle"
```

#### C. Test Sign-In

1. [ ] Launch app on device
2. [ ] Tap "Sign in with Google" button
3. [ ] Google account picker appears
4. [ ] Select account → Allow permissions
5. [ ] User is logged in successfully
6. [ ] Close app and reopen → User stays logged in

#### D. Expected Logs:
```
[GoogleAuth] Initializing plugin...
[GoogleAuth] Plugin initialized successfully
[signInWithGoogle] Calling GoogleAuth.signIn()...
[signInWithGoogle] GoogleAuth.signIn() successful, user: user@gmail.com
[signInWithGoogle] Signing in to Firebase...
[signInWithGoogle] Firebase sign-in successful
```

---

## 📱 TEST 3: RELEASE BUILD (Pre-Play Store)

### Build Release APK:

```powershell
cd android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

### Install on Device:

```powershell
adb install app/build/outputs/apk/release/app-release.apk
```

### Test:
- [ ] Sign in with Google works
- [ ] No crashes
- [ ] User stays logged in after restart
- [ ] All features work as expected

---

## 🐛 COMMON ERRORS & SOLUTIONS

### ❌ Error: `NullPointerException: GoogleSignInClient.getSignInIntent() on null`

**Cause:** Plugin not initialized

**Fix:**
- Check `NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID` is set in `.env`
- Run `npx cap sync android`
- Rebuild app
- Check Logcat for: `[GoogleAuth] Plugin initialized successfully`

---

### ❌ Error: `DEVELOPER_ERROR` (Error code 10)

**Cause:** Wrong SHA-1 fingerprint or package name

**Fix:**
1. Verify SHA-1 is in Google Cloud Console
2. Run this to check your current SHA-1:
```powershell
cd android
./gradlew signingReport
```
3. Compare with Google Cloud Console
4. Verify package name: `com.aurgilabs.aimichat`

---

### ❌ Error: `Error 12500` or `SIGN_IN_FAILED`

**Cause:** Wrong Client ID in `capacitor.config.ts`

**Fix:**
- Check `androidClientId` is: `647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt.apps.googleusercontent.com`
- Run `npx cap sync android`
- Rebuild app

---

### ❌ Error: `auth/invalid-credential` (Firebase)

**Cause:** Wrong Web Client ID

**Fix:**
- Check `serverClientId` in `capacitor.config.ts` is: `647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com`
- Verify Web Client ID exists in Google Cloud Console
- Run `npx cap sync android`

---

### ❌ Google account picker doesn't appear

**Cause 1:** Google Play Services not available

**Fix:**
- Use emulator with "Google Play" system image
- Update Google Play Services

**Cause 2:** OAuth consent screen not published

**Fix:**
- Go to OAuth consent screen → Publish app
- OR add your email as test user

---

### ❌ App gets stuck on "Loading..."

**Cause:** OAuth consent not configured

**Fix:**
1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=aimi-chat
2. Publish consent screen OR add test users
3. Try again

---

## 🚀 GOOGLE PLAY STORE CHECKLIST

### Before First Upload:

- [ ] All 4 SHA fingerprints in Google Cloud Console
- [ ] OAuth consent screen is **"Published"**
- [ ] Release build tested on real device
- [ ] Google Sign-In works end-to-end
- [ ] No crashes in Logcat
- [ ] `versionCode` incremented in `android/app/build.gradle`

### After First Upload with App Signing:

**CRITICAL:** If you enable "App Signing by Google Play", you MUST do this:

1. [ ] Go to: Play Console > Release > Setup > App Integrity > App signing key certificate
2. [ ] Copy **SHA-1** and **SHA-256** from "App signing key certificate" section
3. [ ] Add these to Google Cloud Console OAuth client (in addition to local release SHA)
4. [ ] Download fresh `google-services.json` from Firebase Console
5. [ ] Replace `android/app/google-services.json`
6. [ ] Upload new version with updated google-services.json

**Why:** Google re-signs your APK with a different certificate, so the SHA fingerprint changes!

---

## 📊 SUCCESS CRITERIA

### ✅ Emulator Test Passed:
- [x] App launches without crashes
- [x] GoogleAuth plugin initializes
- [x] Account picker appears
- [x] Sign-in completes successfully
- [x] User stays logged in

### ✅ Real Device Test Passed:
- [x] App installs successfully
- [x] Sign-in works on first try
- [x] No errors in Logcat
- [x] User persists after app restart

### ✅ Release Build Test Passed:
- [x] Release APK installs
- [x] Sign-in works with release SHA
- [x] All features functional

### ✅ Ready for Play Store:
- [x] All above tests pass
- [x] OAuth consent screen published
- [x] All SHA fingerprints registered
- [x] Version code incremented

---

## 🆘 IF ALL TESTS FAIL

### 1. Verify Configuration Files:

**capacitor.config.ts:**
```typescript
androidClientId: '647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt.apps.googleusercontent.com',
serverClientId: '647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com',
```

**Check environment variable:**
```powershell
# On Windows
Get-Content .env | Select-String -Pattern "WEB_CLIENT_ID"

# Should show:
# NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID=647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com
```

### 2. Full Clean Rebuild:

```powershell
# Clean everything
cd android
./gradlew clean
cd ..
rm -rf node_modules/.cache
rm -rf .next

# Reinstall and sync
npm install
npx cap sync android

# Rebuild
cd android
./gradlew assembleDebug
./gradlew installDebug
```

### 3. Check Google Cloud Console:

- [ ] OAuth Client `647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt` exists
- [ ] Package name: `com.aurgilabs.aimichat`
- [ ] Has Debug SHA-1: `AC:43:14:35:8C:8F:77:20:E5:07:90:DB:7C:20:73:24:09:49:A7:6C`
- [ ] Has Release SHA-1: `EB:1A:40:A3:71:39:F3:B4:7A:A7:69:C2:A2:ED:50:84:A7:E8:C7:B7`
- [ ] Web Client `647583841932-gekeglpllnt43tb0gkqnq294j5ejomla` exists

### 4. Check Logcat for Exact Error:

```powershell
adb logcat | Select-String -Pattern "Error|Exception|Failed|GoogleAuth"
```

Send the error logs for further debugging.

---

## ✅ FINAL CONFIRMATION

Once all tests pass, you can confirm:

- ✅ **NullPointerException crash is fixed** (plugin initialization added)
- ✅ **Wrong client IDs fixed** (correct package and Web client ID)
- ✅ **All SHA fingerprints registered** (debug + release)
- ✅ **Emulator test passed** (with Google Play image)
- ✅ **Real device test passed** (production-like environment)
- ✅ **Release build works** (ready for Play Store)

**Google Sign-In is now production-ready! 🎉**
