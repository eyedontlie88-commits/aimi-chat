# 🚀 REBUILD AND TEST GOOGLE SIGN-IN
# Script để rebuild app và chuẩn bị test

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   REBUILD AND TEST GOOGLE SIGN-IN" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Verify configuration
Write-Host "[Step 1/5] Verifying configuration..." -ForegroundColor Yellow
& .\verify-google-signin-fix.ps1

$continue = Read-Host "`nDo you want to continue with rebuild? (y/n)"
if ($continue -ne "y") {
    Write-Host "`nAborted by user." -ForegroundColor Red
    exit
}

# Step 2: Sync Capacitor
Write-Host "`n[Step 2/5] Syncing Capacitor configuration to Android..." -ForegroundColor Yellow
npx cap sync android
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Capacitor sync failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Capacitor sync completed" -ForegroundColor Green

# Step 3: Clean Android build
Write-Host "`n[Step 3/5] Cleaning Android build..." -ForegroundColor Yellow
cd android
./gradlew clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Gradle clean failed!" -ForegroundColor Red
    cd ..
    exit 1
}
Write-Host "✅ Clean completed" -ForegroundColor Green

# Step 4: Build debug APK
Write-Host "`n[Step 4/5] Building debug APK..." -ForegroundColor Yellow
./gradlew assembleDebug
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    cd ..
    exit 1
}
Write-Host "✅ Build completed" -ForegroundColor Green

# Step 5: Check for connected devices
Write-Host "`n[Step 5/5] Checking for connected devices..." -ForegroundColor Yellow
adb devices

$devices = adb devices | Select-String "device$" | Measure-Object
if ($devices.Count -gt 0) {
    Write-Host "✅ Found $($devices.Count) connected device(s)" -ForegroundColor Green
    
    $install = Read-Host "`nInstall APK to device/emulator? (y/n)"
    if ($install -eq "y") {
        Write-Host "`nInstalling APK..." -ForegroundColor Yellow
        ./gradlew installDebug
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ APK installed successfully!" -ForegroundColor Green
            
            Write-Host "`n========================================" -ForegroundColor Cyan
            Write-Host "   READY TO TEST!" -ForegroundColor Cyan
            Write-Host "========================================" -ForegroundColor Cyan
            
            Write-Host "`n📱 App is installed on your device/emulator" -ForegroundColor Green
            Write-Host "`nTo monitor logs while testing:" -ForegroundColor Cyan
            Write-Host 'adb logcat | Select-String -Pattern "MainActivity|GoogleAuth|signInWithGoogle"' -ForegroundColor White
            
            $startLogs = Read-Host "`nStart monitoring logs now? (y/n)"
            if ($startLogs -eq "y") {
                cd ..
                Write-Host "`n🔍 Monitoring logs... (Press Ctrl+C to stop)" -ForegroundColor Yellow
                Write-Host "Expected logs when app starts:" -ForegroundColor Cyan
                Write-Host "  - MainActivity onCreate started" -ForegroundColor White
                Write-Host "  - GoogleAuth.initialize(this) called successfully" -ForegroundColor White
                Write-Host "  - GoogleAuth plugin registered successfully`n" -ForegroundColor White
                adb logcat | Select-String -Pattern "MainActivity|GoogleAuth|signInWithGoogle"
            } else {
                cd ..
            }
        } else {
            Write-Host "❌ Installation failed!" -ForegroundColor Red
            cd ..
            exit 1
        }
    } else {
        cd ..
        Write-Host "`n✅ Build completed. APK location:" -ForegroundColor Green
        Write-Host "android/app/build/outputs/apk/debug/app-debug.apk" -ForegroundColor White
    }
} else {
    Write-Host "⚠️  No devices found" -ForegroundColor Yellow
    Write-Host "`nTo install manually:" -ForegroundColor Cyan
    Write-Host "1. Connect device or start emulator" -ForegroundColor White
    Write-Host "2. Run: ./gradlew installDebug" -ForegroundColor White
    cd ..
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   NEXT STEPS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "`n1. ✅ Launch app on device/emulator" -ForegroundColor White
Write-Host "2. ✅ Tap 'Sign in with Google' button" -ForegroundColor White
Write-Host "3. ✅ Select Google account" -ForegroundColor White
Write-Host "4. ✅ Verify sign-in succeeds (no crash!)" -ForegroundColor White
Write-Host "`nIf sign-in fails, check:" -ForegroundColor Yellow
Write-Host "- SHA fingerprints added to Google Cloud Console" -ForegroundColor White
Write-Host "- OAuth consent screen is published or has test users" -ForegroundColor White
Write-Host "- See FIX_GOOGLE_SIGNIN_CRASH.md for troubleshooting" -ForegroundColor White
Write-Host "`n========================================`n" -ForegroundColor Cyan
