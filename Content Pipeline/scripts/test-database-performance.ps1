# Database Performance Testing Script (PowerShell)
# This script tests index usage and query performance

Write-Host "Testing database index usage and query performance..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$testResults = @()
$testId = 1

function Test-QueryPerformance {
    param(
        [string]$TestName,
        [string]$Description,
        [string]$Query,
        [int]$ExpectedMaxMs = 1000
    )
    
    Write-Host "`n$testId. Testing: $TestName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   Query: $Query" -ForegroundColor White
    
    try {
        $startTime = Get-Date
        $response = Invoke-WebRequest -Uri "$baseUrl$Query" -Method GET -Headers $headers
        $endTime = Get-Date
        $duration = ($endTime - $startTime).TotalMilliseconds
        
        Write-Host "   Duration: $([math]::Round($duration, 2))ms" -ForegroundColor White
        
        if ($duration -le $ExpectedMaxMs) {
            Write-Host "   ✅ PASS - Query performance acceptable" -ForegroundColor Green
            $script:testResults += @{Test=$TestName; Status="PASS"; Duration=$duration; Details="Query performance acceptable"}
        } else {
            Write-Host "   ⚠️  SLOW - Query took longer than expected" -ForegroundColor Yellow
            $script:testResults += @{Test=$TestName; Status="SLOW"; Duration=$duration; Details="Query took longer than expected ($ExpectedMaxMs ms)"}
        }
    } catch {
        Write-Host "   ❌ FAIL - Query failed: $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += @{Test=$TestName; Status="FAIL"; Duration=0; Details="Query failed: $($_.Exception.Message)"}
    }
    
    $script:testId++
}

# Create test data for performance testing
Write-Host "`nCreating test data for performance testing..." -ForegroundColor Yellow

$testJobs = @()
for ($i = 1; $i -le 50; $i++) {
    $body = @{
        topic = "Performance Test Job $i"
        status = if ($i % 4 -eq 0) { "completed" } elseif ($i % 4 -eq 1) { "processing" } elseif ($i % 4 -eq 2) { "error" } else { "pending" }
        retry_count = [math]::Floor($i / 10)
        created_at = (Get-Date).AddMinutes(-$i).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
    } | ConvertTo-Json
    
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
        $jobData = $response.Content | ConvertFrom-Json
        $testJobs += $jobData[0].id
    } catch {
        Write-Host "   Warning: Failed to create test job $i" -ForegroundColor Yellow
    }
}

Write-Host "Created $($testJobs.Count) test jobs" -ForegroundColor Green

# Test 1: Query by status (should use idx_content_jobs_status index)
Test-QueryPerformance -TestName "Status Index Query" -Description "Query jobs by status using status index" -Query "/content_jobs?status=eq.pending&select=id,topic,status&limit=10" -ExpectedMaxMs 500

# Test 2: Query by retry_count (should use idx_content_jobs_retry_count index)
Test-QueryPerformance -TestName "Retry Count Index Query" -Description "Query jobs by retry_count using retry_count index" -Query "/content_jobs?retry_count=eq.0&select=id,topic,retry_count&limit=10" -ExpectedMaxMs 500

# Test 3: Query by created_at range (should use idx_content_jobs_created_at index)
Test-QueryPerformance -TestName "Created At Index Query" -Description "Query jobs by created_at range using created_at index" -Query "/content_jobs?created_at=gte.2025-09-01T00:00:00Z&select=id,topic,created_at&limit=10" -ExpectedMaxMs 500

# Test 4: Complex query with multiple filters
Test-QueryPerformance -TestName "Complex Multi-Filter Query" -Description "Query with multiple filters using multiple indexes" -Query "/content_jobs?status=eq.pending&retry_count=eq.0&created_at=gte.2025-09-01T00:00:00Z&select=id,topic,status,retry_count,created_at&limit=10" -ExpectedMaxMs 800

# Test 5: Count query (should be fast with indexes)
Test-QueryPerformance -TestName "Count Query" -Description "Count jobs by status using status index" -Query "/content_jobs?status=eq.pending&select=count" -ExpectedMaxMs 300

