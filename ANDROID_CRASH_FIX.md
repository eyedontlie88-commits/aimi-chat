# Android App Crash - Root Cause Analysis and Fix

## 🔴 CRITICAL ISSUES FOUND

### Issue 1: **PACKAGE NAME MISMATCH** (Primary Crash Cause)
- **Build.gradle declares**: `com.aurgilabs.aimichat`
- **MainActivity package**: `com.aimi.chat`
- **AndroidManifest references**: `.MainActivity` (relative path expects `com.aurgilabs.aimichat`)
- **Result**: Android cannot find the MainActivity class → Instant crash

### Issue 2: **Missing Error Handling**
- MainActivity has no try-catch blocks
- GoogleAuth plugin import might fail if not properly installed
- No logging to diagnose issues

### Issue 3: **Capacitor Configuration Issues**
- `webDir` set to `public` but Next.js builds to `.next`
- Server URL pointing to production (may cause issues in dev)
- Missing cleartext traffic permission in manifest

## 🔧 FIXES REQUIRED

### Fix 1: Update MainActivity Package (CRITICAL)

**Option A: Move MainActivity to correct package (RECOMMENDED)**

Close Android Studio first, then:

```bash
# Delete old file
rm android/app/src/main/java/com/aimi/chat/MainActivity.java

# The corrected file is already created at:
# android/app/src/main/java/com/aurgilabs/aimichat/MainActivity.java
```

**Option B: Update build.gradle to match current package**

Edit `android/app/build.gradle`:
```gradle
android {
    namespace = "com.aimi.chat"  // Change from com.aurgilabs.aimichat
    defaultConfig {
        applicationId "com.aimi.chat"  // Change from com.aurgilabs.aimichat
    }
}
```

### Fix 2: Update AndroidManifest.xml

Close Android Studio, then edit `android/app/src/main/AndroidManifest.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode|navigation|density"
            android:name="com.aurgilabs.aimichat.MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="aimi-chat-yig9.vercel.app" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths"></meta-data>
        </provider>
    </application>

    <!-- Permissions -->
    <uses-permission android:name="android.permission.INTERNET" />
</manifest>
```

### Fix 3: Update Capacitor Configuration

Edit `capacitor.config.ts` for local development:

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.aurgilabs.aimichat',
  appName: 'Aimi Chat',
  webDir: 'out', // Next.js static export directory
  server: {
    // Comment out for local testing:
    // url: 'https://aimi-chat-yig9.vercel.app',
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      androidClientId: '647583841932-dshut2n2ngg6a60iborrb719i7tpjht9.apps.googleusercontent.com',
      serverClientId: '647583841932-dshut2n2ngg6a60iborrb719i7tpjht9.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  }
};

export default config;
```

## 📱 STEP-BY-STEP BUILD & TEST INSTRUCTIONS

### Step 1: Close Android Studio
Close Android Studio completely to unlock all files.

### Step 2: Apply Fixes
```powershell
# 1. Delete old MainActivity
Remove-Item "android/app/src/main/java/com/aimi/chat/MainActivity.java" -Force

# The corrected MainActivity is already at:
# android/app/src/main/java/com/aurgilabs/aimichat/MainActivity.java

# 2. Manually update AndroidManifest.xml with the changes above
# 3. Manually update capacitor.config.ts with the changes above
```

### Step 3: Clean and Rebuild
```powershell
# Clean Capacitor
npx cap sync android

# Clean Gradle cache
cd android
./gradlew clean

# Or on Windows:
.\gradlew.bat clean

cd ..
```

### Step 4: Build for Local Testing

**Option A: Build Web Assets Locally (No Database)**
```powershell
# Create static export
npm run build

# Copy to Android
npx cap copy android

# Sync
npx cap sync android
```

**Option B: Point to Development Server**
```powershell
# Start your dev server
npm run dev

# Update capacitor.config.ts:
server: {
  url: 'http://YOUR_LOCAL_IP:3000',
  cleartext: true
}

# Then sync
npx cap sync android
```

### Step 5: Open in Android Studio
```powershell
npx cap open android
```

### Step 6: Run and Debug

1. **Select Device/Emulator** in Android Studio
2. **Click Run** (Green Play button)
3. **Monitor Logcat** for errors:
   - Filter: `package:com.aurgilabs.aimichat`
   - Or tag: `MainActivity`

#### View Crash Logs:
```bash
# In Android Studio Terminal:
adb logcat | Select-String "MainActivity|AndroidRuntime|FATAL"
```

Expected logs:
```
D/MainActivity: MainActivity onCreate started
D/MainActivity: GoogleAuth plugin registered successfully
D/MainActivity: MainActivity onCreate completed successfully
```

## 🔍 DEBUGGING CHECKLIST

- [ ] MainActivity file is in correct package: `com/aurgilabs/aimichat/`
- [ ] AndroidManifest has full class path: `com.aurgilabs.aimichat.MainActivity`
- [ ] `usesCleartextTraffic="true"` is set in manifest
- [ ] Google Services JSON exists: `android/app/google-services.json`
- [ ] Gradle sync completes without errors
- [ ] App builds successfully in Android Studio
- [ ] Logcat shows MainActivity logs without exceptions

## 🚨 COMMON ISSUES & SOLUTIONS

### Issue: "ClassNotFoundException: MainActivity"
**Solution**: Package name mismatch - follow Fix 1

### Issue: "Unable to load web page"
**Solutions**:
- Check `capacitor.config.ts` webDir setting
- Ensure `npm run build` completed successfully
- For dev: Use local IP, not localhost
- Add `android:usesCleartextTraffic="true"`

### Issue: "GoogleAuth plugin error"
**Solution**: Already handled with try-catch in new MainActivity

### Issue: Files are locked
**Solution**: Close Android Studio before editing

### Issue: Database connection fails
**Expected**: Prisma requires Node.js backend - not available in mobile app
**Solution**: All API calls should go to your backend server

## 📋 VERIFICATION COMMANDS

```powershell
# Check package structure
Get-ChildItem -Recurse android/app/src/main/java

# Verify MainActivity exists
Test-Path android/app/src/main/java/com/aurgilabs/aimichat/MainActivity.java

# Check Gradle configuration
Select-String "namespace" android/app/build.gradle
Select-String "applicationId" android/app/build.gradle

# Verify manifest
Select-String "android:name" android/app/src/main/AndroidManifest.xml
```

## 🎯 QUICK TEST SCENARIO

After applying fixes:

1. Clean build: `cd android && .\gradlew.bat clean`
2. Sync: `npx cap sync android`
3. Open: `npx cap open android`
4. Build & Run in Android Studio
5. Check Logcat for "MainActivity onCreate completed successfully"
6. App should show splash screen then load web content

## 📞 NEXT STEPS AFTER FIX

1. Test basic navigation
2. Test Firebase authentication
3. Test API connectivity to backend
4. Add additional error boundaries in web code
5. Implement proper offline handling
6. Add Sentry/Crashlytics for production crash reporting

---

**Priority**: Fix package name mismatch FIRST - this is causing the immediate crash.
