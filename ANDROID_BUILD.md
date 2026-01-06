# Android APK/AAB Build Guide

This guide provides step-by-step instructions for building Android packages (APK/AAB) for Google Play Store submission.

---

## Prerequisites

### 1. Install Dependencies
```powershell
npm install
npx prisma generate
```

### 2. Verify Android Setup
- ✅ **google-services.json** exists in `android/app/` (Firebase config)
- ✅ **Capacitor config** points to production URL (`capacitor.config.ts`)
- ✅ **Environment variables** are set (see Environment Configuration below)

---

## Environment Configuration

### Required for Build (NEXT_PUBLIC_* - embedded in bundle):
These variables are baked into the Next.js build and must be set **before building**:

```env
# Firebase Client SDK (required for auth)
NEXT_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef

# Supabase (required for storage/data)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App Base URL (CRITICAL - prevents localhost fallbacks)
NEXT_PUBLIC_APP_URL=https://aimi-chat-yig9.vercel.app
```

### Runtime Variables (Server-side - set on Vercel/hosting):
These are NOT embedded in the app, but needed for server-side API routes:

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://... (for migrations)

# Firebase Admin
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# LLM Providers
LLM_DEFAULT_PROVIDER=gemini
LLM_DEFAULT_MODEL=gemini-1.5-flash
SILICON_API_KEY=sk-...
GEMINI_API_KEY=your-key

# Optional
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (for admin operations)
TELEGRAM_BOT_TOKEN=... (for backup feature)
TELEGRAM_STORAGE_CHAT_ID=... (for backup feature)
```

---

## Version Management

**IMPORTANT**: You must increment version numbers for each release to Google Play.

### Edit `android/app/build.gradle`:
```gradle
defaultConfig {
    applicationId "com.aimi.chat"
    versionCode 1        // ← INCREMENT for every release (1, 2, 3, ...)
    versionName "1.0"    // ← User-visible version (1.0, 1.1, 2.0, etc.)
}
```

**Rules:**
- `versionCode`: Must be **strictly increasing** integer (1 → 2 → 3)
- `versionName`: Human-readable string (can be anything, e.g., "1.0.1", "2.0-beta")
- Google Play **rejects** uploads with same or lower `versionCode`

**Recommended Versioning Strategy:**
| Release Type | versionCode | versionName | Example |
|--------------|-------------|-------------|---------|
| First submission | 1 | "1.0" | Initial release |
| Bug fix | 2 | "1.0.1" | Minor update |
| Feature update | 3 | "1.1.0" | New features |
| Major release | 10 | "2.0.0" | Breaking changes |

---

## Build Process

### Option 1: NPM Script (Recommended for Quick Builds)
```powershell
# Build Next.js app + sync to Android
npm run android
```

This runs: `npm run build && npx cap copy android`

---

### Option 2: Manual Steps (More Control)

#### Step 1: Build Next.js Application
```powershell
npm run build
```

This creates the production build in `.next/` directory.

**Note**: Your app uses **hosted architecture** (loads from Vercel), so the Android app mainly needs the Capacitor wrapper. The Next.js build runs on Vercel, not in the APK.

#### Step 2: Sync Assets to Android
```powershell
npx cap sync android
```

This copies:
- Web assets from `public/` to `android/app/src/main/assets/public/`
- Updates `capacitor.config.json` in Android project
- Updates native plugin configurations

#### Step 3: Open Android Studio (Optional)
```powershell
npx cap open android
```

Wait for Gradle sync to complete before building.

---

## Building APK (Debug)

### Using Gradle Command Line:
```powershell
cd android
.\gradlew assembleDebug
```

**Output**: `android/app/build/outputs/apk/debug/app-debug.apk`

**Use Case**: Testing on physical devices, QA, internal distribution

---

## Building AAB (Release - for Google Play)

### Step 1: Create Signing Key (First Time Only)

You need a **keystore** to sign release builds. Google Play requires all APKs/AABs to be signed.

```powershell
# Navigate to android/app
cd android/app

