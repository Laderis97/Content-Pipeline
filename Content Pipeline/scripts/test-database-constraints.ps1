# Database Constraints Testing Script (PowerShell)
# This script tests all database constraints and validation rules

Write-Host "Testing database constraints and validation rules..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
    "Prefer" = "return=representation"
}

$testResults = @()
$testId = 1

function Test-Constraint {
    param(
        [string]$TestName,
        [string]$Description,
        [scriptblock]$TestScript,
        [string]$ExpectedResult = "FAIL"
    )
    
    Write-Host "`n$testId. Testing: $TestName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    Write-Host "   Expected: $ExpectedResult" -ForegroundColor White
    
    try {
        $result = & $TestScript
        if ($result -eq $ExpectedResult) {
            Write-Host "   ✅ PASS - Constraint working correctly" -ForegroundColor Green
            $script:testResults += @{Test=$TestName; Status="PASS"; Details="Constraint working correctly"}
        } else {
            Write-Host "   ❌ FAIL - Constraint not working as expected" -ForegroundColor Red
            $script:testResults += @{Test=$TestName; Status="FAIL"; Details="Constraint not working as expected"}
        }
    } catch {
        if ($ExpectedResult -eq "FAIL") {
            Write-Host "   ✅ PASS - Constraint correctly rejected invalid data" -ForegroundColor Green
            $script:testResults += @{Test=$TestName; Status="PASS"; Details="Constraint correctly rejected invalid data: $($_.Exception.Message)"}
        } else {
            Write-Host "   ❌ FAIL - Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
            $script:testResults += @{Test=$TestName; Status="FAIL"; Details="Unexpected error: $($_.Exception.Message)"}
        }
    }
    
    $script:testId++
}

