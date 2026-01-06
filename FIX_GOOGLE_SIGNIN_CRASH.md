# 🔧 FIX GOOGLE SIGN-IN CRASH - HOÀN CHỈNH

## ✅ ĐÃ SỬA: MainActivity.java

**File:** `android/app/src/main/java/com/aurgilabs/aimichat/MainActivity.java`

**Thêm dòng này:**
```java
GoogleAuth.initialize(this);
```

**Vị trí:** Trong `onCreate()`, TRƯỚC `registerPlugin(GoogleAuth.class);`

**Tại sao:** 
- `GoogleAuth.initialize(this)` tạo `GoogleSignInClient` object ở native Android
- Nếu không gọi → `GoogleSignInClient = null` → crash khi `signIn()`

---

## 📋 CÁC BƯỚC TIẾP THEO (THEO THỨ TỰ)

### **BƯỚC 1: Thêm biến môi trường (REQUIRED)**

Tạo/sửa file `.env` trong thư mục gốc project:

```bash
NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID=647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com
```

**Lưu ý:** File `.env` không được commit lên Git (đã có trong `.gitignore`)

---

### **BƯỚC 2: Thêm SHA fingerprints vào Google Cloud Console (REQUIRED)**

🔗 **Link:** https://console.cloud.google.com/apis/credentials?project=aimi-chat

1. Tìm OAuth 2.0 Client ID: `647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt.apps.googleusercontent.com`
2. Click vào để edit
3. Trong phần "SHA-1 certificate fingerprints", click **"+ ADD FINGERPRINT"** 3 lần để thêm:

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

**Tại sao cần SHA fingerprints:**
- Google dùng SHA để verify ứng dụng
- Debug SHA-1: cho máy ảo và debug builds
- Release SHA-256: cho release builds và Play Store

---

### **BƯỚC 3: Verify OAuth Consent Screen (REQUIRED)**

🔗 **Link:** https://console.cloud.google.com/apis/credentials/consent?project=aimi-chat

**Check:**
- [ ] Publishing status: **"Published"** (cho production)
  - HOẶC: **"Testing"** với email của bạn trong danh sách test users
- [ ] Scopes phải có: `email`, `profile`, `openid`

**Nếu status là "Testing":**
- Click "ADD USERS" và thêm email Google của bạn vào test users

---

### **BƯỚC 4: Sync Capacitor và Rebuild (REQUIRED)**

```powershell
# 1. Sync Capacitor config sang Android
npx cap sync android

# 2. Clean build
cd android
./gradlew clean

# 3. Build debug APK
./gradlew assembleDebug

# 4. Install lên device/emulator
./gradlew installDebug

# HOẶC dùng Capacitor CLI:
cd ..
npx cap run android
```

---

## 🧪 TEST TRÊN MÁY ẢO (Google Play Image)

### **Yêu cầu:**
- ✅ Máy ảo có icon **Google Play Store** (System image: "Google Play" hoặc "Google APIs")
- ✅ Đã đăng nhập Play Store với tài khoản Google
- ✅ Google Play Services đã update

### **Cách test:**

#### 1. Chạy app:
```powershell
npx cap run android
```

#### 2. Mở terminal thứ 2 để xem logs:
```powershell
adb logcat | Select-String -Pattern "MainActivity|GoogleAuth|signInWithGoogle"
```

#### 3. Expected logs khi app khởi động:
```
MainActivity: MainActivity onCreate started
MainActivity: GoogleAuth.initialize(this) called successfully
MainActivity: GoogleAuth plugin registered successfully
MainActivity: MainActivity onCreate completed successfully
```

#### 4. Test Sign-In Flow:

**Trong app:**
1. Bấm nút "Sign in with Google"
2. Danh sách tài khoản Google hiện ra
3. Chọn tài khoản
4. Allow permissions
5. ✅ Đăng nhập thành công!

**Expected logs khi sign in:**
```
[GoogleAuth] Initializing plugin...
[GoogleAuth] Plugin initialized successfully
[signInWithGoogle] Calling GoogleAuth.signIn()...
[signInWithGoogle] GoogleAuth.signIn() successful, user: user@gmail.com
[signInWithGoogle] Signing in to Firebase...
[signInWithGoogle] Firebase sign-in successful
```

