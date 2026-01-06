# Google Play Store Submission Guide - AImi Chat

**Date**: 2026-01-05
**App**: AImi Chat
**Package**: com.aimi.chat
**Current Version**: 1.0 (versionCode: 1)

---

## 📋 **PART 1: Create Release Signing Key**

### **Step 1: Generate Keystore**

**Important**: This keystore is your permanent identity. If you lose it, you can NEVER update your app on Google Play!

```powershell
# Navigate to android/app directory
cd android\app

# Generate keystore (one-time only)
keytool -genkey -v `
  -keystore aimi-release-key.keystore `
  -alias aimi-chat `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000
```

**You'll be prompted for:**

1. **Keystore password**: Choose a STRONG password (save it!)
   - Example: `YourStrongPassword123!`
   - ⚠️ Write this down in a secure location

2. **Key password**: Can be same as keystore password or different
   - Recommendation: Use the same for simplicity
   - ⚠️ Write this down too

3. **Your details**:
   ```
   What is your first and last name?
     [Enter your name or company name]
   
   What is the name of your organizational unit?
     [Enter: Development or leave blank]
   
   What is the name of your organization?
     [Enter your company/app name]
   
   What is the name of your City or Locality?
     [Enter your city]
   
   What is the name of your State or Province?
     [Enter your state/province]
   
   What is the two-letter country code for this unit?
     [Enter: VN for Vietnam, US for USA, etc.]
   ```

4. **Confirm**: Type `yes` when prompted

**Output**: `aimi-release-key.keystore` created in `android/app/`

---

### **Step 2: Backup Your Keystore (CRITICAL)**

**⚠️ THIS IS THE MOST IMPORTANT STEP! ⚠️**

```powershell
# Create a secure backup
cd android\app
Copy-Item aimi-release-key.keystore ..\..\BACKUP_aimi-release-key.keystore
```

**Store backups in:**
1. ✅ Password manager (1Password, LastPass, etc.)
2. ✅ Cloud storage (Google Drive, Dropbox - in a secure folder)
3. ✅ External USB drive (offline backup)
4. ✅ Email it to yourself (encrypted attachment)

**Why critical?**
- If you lose this keystore, you CANNOT update your app
- You'll have to publish a new app with a different package name
- All existing users will need to download the new app

---

### **Step 3: Create keystore.properties File**

This file stores your signing credentials securely (not committed to git).

```powershell
# Create keystore.properties in android/ directory
cd android
New-Item -ItemType File -Name keystore.properties
```

**Edit `android/keystore.properties` with:**
```properties
storeFile=app/aimi-release-key.keystore
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=aimi-chat
keyPassword=YOUR_KEY_PASSWORD
```

**Example:**
```properties
storeFile=app/aimi-release-key.keystore
storePassword=YourStrongPassword123!
keyAlias=aimi-chat
keyPassword=YourStrongPassword123!
```

---

### **Step 4: Update .gitignore**

**CRITICAL**: Prevent keystore from being committed to git!

Add to `.gitignore`:
```
# Signing keys (DO NOT COMMIT)
android/keystore.properties
android/app/*.keystore
android/app/*.jks
*.keystore
*.jks
BACKUP_*.keystore
```

**Verify it's ignored:**
```powershell
git status
# Should NOT show keystore.properties or .keystore files
```

---

## 🔧 **PART 2: Configure Gradle for Release Builds**

### **Step 1: Update android/app/build.gradle**

Open `android/app/build.gradle` and add signing configuration:

**Find the `android {` block and add BEFORE `buildTypes`:**

```gradle
android {
    // ... existing config (namespace, compileSdk, etc.) ...

    // ✅ ADD THIS SECTION (before buildTypes)
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            if (keystorePropertiesFile.exists()) {
                def keystoreProperties = new Properties()
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release  // ✅ ADD THIS LINE
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    // ... rest of config ...
}
```

**Complete example of what it should look like:**

```gradle
android {
    namespace "com.aimi.chat"
    compileSdk rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "com.aimi.chat"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1  // ← INCREMENT THIS FOR EACH RELEASE
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions {
             // Files and dirs to omit from the packaged assets dir, modified to accommodate modern web apps.
             ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~'
        }
    }

    // ✅ Signing configuration
    signingConfigs {
        release {
            def keystorePropertiesFile = rootProject.file("keystore.properties")
            if (keystorePropertiesFile.exists()) {
                def keystoreProperties = new Properties()
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release  // ✅ Use signing config
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 📦 **PART 3: Build Release AAB**

### **Step 1: Clean Build**

```powershell
cd android
.\gradlew clean
```

---

### **Step 2: Build Release AAB**

```powershell
.\gradlew bundleRelease
```

**Expected output:**
```
> Task :app:bundleRelease
BUILD SUCCESSFUL in 45s
142 actionable tasks: 142 executed
```

---

### **Step 3: Locate Your AAB**

```powershell
# AAB location
$aabPath = "app\build\outputs\bundle\release\app-release.aab"

if (Test-Path $aabPath) {
    $aab = Get-Item $aabPath
    Write-Output "✅ AAB BUILD SUCCESSFUL!"
    Write-Output "Location: $($aab.FullName)"
    Write-Output "Size: $([math]::Round($aab.Length / 1MB, 2)) MB"
    Write-Output "Modified: $($aab.LastWriteTime)"
} else {
    Write-Output "❌ AAB not found"
}
```

**Expected**: AAB file ~5-15 MB

---

### **Step 4: Test AAB Locally (Optional)**

You can't directly install AAB files. Convert to APK for testing:

```powershell
# Install bundletool if not already installed
npm install -g @android/bundletool

# Generate APKs from AAB
cd android\app\build\outputs\bundle\release
bundletool build-apks `
  --bundle=app-release.aab `
  --output=app-release.apks `
  --mode=universal

# Extract APK
Expand-Archive -Path app-release.apks -DestinationPath apks -Force

# Install on connected device
adb install apks\universal.apk
```

---

## 📱 **PART 4: Test Firebase/Google Sign-In on Physical Device**

### **Pre-Test Checklist:**

1. ✅ **google-services.json in correct location**
   ```powershell
   Test-Path android\app\google-services.json
   # Should return: True
   ```

2. ✅ **SHA-1 certificate registered in Firebase Console**

   **Get your release SHA-1:**
   ```powershell
   cd android\app
   keytool -list -v -keystore aimi-release-key.keystore -alias aimi-chat
   ```
   
   **Copy the SHA-1 fingerprint** (looks like: `A1:B2:C3:D4:...`)

   **Add to Firebase:**
   1. Go to: https://console.firebase.google.com
   2. Select your project
   3. Project Settings → Your apps → Android app
   4. Scroll to "SHA certificate fingerprints"
   5. Click "Add fingerprint"
   6. Paste the SHA-1 fingerprint
   7. Click Save
   8. **Download new google-services.json**
   9. Replace `android/app/google-services.json` with new file
   10. Rebuild AAB

3. ✅ **Deep link configured in AndroidManifest.xml**
   - Already configured: `https://aimi-chat-yig9.vercel.app`

4. ✅ **OAuth redirect URL in Firebase Console**
   - Should already be set up for web
   - Check: Firebase Console → Authentication → Sign-in method → Google → Web SDK configuration

---

### **Test Procedure:**

**1. Install the Release APK:**
```powershell
# Connect your Android device via USB
# Enable USB debugging on device (Settings → Developer Options)

# Install
adb install android\app\build\outputs\apk\release\app-release.apk
# Or use the universal.apk from bundletool
```

**2. Open the App:**
- Find "AImi chat" on your device
- Launch the app

**3. Test Google Sign-In:**
- Tap "Sign in with Google"
- Should show Google account picker
- Select an account
- Should successfully sign in
- Check that you're redirected to characters page

**4. Test Chat Functionality:**
- Select a character
- Send a message
- Verify AI responds (should use Silicon/DeepSeek)
- Check that relationship stats update

**5. Test App Restart:**
- Close app completely (swipe away from recents)
- Reopen app
- Should auto-login (no need to sign in again)

**6. Test Sign Out:**
- Go to settings
- Sign out
- Should return to login screen
- Try signing in again

---

### **Common Issues & Fixes:**

**Issue 1: "Error 10" or "Developer Error"**
- **Cause**: SHA-1 fingerprint not registered
- **Fix**: Follow SHA-1 registration steps above

**Issue 2: "Sign in failed: 12500"**
- **Cause**: google-services.json mismatch
- **Fix**: Re-download from Firebase Console after adding SHA-1

**Issue 3: App crashes on launch**
- **Check**: `adb logcat | Select-String "AndroidRuntime"`
- **Common**: Missing google-services.json or Firebase config error

**Issue 4: "Network error" after sign-in**
- **Check**: Vercel is up (https://aimi-chat-yig9.vercel.app)
- **Check**: Device has internet connection
- **Check**: NEXT_PUBLIC_APP_URL is set in Vercel env

---

## ✅ **PART 5: Pre-Submission Checklist**

### **A. VERSION MANAGEMENT**

**Current Version:**
- ✅ versionCode: `1`
- ✅ versionName: `"1.0"`

**For first submission, these are fine. For future updates:**
```gradle
// In android/app/build.gradle
defaultConfig {
    versionCode 2        // ← INCREMENT for each release
    versionName "1.0.1"  // ← User-visible version
}
```

**Version Strategy:**
| Update Type | versionCode | versionName | Example |
|-------------|-------------|-------------|---------|
| Initial release | 1 | "1.0" | First submission |
| Bug fix | 2 | "1.0.1" | Minor fixes |
| Feature update | 3 | "1.1.0" | New features |
| Major release | 10 | "2.0.0" | Big changes |

---

### **B. APP INFORMATION**

**Package Name:** `com.aimi.chat` ✅  
**App Name:** `AImi chat` ✅  
**Icon:** Located in `android/app/src/main/res/mipmap-*/` ✅

**Required for Play Store:**

1. **App Title** (Max 50 characters)
   - Suggestion: "AImi Chat - AI Companion"

2. **Short Description** (Max 80 characters)
   - Suggestion: "Chat with AI companions, build relationships, unlock phone messages"

3. **Full Description** (Max 4000 characters)
   - Template:
   ```
   AImi Chat - Your AI Romantic Companion

   Experience meaningful conversations with AI companions. Build relationships, 
   unlock special features, and enjoy an immersive chat experience.

   ✨ FEATURES:
   • Intelligent AI companions with unique personalities
   • Dynamic relationship system with affection tracking
   • Unlock phone messages as your bond deepens
   • Multiple AI models for natural conversations
   • Beautiful themes and customization options
   • Multi-language support (English, Vietnamese)

   🎭 RELATIONSHIP SYSTEM:
   Track your intimacy level and relationship stage. Your interactions matter 
   and influence how your AI companion responds.

   📱 PHONE MESSAGES:
   Unlock the ability to exchange phone messages with your companion as your 
   relationship grows stronger.

   🎨 CUSTOMIZATION:
   Choose from multiple chat themes, adjust fonts, and personalize your 
   experience.

   🌐 PRIVACY:
   Your conversations are private. We use secure authentication and respect 
   your data.

   Download now and start your journey with AI companions!
   ```

---

### **C. REQUIRED ASSETS**

**1. App Icon** ✅ (Already in project)
- Located: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- Sizes: 48x48, 72x72, 96x96, 144x144, 192x192

**2. Feature Graphic** ❌ (Need to create)
- Size: 1024 x 500 pixels
- Format: PNG or JPEG
- No alpha channel
- Showcases your app (can use logo + tagline)

**3. Screenshots** ❌ (Need to capture)
- **Minimum**: 2 screenshots
- **Recommended**: 4-8 screenshots
- **Sizes**:
  - Phone: 1080 x 1920 or 1080 x 2340 (portrait)
  - 7-inch tablet: 1200 x 1920 (optional)
  - 10-inch tablet: 1600 x 2560 (optional)

**Screenshot Suggestions:**
1. Characters page (showing available companions)
2. Chat interface (sample conversation)
3. Relationship stats screen
4. Phone messages screen
5. Settings/customization
6. Login screen

**How to capture:**
- Use your Android device
- Navigate to each screen
- Press Power + Volume Down
- Transfer screenshots to PC
- Crop/resize if needed (1080 x 1920)

**4. Privacy Policy URL** ❌ (REQUIRED)
- Must be publicly accessible
- Can host on:
  - Your domain: `https://aimi-chat.com/privacy`
  - Vercel: `https://aimi-chat-yig9.vercel.app/privacy`
  - GitHub Pages
  - Google Docs (set to public)

