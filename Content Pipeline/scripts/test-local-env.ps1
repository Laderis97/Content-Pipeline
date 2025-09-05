# Local Environment Testing Script (PowerShell)
# This script tests the local development environment setup

Write-Host "Testing local development environment..." -ForegroundColor Green

$errors = @()
$warnings = @()

# Test 1: Check if .env.local exists
Write-Host "`n1. Checking environment files..." -ForegroundColor Yellow
if (Test-Path ".env.local") {
    Write-Host "   ✅ .env.local file exists" -ForegroundColor Green
} else {
    $errors += ".env.local file is missing"
    Write-Host "   ❌ .env.local file is missing" -ForegroundColor Red
}

if (Test-Path ".env.example") {
    Write-Host "   ✅ .env.example file exists" -ForegroundColor Green
} else {
    $warnings += ".env.example file is missing"
    Write-Host "   ⚠️  .env.example file is missing" -ForegroundColor Yellow
}

# Test 2: Check if .gitignore exists and includes .env files
Write-Host "`n2. Checking .gitignore configuration..." -ForegroundColor Yellow
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -match "\.env\.local") {
        Write-Host "   ✅ .env.local is properly ignored in .gitignore" -ForegroundColor Green
    } else {
        $warnings += ".env.local is not ignored in .gitignore"
        Write-Host "   ⚠️  .env.local is not ignored in .gitignore" -ForegroundColor Yellow
    }
} else {
    $errors += ".gitignore file is missing"
    Write-Host "   ❌ .gitignore file is missing" -ForegroundColor Red
}

# Test 3: Check Docker installation
Write-Host "`n3. Checking Docker installation..." -ForegroundColor Yellow
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        Write-Host "   ✅ Docker is installed: $dockerVersion" -ForegroundColor Green
    } else {
        $errors += "Docker is not installed or not in PATH"
        Write-Host "   ❌ Docker is not installed or not in PATH" -ForegroundColor Red
    }
} catch {
    $errors += "Docker is not installed or not in PATH"
    Write-Host "   ❌ Docker is not installed or not in PATH" -ForegroundColor Red
}

# Test 4: Check if Docker Desktop is running
Write-Host "`n4. Checking Docker Desktop status..." -ForegroundColor Yellow
try {
    $dockerPs = docker ps 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Docker Desktop is running" -ForegroundColor Green
    } else {
        $warnings += "Docker Desktop is not running"
        Write-Host "   ⚠️  Docker Desktop is not running" -ForegroundColor Yellow
        Write-Host "      Please start Docker Desktop to use local Supabase development" -ForegroundColor White
    }
} catch {
    $warnings += "Docker Desktop is not running"
    Write-Host "   ⚠️  Docker Desktop is not running" -ForegroundColor Yellow
    Write-Host "      Please start Docker Desktop to use local Supabase development" -ForegroundColor White
}

# Test 5: Check Supabase CLI
Write-Host "`n5. Checking Supabase CLI..." -ForegroundColor Yellow
try {
    $supabaseVersion = npx supabase --version 2>$null
    if ($supabaseVersion) {
        Write-Host "   ✅ Supabase CLI is available: $supabaseVersion" -ForegroundColor Green
    } else {
        $errors += "Supabase CLI is not available"
        Write-Host "   ❌ Supabase CLI is not available" -ForegroundColor Red
    }
} catch {
    $errors += "Supabase CLI is not available"
    Write-Host "   ❌ Supabase CLI is not available" -ForegroundColor Red
}

# Test 6: Check Node.js and npm
Write-Host "`n6. Checking Node.js and npm..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "   ✅ Node.js is installed: $nodeVersion" -ForegroundColor Green
    } else {
        $errors += "Node.js is not installed"
        Write-Host "   ❌ Node.js is not installed" -ForegroundColor Red
    }
} catch {
    $errors += "Node.js is not installed"
    Write-Host "   ❌ Node.js is not installed" -ForegroundColor Red
}

try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "   ✅ npm is installed: $npmVersion" -ForegroundColor Green
    } else {
        $errors += "npm is not installed"
        Write-Host "   ❌ npm is not installed" -ForegroundColor Red
    }
} catch {
    $errors += "npm is not installed"
    Write-Host "   ❌ npm is not installed" -ForegroundColor Red
}

# Test 7: Check if node_modules exists
Write-Host "`n7. Checking Node.js dependencies..." -ForegroundColor Yellow
if (Test-Path "node_modules") {
    Write-Host "   ✅ node_modules directory exists" -ForegroundColor Green
} else {
    $warnings += "node_modules directory is missing - run 'npm install'"
    Write-Host "   ⚠️  node_modules directory is missing" -ForegroundColor Yellow
    Write-Host "      Run 'npm install' to install dependencies" -ForegroundColor White
}

# Test 8: Check TypeScript configuration
Write-Host "`n8. Checking TypeScript configuration..." -ForegroundColor Yellow
if (Test-Path "tsconfig.json") {
    Write-Host "   ✅ tsconfig.json exists" -ForegroundColor Green
} else {
    $warnings += "tsconfig.json is missing"
    Write-Host "   ⚠️  tsconfig.json is missing" -ForegroundColor Yellow
}

# Test 9: Check Supabase configuration
Write-Host "`n9. Checking Supabase configuration..." -ForegroundColor Yellow
if (Test-Path "supabase/config.toml") {
    Write-Host "   ✅ supabase/config.toml exists" -ForegroundColor Green
} else {
    $errors += "supabase/config.toml is missing"
    Write-Host "   ❌ supabase/config.toml is missing" -ForegroundColor Red
}

# Test 10: Check if project is linked to Supabase
Write-Host "`n10. Checking Supabase project link..." -ForegroundColor Yellow
try {
    $supabaseStatus = npx supabase status 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "   ✅ Supabase project is linked" -ForegroundColor Green
    } else {
        $warnings += "Supabase project is not linked locally"
        Write-Host "   ⚠️  Supabase project is not linked locally" -ForegroundColor Yellow
        Write-Host "      This is normal if using remote development only" -ForegroundColor White
    }
} catch {
    $warnings += "Supabase project is not linked locally"
    Write-Host "   ⚠️  Supabase project is not linked locally" -ForegroundColor Yellow
    Write-Host "      This is normal if using remote development only" -ForegroundColor White
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "LOCAL ENVIRONMENT TEST SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

if ($errors.Count -eq 0) {
    Write-Host "`n🎉 All critical tests passed!" -ForegroundColor Green
    Write-Host "Your local development environment is ready." -ForegroundColor Green
} else {
    Write-Host "`n❌ Critical issues found:" -ForegroundColor Red
    foreach ($error in $errors) {
        Write-Host "   • $error" -ForegroundColor Red
    }
}

if ($warnings.Count -gt 0) {
    Write-Host "`n⚠️  Warnings:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "   • $warning" -ForegroundColor Yellow
    }
}

Write-Host "`nNext steps:" -ForegroundColor Yellow
if ($errors.Count -eq 0) {
    Write-Host "1. Start Docker Desktop if you want to use local Supabase development" -ForegroundColor White
    Write-Host "2. Edit .env.local with your actual API keys" -ForegroundColor White
    Write-Host "3. Run 'npx supabase start' to start local development (requires Docker)" -ForegroundColor White
    Write-Host "4. Or continue with remote development using the linked project" -ForegroundColor White
} else {
    Write-Host "1. Fix the critical issues listed above" -ForegroundColor White
    Write-Host "2. Run this test script again" -ForegroundColor White
    Write-Host "3. Then proceed with local development setup" -ForegroundColor White
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
