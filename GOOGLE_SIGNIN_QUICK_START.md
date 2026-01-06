# 🚀 GOOGLE SIGN-IN QUICK START

## ✅ WHAT WAS FIXED

**Problem:** App crashed with `NullPointerException: GoogleSignInClient.getSignInIntent() on null`

**Solution:** Added `GoogleAuth.initialize()` before calling `signIn()` + Fixed client IDs

---

## 🎯 3 STEPS TO GET IT WORKING

### **STEP 1: Add Environment Variable (30 seconds)**

Add to `.env` or `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID=647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com
```

### **STEP 2: Add SHA Fingerprints to Google Cloud Console (2 minutes)**

🔗 https://console.cloud.google.com/apis/credentials?project=aimi-chat

1. Find OAuth Client: `647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt.apps.googleusercontent.com`
2. Click "+ ADD FINGERPRINT" and add these 3:

```
AC:43:14:35:8C:8F:77:20:E5:07:90:DB:7C:20:73:24:09:49:A7:6C
2C:47:5F:2C:74:4B:0F:23:AD:09:60:57:95:BD:DF:BF:E9:51:D9:1A:8D:3C:1C:C9:DF:F4:36:8F:FE:53:38:BB
EC:0D:C2:0A:8F:4C:57:5A:73:93:0A:C3:21:9F:4B:74:DF:34:66:DF:41:BC:F2:65:5E:5B:BE:78:0F:AA:A6:BA
```

3. Click **SAVE**

### **STEP 3: Rebuild and Test (2 minutes)**

```powershell
npx cap sync android
cd android
./gradlew clean assembleDebug
cd ..
npx cap run android
```

**Expected:** Google account picker appears → Sign in works!

---

## 🧪 TEST ON EMULATOR

**Requirements:**
- Emulator with **Google Play Store** icon
- Signed in to Play Store

**Test:**
1. Launch app
2. Tap "Sign in with Google"
3. Select account
4. ✅ Success!

**Monitor logs:**
```powershell
adb logcat | Select-String "GoogleAuth|signInWithGoogle"
```

Expected logs:
```
[GoogleAuth] Plugin initialized successfully
[signInWithGoogle] Firebase sign-in successful
```

---

## 🧪 TEST ON REAL DEVICE

```powershell
cd android
./gradlew installDebug
```

1. Launch app
2. Tap "Sign in with Google"
3. Select account
4. ✅ Success!

---

## 🐛 TROUBLESHOOTING

### ❌ `NullPointerException` still happening?

**Check:**
- `.env` has `NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID`
- Ran `npx cap sync android`
- Rebuilt app

### ❌ `DEVELOPER_ERROR` or error code 10?

**Check:**
- SHA fingerprints added to Google Cloud Console
- Package name is `com.aurgilabs.aimichat`

### ❌ Account picker doesn't appear?

**Check:**
- Emulator has Google Play Store
- OAuth consent screen is published (or you're added as test user)

---

## 📋 FILES CHANGED

✅ **lib/firebase/client.ts** - Added `GoogleAuth.initialize()`  
✅ **capacitor.config.ts** - Fixed client IDs  
✅ **.env.example** - Added `NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID`  

---

## 📚 FULL DOCUMENTATION

- **Complete fix guide:** `docs/GOOGLE_SIGNIN_FIX.md`
- **Test checklist:** `GOOGLE_SIGNIN_TEST_CHECKLIST.md`

---

## ✅ DONE!

After following the 3 steps above, Google Sign-In will work on:
- ✅ Android Emulator (with Google Play)
- ✅ Real Android devices
- ✅ Release builds (Google Play Store)

**No more crashes! 🎉**
