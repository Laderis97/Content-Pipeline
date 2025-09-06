# Simple Production Testing Script (PowerShell)
# This script performs basic production testing of the Content Pipeline system

Write-Host "Starting Simple Production Testing for Content Pipeline..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$testResults = @()
$testId = 1

function Test-SystemComponent {
    param(
        [string]$TestName,
        [string]$Description
    )
    
    Write-Host "`n$testId. Testing: $TestName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        
        # Test content job creation
        $jobBody = @{
            topic = "Test Topic for $TestName"
            status = "pending"
            created_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
        } | ConvertTo-Json
        
        $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $jobBody
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        
        if ($response.StatusCode -eq 201) {
            $jobData = $response.Content | ConvertFrom-Json
            Write-Host "   Status: ✅ SUCCESS (${responseTime}ms)" -ForegroundColor Green
            Write-Host "   Job ID: $($jobData.id)" -ForegroundColor White
            
            $script:testResults += @{
                Name = $TestName
                Status = "SUCCESS"
                ResponseTime = $responseTime
                JobId = $jobData.id
                Details = "Content job created successfully"
            }
        } else {
            Write-Host "   Status: ❌ FAILED ($($response.StatusCode))" -ForegroundColor Red
            $script:testResults += @{
                Name = $TestName
                Status = "FAILED"
                ResponseTime = $responseTime
                JobId = $null
                Details = "Failed with status: $($response.StatusCode)"
            }
        }
    } catch {
        $endTime = Get-Date
        $responseTime = ($endTime - $startTime).TotalMilliseconds
        Write-Host "   Status: ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += @{
            Name = $TestName
            Status = "ERROR"
            ResponseTime = $responseTime
            JobId = $null
            Details = "Error: $($_.Exception.Message)"
        }
    }
    
    $script:testId++
}

# Test 1: Create test content jobs
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 1: CREATING TEST CONTENT JOBS" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

Test-SystemComponent -TestName "Technology Article" -Description "Test content generation for AI healthcare topic"
Test-SystemComponent -TestName "Business Article" -Description "Test content generation for business transformation topic"
Test-SystemComponent -TestName "Lifestyle Article" -Description "Test content generation for lifestyle topic"
Test-SystemComponent -TestName "Educational Article" -Description "Test content generation for educational topic"
Test-SystemComponent -TestName "News Article" -Description "Test content generation for news topic"

# Test 2: Test database access
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 2: TESTING DATABASE ACCESS" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

try {
    Write-Host "`n$testId. Testing: Database Table Access" -ForegroundColor Yellow
    Write-Host "   Description: Test access to content_jobs table" -ForegroundColor White
    
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs?select=count" -Method GET -Headers $headers
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 200) {
        $count = ($response.Content | ConvertFrom-Json)[0].count
        Write-Host "   Status: ✅ SUCCESS (${responseTime}ms)" -ForegroundColor Green
        Write-Host "   Records: $count" -ForegroundColor White
        
        $script:testResults += @{
            Name = "Database Table Access"
            Status = "SUCCESS"
            ResponseTime = $responseTime
            JobId = $null
            Details = "Database accessible, $count records found"
        }
    } else {
        Write-Host "   Status: ❌ FAILED ($($response.StatusCode))" -ForegroundColor Red
        $script:testResults += @{
            Name = "Database Table Access"
            Status = "FAILED"
            ResponseTime = $responseTime
            JobId = $null
            Details = "Failed with status: $($response.StatusCode)"
        }
    }
    $script:testId++
} catch {
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    Write-Host "   Status: ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $script:testResults += @{
        Name = "Database Table Access"
        Status = "ERROR"
        ResponseTime = $responseTime
        JobId = $null
        Details = "Error: $($_.Exception.Message)"
    }
    $script:testId++
}

# Test 3: Test Edge Functions
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 3: TESTING EDGE FUNCTIONS" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

try {
    Write-Host "`n$testId. Testing: Performance Monitor Function" -ForegroundColor Yellow
    Write-Host "   Description: Test performance monitor function" -ForegroundColor White
    
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/performance-monitor" -Method GET -Headers $headers -TimeoutSec 30
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   Status: ✅ SUCCESS (${responseTime}ms)" -ForegroundColor Green
        $script:testResults += @{
            Name = "Performance Monitor Function"
            Status = "SUCCESS"
            ResponseTime = $responseTime
            JobId = $null
            Details = "Performance monitor function working"
        }
    } else {
        Write-Host "   Status: ❌ FAILED ($($response.StatusCode))" -ForegroundColor Red
        $script:testResults += @{
            Name = "Performance Monitor Function"
            Status = "FAILED"
            ResponseTime = $responseTime
            JobId = $null
            Details = "Failed with status: $($response.StatusCode)"
        }
    }
    $script:testId++
} catch {
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    Write-Host "   Status: ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $script:testResults += @{
        Name = "Performance Monitor Function"
        Status = "ERROR"
        ResponseTime = $responseTime
        JobId = $null
        Details = "Error: $($_.Exception.Message)"
    }
    $script:testId++
}

try {
    Write-Host "`n$testId. Testing: Metrics Collector Function" -ForegroundColor Yellow
    Write-Host "   Description: Test metrics collector function" -ForegroundColor White
    
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/metrics" -Method GET -Headers $headers -TimeoutSec 30
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    
    if ($response.StatusCode -eq 200) {
        Write-Host "   Status: ✅ SUCCESS (${responseTime}ms)" -ForegroundColor Green
        $script:testResults += @{
            Name = "Metrics Collector Function"
            Status = "SUCCESS"
            ResponseTime = $responseTime
            JobId = $null
            Details = "Metrics collector function working"
        }
    } else {
        Write-Host "   Status: ❌ FAILED ($($response.StatusCode))" -ForegroundColor Red
        $script:testResults += @{
            Name = "Metrics Collector Function"
            Status = "FAILED"
            ResponseTime = $responseTime
            JobId = $null
            Details = "Failed with status: $($response.StatusCode)"
        }
    }
    $script:testId++
} catch {
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    Write-Host "   Status: ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $script:testResults += @{
        Name = "Metrics Collector Function"
        Status = "ERROR"
        ResponseTime = $responseTime
        JobId = $null
        Details = "Error: $($_.Exception.Message)"
    }
    $script:testId++
}

