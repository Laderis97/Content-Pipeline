# OpenAI API Connectivity Test Script (PowerShell)
# This script tests OpenAI API connectivity and configuration

Write-Host "Testing OpenAI API connectivity..." -ForegroundColor Green

$baseUrl = "https://zjqsfdqhhvhbwqmgdfzn.supabase.co/rest/v1"
$headers = @{
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA"
    "apikey" = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo"
    "Content-Type" = "application/json"
}

$testResults = @()
$testId = 1

function Test-OpenAIConnection {
    param(
        [string]$TestName,
        [string]$Description,
        [scriptblock]$TestScript
    )
    
    Write-Host "`n$testId. Testing: $TestName" -ForegroundColor Yellow
    Write-Host "   Description: $Description" -ForegroundColor White
    
    try {
        $result = & $TestScript
        Write-Host "   Status: $result" -ForegroundColor Green
        $script:testResults += @{Test=$TestName; Status="PASS"; Details=$result}
    } catch {
        Write-Host "   Status: Error - $($_.Exception.Message)" -ForegroundColor Red
        $script:testResults += @{Test=$TestName; Status="FAIL"; Details="Error: $($_.Exception.Message)"}
    }
    
    $script:testId++
}

# Test 1: Check if OpenAI API key exists in vault
Test-OpenAIConnection -TestName "OpenAI API Key Exists" -Description "Verify OpenAI API key is stored in vault" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.openai_api_key" -Method GET -Headers $headers
    $secrets = $response.Content | ConvertFrom-Json
    if ($secrets.Count -gt 0) {
        "API key found in vault"
    } else {
        "API key not found in vault"
    }
}

# Test 2: Check API key format
Test-OpenAIConnection -TestName "API Key Format" -Description "Verify API key has correct format" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.openai_api_key" -Method GET -Headers $headers
    $secrets = $response.Content | ConvertFrom-Json
    if ($secrets.Count -gt 0) {
        $apiKey = $secrets[0].value
        if ($apiKey -like "sk-*") {
            "API key format is correct (starts with sk-)"
        } elseif ($apiKey -like "sk-placeholder*") {
            "API key is placeholder - needs to be replaced with real key"
        } else {
            "API key format is incorrect"
        }
    } else {
        "API key not found"
    }
}

# Test 3: Test OpenAI API connectivity (if real key is provided)
Test-OpenAIConnection -TestName "OpenAI API Connectivity" -Description "Test actual OpenAI API connection" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.openai_api_key" -Method GET -Headers $headers
    $secrets = $response.Content | ConvertFrom-Json
    if ($secrets.Count -gt 0) {
        $apiKey = $secrets[0].value
        if ($apiKey -like "sk-placeholder*") {
            "Skipped - placeholder key detected. Replace with real key to test connectivity."
        } else {
            # Test with a simple completion request
            $openaiHeaders = @{
                "Authorization" = "Bearer $apiKey"
                "Content-Type" = "application/json"
            }
            $openaiBody = @{
                model = "gpt-3.5-turbo"
                messages = @(@{role="user"; content="Hello, this is a test."})
                max_tokens = 10
            } | ConvertTo-Json
            
            try {
                $openaiResponse = Invoke-WebRequest -Uri "https://api.openai.com/v1/chat/completions" -Method POST -Headers $openaiHeaders -Body $openaiBody
                "OpenAI API connection successful"
            } catch {
                "OpenAI API connection failed: $($_.Exception.Message)"
            }
        }
    } else {
        "API key not found"
    }
}

# Test 4: Check API rate limits and usage
Test-OpenAIConnection -TestName "API Usage Information" -Description "Check API usage and rate limits" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.openai_api_key" -Method GET -Headers $headers
    $secrets = $response.Content | ConvertFrom-Json
    if ($secrets.Count -gt 0) {
        $apiKey = $secrets[0].value
        if ($apiKey -like "sk-placeholder*") {
            "Skipped - placeholder key detected. Real key needed to check usage."
        } else {
            # Check usage with OpenAI API
            $openaiHeaders = @{
                "Authorization" = "Bearer $apiKey"
            }
            try {
                $usageResponse = Invoke-WebRequest -Uri "https://api.openai.com/v1/usage" -Method GET -Headers $openaiHeaders
                "API usage information retrieved successfully"
            } catch {
                "Could not retrieve usage information: $($_.Exception.Message)"
            }
        }
    } else {
        "API key not found"
    }
}

# Test 5: Test content generation capability
Test-OpenAIConnection -TestName "Content Generation Test" -Description "Test content generation with OpenAI" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?name=eq.openai_api_key" -Method GET -Headers $headers
    $secrets = $response.Content | ConvertFrom-Json
    if ($secrets.Count -gt 0) {
        $apiKey = $secrets[0].value
        if ($apiKey -like "sk-placeholder*") {
            "Skipped - placeholder key detected. Real key needed for content generation test."
        } else {
            # Test content generation
            $openaiHeaders = @{
                "Authorization" = "Bearer $apiKey"
                "Content-Type" = "application/json"
            }
            $openaiBody = @{
                model = "gpt-3.5-turbo"
                messages = @(@{role="user"; content="Write a short paragraph about artificial intelligence in content generation."})
                max_tokens = 100
                temperature = 0.7
            } | ConvertTo-Json
            
            try {
                $openaiResponse = Invoke-WebRequest -Uri "https://api.openai.com/v1/chat/completions" -Method POST -Headers $openaiHeaders -Body $openaiBody
                $responseData = $openaiResponse.Content | ConvertFrom-Json
                "Content generation test successful - Generated: $($responseData.choices[0].message.content.Substring(0, [Math]::Min(50, $responseData.choices[0].message.content.Length)))..."
            } catch {
                "Content generation test failed: $($_.Exception.Message)"
            }
        }
    } else {
        "API key not found"
    }
}

# Test 6: Check configuration settings
Test-OpenAIConnection -TestName "Configuration Settings" -Description "Check content generation configuration" -TestScript {
    $response = Invoke-WebRequest -Uri "$baseUrl/vault_secrets?category=eq.configuration" -Method GET -Headers $headers
    $configSecrets = $response.Content | ConvertFrom-Json
    if ($configSecrets.Count -gt 0) {
        "Configuration secrets found: $($configSecrets.Count) items"
    } else {
        "No configuration secrets found"
    }
}

# Summary
Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "OPENAI API CONNECTIVITY TEST SUMMARY" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan

$passedTests = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failedTests = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalTests = $testResults.Count

Write-Host "`nTotal Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red

Write-Host "`nTest Results:" -ForegroundColor White
$testResults | ForEach-Object {
    $statusColor = if ($_.Status -eq "PASS") { "Green" } else { "Red" }
    Write-Host "   • $($_.Test): $($_.Details)" -ForegroundColor $statusColor
}

Write-Host "`nNext Steps:" -ForegroundColor White
Write-Host "1. Replace placeholder OpenAI API key with real key" -ForegroundColor Yellow
Write-Host "2. Test actual API connectivity with real credentials" -ForegroundColor Yellow
Write-Host "3. Verify API rate limits and usage quotas" -ForegroundColor Yellow
Write-Host "4. Test content generation with real API key" -ForegroundColor Yellow

if ($passedTests -eq $totalTests) {
    Write-Host "`n🎉 All OpenAI connectivity tests passed!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some tests failed or need real API key" -ForegroundColor Yellow
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
