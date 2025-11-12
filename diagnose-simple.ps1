# FLEET NAVIGATION DIAGNOSTIC SCRIPT
# Finds undefined screens causing "map of undefined" error

Write-Host "=== FLEET NAVIGATION DIAGNOSTIC ===" -ForegroundColor Cyan
Write-Host ""

# Change to project directory
Set-Location "C:\argon"

Write-Host "[1/4] Checking Screens.js..." -ForegroundColor Yellow
$screensFile = "navigation\Screens.js"

if (-not (Test-Path $screensFile)) {
    Write-Host "ERROR: Screens.js not found!" -ForegroundColor Red
    exit 1
}

Write-Host "  Found: $screensFile" -ForegroundColor Green
Write-Host ""

Write-Host "[2/4] Reading file..." -ForegroundColor Yellow
$content = Get-Content $screensFile -Raw

# Extract all imports
$importPattern = 'import\s+(\w+)\s+from\s+[''"](.+?)[''"]'
$imports = [regex]::Matches($content, $importPattern)

Write-Host "  Total imports: $($imports.Count)" -ForegroundColor Gray
Write-Host ""

Write-Host "[3/4] Checking each screen..." -ForegroundColor Yellow
$missingScreens = @()

foreach ($import in $imports) {
    $screenName = $import.Groups[1].Value
    $screenPath = $import.Groups[2].Value
    
    # Skip non-screen imports
    if ($screenPath -notmatch "screens") {
        continue
    }
    
    # Convert path
    $actualPath = ""
    if ($screenPath.StartsWith("../screens/")) {
        $actualPath = $screenPath.Replace("../screens/", "screens\").Replace("/", "\")
    }
    
    # Check if exists
    $exists = $false
    if ($actualPath) {
        if (Test-Path "$actualPath.js") {
            $exists = $true
        }
        elseif (Test-Path "$actualPath.jsx") {
            $exists = $true
        }
    }
    
    if ($exists) {
        Write-Host "  OK: $screenName" -ForegroundColor Green
    }
    else {
        Write-Host "  MISSING: $screenName" -ForegroundColor Red
        $missingScreens += $screenName
    }
}

Write-Host ""
Write-Host "[4/4] Summary" -ForegroundColor Yellow
Write-Host "  Missing screens: $($missingScreens.Count)" -ForegroundColor $(if ($missingScreens.Count -gt 0) { "Red" } else { "Green" })

if ($missingScreens.Count -gt 0) {
    Write-Host ""
    Write-Host "Missing screens:" -ForegroundColor Red
    foreach ($screen in $missingScreens) {
        Write-Host "  - $screen" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "SOLUTION: These screens need to be removed from Screens.js" -ForegroundColor Yellow
}
else {
    Write-Host ""
    Write-Host "All screens found! Issue may be:" -ForegroundColor Yellow
    Write-Host "  1. Empty arrays in Screens.js" -ForegroundColor White
    Write-Host "  2. Screens referenced dynamically or exported with different names" -ForegroundColor White
    Write-Host ""
    Write-Host "If the issue persists, verify runtime imports, navigation registration, and rebuild the app." -ForegroundColor Yellow
}