**Privacy Policy Template** (see PART 6 below)

---

### **D. PLAY CONSOLE SETUP**

**1. Create Developer Account** (if not already done)
- Go to: https://play.google.com/console
- One-time fee: $25 USD
- Verification: Email + payment method

**2. App Content Declaration:**

Required information:

**Privacy Policy:**
- ✅ URL: [Your privacy policy URL]

**App Access:**
- ❌ Restricted: No (app is free)
- ✅ Unrestricted: Yes

**Ads:**
- Does your app contain ads? **No** ✅

**Content Rating:**
- You'll fill out a questionnaire
- Expected rating: **Teen** (13+) or **Mature 17+** (depending on AI content)
- Answer truthfully about:
  - Violence: None
  - Sexual content: Depends on your AI responses
  - Profanity: None/Mild
  - Controlled substances: None
  - Gambling: No

**Target Audience:**
- Age groups: 13+, 16+, or 18+ (depending on content)
- Designed for children: **No**

**Data Safety:**
- Collects user data: **Yes**
  - Account info (email from Google Sign-In)
  - User content (chat messages)
- Shares data: **No**
- Encryption: **Yes** (data transmitted using HTTPS)
- Can request deletion: **Yes** (via settings or contact)

---

### **E. RELEASE TRACK**

**Options:**