# Test 4: Test job status update
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "TEST 4: TESTING JOB STATUS UPDATE" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

try {
    Write-Host "`n$testId. Testing: Job Status Update" -ForegroundColor Yellow
    Write-Host "   Description: Test updating job status from pending to processing" -ForegroundColor White
    
    # Get a pending job
    $startTime = Get-Date
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs?status=eq.pending&select=id&limit=1" -Method GET -Headers $headers
    
    if ($response.StatusCode -eq 200) {
        $jobs = $response.Content | ConvertFrom-Json
        if ($jobs.Count -gt 0) {
            $jobId = $jobs[0].id
            
            # Update job status to processing
            $updateBody = @{
                status = "processing"
                claimed_at = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
            } | ConvertTo-Json
            
            $updateResponse = Invoke-WebRequest -Uri "$baseUrl/content_jobs?id=eq.$jobId" -Method PATCH -Headers $headers -Body $updateBody
            $endTime = Get-Date
            $responseTime = ($endTime - $startTime).TotalMilliseconds
            
            if ($updateResponse.StatusCode -eq 200) {
                Write-Host "   Status: ✅ SUCCESS (${responseTime}ms)" -ForegroundColor Green
                Write-Host "   Job ID: $jobId" -ForegroundColor White
                $script:testResults += @{
                    Name = "Job Status Update"
                    Status = "SUCCESS"
                    ResponseTime = $responseTime
                    JobId = $jobId
                    Details = "Job status updated to processing successfully"
                }
            } else {
                Write-Host "   Status: ❌ FAILED ($($updateResponse.StatusCode))" -ForegroundColor Red
                $script:testResults += @{
                    Name = "Job Status Update"
                    Status = "FAILED"
                    ResponseTime = $responseTime
                    JobId = $jobId
                    Details = "Failed to update job status"
                }
            }
        } else {
            Write-Host "   Status: ⚠️  NO PENDING JOBS FOUND" -ForegroundColor Yellow
            $script:testResults += @{
                Name = "Job Status Update"
                Status = "WARNING"
                ResponseTime = 0
                JobId = $null
                Details = "No pending jobs found for testing"
            }
        }
    } else {
        Write-Host "   Status: ❌ FAILED ($($response.StatusCode))" -ForegroundColor Red
        $script:testResults += @{
            Name = "Job Status Update"
            Status = "FAILED"
            ResponseTime = 0
            JobId = $null
            Details = "Failed to get pending jobs"
        }
    }
    $script:testId++
} catch {
    $endTime = Get-Date
    $responseTime = ($endTime - $startTime).TotalMilliseconds
    Write-Host "   Status: ❌ ERROR - $($_.Exception.Message)" -ForegroundColor Red
    $script:testResults += @{
        Name = "Job Status Update"
        Status = "ERROR"
        ResponseTime = $responseTime
        JobId = $null
        Details = "Error: $($_.Exception.Message)"
    }
    $script:testId++
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "SIMPLE PRODUCTION TESTING SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$successCount = ($testResults | Where-Object { $_.Status -eq "SUCCESS" }).Count
$warningCount = ($testResults | Where-Object { $_.Status -eq "WARNING" }).Count
$failedCount = ($testResults | Where-Object { $_.Status -eq "FAILED" -or $_.Status -eq "ERROR" }).Count
$totalTests = $testResults.Count

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Warnings: $warningCount" -ForegroundColor Yellow
Write-Host "Failed: $failedCount" -ForegroundColor Red

Write-Host "`nTest Results:" -ForegroundColor White
$testResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "SUCCESS") { "Green" } elseif ($_.Status -eq "WARNING") { "Yellow" } else { "Red" }
    $statusIcon = if ($_.Status -eq "SUCCESS") { "✅" } elseif ($_.Status -eq "WARNING") { "⚠️" } else { "❌" }
    Write-Host "   $statusIcon $($_.Name): $($_.Status)" -ForegroundColor $statusColor
}

# Calculate overall test score
$testScore = [math]::Round(($successCount / $totalTests) * 100, 1)
Write-Host "`nOverall Test Score: $testScore%" -ForegroundColor $(if ($testScore -ge 90) { "Green" } elseif ($testScore -ge 70) { "Yellow" } else { "Red" })

Write-Host "`nTest Categories:" -ForegroundColor White
Write-Host "   • Content Job Creation: 5 tests" -ForegroundColor Green
Write-Host "   • Database Access: 1 test" -ForegroundColor Green
Write-Host "   • Edge Functions: 2 tests" -ForegroundColor Green
Write-Host "   • Job Status Update: 1 test" -ForegroundColor Green
Write-Host "   • Total Tests: $totalTests" -ForegroundColor Green

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "1. Review failed tests and address issues" -ForegroundColor Yellow
Write-Host "2. Test content generation quality" -ForegroundColor Yellow
Write-Host "3. Validate WordPress draft post creation" -ForegroundColor Yellow
Write-Host "4. Test concurrent job processing" -ForegroundColor Yellow
Write-Host "5. Verify system performance under load" -ForegroundColor Yellow

if ($failedCount -eq 0) {
    Write-Host "`n🎉 Simple production testing completed successfully!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some tests failed - review the details above" -ForegroundColor Yellow
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
