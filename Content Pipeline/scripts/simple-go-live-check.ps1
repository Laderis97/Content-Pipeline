# Simple Go-Live Health Check Script (PowerShell)
# Direct health check without ScriptBlocks

Write-Host "Starting Simple Go-Live Health Check for Content Pipeline..." -ForegroundColor Green
Write-Host "Timestamp: $(Get-Date)" -ForegroundColor White

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$functionsUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$healthResults = @()
$checkId = 1
$overallStatus = "PASS"

function Test-Component {
    param(
        [string]$Name,
        [string]$Description,
        [string]$CriticalLevel = "HIGH"
    )
    
    Write-Host "`n$checkId. Testing: $Name" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   Critical Level: $CriticalLevel" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        
        # Test database connection
        $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs?select=count" -Method GET -Headers $headers -TimeoutSec 10
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        if ($response.StatusCode -eq 200) {
            $count = ($response.Content | ConvertFrom-Json)[0].count
            Write-Host "   Status: [PASS] (${responseTime}ms)" -ForegroundColor Green
            Write-Host "   Details: Database accessible, $count content jobs found" -ForegroundColor White
            
            $script:healthResults += @{
                Component = $Name
                Status = "PASS"
                ResponseTime = $responseTime
                CriticalLevel = $CriticalLevel
                Details = "Database accessible, $count content jobs found"
            }
        } else {
            Write-Host "   Status: [FAIL] ($($response.StatusCode))" -ForegroundColor Red
            $script:healthResults += @{
                Component = $Name
                Status = "FAIL"
                ResponseTime = $responseTime
                CriticalLevel = $CriticalLevel
                Details = "Failed with status: $($response.StatusCode)"
            }
            if ($CriticalLevel -eq "CRITICAL") {
                $script:overallStatus = "FAIL"
            }
        }
    } catch {
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        Write-Host "   Status: [FAIL] - $($_.Exception.Message)" -ForegroundColor Red
        $script:healthResults += @{
            Component = $Name
            Status = "FAIL"
            ResponseTime = $responseTime
            CriticalLevel = $CriticalLevel
            Details = "Error: $($_.Exception.Message)"
        }
        if ($CriticalLevel -eq "CRITICAL") {
            $script:overallStatus = "FAIL"
        }
    }
    
    $script:checkId++
}

# Test 1: Database Connectivity
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 1: DATABASE CONNECTIVITY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-Component -Name "Database Connection" -Description "Test basic database connectivity" -CriticalLevel "CRITICAL"

# Test 2: Edge Functions
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 2: EDGE FUNCTIONS" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

try {
    Write-Host "`n$checkId. Testing: Health Check Function" -ForegroundColor Yellow
    Write-Host "   Description: Test health check endpoint" -ForegroundColor White
    Write-Host "   Critical Level: CRITICAL" -ForegroundColor White
    
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$functionsUrl/health" -Method GET -Headers $headers -TimeoutSec 15
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   Status: [PASS] (${responseTime}ms)" -ForegroundColor Green
        Write-Host "   Details: Health check function operational" -ForegroundColor White
        $healthResults += @{
            Component = "Health Check Function"
            Status = "PASS"
            ResponseTime = $responseTime
            CriticalLevel = "CRITICAL"
            Details = "Health check function operational"
        }
    } else {
        Write-Host "   Status: [FAIL] ($($response.StatusCode))" -ForegroundColor Red
        $healthResults += @{
            Component = "Health Check Function"
            Status = "FAIL"
            ResponseTime = $responseTime
            CriticalLevel = "CRITICAL"
            Details = "Failed with status: $($response.StatusCode)"
        }
        $overallStatus = "FAIL"
    }
    $checkId++
} catch {
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    Write-Host "   Status: [FAIL] - $($_.Exception.Message)" -ForegroundColor Red
    $healthResults += @{
        Component = "Health Check Function"
        Status = "FAIL"
        ResponseTime = $responseTime
        CriticalLevel = "CRITICAL"
        Details = "Error: $($_.Exception.Message)"
    }
    $overallStatus = "FAIL"
    $checkId++
}