### **Troubleshooting máy ảo:**

**Nếu không hiện danh sách tài khoản:**
```powershell
# Check Google Play Services có cài không
adb shell "pm list packages | grep google"

# Phải thấy:
# com.google.android.gms (Google Play Services)
# com.google.android.gsf (Google Services Framework)
```

**Nếu thiếu → Tạo máy ảo mới:**
- AVD Manager → Create Virtual Device
- Select device (ví dụ: Pixel 5)
- **System Image:** Chọn dòng có chữ **"Google Play"** (KHÔNG chọn "Google APIs" thường)
- Download và tạo
- Khởi động máy ảo → Sign in Play Store

---

## 🧪 TEST TRÊN MÁY THẬT

### **Yêu cầu:**
- ✅ USB Debugging đã bật (Settings → Developer Options → USB Debugging)
- ✅ Máy có ít nhất 1 tài khoản Google

### **Cách test:**

#### 1. Kết nối máy qua USB:
```powershell
# Kiểm tra máy có connect không
adb devices

# Phải thấy device của bạn:
# List of devices attached
# ABC123XYZ    device
```

#### 2. Install app:
```powershell
cd android
./gradlew installDebug
```

#### 3. Xem logs:
```powershell
adb logcat | Select-String -Pattern "MainActivity|GoogleAuth|signInWithGoogle"
```

#### 4. Test trên máy:
1. Mở app (icon sẽ xuất hiện trong app drawer)
2. Bấm "Sign in with Google"
3. Chọn tài khoản → Allow
4. ✅ Thành công!

#### 5. Test persistence:
1. Close app (swipe away từ Recent Apps)
2. Mở lại app
3. ✅ User vẫn đang đăng nhập (không cần sign in lại)

---

## 🐛 XỬ LÝ LỖI PHỔ BIẾN

### ❌ **Vẫn crash với `NullPointerException`**

**Check:**
```powershell
# 1. Xem logs có dòng này không:
adb logcat | Select-String "GoogleAuth.initialize"

# Phải thấy:
# MainActivity: GoogleAuth.initialize(this) called successfully
```

**Nếu KHÔNG thấy:**
- Chưa chạy `npx cap sync android`
- Chưa rebuild app
- File `.env` chưa có `NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID`

**Fix:**
```powershell
npx cap sync android
cd android
./gradlew clean assembleDebug installDebug
```

---

### ❌ **Error: `DEVELOPER_ERROR` hoặc error code `10`**

**Nguyên nhân:** SHA-1 fingerprint chưa có trong Google Cloud Console

**Check SHA hiện tại:**
```powershell
cd android
./gradlew signingReport | Select-String -Pattern "SHA1|SHA-1"
```

**So sánh với SHA trong Google Cloud Console → Phải khớp!**

**Fix:** Thêm SHA vào Google Cloud Console (xem BƯỚC 2 ở trên)

---

### ❌ **Error: `Error 12500` hoặc `SIGN_IN_FAILED`**

**Nguyên nhân:** Client ID sai trong `capacitor.config.ts`

**Check:**
```powershell
Get-Content capacitor.config.ts | Select-String "androidClientId"
```

**Phải thấy:**
```typescript
androidClientId: '647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt.apps.googleusercontent.com'
```

**Nếu sai → đã được fix trong file `capacitor.config.ts` rồi, chỉ cần:**
```powershell
npx cap sync android
```

---

### ❌ **Error: `auth/invalid-credential` (từ Firebase)**

**Nguyên nhân:** Web Client ID sai

**Check:**
```powershell
Get-Content capacitor.config.ts | Select-String "serverClientId"
```

**Phải thấy:**
```typescript
serverClientId: '647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com'
```

**Fix:** Đã được sửa trong `capacitor.config.ts`, run:
```powershell
npx cap sync android
```

---

### ❌ **Không hiện danh sách tài khoản (máy ảo)**

**Nguyên nhân:** Máy ảo không có Google Play Services

**Check:**
```powershell
adb shell "pm list packages | grep gms"
```

**Nếu không thấy `com.google.android.gms` → Máy ảo sai loại!**

**Fix:** Tạo máy ảo mới với System Image có chữ **"Google Play"**

---