1. **Internal Testing** (Recommended first)
   - Up to 100 testers
   - Quick review (~hours)
   - Perfect for final testing

2. **Closed Testing**
   - Invite-only testers
   - Review time: 1-2 days
   - Collect feedback before public launch

3. **Open Testing**
   - Anyone can join
   - Appears in Play Store as "Early Access"
   - Review time: 1-2 days

4. **Production** (Public launch)
   - Full review process: 3-7 days (sometimes up to 2 weeks)
   - Available to all users

**Recommendation:** Start with **Internal Testing** to verify everything works, then move to **Production**.

---

### **F. FINAL VERIFICATION**

**Before uploading AAB:**

- [ ] ✅ AAB file built successfully
- [ ] ✅ File size reasonable (< 150 MB)
- [ ] ✅ Tested on physical device
- [ ] ✅ Google Sign-In works
- [ ] ✅ Chat functionality works
- [ ] ✅ No crashes or major bugs
- [ ] ✅ versionCode and versionName correct
- [ ] ✅ google-services.json includes release SHA-1
- [ ] ✅ Privacy policy published
- [ ] ✅ Screenshots prepared
- [ ] ✅ App description written
- [ ] ✅ Feature graphic created
- [ ] ✅ Content rating questionnaire ready

---

## 📄 **PART 6: Privacy Policy Template**

