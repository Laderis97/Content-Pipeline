# Setup Monitoring Dashboards Script (PowerShell)
# This script sets up production monitoring dashboards for the Content Pipeline system

Write-Host "Setting up Production Monitoring Dashboards for Content Pipeline..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co"
$functionsUrl = "$baseUrl/functions/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$setupResults = @()
$setupId = 1

function Test-DashboardSetup {
    param(
        [string]$DashboardName,
        [string]$Description,
        [string]$EndpointUrl
    )
    
    Write-Host "`n$setupId. Setting up: $DashboardName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   Endpoint: $EndpointUrl" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri $EndpointUrl -Method GET -Headers $headers -TimeoutSec 30
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        if ($response.StatusCode -eq 200) {
            $data = $response.Content | ConvertFrom-Json
            Write-Host "   Status: [SUCCESS] (${responseTime}ms)" -ForegroundColor Green
            Write-Host "   Details: Dashboard endpoint operational" -ForegroundColor White
            
            $script:setupResults += @{
                Name = $DashboardName
                Status = "SUCCESS"
                ResponseTime = $responseTime
                Details = "Dashboard endpoint operational"
            }
        } else {
            Write-Host "   Status: [FAILED] ($($response.StatusCode))" -ForegroundColor Red
            $script:setupResults += @{
                Name = $DashboardName
                Status = "FAILED"
                ResponseTime = $responseTime
                Details = "Failed with status: $($response.StatusCode)"
            }
        }
    } catch {
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        Write-Host "   Status: [ERROR] - $($_.Exception.Message)" -ForegroundColor Red
        $script:setupResults += @{
            Name = $DashboardName
            Status = "ERROR"
            ResponseTime = $responseTime
            Details = "Error: $($_.Exception.Message)"
        }
    }
    
    $script:setupId++
}

# Test 1: Real-time Monitoring Dashboard
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 1: REAL-TIME MONITORING DASHBOARD" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-DashboardSetup -DashboardName "Real-time Monitoring Dashboard" -Description "Test real-time monitoring dashboard endpoint" -EndpointUrl "$functionsUrl/monitoring-dashboard"

# Test 2: Historical Performance Dashboard
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 2: HISTORICAL PERFORMANCE DASHBOARD" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-DashboardSetup -DashboardName "Historical Performance Dashboard" -Description "Test historical performance dashboard endpoint" -EndpointUrl "$functionsUrl/historical-dashboard?period=24h"

# Test 3: Alerting Dashboard
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 3: ALERTING DASHBOARD" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-DashboardSetup -DashboardName "Alerting Dashboard" -Description "Test alerting dashboard endpoint" -EndpointUrl "$functionsUrl/alerting-dashboard"

# Test 4: Web Dashboard Interface
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 4: WEB DASHBOARD INTERFACE" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

try {
    Write-Host "`n$setupId. Testing: Web Dashboard Interface" -ForegroundColor Yellow
    Write-Host "   Description: Test web dashboard HTML interface" -ForegroundColor White
    Write-Host "   File: docs/monitoring-dashboard.html" -ForegroundColor White
    
    if (Test-Path "docs/monitoring-dashboard.html") {
        $fileSize = (Get-Item "docs/monitoring-dashboard.html").Length
        Write-Host "   Status: [SUCCESS] (${fileSize} bytes)" -ForegroundColor Green
        Write-Host "   Details: Web dashboard interface file exists" -ForegroundColor White
        
        $script:setupResults += @{
            Name = "Web Dashboard Interface"
            Status = "SUCCESS"
            ResponseTime = 0
            Details = "Web dashboard interface file exists (${fileSize} bytes)"
        }
    } else {
        Write-Host "   Status: [FAILED] - File not found" -ForegroundColor Red
        $script:setupResults += @{
            Name = "Web Dashboard Interface"
            Status = "FAILED"
            ResponseTime = 0
            Details = "File not found"
        }
    }
    $script:setupId++
} catch {
    Write-Host "   Status: [ERROR] - $($_.Exception.Message)" -ForegroundColor Red
    $script:setupResults += @{
        Name = "Web Dashboard Interface"
        Status = "ERROR"
        ResponseTime = 0
        Details = "Error: $($_.Exception.Message)"
    }
    $script:setupId++
}

# Test 5: Dashboard Data Validation
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 5: DASHBOARD DATA VALIDATION" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

