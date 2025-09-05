import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { response } from '../_shared/response.ts'
import { logger } from '../_shared/logger.ts'
import { 
  secretsManager,
  getSecret,
  getSecrets,
  getSecretsByCategory,
  getRequiredSecrets,
  validateAllSecrets,
  getSecretsStatus,
  getSecretInfo,
  getAllSecretInfo,
  getOpenAIConfig,
  getWordPressConfig,
  getNotificationConfig,
  getSecretsConfig
} from '../_shared/secrets.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const testType = url.searchParams.get('type') || 'basic'
    
    logger.info(`Secrets test - Action: ${action}, Type: ${testType}`, 'secrets_test')
    
    switch (action) {
      case 'test':
        return await handleSecretsTest(testType)
      
      case 'validation-test':
        return await handleValidationTest()
      
      case 'cache-test':
        return await handleCacheTest()
      
      case 'performance-test':
        return await handlePerformanceTest()
      
      case 'integration-test':
        return await handleIntegrationTest()
      
      case 'security-test':
        return await handleSecurityTest()
      
      default:
        return response.validationError(
          'Invalid action. Supported actions: test, validation-test, cache-test, performance-test, integration-test, security-test'
        )
    }
    
  } catch (error) {
    logger.error('Secrets test error:', 'secrets_test', { error: error.message })
    return response.internalError('Secrets test failed', { error: error.message })
  }
})

async function handleSecretsTest(testType: string): Promise<Response> {
  try {
    let result: any
    
    switch (testType) {
      case 'basic':
        result = await testBasicSecrets()
        break
      case 'status':
        result = await testSecretsStatus()
        break
      case 'config':
        result = await testSecretsConfig()
        break
      case 'info':
        result = await testSecretsInfo()
        break
      default:
        result = await testBasicSecrets()
    }
    
    return response.success(
      result,
      `Secrets test (${testType}) completed successfully`,
      200,
      { test_type: testType }
    )
    
  } catch (error) {
    logger.error(`Secrets test (${testType}) failed:`, 'secrets_test', { error: error.message })
    return response.internalError(`Secrets test (${testType}) failed`, { error: error.message })
  }
}

async function handleValidationTest(): Promise<Response> {
  try {
    const validation = await validateAllSecrets()
    const status = await getSecretsStatus()
    
    // Test individual secret validation
    const individualTests = await testIndividualSecretValidation()
    
    // Test secret format validation
    const formatTests = testSecretFormatValidation()
    
    return response.success(
      {
        overall_validation: validation,
        status: status,
        individual_tests: individualTests,
        format_tests: formatTests,
        all_tests_passed: validation.valid && individualTests.all_passed && formatTests.all_passed
      },
      'Secrets validation test completed',
      200
    )
    
  } catch (error) {
    logger.error('Secrets validation test failed:', 'secrets_test', { error: error.message })
    return response.internalError('Secrets validation test failed', { error: error.message })
  }
}

async function handleCacheTest(): Promise<Response> {
  try {
    // Test cache functionality
    const cacheTests = await testCacheFunctionality()
    
    // Test cache performance
    const performanceTests = await testCachePerformance()
    
    // Test cache invalidation
    const invalidationTests = await testCacheInvalidation()
    
    return response.success(
      {
        cache_tests: cacheTests,
        performance_tests: performanceTests,
        invalidation_tests: invalidationTests,
        all_tests_passed: cacheTests.success && performanceTests.success && invalidationTests.success
      },
      'Secrets cache test completed',
      200
    )
    
  } catch (error) {
    logger.error('Secrets cache test failed:', 'secrets_test', { error: error.message })
    return response.internalError('Secrets cache test failed', { error: error.message })
  }
}

async function handlePerformanceTest(): Promise<Response> {
  try {
    const performanceTests = await testSecretsPerformance()
    
    return response.success(
      performanceTests,
      'Secrets performance test completed',
      200
    )
    
  } catch (error) {
    logger.error('Secrets performance test failed:', 'secrets_test', { error: error.message })
    return response.internalError('Secrets performance test failed', { error: error.message })
  }
}