Create a file at `public/privacy.html` or host separately:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Privacy Policy - AImi Chat</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { color: #333; }
        h2 { color: #666; margin-top: 30px; }
        p { margin: 10px 0; }
    </style>
</head>
<body>
    <h1>Privacy Policy for AImi Chat</h1>
    <p><strong>Last Updated:</strong> January 5, 2026</p>
    
    <h2>1. Introduction</h2>
    <p>AImi Chat ("we", "our", or "us") respects your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our mobile application.</p>
    
    <h2>2. Information We Collect</h2>
    <h3>2.1 Account Information</h3>
    <p>When you sign in with Google, we collect:</p>
    <ul>
        <li>Your email address</li>
        <li>Your name (if provided by Google)</li>
        <li>Your Google account ID</li>
    </ul>
    
    <h3>2.2 User Content</h3>
    <p>We store the following data you create:</p>
    <ul>
        <li>Chat messages with AI companions</li>
        <li>Character preferences and settings</li>
        <li>Relationship progress and statistics</li>
        <li>User profile information (name, age, preferences)</li>
    </ul>
    
    <h3>2.3 Technical Information</h3>
    <p>We automatically collect:</p>
    <ul>
        <li>Device information (model, OS version)</li>
        <li>App usage statistics</li>
        <li>Error logs for debugging</li>
    </ul>
    
    <h2>3. How We Use Your Information</h2>
    <p>We use your information to:</p>
    <ul>
        <li>Provide and improve our AI chat services</li>
        <li>Personalize your experience</li>
        <li>Maintain your account and authentication</li>
        <li>Send AI-generated responses</li>
        <li>Track relationship progress and unlock features</li>
        <li>Debug and fix technical issues</li>
    </ul>
    
    <h2>4. Data Storage and Security</h2>
    <p>Your data is:</p>
    <ul>
        <li>Stored securely on Supabase (PostgreSQL database)</li>
        <li>Transmitted using HTTPS encryption</li>
        <li>Protected by Firebase Authentication</li>
        <li>Not sold to third parties</li>
    </ul>
    
    <h2>5. Third-Party Services</h2>
    <p>We use the following third-party services:</p>
    <ul>
        <li><strong>Google Sign-In:</strong> For authentication</li>
        <li><strong>Firebase:</strong> For user authentication</li>
        <li><strong>Supabase:</strong> For data storage</li>
        <li><strong>AI Providers:</strong> We send your messages to AI models (Gemini, SiliconFlow, Moonshot, etc.) to generate responses. These providers may process your messages but do not store them permanently.</li>
    </ul>
    
    <h2>6. Data Retention</h2>
    <p>We retain your data:</p>
    <ul>
        <li>As long as your account is active</li>
        <li>For 30 days after account deletion (backup retention)</li>
        <li>Error logs: 90 days</li>
    </ul>
    
    <h2>7. Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
        <li>Access your personal data</li>
        <li>Request data deletion</li>
        <li>Export your data</li>
        <li>Opt out of data collection (by deleting your account)</li>
    </ul>
    
    <h2>8. Children's Privacy</h2>
    <p>Our app is not intended for users under 13 years of age. We do not knowingly collect information from children under 13.</p>
    
    <h2>9. Changes to This Policy</h2>
    <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>
    
    <h2>10. Contact Us</h2>
    <p>If you have questions about this Privacy Policy, please contact us at:</p>
    <p>Email: [Your email address]</p>
    
    <hr>
    <p><small>This privacy policy is effective as of January 5, 2026.</small></p>
</body>
</html>
```

**Deploy it:**
```powershell
# If using Vercel, commit and push
git add public/privacy.html
git commit -m "Add privacy policy for Play Store"
git push origin main

# URL will be: https://aimi-chat-yig9.vercel.app/privacy.html
```

---

## 🚀 **PART 7: Upload to Play Console**

### **Step 1: Go to Play Console**
- https://play.google.com/console
- Select "Create app" (if first time)

### **Step 2: Fill Basic Info**
- App name: AImi Chat
- Default language: English (or Vietnamese)
- App or Game: App
- Free or Paid: Free

### **Step 3: Complete Store Listing**
- Upload screenshots
- Upload feature graphic
- Add app description
- Add privacy policy URL
- Select category: Communication or Entertainment

### **Step 4: Complete App Content**
- Fill content rating questionnaire
- Complete data safety form
- Add target audience

### **Step 5: Create Release**
- Go to: Production → Create new release
- Upload: `app-release.aab`
- Release name: 1.0
- Release notes: "Initial release of AImi Chat"
- Review and rollout

---

## ⏱️ **Expected Timeline**

1. **Keystore creation**: 5 minutes
2. **Gradle configuration**: 10 minutes
3. **AAB build**: 2 minutes
4. **Device testing**: 30 minutes
5. **Privacy policy**: 20 minutes
6. **Screenshots**: 20 minutes
7. **Play Console setup**: 30 minutes
8. **Upload & submit**: 10 minutes

**Total**: ~2 hours of work

**Review time**: 3-7 days (sometimes up to 2 weeks)

---

## ✅ **Quick Command Reference**

```powershell
# 1. Generate keystore
cd android\app
keytool -genkey -v -keystore aimi-release-key.keystore -alias aimi-chat -keyalg RSA -keysize 2048 -validity 10000

# 2. Get SHA-1 fingerprint
keytool -list -v -keystore aimi-release-key.keystore -alias aimi-chat

# 3. Build AAB
cd android
.\gradlew clean
.\gradlew bundleRelease

# 4. Check AAB
Test-Path app\build\outputs\bundle\release\app-release.aab

# 5. Install on device (for testing)
adb install app\build\outputs\apk\release\app-release.apk
```

---

## 📞 **Support**

**If you encounter issues:**
- Check ANDROID_BUILD.md for troubleshooting
- Review Vercel logs for server errors
- Test on multiple devices if possible
- Join Google Play Console Help Center

---

**Ready to submit? Let's get started! 🚀**
