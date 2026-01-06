# ✅ Pre-Flight Checklist - Before Running Android App

## 🔴 CRITICAL - Do These First

### [ ] 1. Close Android Studio
- Close all Android Studio windows
- Check Task Manager to ensure no `studio64.exe` or `java.exe` processes related to Android Studio
- This prevents file lock issues

### [ ] 2. Run Fix Script
```powershell
.\tmp_rovodev_fix_android.ps1
```
Expected output:
- ✓ Removed old MainActivity
- ✓ New MainActivity exists at correct location
- ✓ build.gradle has correct namespace
- ✓ Gradle cleaned
- ✓ Capacitor synced

### [ ] 3. Update AndroidManifest.xml Manually
**File**: `android/app/src/main/AndroidManifest.xml`

**Required changes**:
1. Line 10: Add `android:usesCleartextTraffic="true"`
2. Line 13: Change `android:name=".MainActivity"` to `android:name="com.aurgilabs.aimichat.MainActivity"`

**Quick way**: Copy content from `tmp_rovodev_AndroidManifest_FIXED.xml`

## 📝 Verification Steps

### [ ] 4. Verify File Structure
```powershell
# Should return True
Test-Path "android/app/src/main/java/com/aurgilabs/aimichat/MainActivity.java"

# Should return False (old file deleted)
Test-Path "android/app/src/main/java/com/aimi/chat/MainActivity.java"
```

### [ ] 5. Check Build Configuration
```powershell
# Should show: namespace = "com.aurgilabs.aimichat"
Select-String "namespace" android/app/build.gradle

# Should show: applicationId "com.aurgilabs.aimichat"
Select-String "applicationId" android/app/build.gradle
```

### [ ] 6. Verify AndroidManifest
```powershell
# Should show: com.aurgilabs.aimichat.MainActivity
Select-String "android:name" android/app/src/main/AndroidManifest.xml

# Should show: usesCleartextTraffic
Select-String "cleartext" android/app/src/main/AndroidManifest.xml
```

## 🚀 Build and Run

### [ ] 7. Open in Android Studio
```powershell
npx cap open android
```

### [ ] 8. Clean and Rebuild
In Android Studio:
1. Build → Clean Project
2. Wait for completion
3. Build → Rebuild Project
4. Wait for completion (check Build Output at bottom)

### [ ] 9. Run the App
1. Select device/emulator from dropdown
2. Click green play button (Run)
3. Wait for app to install and launch

### [ ] 10. Monitor Logs
**Option A**: In Android Studio
1. Open Logcat tab (bottom)
2. Filter: `MainActivity`
3. Look for: "MainActivity onCreate completed successfully"

**Option B**: Use script (in separate PowerShell window)
```powershell
.\tmp_rovodev_test_logs.ps1
# Choose option 1 (Live logs)
```

## ✅ Success Criteria

### App Should:
- [ ] Launch without "App keeps stopping" error
- [ ] Show splash screen briefly
- [ ] Load web content (home screen or login)
- [ ] Logs show: "MainActivity onCreate started"
- [ ] Logs show: "MainActivity onCreate completed successfully"

### If Using Local Backend:
- [ ] Dev server is running (`npm run dev`)
- [ ] Updated capacitor.config.ts with your local IP
- [ ] Can access http://YOUR_IP:3000 from browser
- [ ] Phone/emulator is on same network as your PC

## 🐛 If App Still Crashes

### [ ] Get Crash Logs
```powershell
.\tmp_rovodev_test_logs.ps1
# Choose option 2 (Last crash)
```

### [ ] Common Issues

**"ClassNotFoundException: MainActivity"**
- ❌ AndroidManifest not updated
- ✅ Fix: Update line 13 with full class path

**"Unable to load page"**
- ❌ Server URL incorrect or server not running
- ✅ Fix: Check capacitor.config.ts and start dev server

**"GoogleAuth plugin error"**
- ℹ️ This is OK - error is caught and logged
- ✅ App should still launch

**Build errors in Android Studio**
- ❌ Gradle cache issue
- ✅ Fix: Run `cd android && .\gradlew.bat clean`

## 📱 Testing Checklist

After app launches successfully:

### Basic Functionality:
- [ ] App loads home screen
- [ ] Can navigate to characters page
- [ ] Can click on a character
- [ ] Chat interface loads
- [ ] Can type a message
- [ ] Back button works

### Authentication (if enabled):
- [ ] Login screen appears
- [ ] Can sign in with Google
- [ ] User profile shows after login
- [ ] Can sign out

### Network:
- [ ] API calls succeed (check Network in Chrome DevTools via desktop)
- [ ] Loading states appear
- [ ] Error messages show when offline

## 🎯 Quick Commands Reference

```powershell
# Clean everything
cd android && .\gradlew.bat clean && cd ..

# Sync Capacitor
npx cap sync android

# Open in Android Studio
npx cap open android

# View logs
.\tmp_rovodev_test_logs.ps1

# Check file structure
Get-ChildItem -Recurse android/app/src/main/java

# Rebuild app
cd android && .\gradlew.bat assembleDebug && cd ..
```

## 📚 Documentation Reference

- **Quick Fix**: `ANDROID_QUICK_FIX.md`
- **Detailed Guide**: `ANDROID_CRASH_FIX.md`
- **Architecture**: `ANDROID_PRISMA_NOTE.md`
- **Summary**: `ANDROID_FIX_SUMMARY.md`

## ⏱️ Estimated Time

- Fix application: ~5 minutes
- Clean build: ~2 minutes
- First run: ~1 minute
- Total: ~8-10 minutes

---

**Ready to go?** Start with step 1! 🚀