# Test 1: Empty topic constraint
Test-Constraint -TestName "Empty Topic Constraint" -Description "Should reject jobs with empty or whitespace-only topics" -ExpectedResult "FAIL" -TestScript {
    $body = @{topic="   "; status="pending"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    "PASS"
}

# Test 2: Topic length constraint
Test-Constraint -TestName "Topic Length Constraint" -Description "Should reject topics longer than 500 characters" -ExpectedResult "FAIL" -TestScript {
    $longTopic = "a" * 501
    $body = @{topic=$longTopic; status="pending"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    "PASS"
}

# Test 3: Invalid status constraint
Test-Constraint -TestName "Invalid Status Constraint" -Description "Should reject invalid status values" -ExpectedResult "FAIL" -TestScript {
    $body = @{topic="Test Topic"; status="invalid_status"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    "PASS"
}

# Test 4: Retry count range constraint
Test-Constraint -TestName "Retry Count Range Constraint" -Description "Should reject retry_count outside 0-3 range" -ExpectedResult "FAIL" -TestScript {
    $body = @{topic="Test Topic"; status="pending"; retry_count=5} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    "PASS"
}

# Test 5: Negative retry count constraint
Test-Constraint -TestName "Negative Retry Count Constraint" -Description "Should reject negative retry_count values" -ExpectedResult "FAIL" -TestScript {
    $body = @{topic="Test Topic"; status="pending"; retry_count=-1} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    "PASS"
}

# Test 6: Valid job creation
Test-Constraint -TestName "Valid Job Creation" -Description "Should allow creation of valid jobs" -ExpectedResult "PASS" -TestScript {
    $body = @{topic="Valid Test Topic"; status="pending"; retry_count=0} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    $jobData = $response.Content | ConvertFrom-Json
    if ($jobData.id) { "PASS" } else { "FAIL" }
}

# Test 7: Claimed at constraint for processing status
Test-Constraint -TestName "Claimed At Processing Constraint" -Description "Should require claimed_at when status is processing" -ExpectedResult "FAIL" -TestScript {
    $body = @{topic="Test Topic"; status="pending"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    $jobData = $response.Content | ConvertFrom-Json
    $jobId = $jobData[0].id
    
    # Try to set status to processing without claimed_at
    $updateBody = @{status="processing"} | ConvertTo-Json
    $updateResponse = Invoke-WebRequest -Uri "$baseUrl/content_jobs?id=eq.$jobId" -Method PATCH -Headers $headers -Body $updateBody
    "PASS"
}

# Test 8: Completed job content constraint
Test-Constraint -TestName "Completed Job Content Constraint" -Description "Should require generated_title and generated_content for completed jobs" -ExpectedResult "FAIL" -TestScript {
    $body = @{topic="Test Topic"; status="pending"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    $jobData = $response.Content | ConvertFrom-Json
    $jobId = $jobData[0].id
    
    # Try to set status to completed without required fields
    $updateBody = @{status="completed"} | ConvertTo-Json
    $updateResponse = Invoke-WebRequest -Uri "$baseUrl/content_jobs?id=eq.$jobId" -Method PATCH -Headers $headers -Body $updateBody
    "PASS"
}

# Test 9: Completed job WordPress ID constraint
Test-Constraint -TestName "Completed Job WordPress ID Constraint" -Description "Should require wordpress_post_id for completed jobs" -ExpectedResult "FAIL" -TestScript {
    $body = @{topic="Test Topic"; status="pending"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    $jobData = $response.Content | ConvertFrom-Json
    $jobId = $jobData[0].id
    
    # Try to set status to completed without wordpress_post_id
    $updateBody = @{status="completed"; generated_title="Test Title"; generated_content="Test Content"} | ConvertTo-Json
    $updateResponse = Invoke-WebRequest -Uri "$baseUrl/content_jobs?id=eq.$jobId" -Method PATCH -Headers $headers -Body $updateBody
    "PASS"
}

# Test 10: Error job message constraint
Test-Constraint -TestName "Error Job Message Constraint" -Description "Should require last_error for error status jobs" -ExpectedResult "FAIL" -TestScript {
    $body = @{topic="Test Topic"; status="pending"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    $jobData = $response.Content | ConvertFrom-Json
    $jobId = $jobData[0].id
    
    # Try to set status to error without last_error
    $updateBody = @{status="error"} | ConvertTo-Json
    $updateResponse = Invoke-WebRequest -Uri "$baseUrl/content_jobs?id=eq.$jobId" -Method PATCH -Headers $headers -Body $updateBody
    "PASS"
}

# Test 11: Valid completed job
Test-Constraint -TestName "Valid Completed Job" -Description "Should allow valid completed job with all required fields" -ExpectedResult "PASS" -TestScript {
    $body = @{topic="Test Topic"; status="pending"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    $jobData = $response.Content | ConvertFrom-Json
    $jobId = $jobData[0].id
    
    # Set status to completed with all required fields
    $updateBody = @{
        status="completed"
        generated_title="Test Title"
        generated_content="Test Content"
        wordpress_post_id=12345
        claimed_at=$null
    } | ConvertTo-Json
    $updateResponse = Invoke-WebRequest -Uri "$baseUrl/content_jobs?id=eq.$jobId" -Method PATCH -Headers $headers -Body $updateBody
    $updatedJob = $updateResponse.Content | ConvertFrom-Json
    if ($updatedJob[0].status -eq "completed") { "PASS" } else { "FAIL" }
}

# Test 12: Valid error job
Test-Constraint -TestName "Valid Error Job" -Description "Should allow valid error job with error message" -ExpectedResult "PASS" -TestScript {
    $body = @{topic="Test Topic"; status="pending"} | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/content_jobs" -Method POST -Headers $headers -Body $body
    $jobData = $response.Content | ConvertFrom-Json
    $jobId = $jobData[0].id
    
    # Set status to error with error message
    $updateBody = @{status="error"; last_error="Test error message"} | ConvertTo-Json
    $updateResponse = Invoke-WebRequest -Uri "$baseUrl/content_jobs?id=eq.$jobId" -Method PATCH -Headers $headers -Body $updateBody
    $updatedJob = $updateResponse.Content | ConvertFrom-Json
    if ($updatedJob[0].status -eq "error") { "PASS" } else { "FAIL" }
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "DATABASE CONSTRAINTS TEST SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$passedTests = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$totalTests = $testResults.Count

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $($totalTests - $passedTests)" -ForegroundColor Red

if ($passedTests -eq $totalTests) {
    Write-Host "`n🎉 All database constraints are working correctly!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some constraints need attention:" -ForegroundColor Yellow
    $testResults | Where-Object { $_.Status -eq "FAIL" } | ForEach-Object {
        Write-Host "   • $($_.Test): $($_.Details)" -ForegroundColor Red
    }
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