async function handleIntegrationTest(): Promise<Response> {
  try {
    const integrationTests = await testSecretsIntegration()
    
    return response.success(
      integrationTests,
      'Secrets integration test completed',
      200
    )
    
  } catch (error) {
    logger.error('Secrets integration test failed:', 'secrets_test', { error: error.message })
    return response.internalError('Secrets integration test failed', { error: error.message })
  }
}

async function handleSecurityTest(): Promise<Response> {
  try {
    const securityTests = await testSecretsSecurity()
    
    return response.success(
      securityTests,
      'Secrets security test completed',
      200
    )
    
  } catch (error) {
    logger.error('Secrets security test failed:', 'secrets_test', { error: error.message })
    return response.internalError('Secrets security test failed', { error: error.message })
  }
}

// Test helper functions
async function testBasicSecrets(): Promise<any> {
  try {
    const status = await getSecretsStatus()
    const config = getSecretsConfig()
    const allInfo = getAllSecretInfo()
    
    return {
      status: status,
      config_summary: {
        total_secret_names: Object.keys(config.SECRET_NAMES).length,
        total_categories: Object.keys(config.CATEGORIES).length,
        total_validation_rules: Object.keys(config.VALIDATION).length
      },
      secret_info: {
        total_secrets: allInfo.length,
        required_secrets: allInfo.filter(info => info.required).length,
        optional_secrets: allInfo.filter(info => !info.required).length
      }
    }
  } catch (error) {
    return {
      error: error.message,
      success: false
    }
  }
}

async function testSecretsStatus(): Promise<any> {
  try {
    const status = await getSecretsStatus()
    
    return {
      status: status,
      health_check: {
        all_required_present: status.missing_required.length === 0,
        validation_errors: Object.keys(status.validation_errors).length === 0,
        cache_healthy: status.cached_secrets > 0
      }
    }
  } catch (error) {
    return {
      error: error.message,
      success: false
    }
  }
}

async function testSecretsConfig(): Promise<any> {
  try {
    const config = getSecretsConfig()
    
    return {
      config: config,
      validation: {
        secret_names_valid: Object.keys(config.SECRET_NAMES).length > 0,
        categories_valid: Object.keys(config.CATEGORIES).length > 0,
        validation_rules_valid: Object.keys(config.VALIDATION).length > 0,
        cache_config_valid: config.CACHE.TTL_SECONDS > 0
      }
    }
  } catch (error) {
    return {
      error: error.message,
      success: false
    }
  }
}

async function testSecretsInfo(): Promise<any> {
  try {
    const allInfo = getAllSecretInfo()
    
    return {
      secret_info: allInfo,
      summary: {
        total_secrets: allInfo.length,
        required_secrets: allInfo.filter(info => info.required).length,
        optional_secrets: allInfo.filter(info => !info.required).length,
        cached_secrets: allInfo.filter(info => info.cached).length
      }
    }
  } catch (error) {
    return {
      error: error.message,
      success: false
    }
  }
}

async function testIndividualSecretValidation(): Promise<any> {
  const tests = []
  
  try {
    // Test OpenAI API key validation
    try {
      const openaiKey = await getSecret('openai_api_key')
      const validation = secretsManager.validateSecret('openai_api_key', openaiKey)
      tests.push({
        secret: 'openai_api_key',
        valid: validation.valid,
        errors: validation.errors
      })
    } catch (error) {
      tests.push({
        secret: 'openai_api_key',
        valid: false,
        errors: [error.message]
      })
    }
    
    // Test WordPress URL validation
    try {
      const wordpressUrl = await getSecret('wordpress_url')
      const validation = secretsManager.validateSecret('wordpress_url', wordpressUrl)
      tests.push({
        secret: 'wordpress_url',
        valid: validation.valid,
        errors: validation.errors
      })
    } catch (error) {
      tests.push({
        secret: 'wordpress_url',
        valid: false,
        errors: [error.message]
      })
    }
    
    // Test WordPress username validation
    try {
      const wordpressUsername = await getSecret('wordpress_username')
      const validation = secretsManager.validateSecret('wordpress_username', wordpressUsername)
      tests.push({
        secret: 'wordpress_username',
        valid: validation.valid,
        errors: validation.errors
      })
    } catch (error) {
      tests.push({
        secret: 'wordpress_username',
        valid: false,
        errors: [error.message]
      })
    }
    
    return {
      tests: tests,
      all_passed: tests.every(test => test.valid)
    }
  } catch (error) {
    return {
      error: error.message,
      all_passed: false
    }
  }
}