# Generate keystore
keytool -genkey -v -keystore aimi-release-key.keystore -alias aimi-chat -keyalg RSA -keysize 2048 -validity 10000
```

**Prompts**:
- Password: Choose a strong password (save it securely!)
- Name, Organization: Your details
- Alias: `aimi-chat` (or your preferred name)

**CRITICAL**: Backup this keystore file! If you lose it, you cannot update your app on Google Play.

---

### Step 2: Configure Signing in Gradle

Create `android/keystore.properties` (git-ignored):
```properties
storeFile=aimi-release-key.keystore
storePassword=your_keystore_password
keyAlias=aimi-chat
keyPassword=your_key_password
```

**Security**: Add to `.gitignore`:
```
android/keystore.properties
android/app/*.keystore
```

---

### Step 3: Update `android/app/build.gradle`

Add signing config (if not already present):

```gradle
android {
    // ... existing config ...

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
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

### Step 4: Build Release AAB

```powershell
cd android
.\gradlew bundleRelease
```

**Output**: `android/app/build/outputs/bundle/release/app-release.aab`

**File Size**: Typically 5-15 MB (Google Play optimizes this per device)

---

### Step 5: Test Release Build Locally (Optional)

You can't directly install AAB files. Convert to APK for testing:

```powershell
# Using bundletool (install via npm or download from Google)
npm install -g @android/bundletool

# Generate APKs from AAB
bundletool build-apks --bundle=app-release.aab --output=app-release.apks --mode=universal

# Extract universal APK
unzip app-release.apks -d apks
adb install apks/universal.apk
```

---

## Build Troubleshooting

### Common Issues:

#### 1. **Build fails: "google-services.json not found"**
```
Solution: Copy app/google-services.json to android/app/google-services.json
```

#### 2. **TypeScript errors during npm run build**
```
Check: next.config.js has ignoreBuildErrors: true
Warning: Fix critical errors before production release
```

#### 3. **Gradle sync fails**
```powershell
cd android
.\gradlew clean
.\gradlew --refresh-dependencies
```

#### 4. **"SDK location not found" error**
```
Create android/local.properties:
sdk.dir=C:\\Users\\YourName\\AppData\\Local\\Android\\Sdk
```

#### 5. **Signing fails: "keystore not found"**
```
Verify: android/keystore.properties paths are relative to android/app/
Example: storeFile=aimi-release-key.keystore (in android/app/ directory)
```

---

## Pre-Submission Checklist

Before uploading to Google Play:

- [ ] ✅ **Version bumped**: Increment `versionCode` in `android/app/build.gradle`
- [ ] ✅ **Environment vars set**: `NEXT_PUBLIC_APP_URL` and all required keys
- [ ] ✅ **google-services.json** copied to `android/app/`
- [ ] ✅ **Keystore secured**: Backup keystore file and passwords
- [ ] ✅ **Test on device**: Install and test release AAB
- [ ] ✅ **Check app name**: Verify in `android/app/src/main/res/values/strings.xml`
- [ ] ✅ **Review permissions**: Check `AndroidManifest.xml` (currently only INTERNET)
- [ ] ✅ **Privacy policy**: Prepare URL (required by Google Play)
- [ ] ✅ **Screenshots**: Prepare app screenshots for Play Store listing
- [ ] ✅ **Icons**: Verify app icons in `android/app/src/main/res/mipmap-*/`

---

## Deployment Architecture Notes

This app uses **hosted architecture**:
- Android WebView loads `https://aimi-chat-yig9.vercel.app`
- Updates deploy to Vercel **without new APK**
- Requires internet connection (no offline mode)

**Implications**:
- ✅ Fast updates (no Play Store review for content changes)
- ✅ Single codebase for web + Android
- ⚠️ Requires internet connection
- ⚠️ If Vercel is down, app is down

**Alternative**: Switch to static export (`output: 'export'` in `next.config.js`) and set `webDir: 'out'` in `capacitor.config.ts` for fully bundled offline app.

---

## Google Play Console Upload

1. Go to: https://play.google.com/console
2. Select your app
3. **Production** > **Create new release**
4. Upload `app-release.aab`
5. Review and **Roll out**

**First submission**: Requires app details, screenshots, privacy policy, content rating questionnaire.

---

## Post-Submission Workflow

During the 2-week review period:

1. **Continue development** on Vercel (changes go live immediately for web + Android)
2. **Monitor**: Check Play Console for review status
3. **Fix bugs**: Deploy fixes to Vercel (no new APK needed)
4. **Prepare next release**: Implement new features

**When to submit new APK/AAB**:
- Native plugin changes
- Android manifest changes
- Capacitor/dependency updates
- Version/branding changes

---

## Quick Reference Commands

```powershell
# Full build + sync
npm run android

# Build only
npm run build

# Sync to Android
npx cap sync android

# Debug APK
cd android && .\gradlew assembleDebug

# Release AAB
cd android && .\gradlew bundleRelease

# Clean build
cd android && .\gradlew clean

# Check Gradle version
cd android && .\gradlew --version
```

---

## Support & Resources

- **Capacitor Docs**: https://capacitorjs.com/docs/android
- **Android Gradle Plugin**: https://developer.android.com/studio/releases/gradle-plugin
- **Google Play Console**: https://play.google.com/console
- **Firebase Console**: https://console.firebase.google.com

---

*Last updated: 2026-01-05*