# Test 3: Performance Monitor
try {
    Write-Host "`n$checkId. Testing: Performance Monitor" -ForegroundColor Yellow
    Write-Host "   Description: Test performance monitoring function" -ForegroundColor White
    Write-Host "   Critical Level: HIGH" -ForegroundColor White
    
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$functionsUrl/performance-monitor" -Method GET -Headers $headers -TimeoutSec 15
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   Status: [PASS] (${responseTime}ms)" -ForegroundColor Green
        Write-Host "   Details: Performance monitor function operational" -ForegroundColor White
        $healthResults += @{
            Component = "Performance Monitor"
            Status = "PASS"
            ResponseTime = $responseTime
            CriticalLevel = "HIGH"
            Details = "Performance monitor function operational"
        }
    } else {
        Write-Host "   Status: [FAIL] ($($response.StatusCode))" -ForegroundColor Red
        $healthResults += @{
            Component = "Performance Monitor"
            Status = "FAIL"
            ResponseTime = $responseTime
            CriticalLevel = "HIGH"
            Details = "Failed with status: $($response.StatusCode)"
        }
    }
    $checkId++
} catch {
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    Write-Host "   Status: [FAIL] - $($_.Exception.Message)" -ForegroundColor Red
    $healthResults += @{
        Component = "Performance Monitor"
        Status = "FAIL"
        ResponseTime = $responseTime
        CriticalLevel = "HIGH"
        Details = "Error: $($_.Exception.Message)"
    }
    $checkId++
}

# Test 4: Metrics Collector
try {
    Write-Host "`n$checkId. Testing: Metrics Collector" -ForegroundColor Yellow
    Write-Host "   Description: Test metrics collection function" -ForegroundColor White
    Write-Host "   Critical Level: HIGH" -ForegroundColor White
    
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$functionsUrl/metrics" -Method GET -Headers $headers -TimeoutSec 15
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   Status: [PASS] (${responseTime}ms)" -ForegroundColor Green
        Write-Host "   Details: Metrics collector function operational" -ForegroundColor White
        $healthResults += @{
            Component = "Metrics Collector"
            Status = "PASS"
            ResponseTime = $responseTime
            CriticalLevel = "HIGH"
            Details = "Metrics collector function operational"
        }
    } else {
        Write-Host "   Status: [FAIL] ($($response.StatusCode))" -ForegroundColor Red
        $healthResults += @{
            Component = "Metrics Collector"
            Status = "FAIL"
            ResponseTime = $responseTime
            CriticalLevel = "HIGH"
            Details = "Failed with status: $($response.StatusCode)"
        }
    }
    $checkId++
} catch {
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    Write-Host "   Status: [FAIL] - $($_.Exception.Message)" -ForegroundColor Red
    $healthResults += @{
        Component = "Metrics Collector"
        Status = "FAIL"
        ResponseTime = $responseTime
        CriticalLevel = "HIGH"
        Details = "Error: $($_.Exception.Message)"
    }
    $checkId++
}

# Test 5: Job Creation
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 3: JOB PROCESSING" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

try {
    Write-Host "`n$checkId. Testing: Job Creation" -ForegroundColor Yellow
    Write-Host "   Description: Test content job creation" -ForegroundColor White
    Write-Host "   Critical Level: CRITICAL" -ForegroundColor White
    
    $startTime = Get-Date
    $jobBody = @{
        topic = "Go-Live Health Check Test"
        status = "pending"
        created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    } | ConvertTo-Json
    
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $jobBody -TimeoutSec 10
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 201) {
        $jobData = $response.Content | ConvertFrom-Json
        Write-Host "   Status: [PASS] (${responseTime}ms)" -ForegroundColor Green
        Write-Host "   Details: Job created successfully: $($jobData.id)" -ForegroundColor White
        $healthResults += @{
            Component = "Job Creation"
            Status = "PASS"
            ResponseTime = $responseTime
            CriticalLevel = "CRITICAL"
            Details = "Job created successfully: $($jobData.id)"
        }
    } else {
        Write-Host "   Status: [FAIL] ($($response.StatusCode))" -ForegroundColor Red
        $healthResults += @{
            Component = "Job Creation"
            Status = "FAIL"
            ResponseTime = $responseTime
            CriticalLevel = "CRITICAL"
            Details = "Failed with status: $($response.StatusCode)"
        }
        $overallStatus = "FAIL"
    }
    $checkId++
} catch {
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    Write-Host "   Status: [FAIL] - $($_.Exception.Message)" -ForegroundColor Red
    $healthResults += @{
        Component = "Job Creation"
        Status = "FAIL"
        ResponseTime = $responseTime
        CriticalLevel = "CRITICAL"
        Details = "Error: $($_.Exception.Message)"
    }
    $overallStatus = "FAIL"
    $checkId++
}

