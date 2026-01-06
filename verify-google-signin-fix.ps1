# 🔍 VERIFY GOOGLE SIGN-IN FIX
# Script kiểm tra tất cả configuration đã đúng chưa

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   GOOGLE SIGN-IN FIX VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$errors = 0
$warnings = 0

# ✅ CHECK 1: MainActivity.java có GoogleAuth.initialize()
Write-Host "[1/7] Checking MainActivity.java..." -ForegroundColor Yellow
$mainActivityPath = "android/app/src/main/java/com/aurgilabs/aimichat/MainActivity.java"
if (Test-Path $mainActivityPath) {
    $content = Get-Content $mainActivityPath -Raw
    if ($content -match "GoogleAuth\.initialize\(this\)") {
        Write-Host "  ✅ GoogleAuth.initialize(this) found in MainActivity" -ForegroundColor Green
    } else {
        Write-Host "  ❌ GoogleAuth.initialize(this) NOT FOUND in MainActivity" -ForegroundColor Red
        Write-Host "     Fix: Add 'GoogleAuth.initialize(this);' in onCreate()" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "  ❌ MainActivity.java not found at $mainActivityPath" -ForegroundColor Red
    $errors++
}

# ✅ CHECK 2: .env file có NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID
Write-Host "`n[2/7] Checking .env file..." -ForegroundColor Yellow
if (Test-Path ".env") {
    $envContent = Get-Content .env -Raw
    if ($envContent -match "NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID=647583841932-gekeglpllnt43tb0gkqnq294j5ejomla\.apps\.googleusercontent\.com") {
        Write-Host "  ✅ NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID is set correctly" -ForegroundColor Green
    } elseif ($envContent -match "NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID") {
        Write-Host "  ⚠️  NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID found but value might be wrong" -ForegroundColor Yellow
        Write-Host "     Expected: 647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com" -ForegroundColor Yellow
        $warnings++
    } else {
        Write-Host "  ❌ NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID not found in .env" -ForegroundColor Red
        Write-Host "     Fix: Add this line to .env:" -ForegroundColor Red
        Write-Host "     NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID=647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "  ❌ .env file not found" -ForegroundColor Red
    Write-Host "     Fix: Create .env file with NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID" -ForegroundColor Red
    $errors++
}

# ✅ CHECK 3: capacitor.config.ts có đúng androidClientId
Write-Host "`n[3/7] Checking capacitor.config.ts androidClientId..." -ForegroundColor Yellow
if (Test-Path "capacitor.config.ts") {
    $capConfig = Get-Content capacitor.config.ts -Raw
    if ($capConfig -match "androidClientId:\s*['\`"]647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt\.apps\.googleusercontent\.com['\`"]") {
        Write-Host "  ✅ androidClientId is correct (com.aurgilabs.aimichat)" -ForegroundColor Green
    } elseif ($capConfig -match "androidClientId:\s*['\`"]647583841932-dshut2n2ngg6a60iborrb719i7tpjht9\.apps\.googleusercontent\.com['\`"]") {
        Write-Host "  ❌ androidClientId is WRONG (still using old package com.aimi.chat)" -ForegroundColor Red
        Write-Host "     This was supposed to be fixed. Check capacitor.config.ts manually." -ForegroundColor Red
        $errors++
    } else {
        Write-Host "  ⚠️  androidClientId found but value unclear" -ForegroundColor Yellow
        Write-Host "     Expected: 647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt.apps.googleusercontent.com" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "  ❌ capacitor.config.ts not found" -ForegroundColor Red
    $errors++
}

# ✅ CHECK 4: capacitor.config.ts có đúng serverClientId
Write-Host "`n[4/7] Checking capacitor.config.ts serverClientId..." -ForegroundColor Yellow
if (Test-Path "capacitor.config.ts") {
    $capConfig = Get-Content capacitor.config.ts -Raw
    if ($capConfig -match "serverClientId:\s*['\`"]647583841932-gekeglpllnt43tb0gkqnq294j5ejomla\.apps\.googleusercontent\.com['\`"]") {
        Write-Host "  ✅ serverClientId is correct (Web Client ID)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  serverClientId might be wrong or missing" -ForegroundColor Yellow
        Write-Host "     Expected: 647583841932-gekeglpllnt43tb0gkqnq294j5ejomla.apps.googleusercontent.com" -ForegroundColor Yellow
        $warnings++
    }
}

# ✅ CHECK 5: lib/firebase/client.ts có ensureGoogleAuthInitialized
Write-Host "`n[5/7] Checking lib/firebase/client.ts..." -ForegroundColor Yellow
if (Test-Path "lib/firebase/client.ts") {
    $clientTs = Get-Content "lib/firebase/client.ts" -Raw
    if ($clientTs -match "ensureGoogleAuthInitialized") {
        Write-Host "  ✅ ensureGoogleAuthInitialized() function found" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  ensureGoogleAuthInitialized() not found" -ForegroundColor Yellow
        Write-Host "     JS-side initialization might be missing (not critical if MainActivity is fixed)" -ForegroundColor Yellow
        $warnings++
    }
    if ($clientTs -match "await ensureGoogleAuthInitialized\(\)") {
        Write-Host "  ✅ ensureGoogleAuthInitialized() is called before signIn()" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  ensureGoogleAuthInitialized() might not be called before signIn()" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "  ❌ lib/firebase/client.ts not found" -ForegroundColor Red
    $errors++
}

# ✅ CHECK 6: google-services.json có com.aurgilabs.aimichat client
Write-Host "`n[6/7] Checking google-services.json..." -ForegroundColor Yellow
if (Test-Path "android/app/google-services.json") {
    $googleServices = Get-Content "android/app/google-services.json" -Raw
    if ($googleServices -match "com\.aurgilabs\.aimichat") {
        Write-Host "  ✅ google-services.json contains com.aurgilabs.aimichat client" -ForegroundColor Green
        
        # Check for Android client ID
        if ($googleServices -match "647583841932-jkvqdk495qua1rntcfe1dk7pn1l69lqt\.apps\.googleusercontent\.com") {
            Write-Host "  ✅ Android Client ID found in google-services.json" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Android Client ID might be missing" -ForegroundColor Yellow
            $warnings++
        }
    } else {
        Write-Host "  ⚠️  com.aurgilabs.aimichat client might be missing" -ForegroundColor Yellow
        $warnings++
    }
} else {
    Write-Host "  ❌ google-services.json not found" -ForegroundColor Red
    $errors++
}

# ✅ CHECK 7: Package name trong build.gradle
Write-Host "`n[7/7] Checking android/app/build.gradle..." -ForegroundColor Yellow
if (Test-Path "android/app/build.gradle") {
    $buildGradle = Get-Content "android/app/build.gradle" -Raw
    if ($buildGradle -match 'applicationId\s+"com\.aurgilabs\.aimichat"') {
        Write-Host "  ✅ applicationId is correct: com.aurgilabs.aimichat" -ForegroundColor Green
    } else {
        Write-Host "  ❌ applicationId might be wrong" -ForegroundColor Red
        Write-Host "     Expected: com.aurgilabs.aimichat" -ForegroundColor Red
        $errors++
    }
} else {
    Write-Host "  ❌ android/app/build.gradle not found" -ForegroundColor Red
    $errors++
}

# 📊 SUMMARY
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "             SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

if ($errors -eq 0 -and $warnings -eq 0) {
    Write-Host "`n✅ ALL CHECKS PASSED!" -ForegroundColor Green
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Add 3 SHA fingerprints to Google Cloud Console" -ForegroundColor White
    Write-Host "   https://console.cloud.google.com/apis/credentials?project=aimi-chat" -ForegroundColor White
    Write-Host "2. Run: npx cap sync android" -ForegroundColor White
    Write-Host "3. Run: cd android && ./gradlew clean assembleDebug installDebug" -ForegroundColor White
    Write-Host "4. Test on emulator/device" -ForegroundColor White
} elseif ($errors -eq 0) {
    Write-Host "`n⚠️  $warnings warning(s) found" -ForegroundColor Yellow
    Write-Host "`nCode should work, but review warnings above." -ForegroundColor Yellow
    Write-Host "`nNext steps:" -ForegroundColor Cyan
    Write-Host "1. Review warnings above" -ForegroundColor White
    Write-Host "2. Add 3 SHA fingerprints to Google Cloud Console" -ForegroundColor White
    Write-Host "3. Run: npx cap sync android" -ForegroundColor White
    Write-Host "4. Run: cd android && ./gradlew clean assembleDebug installDebug" -ForegroundColor White
} else {
    Write-Host "`n❌ $errors error(s) and $warnings warning(s) found" -ForegroundColor Red
    Write-Host "`nPlease fix the errors above before proceeding." -ForegroundColor Red
    Write-Host "`nFor help, see: FIX_GOOGLE_SIGNIN_CRASH.md" -ForegroundColor Yellow
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
