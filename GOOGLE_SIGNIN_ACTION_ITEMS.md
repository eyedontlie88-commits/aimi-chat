# ✅ GOOGLE SIGN-IN - ACTION ITEMS

## 🎯 NHỮNG GÌ ĐÃ ĐƯỢC SỬA (Tự động)

- ✅ **MainActivity.java** - Added `GoogleAuth.initialize(this)` 
- ✅ **capacitor.config.ts** - Fixed `androidClientId` và `serverClientId`
- ✅ **lib/firebase/client.ts** - Added `ensureGoogleAuthInitialized()`
- ✅ **.env.example** - Added documentation

---

## ⚠️ BẠN CẦN LÀM NGAY (Thủ công - 5 phút)

### 📍 ACTION 1: Thêm biến môi trường (30 giây)

**File:** `.env` (tạo file này trong thư mục gốc nếu chưa có)

**Thêm dòng này:**
```bash
NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID=647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com
```

**Copy-paste command:**
```powershell
Add-Content .env "NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID=647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com"
```

---

### 📍 ACTION 2: Thêm SHA fingerprints vào Google Cloud Console (2 phút)

**Link:** https://console.cloud.google.com/apis/credentials?project=aimi-chat

**Các bước:**
1. Click vào OAuth Client ID: `647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt.apps.googleusercontent.com`
2. Scroll xuống "SHA-1 certificate fingerprints"
3. Click **"+ ADD FINGERPRINT"** để thêm từng fingerprint:

```
AC:43:14:35:8C:8F:77:20:E5:07:90:DB:7C:20:73:24:09:49:A7:6C
```

4. Click **"+ ADD FINGERPRINT"** lần 2:

```
2C:47:5F:2C:74:4B:0F:23:AD:09:60:57:95:BD:DF:BF:E9:51:D9:1A:8D:3C:1C:C9:DF:F4:36:8F:FE:53:38:BB
```

5. Click **"+ ADD FINGERPRINT"** lần 3:

```
EC:0D:C2:0A:8F:4C:57:5A:73:93:0A:C3:21:9F:4B:74:DF:34:66:DF:41:BC:F2:65:5E:5B:BE:78:0F:AA:A6:BA
```

6. Verify package name hiển thị: `com.aurgilabs.aimichat`
7. Click **SAVE** (nút màu xanh ở góc dưới)

---

### 📍 ACTION 3: Verify OAuth Consent Screen (30 giây)

**Link:** https://console.cloud.google.com/apis/credentials/consent?project=aimi-chat

**Check:**
- Publishing status phải là **"Published"** (cho production)
- HOẶC nếu là **"Testing"** → Click "ADD USERS" và thêm email Google của bạn

---

### 📍 ACTION 4: Rebuild app (2 phút)

**Option A: Dùng script tự động (Recommended)**
```powershell
.\rebuild-and-test.ps1
```

**Option B: Manual commands**
```powershell
# Sync Capacitor
npx cap sync android

# Clean và rebuild
cd android
./gradlew clean
./gradlew assembleDebug
./gradlew installDebug
```

---

## 🧪 TESTING

### Test trên máy ảo (Google Play Image):
```powershell
# Start emulator với Google Play Store
# Trong Android Studio: AVD Manager → Start emulator

# Install app
npx cap run android

# Monitor logs (terminal riêng)
adb logcat | Select-String -Pattern "MainActivity|GoogleAuth"
```

**Expected logs:**
```
MainActivity: GoogleAuth.initialize(this) called successfully
MainActivity: GoogleAuth plugin registered successfully
[GoogleAuth] Plugin initialized successfully
[signInWithGoogle] Firebase sign-in successful
```

### Test trên máy thật:
```powershell
# Kết nối máy qua USB
adb devices

# Install
cd android
./gradlew installDebug
```

---

## ✅ VERIFICATION CHECKLIST

**Trước khi test:**
- [ ] File `.env` có `NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID`
- [ ] 3 SHA fingerprints đã thêm vào Google Cloud Console
- [ ] OAuth consent screen: Published hoặc có email test
- [ ] Đã chạy `npx cap sync android`
- [ ] Đã rebuild app

**Khi test:**
- [ ] App launch không crash
- [ ] Bấm "Sign in with Google"
- [ ] Danh sách tài khoản Google xuất hiện
- [ ] Chọn tài khoản → Đăng nhập thành công
- [ ] Logs hiển thị: `GoogleAuth.initialize(this) called successfully`

---

## 🐛 TROUBLESHOOTING NHANH

| Vấn đề | Fix nhanh |
|--------|-----------|
| Vẫn crash `NullPointerException` | Check logs có `GoogleAuth.initialize` không. Nếu không → chạy `npx cap sync android` và rebuild |
| `DEVELOPER_ERROR (10)` | SHA fingerprints chưa được add vào Google Cloud Console |
| Không hiện account picker | Máy ảo phải có Google Play Store. Hoặc OAuth consent chưa publish |
| `Error 12500` | Run `npx cap sync android` lại |

---

## 📊 QUICK VERIFICATION SCRIPT

**Chạy script này để check configuration:**
```powershell
.\verify-google-signin-fix.ps1
```

Script sẽ check:
- ✅ MainActivity có `GoogleAuth.initialize()`
- ✅ `.env` có Web Client ID
- ✅ `capacitor.config.ts` có đúng client IDs
- ✅ Package names đúng

---

## 📚 DOCUMENTATION

| File | Mục đích |
|------|----------|
| **FIX_GOOGLE_SIGNIN_CRASH.md** | Hướng dẫn chi tiết đầy đủ |
| **GOOGLE_SIGNIN_ACTION_ITEMS.md** | Checklist này - bắt đầu từ đây |
| **verify-google-signin-fix.ps1** | Script verify configuration |
| **rebuild-and-test.ps1** | Script rebuild tự động |

---

## 🎉 KẾT QUẢ MONG ĐỢI

Sau khi làm xong 4 actions ở trên:

✅ Bấm "Sign in with Google" → Account picker xuất hiện  
✅ Chọn account → Đăng nhập thành công  
✅ **KHÔNG CÒN CRASH!** 🚀  

**Ready for production!** 🎊