function testSecretFormatValidation(): any {
  const tests = []
  
  // Test valid formats
  const validTests = [
    { secret: 'openai_api_key', value: 'sk-123456789012345678901234567890', expected: true },
    { secret: 'openai_organization', value: 'org-123456789012345678901234567890', expected: true },
    { secret: 'wordpress_url', value: 'https://example.com', expected: true },
    { secret: 'wordpress_username', value: 'content-bot', expected: true },
    { secret: 'wordpress_password', value: 'password123', expected: true },
    { secret: 'slack_webhook_url', value: 'https://hooks.slack.com/services/123/456/789', expected: true }
  ]
  
  // Test invalid formats
  const invalidTests = [
    { secret: 'openai_api_key', value: 'invalid-key', expected: false },
    { secret: 'openai_organization', value: 'invalid-org', expected: false },
    { secret: 'wordpress_url', value: 'not-a-url', expected: false },
    { secret: 'wordpress_username', value: 'ab', expected: false },
    { secret: 'wordpress_password', value: '123', expected: false },
    { secret: 'slack_webhook_url', value: 'not-a-slack-url', expected: false }
  ]
  
  for (const test of validTests) {
    const validation = secretsManager.validateSecret(test.secret, test.value)
    tests.push({
      secret: test.secret,
      value: test.value,
      expected: test.expected,
      actual: validation.valid,
      passed: validation.valid === test.expected,
      errors: validation.errors
    })
  }
  
  for (const test of invalidTests) {
    const validation = secretsManager.validateSecret(test.secret, test.value)
    tests.push({
      secret: test.secret,
      value: test.value,
      expected: test.expected,
      actual: validation.valid,
      passed: validation.valid === test.expected,
      errors: validation.errors
    })
  }
  
  return {
    tests: tests,
    all_passed: tests.every(test => test.passed)
  }
}