try {
    Write-Host "`n$setupId. Testing: Dashboard Data Validation" -ForegroundColor Yellow
    Write-Host "   Description: Validate dashboard data structure and content" -ForegroundColor White
    
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$functionsUrl/monitoring-dashboard" -Method GET -Headers $headers -TimeoutSec 30
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 200) {
        $data = $response.Content | ConvertFrom-Json
        
        # Validate data structure
        $requiredFields = @('systemHealth', 'jobStats', 'performance', 'functions', 'alerts', 'recentJobs')
        $missingFields = @()
        
        foreach ($field in $requiredFields) {
            if (-not $data.data.PSObject.Properties.Name -contains $field) {
                $missingFields += $field
            }
        }
        
        if ($missingFields.Count -eq 0) {
            Write-Host "   Status: [SUCCESS] (${responseTime}ms)" -ForegroundColor Green
            Write-Host "   Details: Dashboard data structure valid" -ForegroundColor White
            Write-Host "   Data Points: $($data.data.PSObject.Properties.Count) fields" -ForegroundColor White
            
            $script:setupResults += @{
                Name = "Dashboard Data Validation"
                Status = "SUCCESS"
                ResponseTime = $responseTime
                Details = "Dashboard data structure valid with $($data.data.PSObject.Properties.Count) fields"
            }
        } else {
            Write-Host "   Status: [FAILED] - Missing fields: $($missingFields -join ', ')" -ForegroundColor Red
            $script:setupResults += @{
                Name = "Dashboard Data Validation"
                Status = "FAILED"
                ResponseTime = $responseTime
                Details = "Missing required fields: $($missingFields -join ', ')"
            }
        }
    } else {
        Write-Host "   Status: [FAILED] ($($response.StatusCode))" -ForegroundColor Red
        $script:setupResults += @{
            Name = "Dashboard Data Validation"
            Status = "FAILED"
            ResponseTime = $responseTime
            Details = "Failed with status: $($response.StatusCode)"
        }
    }
    $script:setupId++
} catch {
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    Write-Host "   Status: [ERROR] - $($_.Exception.Message)" -ForegroundColor Red
    $script:setupResults += @{
        Name = "Dashboard Data Validation"
        Status = "ERROR"
        ResponseTime = $responseTime
        Details = "Error: $($_.Exception.Message)"
    }
    $script:setupId++
}

# Summary Report
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "MONITORING DASHBOARDS SETUP SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$totalSetups = $setupResults.Count
$successfulSetups = ($setupResults | Where-Object { $_.Status -eq "SUCCESS" }).Count
$failedSetups = ($setupResults | Where-Object { $_.Status -eq "FAILED" -or $_.Status -eq "ERROR" }).Count

Write-Host "`nTotal Setups: $totalSetups" -ForegroundColor White
Write-Host "Successful: $successfulSetups" -ForegroundColor Green
Write-Host "Failed: $failedSetups" -ForegroundColor Red

Write-Host "`nSetup Results:" -ForegroundColor White
$setupResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "SUCCESS") { "Green" } else { "Red" }
    $statusIcon = if ($_.Status -eq "SUCCESS") { "[SUCCESS]" } else { "[FAILED]" }
    Write-Host "   $statusIcon $($_.Name): $($_.Status) ($($_.ResponseTime)ms)" -ForegroundColor $statusColor
}

# Dashboard URLs
Write-Host "`nDashboard URLs:" -ForegroundColor White
Write-Host "   Real-time Dashboard: $functionsUrl/monitoring-dashboard" -ForegroundColor Cyan
Write-Host "   Historical Dashboard: $functionsUrl/historical-dashboard" -ForegroundColor Cyan
Write-Host "   Alerting Dashboard: $functionsUrl/alerting-dashboard" -ForegroundColor Cyan
Write-Host "   Web Interface: docs/monitoring-dashboard.html" -ForegroundColor Cyan

# Setup Instructions
Write-Host "`nSetup Instructions:" -ForegroundColor White
Write-Host "1. Deploy Edge Functions to Supabase" -ForegroundColor Yellow
Write-Host "2. Configure dashboard endpoints" -ForegroundColor Yellow
Write-Host "3. Set up user access permissions" -ForegroundColor Yellow
Write-Host "4. Configure auto-refresh intervals" -ForegroundColor Yellow
Write-Host "5. Test dashboard functionality" -ForegroundColor Yellow

# Next Steps
Write-Host "`nNext Steps:" -ForegroundColor White
if ($failedSetups -eq 0) {
    Write-Host "1. [OK] Deploy Edge Functions to production" -ForegroundColor Green
    Write-Host "2. [OK] Configure dashboard access permissions" -ForegroundColor Green
    Write-Host "3. [OK] Set up monitoring schedules" -ForegroundColor Green
    Write-Host "4. [OK] Train users on dashboard usage" -ForegroundColor Green
} else {
    Write-Host "1. [STOP] Address failed dashboard setups first" -ForegroundColor Red
    Write-Host "2. [STOP] Re-run setup script after fixes" -ForegroundColor Red
    Write-Host "3. [STOP] Verify all dashboards are operational" -ForegroundColor Red
    Write-Host "4. [STOP] Contact technical team for assistance" -ForegroundColor Red
}

Write-Host "`nDashboard setup completed at: $(Get-Date)" -ForegroundColor White
Write-Host "="*60 -ForegroundColor Cyan
