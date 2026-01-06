# 🚀 Android Crash - QUICK FIX (5 Minutes)

## Root Cause
**Package name mismatch**: MainActivity is in `com.aimi.chat` but build.gradle expects `com.aurgilabs.aimichat`

## Fix Steps (In Order)

### 1. Close Android Studio ⚠️
**IMPORTANT**: Close Android Studio completely before making changes!

### 2. Run Auto-Fix Script
```powershell
.\tmp_rovodev_fix_android.ps1
```

### 3. Update AndroidManifest.xml
Replace the content of `android/app/src/main/AndroidManifest.xml` with the content from:
```
tmp_rovodev_AndroidManifest_FIXED.xml
```

**Key changes:**
- Line 10: Added `android:usesCleartextTraffic="true"`
- Line 13: Changed to `android:name="com.aurgilabs.aimichat.MainActivity"`

### 4. Update capacitor.config.ts (Optional for Local Dev)
For local testing, see: `tmp_rovodev_capacitor_config_LOCAL.ts`

### 5. Build and Run
```powershell
# Open in Android Studio
npx cap open android

# In Android Studio:
# 1. Build > Clean Project
# 2. Build > Rebuild Project
# 3. Run app (Green play button)
```

### 6. Check Logs
In Android Studio Logcat, filter by `MainActivity` and look for:
```
D/MainActivity: MainActivity onCreate started
D/MainActivity: MainActivity onCreate completed successfully
```

## Files Changed
✅ Created: `android/app/src/main/java/com/aurgilabs/aimichat/MainActivity.java` (with error handling)
🗑️ Delete: `android/app/src/main/java/com/aimi/chat/MainActivity.java` (old location)
✏️ Update: `android/app/src/main/AndroidManifest.xml` (use fixed version)

## If Still Crashing
Run this in PowerShell to see crash logs:
```powershell
adb logcat -d | Select-String "FATAL|AndroidRuntime|MainActivity" | Select-Object -Last 50
```

## Common Issues
- **Files locked**: Close Android Studio first
- **Build errors**: Run `cd android && .\gradlew.bat clean`
- **Can't connect to server**: Update capacitor.config.ts with your local IP
- **GoogleAuth error**: Already handled with try-catch (safe to ignore)

## Full Documentation
See `ANDROID_CRASH_FIX.md` for detailed explanation and troubleshooting.