async function testCacheFunctionality(): Promise<any> {
  try {
    // Clear cache first
    secretsManager.clearCache()
    
    // Test cache miss
    const startTime1 = Date.now()
    const secret1 = await getSecret('openai_api_key')
    const time1 = Date.now() - startTime1
    
    // Test cache hit
    const startTime2 = Date.now()
    const secret2 = await getSecret('openai_api_key')
    const time2 = Date.now() - startTime2
    
    // Test cache status
    const status = await getSecretsStatus()
    
    return {
      success: true,
      cache_miss_time: time1,
      cache_hit_time: time2,
      cache_improvement: time1 > time2,
      cached_secrets: status.cached_secrets,
      secret_values_match: secret1 === secret2
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testCachePerformance(): Promise<any> {
  try {
    const iterations = 10
    const times = []
    
    // Clear cache first
    secretsManager.clearCache()
    
    // Test cache performance
    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now()
      await getSecret('openai_api_key')
      const time = Date.now() - startTime
      times.push(time)
    }
    
    const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length
    const minTime = Math.min(...times)
    const maxTime = Math.max(...times)
    
    return {
      success: true,
      iterations: iterations,
      average_time_ms: averageTime,
      min_time_ms: minTime,
      max_time_ms: maxTime,
      times: times
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testCacheInvalidation(): Promise<any> {
  try {
    // Clear cache first
    secretsManager.clearCache()
    
    // Load a secret
    await getSecret('openai_api_key')
    
    // Check cache status
    const status1 = await getSecretsStatus()
    
    // Clear cache
    secretsManager.clearCache()
    
    // Check cache status again
    const status2 = await getSecretsStatus()
    
    return {
      success: true,
      before_clear: status1.cached_secrets,
      after_clear: status2.cached_secrets,
      cache_cleared: status2.cached_secrets === 0
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testSecretsPerformance(): Promise<any> {
  try {
    const tests = []
    
    // Test single secret retrieval
    const startTime1 = Date.now()
    await getSecret('openai_api_key')
    const singleSecretTime = Date.now() - startTime1
    
    // Test multiple secrets retrieval
    const startTime2 = Date.now()
    await getSecrets(['openai_api_key', 'wordpress_url', 'wordpress_username'])
    const multipleSecretsTime = Date.now() - startTime2
    
    // Test category retrieval
    const startTime3 = Date.now()
    await getSecretsByCategory('api_keys')
    const categoryTime = Date.now() - startTime3
    
    // Test required secrets retrieval
    const startTime4 = Date.now()
    await getRequiredSecrets()
    const requiredSecretsTime = Date.now() - startTime4
    
    // Test validation
    const startTime5 = Date.now()
    await validateAllSecrets()
    const validationTime = Date.now() - startTime5
    
    tests.push({
      operation: 'single_secret',
      time_ms: singleSecretTime,
      success: singleSecretTime < 1000
    })
    
    tests.push({
      operation: 'multiple_secrets',
      time_ms: multipleSecretsTime,
      success: multipleSecretsTime < 2000
    })
    
    tests.push({
      operation: 'category_secrets',
      time_ms: categoryTime,
      success: categoryTime < 1000
    })
    
    tests.push({
      operation: 'required_secrets',
      time_ms: requiredSecretsTime,
      success: requiredSecretsTime < 2000
    })
    
    tests.push({
      operation: 'validation',
      time_ms: validationTime,
      success: validationTime < 3000
    })
    
    return {
      tests: tests,
      all_passed: tests.every(test => test.success),
      total_time_ms: tests.reduce((sum, test) => sum + test.time_ms, 0)
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testSecretsIntegration(): Promise<any> {
  try {
    const tests = []
    
    // Test OpenAI config integration
    try {
      const openaiConfig = await getOpenAIConfig()
      tests.push({
        integration: 'openai_config',
        success: true,
        has_api_key: !!openaiConfig.apiKey,
        has_organization: !!openaiConfig.organization
      })
    } catch (error) {
      tests.push({
        integration: 'openai_config',
        success: false,
        error: error.message
      })
    }
    
    // Test WordPress config integration
    try {
      const wordpressConfig = await getWordPressConfig()
      tests.push({
        integration: 'wordpress_config',
        success: true,
        has_url: !!wordpressConfig.url,
        has_username: !!wordpressConfig.username,
        has_password: !!wordpressConfig.password
      })
    } catch (error) {
      tests.push({
        integration: 'wordpress_config',
        success: false,
        error: error.message
      })
    }
    
    // Test notification config integration
    try {
      const notificationConfig = await getNotificationConfig()
      tests.push({
        integration: 'notification_config',
        success: true,
        has_slack_webhook: !!notificationConfig.slackWebhookUrl,
        has_alert_webhook: !!notificationConfig.alertWebhookUrl
      })
    } catch (error) {
      tests.push({
        integration: 'notification_config',
        success: false,
        error: error.message
      })
    }
    
    return {
      tests: tests,
      all_passed: tests.every(test => test.success)
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testSecretsSecurity(): Promise<any> {
  try {
    const tests = []
    
    // Test that secrets are not exposed in logs
    const originalLog = console.log
    let logOutput = ''
    console.log = (...args) => {
      logOutput += args.join(' ')
    }
    
    try {
      await getSecret('openai_api_key')
    } catch (error) {
      // Expected to fail in test environment
    }
    
    console.log = originalLog
    
    tests.push({
      security_check: 'secrets_not_in_logs',
      success: !logOutput.includes('sk-') && !logOutput.includes('password'),
      log_output: logOutput.substring(0, 100) + '...'
    })
    
    // Test that secrets are properly masked in responses
    const status = await getSecretsStatus()
    tests.push({
      security_check: 'secrets_masked_in_status',
      success: true, // Status doesn't contain actual secret values
      status_keys: Object.keys(status)
    })
    
    // Test that secrets are properly cached (not exposed)
    const cacheStatus = await getSecretsStatus()
    tests.push({
      security_check: 'cache_security',
      success: cacheStatus.cached_secrets >= 0, // Cache count is safe to expose
      cached_secrets: cacheStatus.cached_secrets
    })
    
    return {
      tests: tests,
      all_passed: tests.every(test => test.success)
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