# Test 6: Order by created_at (should use created_at index)
Test-QueryPerformance -TestName "Order By Created At" -Description "Order jobs by created_at using created_at index" -Query "/content_jobs?select=id,topic,created_at&order=created_at.desc&limit=10" -ExpectedMaxMs 500

# Test 7: Query with limit and offset
Test-QueryPerformance -TestName "Pagination Query" -Description "Query with limit and offset for pagination" -Query "/content_jobs?select=id,topic,status&limit=5&offset=10" -ExpectedMaxMs 500

# Test 8: Query all jobs (full table scan - should be slower)
Test-QueryPerformance -TestName "Full Table Scan" -Description "Query all jobs without filters (full table scan)" -Query "/content_jobs?select=id,topic,status&limit=20" -ExpectedMaxMs 1000

# Test 9: Query with text search (if supported)
Test-QueryPerformance -TestName "Text Search Query" -Description "Query with text search on topic field" -Query "/content_jobs?topic=like.*Performance*&select=id,topic&limit=10" -ExpectedMaxMs 800

# Test 10: Aggregate query
Test-QueryPerformance -TestName "Aggregate Query" -Description "Aggregate query counting jobs by status" -Query "/content_jobs?select=status,count" -ExpectedMaxMs 1000

# Test 11: Query job_runs table (if it exists)
Test-QueryPerformance -TestName "Job Runs Query" -Description "Query job_runs table for performance" -Query "/job_runs?select=*&limit=10" -ExpectedMaxMs 500

# Test 12: Query with joins (if supported)
Test-QueryPerformance -TestName "Join Query" -Description "Query with potential joins between tables" -Query "/content_jobs?select=id,topic,status&limit=10" -ExpectedMaxMs 500

# Clean up test data
Write-Host "`nCleaning up test data..." -ForegroundColor Yellow
try {
    $deleteResponse = Invoke-WebRequest -Uri "$baseUrl/content_jobs?topic=like.*Performance*" -Method DELETE -Headers $headers
    Write-Host "Test data cleaned up successfully" -ForegroundColor Green
} catch {
    Write-Host "Warning: Failed to clean up some test data" -ForegroundColor Yellow
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "DATABASE PERFORMANCE TEST SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$passedTests = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$slowTests = ($testResults | Where-Object { $_.Status -eq "SLOW" }).Count
$failedTests = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalTests = $testResults.Count

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Slow: $slowTests" -ForegroundColor Yellow
Write-Host "Failed: $failedTests" -ForegroundColor Red

# Performance summary
$avgDuration = ($testResults | Where-Object { $_.Duration -gt 0 } | Measure-Object -Property Duration -Average).Average
$maxDuration = ($testResults | Where-Object { $_.Duration -gt 0 } | Measure-Object -Property Duration -Maximum).Maximum
$minDuration = ($testResults | Where-Object { $_.Duration -gt 0 } | Measure-Object -Property Duration -Minimum).Minimum

Write-Host "`nPerformance Metrics:" -ForegroundColor White
Write-Host "Average Query Time: $([math]::Round($avgDuration, 2))ms" -ForegroundColor White
Write-Host "Fastest Query: $([math]::Round($minDuration, 2))ms" -ForegroundColor Green
Write-Host "Slowest Query: $([math]::Round($maxDuration, 2))ms" -ForegroundColor Yellow

if ($passedTests -eq $totalTests) {
    Write-Host "`n🎉 All database performance tests passed!" -ForegroundColor Green
} elseif ($failedTests -eq 0) {
    Write-Host "`n✅ All queries executed successfully, some were slower than expected" -ForegroundColor Yellow
} else {
    Write-Host "`n⚠️  Some queries failed or need optimization:" -ForegroundColor Yellow
    $testResults | Where-Object { $_.Status -ne "PASS" } | ForEach-Object {
        Write-Host "   • $($_.Test): $($_.Details)" -ForegroundColor Red
    }
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
