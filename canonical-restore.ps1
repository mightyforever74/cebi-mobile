# ========================================
# CANONICAL EXPO SDK 54 RESTORE (HARDENED)
# ========================================
$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   CANONICAL EXPO SDK 54 RESTORE" -ForegroundColor Cyan
Write-Host "   Version Drift Fix (Hardened)" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ADIM 1: LEGACY MODE KAPAT
Write-Host "ADIM 1: Legacy mode kapatiliyor..." -ForegroundColor Yellow

if (Test-Path .npmrc) {
    Remove-Item .npmrc -Force
    Write-Host "   OK: .npmrc kaldirildi" -ForegroundColor Green
} else {
    Write-Host "   INFO: .npmrc zaten yok" -ForegroundColor Gray
}

# ADIM 2: GUCLENDIRILIS CACHE TEMIZLIGI
Write-Host ""
Write-Host "ADIM 2: Cache temizleniyor (guclendirilmis)..." -ForegroundColor Yellow

# Surecleri oldur
Write-Host "   Ilgili surecleri kapatiliyor..." -ForegroundColor Gray
try {
  cmd /c "taskkill /F /IM node.exe /IM node64.exe /IM expo.exe /IM java.exe /IM adb.exe 2>nul || exit /b 0"
} catch {
  # Süreç yoksa sorun değil
}
# node_modules silme (cok yonlu yaklasim)
if (Test-Path node_modules) {
    Write-Host "   node_modules siliniyor (cok katmanli yaklasim)..." -ForegroundColor Gray
    
    # Read-only / kilitli bayraklari temizle
    attrib -r -s -h /s /d node_modules 2>$null | Out-Null
    
    # Yontem 1: rimraf
    try {
        npx rimraf node_modules 2>$null
        if (-not (Test-Path node_modules)) {
            Write-Host "   OK: node_modules silindi (rimraf)" -ForegroundColor Green
        }
    } catch {
        Write-Host "   UYARI: rimraf basarisiz, rmdir deneniyor..." -ForegroundColor Yellow
    }
    
    # Yontem 2: CMD rmdir (rimraf basarisiz olursa)
    if (Test-Path node_modules) {
        cmd /c rmdir /S /Q node_modules 2>$null
        if (-not (Test-Path node_modules)) {
            Write-Host "   OK: node_modules silindi (rmdir)" -ForegroundColor Green
        }
    }
    
    # Yontem 3: robocopy /MIR (son care)
    if (Test-Path node_modules) {
        Write-Host "   UYARI: robocopy /MIR temizligi deneniyor (son care)..." -ForegroundColor Yellow
        mkdir empty 2>$null | Out-Null
        robocopy empty node_modules /MIR /NFL /NDL /NJH /NJS 2>$null | Out-Null
        cmd /c rmdir /S /Q node_modules 2>$null
        cmd /c rmdir /S /Q empty 2>$null
        
        if (-not (Test-Path node_modules)) {
            Write-Host "   OK: node_modules silindi (robocopy)" -ForegroundColor Green
        }
    }
    
    # Final kontrol
    if (Test-Path node_modules) {
        Write-Host "   HATA: node_modules silinemedi!" -ForegroundColor Red
        Write-Host "   Manuel olarak silin veya bilgisayari yeniden baslatin" -ForegroundColor Yellow
        Write-Host "   Alternatif: LongPathsEnabled registry ayarini acin" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "   INFO: node_modules zaten yok" -ForegroundColor Gray
}

# Lock files
Write-Host "   Lock files kaldiiriliyor..." -ForegroundColor Gray
Remove-Item package-lock.json -Force -ErrorAction SilentlyContinue
Remove-Item yarn.lock -Force -ErrorAction SilentlyContinue
Remove-Item pnpm-lock.yaml -Force -ErrorAction SilentlyContinue
Write-Host "   OK: Lock files temizlendi" -ForegroundColor Green

# npm cache
Write-Host "   npm cache temizleniyor..." -ForegroundColor Gray
npm cache clean --force 2>$null | Out-Null
Write-Host "   OK: npm cache temizlendi" -ForegroundColor Green

# npm cache
Write-Host "   npm cache temizleniyor..." -ForegroundColor Gray
cmd /c "npm cache clean --force" 1>nul 2>nul
Write-Host "   OK: npm cache temizlendi" -ForegroundColor Green

# ADIM 3: EXPO CANONICAL PAKETLER
Write-Host ""
Write-Host "ADIM 3: Expo canonical paketleri yukleniyor..." -ForegroundColor Cyan
Write-Host "   Bu islem 3-5 dakika surebilir..." -ForegroundColor Gray
Write-Host ""

try {
    Write-Host "   [1/3] expo install --fix calistiriliyor..." -ForegroundColor Gray
    npx expo install --fix
    if ($LASTEXITCODE -ne 0) { throw "expo install --fix basarisiz" }
    Write-Host "   OK: Expo fix tamamlandi" -ForegroundColor Green
    
    Write-Host "   [2/3] Reanimated + Gesture Handler yukleniyor..." -ForegroundColor Gray
    npx expo install react-native-reanimated react-native-gesture-handler
    if ($LASTEXITCODE -ne 0) { throw "Reanimated/Gesture yuklenemedi" }
    Write-Host "   OK: Reanimated + Gesture yuklendi" -ForegroundColor Green
    
    Write-Host "   [3/3] React Navigation paketleri yukleniyor..." -ForegroundColor Gray
    npx expo install @react-navigation/native @react-navigation/drawer @react-navigation/native-stack
    if ($LASTEXITCODE -ne 0) { throw "Navigation paketleri yuklenemedi" }
    Write-Host "   OK: Navigation paketleri yuklendi" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "   OK: TUM PAKETLER BASARIYLA YUKLENDI!" -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "   HATA: $_" -ForegroundColor Red
    Write-Host "   Lutfen hata mesajini kontrol edin." -ForegroundColor Yellow
    exit 1
}

# ADIM 4: VERSIYON DOGRULAMA
Write-Host ""
Write-Host "ADIM 4: Yuklenen versiyonlar kontrol ediliyor..." -ForegroundColor Yellow
Write-Host ""

$versions = npm list react react-native react-native-reanimated --depth=0 2>&1
Write-Host $versions

Write-Host ""
Write-Host "Beklenen versiyonlar (Expo SDK 54):" -ForegroundColor Cyan
Write-Host "   react@19.1.0" -ForegroundColor White
Write-Host "   react-native@0.81.5" -ForegroundColor White
Write-Host "   react-native-reanimated@4.1.3" -ForegroundColor White

# ADIM 5: KONTROL LISTESI
Write-Host ""
Write-Host "KONTROL LISTESI - Lutfen Dogrula:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   babel.config.js:" -ForegroundColor Cyan
Write-Host "      plugins: [" -ForegroundColor White
Write-Host "        // diger pluginler..." -ForegroundColor Gray
Write-Host "        'react-native-reanimated/plugin'  // <- EN SONDA!" -ForegroundColor White
Write-Host "      ]" -ForegroundColor White
Write-Host ""
Write-Host "   index.js:" -ForegroundColor Cyan
Write-Host "      import 'react-native-gesture-handler';  // <- EN USTTE" -ForegroundColor White
Write-Host "      import 'react-native-reanimated';       // <- IKINCI" -ForegroundColor White
Write-Host ""

# ADIM 6: EXPO DOCTOR
Write-Host "ADIM 5: Expo doctor saglik kontrolu..." -ForegroundColor Cyan
Write-Host ""

try {
    npx expo-doctor
    Write-Host ""
    Write-Host "   OK: Expo doctor tamamlandi" -ForegroundColor Green
} catch {
    Write-Host "   UYARI: expo-doctor calistirilamadi" -ForegroundColor Yellow
}

# FINAL
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "   RESTORE TAMAMLANDI!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Host "SIMDI SUNLARI YAP:" -ForegroundColor Yellow
Write-Host ""
Write-Host "   1) Metro'yu baslat:" -ForegroundColor Cyan
Write-Host "      npx expo start -c" -ForegroundColor White
Write-Host ""
Write-Host "   2) Expo Go'da test et:" -ForegroundColor Cyan
Write-Host "      - Telefonda Expo Go'yu KAPAT ve YENIDEN AC" -ForegroundColor White
Write-Host "      - QR kodu scan et" -ForegroundColor White
Write-Host ""
Write-Host "   3) Emulator'de test et:" -ForegroundColor Cyan
Write-Host "      - Metro'da 'a' tusuna bas" -ForegroundColor White
Write-Host ""

Write-Host "BEKLENEN SONUC:" -ForegroundColor Yellow
Write-Host "   - [runtime not ready] hatasi yok" -ForegroundColor Green
Write-Host "   - App aciliyor" -ForegroundColor Green
Write-Host "   - Drawer navigation calisiyor" -ForegroundColor Green
Write-Host ""

Write-Host "OPSIYONEL: Windows uzun yol desteği" -ForegroundColor Yellow
Write-Host "   Gelecekte sorun yasamamak icin:" -ForegroundColor White
Write-Host "   reg add HKLM\SYSTEM\CurrentControlSet\Control\FileSystem \" -ForegroundColor Gray
Write-Host "     /v LongPathsEnabled /t REG_DWORD /d 1 /f" -ForegroundColor Gray
Write-Host "   (Admin gerektirir, yeniden baslatma gerekebilir)" -ForegroundColor Gray
Write-Host ""