# Summary Report
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "GO-LIVE HEALTH CHECK SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$totalChecks = $healthResults.Count
$passedChecks = ($healthResults | Where-Object { $_.Status -eq "PASS" }).Count
$failedChecks = ($healthResults | Where-Object { $_.Status -eq "FAIL" }).Count
$criticalFailures = ($healthResults | Where-Object { $_.Status -eq "FAIL" -and $_.CriticalLevel -eq "CRITICAL" }).Count

Write-Host "`nOverall Status: $overallStatus" -ForegroundColor $(if ($overallStatus -eq "PASS") { "Green" } else { "Red" })
Write-Host "Total Checks: $totalChecks" -ForegroundColor White
Write-Host "Passed: $passedChecks" -ForegroundColor Green
Write-Host "Failed: $failedChecks" -ForegroundColor Red
Write-Host "Critical Failures: $criticalFailures" -ForegroundColor $(if ($criticalFailures -eq 0) { "Green" } else { "Red" })

Write-Host "`nDetailed Results:" -ForegroundColor White
$healthResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "PASS") { "Green" } else { "Red" }
    $statusIcon = if ($_.Status -eq "PASS") { "[PASS]" } else { "[FAIL]" }
    $criticalIcon = if ($_.CriticalLevel -eq "CRITICAL") { "[CRIT]" } elseif ($_.CriticalLevel -eq "HIGH") { "[HIGH]" } else { "[LOW]" }
    Write-Host "   $statusIcon $criticalIcon $($_.Component): $($_.Status) ($($_.ResponseTime)ms)" -ForegroundColor $statusColor
}

# Performance Summary
if ($healthResults.Count -gt 0) {
    $avgResponseTime = [math]::Round(($healthResults | Measure-Object -Property ResponseTime -Average).Average, 2)
    $maxResponseTime = ($healthResults | Measure-Object -Property ResponseTime -Maximum).Maximum
    $minResponseTime = ($healthResults | Measure-Object -Property ResponseTime -Minimum).Minimum

    Write-Host "`nPerformance Summary:" -ForegroundColor White
    Write-Host "   Average Response Time: ${avgResponseTime}ms" -ForegroundColor White
    Write-Host "   Maximum Response Time: ${maxResponseTime}ms" -ForegroundColor White
    Write-Host "   Minimum Response Time: ${minResponseTime}ms" -ForegroundColor White
}

# Go-Live Recommendation
Write-Host "`nGo-Live Recommendation:" -ForegroundColor White
if ($overallStatus -eq "PASS" -and $criticalFailures -eq 0) {
    Write-Host "   [SUCCESS] SYSTEM READY FOR GO-LIVE!" -ForegroundColor Green
    Write-Host "   All critical systems operational" -ForegroundColor Green
    Write-Host "   Performance within acceptable limits" -ForegroundColor Green
    Write-Host "   No blocking issues identified" -ForegroundColor Green
} else {
    Write-Host "   [WARNING] SYSTEM NOT READY FOR GO-LIVE" -ForegroundColor Red
    Write-Host "   Critical failures detected: $criticalFailures" -ForegroundColor Red
    Write-Host "   Address issues before proceeding" -ForegroundColor Red
}

# Next Steps
Write-Host "`nNext Steps:" -ForegroundColor White
if ($overallStatus -eq "PASS") {
    Write-Host "1. [OK] Proceed with go-live deployment" -ForegroundColor Green
    Write-Host "2. [OK] Monitor system during initial deployment" -ForegroundColor Green
    Write-Host "3. [OK] Have support team ready for first 24 hours" -ForegroundColor Green
    Write-Host "4. [OK] Document any issues encountered" -ForegroundColor Green
} else {
    Write-Host "1. [STOP] Address critical failures first" -ForegroundColor Red
    Write-Host "2. [STOP] Re-run health check after fixes" -ForegroundColor Red
    Write-Host "3. [STOP] Do not proceed with go-live until all critical issues resolved" -ForegroundColor Red
    Write-Host "4. [STOP] Contact technical team for assistance" -ForegroundColor Red
}

Write-Host "`nHealth Check completed at: $(Get-Date)" -ForegroundColor White
Write-Host "="*60 -ForegroundColor Cyan