### ❌ **Stuck ở màn hình "Loading..."**

**Nguyên nhân:** OAuth consent screen chưa published hoặc email chưa trong test users

**Fix:**
1. Go to: https://console.cloud.google.com/apis/credentials/consent?project=aimi-chat
2. Nếu status = "Testing" → Click "ADD USERS" → Thêm email của bạn
3. HOẶC: Click "PUBLISH APP" để publish (cho production)

---

## 📱 TEST RELEASE BUILD (Trước khi upload Play Store)

### **Build release APK:**
```powershell
cd android
./gradlew assembleRelease

# APK output:
# android/app/build/outputs/apk/release/app-release.apk
```

### **Install trên device:**
```powershell
adb install app/build/outputs/apk/release/app-release.apk
```

### **Test:**
- [ ] Sign in works
- [ ] Không crash
- [ ] User stays logged in sau khi restart
- [ ] Tất cả features hoạt động bình thường

---

## 🚀 CHECKLIST TRƯỚC KHI UPLOAD GOOGLE PLAY

### **Pre-upload checklist:**

- [ ] File `.env` có `NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID`
- [ ] 3 SHA fingerprints đã thêm vào Google Cloud Console
- [ ] OAuth consent screen: **"Published"**
- [ ] Test thành công trên máy ảo (Google Play image)
- [ ] Test thành công trên máy thật
- [ ] Release build test xong
- [ ] `versionCode` đã increment trong `android/app/build.gradle`
- [ ] Không có crash trong Logcat

### **Build AAB cho Play Store:**
```powershell
cd android
./gradlew bundleRelease

# Output:
# android/app/build/outputs/bundle/release/app-release.aab
```

---

## ⚠️ QUAN TRỌNG: SAU KHI UPLOAD LẦN ĐẦU LÊN PLAY STORE

**Nếu bạn enable "App Signing by Google Play":**

Google sẽ re-sign app của bạn với certificate khác → SHA fingerprint thay đổi!

**Phải làm thêm:**

1. Go to: Play Console → Your App → Release → Setup → App Integrity
2. Scroll xuống "App signing key certificate"
3. Copy SHA-1 và SHA-256 ở đó
4. Add vào Google Cloud Console OAuth client (ngoài SHA local của bạn)
5. Download `google-services.json` mới từ Firebase
6. Replace `android/app/google-services.json`
7. Upload version mới

**Tại sao:** Play Store certificate SHA ≠ Local release SHA!

---

## ✅ VERIFICATION

### **Sau khi làm xong tất cả:**

```powershell
# 1. Check MainActivity có GoogleAuth.initialize
Get-Content android/app/src/main/java/com/aurgilabs/aimichat/MainActivity.java | Select-String "GoogleAuth.initialize"

# 2. Check .env có Web Client ID
Get-Content .env | Select-String "WEB_CLIENT_ID"

# 3. Check capacitor.config.ts
Get-Content capacitor.config.ts | Select-String "androidClientId|serverClientId"

# 4. Sync và rebuild
npx cap sync android
cd android
./gradlew clean assembleDebug installDebug
```

### **Check logs khi chạy app:**
```powershell
adb logcat | Select-String "MainActivity|GoogleAuth"
```

**Expected:**
```
MainActivity: MainActivity onCreate started
MainActivity: GoogleAuth.initialize(this) called successfully
MainActivity: GoogleAuth plugin registered successfully
MainActivity: MainActivity onCreate completed successfully
```

---

## 🎉 HOÀN TẤT!

### **Đã fix:**
- ✅ `MainActivity.java` - Added `GoogleAuth.initialize(this)`
- ✅ `capacitor.config.ts` - Fixed client IDs
- ✅ `lib/firebase/client.ts` - Added plugin initialization
- ✅ `.env.example` - Added Web Client ID documentation

### **Bạn cần làm:**
- ⚠️ Thêm `NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID` vào `.env`
- ⚠️ Thêm 3 SHA fingerprints vào Google Cloud Console
- ⚠️ Verify OAuth consent screen
- ⚠️ Run `npx cap sync android` và rebuild
- ⚠️ Test trên máy ảo + máy thật

**Sau khi làm xong → Google Sign-In sẽ hoạt động 100%!** 🚀
