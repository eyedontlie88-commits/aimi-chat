# Quick Start - Google Play Submission

**Time to complete**: ~2 hours  
**Review time**: 3-7 days

---

## 🚀 **Step 1: Configure Gradle (5 min)**

1. **Close Android Studio** if it's open
2. Open `android/app/build.gradle` in your text editor
3. Find the `buildTypes {` section (around line 18)
4. Add the signing configuration (see `GRADLE_SIGNING_CONFIG.txt`)
5. Save the file

---

## 🔐 **Step 2: Create Keystore (5 min)**

```powershell
# Navigate to android/app
cd android\app

# Generate keystore (answer all prompts)
keytool -genkey -v -keystore aimi-release-key.keystore -alias aimi-chat -keyalg RSA -keysize 2048 -validity 10000
```

**Prompts:**
- Keystore password: Choose a strong password
- Key password: Same as keystore (for simplicity)
- Name: Your name or company
- Other fields: Can leave blank or fill in

**⚠️ CRITICAL**: Save this password! You'll need it forever.

---

## 💾 **Step 3: Backup Keystore (MUST DO!)**

```powershell
# From android/app directory
Copy-Item aimi-release-key.keystore ..\..\BACKUP_aimi-release-key.keystore

# Also backup to:
# - Cloud storage (Google Drive, Dropbox)
# - Password manager
# - USB drive
# - Email to yourself
```

**Why?** If you lose this keystore, you can NEVER update your app on Google Play!

---

## ⚙️ **Step 4: Create keystore.properties**

```powershell
# Navigate to android directory
cd ..

# Create the file
New-Item -ItemType File -Name keystore.properties

# Open in notepad
notepad keystore.properties
```

**Add these lines** (replace YOUR_PASSWORD with your actual password):
```
storeFile=app/aimi-release-key.keystore
storePassword=YOUR_PASSWORD
keyAlias=aimi-chat
keyPassword=YOUR_PASSWORD
```

**Save and close.**

---

## 🔨 **Step 5: Build Release AAB (5 min)**

```powershell
# From android directory
.\gradlew clean
.\gradlew bundleRelease
```

**Expected output:**
```
BUILD SUCCESSFUL in 45s
```

**Verify:**
```powershell
Test-Path app\build\outputs\bundle\release\app-release.aab
# Should return: True
```

**AAB Location**: `android/app/build/outputs/bundle/release/app-release.aab`

---

## 🔑 **Step 6: Get SHA-1 for Firebase (5 min)**

```powershell
# From android/app directory
cd app
keytool -list -v -keystore aimi-release-key.keystore -alias aimi-chat
```

**Copy the SHA-1 fingerprint** (looks like: `A1:B2:C3:D4:E5...`)

**Add to Firebase:**
1. Go to https://console.firebase.google.com
2. Select your project
3. Project Settings → Your apps → Android app
4. Scroll to "SHA certificate fingerprints"
5. Click "Add fingerprint"
6. Paste SHA-1
7. Save
8. **Download new google-services.json**
9. Replace `android/app/google-services.json`
10. Rebuild AAB (repeat Step 5)

---

## 📱 **Step 7: Test on Physical Device (30 min)**

### Option A: Test with Release APK

```powershell
# Build APK instead of AAB
cd android
.\gradlew assembleRelease

# Install on device (connect via USB)
adb install app\build\outputs\apk\release\app-release.apk
```

### Option B: Extract APK from AAB

```powershell
# Install bundletool
npm install -g @android/bundletool

# Convert AAB to APK
cd android\app\build\outputs\bundle\release
bundletool build-apks --bundle=app-release.aab --output=app-release.apks --mode=universal

# Extract
Expand-Archive -Path app-release.apks -DestinationPath apks -Force

# Install
adb install apks\universal.apk
```

### Test Checklist:
- [ ] App opens without crashes
- [ ] Google Sign-In works
- [ ] Can navigate to characters page
- [ ] Can open a chat
- [ ] Can send messages (AI responds)
- [ ] App restarts without needing to sign in again

**If Google Sign-In fails:**
- Check that SHA-1 was added to Firebase
- Download new google-services.json
- Rebuild AAB

---

## 📄 **Step 8: Prepare Store Assets (30 min)**

### A. Privacy Policy
1. Open `GOOGLE_PLAY_SUBMISSION.md`
2. Copy privacy policy template
3. Create `public/privacy.html`
4. Commit and deploy to Vercel
5. URL: `https://aimi-chat-yig9.vercel.app/privacy.html`

### B. Screenshots (capture 4-8 images)
Use your Android device:
1. Characters page
2. Chat interface
3. Relationship stats
4. Settings

Resize to 1080 x 1920 if needed.

### C. Feature Graphic (optional but recommended)
- Size: 1024 x 500
- Can use Canva or Figma
- Simple: Logo + tagline

### D. App Description
See GOOGLE_PLAY_SUBMISSION.md for template.

---

## 🏪 **Step 9: Upload to Play Console (30 min)**

1. Go to https://play.google.com/console
2. Click "Create app"
3. Fill basic info:
   - Name: AImi Chat
   - Language: English
   - Type: App
   - Free/Paid: Free
4. Complete store listing:
   - Upload screenshots
   - Add description
   - Add privacy policy URL
   - Select category: Communication
5. Complete app content:
   - Fill content rating
   - Complete data safety
   - Add target audience (13+)
6. Create release:
   - Production → Create new release
   - Upload `app-release.aab`
   - Add release notes
   - Review and rollout

---

## ⏱️ **Timeline**

- Configuration: 5 min
- Keystore: 5 min
- Build: 5 min
- Firebase SHA-1: 5 min
- Device testing: 30 min
- Privacy policy: 15 min
- Screenshots: 20 min
- Play Console: 30 min

**Total**: ~2 hours

**Review**: 3-7 days (sometimes up to 2 weeks)

---

## 🆘 **Troubleshooting**

### Build fails: "keystore.properties not found"
- Check file exists in `android/keystore.properties`
- Check path in file: `storeFile=app/aimi-release-key.keystore`

### Google Sign-In error: "Error 10"
- Add SHA-1 to Firebase Console
- Download new google-services.json
- Rebuild AAB

### AAB too large (> 150 MB)
- Should be ~5-15 MB
- Check for unnecessary files in `public/`

### Can't find AAB file
- Path: `android/app/build/outputs/bundle/release/app-release.aab`
- If missing, check build logs for errors

---

## ✅ **Final Checklist**

Before submission:
- [ ] AAB built successfully
- [ ] Tested on physical device
- [ ] Google Sign-In works
- [ ] Chat functionality works
- [ ] Privacy policy published
- [ ] Screenshots prepared (4-8 images)
- [ ] App description written
- [ ] Content rating completed
- [ ] SHA-1 added to Firebase
- [ ] versionCode: 1, versionName: "1.0"

---

## 📚 **Resources**

- Full guide: `GOOGLE_PLAY_SUBMISSION.md`
- Build guide: `ANDROID_BUILD.md`
- Gradle config: `GRADLE_SIGNING_CONFIG.txt`

---

**Ready? Start with Step 1! 🚀**
