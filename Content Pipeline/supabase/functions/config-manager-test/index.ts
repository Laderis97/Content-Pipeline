import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { response } from '../_shared/response.ts'
import { logger } from '../_shared/logger.ts'
import { initializeConfig, getConfig, getConfigStatus, updateConfig, resetConfig, validateExternalServiceConfig, getServiceConfig, isFeatureEnabled } from '../_shared/env-config.ts'
import { initializeAuth, getAuthStatus, validateAuthEnvironment } from '../_shared/auth.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const testType = url.searchParams.get('type') || 'all'
    
    logger.info(`Config manager test - Action: ${action}, Type: ${testType}`, 'config-manager-test')
    
    switch (action) {
      case 'test':
        return await handleConfigTest(testType)
      
      case 'env-test':
        return await handleEnvironmentTest()
      
      case 'auth-test':
        return await handleAuthTest()
      
      case 'service-test':
        return await handleServiceTest()
      
      case 'feature-test':
        return await handleFeatureTest()
      
      case 'validation-test':
        return await handleValidationTest()
      
      case 'integration-test':
        return await handleIntegrationTest()
      
      case 'performance-test':
        return await handlePerformanceTest()
      
      default:
        return response.validationError(
          'Invalid action. Supported actions: test, env-test, auth-test, service-test, feature-test, validation-test, integration-test, performance-test'
        )
    }
    
  } catch (error) {
    logger.error('Config manager test error:', 'config-manager-test', { error: error.message })
    return response.internalError('Config manager test failed', { error: error.message })
  }
})

async function handleConfigTest(testType: string): Promise<Response> {
  try {
    let result: any
    
    switch (testType) {
      case 'basic':
        result = await testBasicConfig()
        break
      case 'initialization':
        result = await testConfigInitialization()
        break
      case 'validation':
        result = await testConfigValidation()
        break
      case 'update':
        result = await testConfigUpdate()
        break
      case 'reset':
        result = await testConfigReset()
        break
      default:
        result = await testBasicConfig()
    }
    
    return response.success(
      result,
      `Configuration test (${testType}) completed successfully`,
      200,
      { test_type: testType }
    )
    
  } catch (error) {
    logger.error(`Configuration test (${testType}) failed:`, 'config-manager-test', { error: error.message })
    return response.internalError(`Configuration test (${testType}) failed`, { error: error.message })
  }
}

async function handleEnvironmentTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Environment variable presence
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY',
      'OPENAI_API_KEY',
      'WORDPRESS_URL',
      'WORDPRESS_USERNAME',
      'WORDPRESS_PASSWORD'
    ]
    
    for (const varName of requiredVars) {
      const value = Deno.env.get(varName)
      tests.push({
        variable: varName,
        present: !!value,
        has_value: value && value.length > 0,
        message: value ? 'Variable is set' : 'Variable is not set'
      })
    }
    
    // Test 2: Environment variable formats
    const formatTests = [
      {
        variable: 'SUPABASE_URL',
        test: (value: string) => value.startsWith('https://'),
        message: 'Must start with https://'
      },
      {
        variable: 'SUPABASE_SERVICE_ROLE_KEY',
        test: (value: string) => value.startsWith('eyJ'),
        message: 'Must be a valid JWT token'
      },
      {
        variable: 'OPENAI_API_KEY',
        test: (value: string) => value.startsWith('sk-'),
        message: 'Must start with sk-'
      },
      {
        variable: 'WORDPRESS_URL',
        test: (value: string) => {
          try {
            new URL(value)
            return true
          } catch {
            return false
          }
        },
        message: 'Must be a valid URL'
      }
    ]
    
    for (const formatTest of formatTests) {
      const value = Deno.env.get(formatTest.variable)
      const isValid = value ? formatTest.test(value) : false
      
      tests.push({
        variable: formatTest.variable,
        format_valid: isValid,
        message: isValid ? 'Format is valid' : formatTest.message
      })
    }
    
    // Test 3: Optional environment variables
    const optionalVars = [
      'ENVIRONMENT',
      'LOG_LEVEL',
      'OPENAI_MODEL',
      'DEFAULT_WORD_COUNT',
      'MAX_RETRIES',
      'OPENAI_TIMEOUT_MS'
    ]
    
    for (const varName of optionalVars) {
      const value = Deno.env.get(varName)
      tests.push({
        variable: varName,
        present: !!value,
        message: value ? 'Optional variable is set' : 'Optional variable not set (using default)'
      })
    }
    
    const allRequiredPresent = requiredVars.every(varName => !!Deno.env.get(varName))
    const allFormatsValid = formatTests.every(test => {
      const value = Deno.env.get(test.variable)
      return value ? test.test(value) : false
    })
    
    return response.success(
      {
        tests: tests,
        summary: {
          total_variables: requiredVars.length + formatTests.length + optionalVars.length,
          required_present: allRequiredPresent,
          formats_valid: allFormatsValid,
          overall_success: allRequiredPresent && allFormatsValid
        }
      },
      'Environment test completed',
      200
    )
    
  } catch (error) {
    logger.error('Environment test failed:', 'config-manager-test', { error: error.message })
    return response.internalError('Environment test failed', { error: error.message })
  }
}

async function handleAuthTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Auth environment validation
    try {
      const authEnv = validateAuthEnvironment()
      tests.push({
        test: 'auth_environment_validation',
        success: authEnv.valid,
        message: authEnv.valid ? 'Auth environment validation passed' : 'Auth environment validation failed',
        details: {
          errors: authEnv.errors
        }
      })
    } catch (error) {
      tests.push({
        test: 'auth_environment_validation',
        success: false,
        message: `Auth environment validation error: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: Auth initialization
    try {
      const authStatus = getAuthStatus()
      tests.push({
        test: 'auth_initialization',
        success: authStatus.initialized,
        message: authStatus.initialized ? 'Auth initialized successfully' : 'Auth not initialized',
        details: authStatus
      })
    } catch (error) {
      tests.push({
        test: 'auth_initialization',
        success: false,
        message: `Auth initialization error: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: Auth configuration
    try {
      const authConfig = initializeAuth()
      tests.push({
        test: 'auth_configuration',
        success: !!authConfig,
        message: 'Auth configuration created successfully',
        details: {
          has_supabase_url: !!authConfig.supabaseUrl,
          has_service_role_key: !!authConfig.supabaseServiceRoleKey,
          has_anon_key: !!authConfig.supabaseAnonKey,
          allowed_origins: authConfig.allowedOrigins,
          rate_limit_config: authConfig.rateLimitConfig
        }
      })
    } catch (error) {
      tests.push({
        test: 'auth_configuration',
        success: false,
        message: `Auth configuration error: ${error.message}`,
        details: null
      })
    }
    
    const allTestsPassed = tests.every(test => test.success)
    
    return response.success(
      {
        tests: tests,
        all_tests_passed: allTestsPassed,
        summary: {
          total_tests: tests.length,
          passed_tests: tests.filter(test => test.success).length,
          failed_tests: tests.filter(test => !test.success).length
        }
      },
      'Auth test completed',
      200
    )
    
  } catch (error) {
    logger.error('Auth test failed:', 'config-manager-test', { error: error.message })
    return response.internalError('Auth test failed', { error: error.message })
  }
}

async function handleServiceTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Supabase service config
    try {
      const supabaseConfig = getServiceConfig('supabase')
      tests.push({
        service: 'supabase',
        success: !!supabaseConfig,
        message: 'Supabase service config retrieved successfully',
        details: {
          has_url: !!supabaseConfig.url,
          has_service_role_key: !!supabaseConfig.serviceRoleKey,
          has_anon_key: !!supabaseConfig.anonKey
        }
      })
    } catch (error) {
      tests.push({
        service: 'supabase',
        success: false,
        message: `Supabase service config error: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: OpenAI service config
    try {
      const openaiConfig = getServiceConfig('openai')
      tests.push({
        service: 'openai',
        success: !!openaiConfig,
        message: 'OpenAI service config retrieved successfully',
        details: {
          has_api_key: !!openaiConfig.apiKey,
          model: openaiConfig.model,
          max_tokens: openaiConfig.maxTokens,
          temperature: openaiConfig.temperature,
          timeout_ms: openaiConfig.timeoutMs,
          rate_limit: openaiConfig.rateLimit
        }
      })
    } catch (error) {
      tests.push({
        service: 'openai',
        success: false,
        message: `OpenAI service config error: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: WordPress service config
    try {
      const wordpressConfig = getServiceConfig('wordpress')
      tests.push({
        service: 'wordpress',
        success: !!wordpressConfig,
        message: 'WordPress service config retrieved successfully',
        details: {
          has_url: !!wordpressConfig.url,
          has_username: !!wordpressConfig.username,
          has_password: !!wordpressConfig.password,
          api_path: wordpressConfig.apiPath,
          timeout_ms: wordpressConfig.timeoutMs,
          rate_limit: wordpressConfig.rateLimit
        }
      })
    } catch (error) {
      tests.push({
        service: 'wordpress',
        success: false,
        message: `WordPress service config error: ${error.message}`,
        details: null
      })
    }
    
    // Test 4: Content service config
    try {
      const contentConfig = getServiceConfig('content')
      tests.push({
        service: 'content',
        success: !!contentConfig,
        message: 'Content service config retrieved successfully',
        details: {
          default_word_count: contentConfig.defaultWordCount,
          min_word_count: contentConfig.minWordCount,
          max_word_count: contentConfig.maxWordCount,
          default_model: contentConfig.defaultModel
        }
      })
    } catch (error) {
      tests.push({
        service: 'content',
        success: false,
        message: `Content service config error: ${error.message}`,
        details: null
      })
    }
    
    // Test 5: System service config
    try {
      const systemConfig = getServiceConfig('system')
      tests.push({
        service: 'system',
        success: !!systemConfig,
        message: 'System service config retrieved successfully',
        details: {
          environment: systemConfig.environment,
          log_level: systemConfig.logLevel,
          enable_metrics: systemConfig.enableMetrics,
          enable_health_checks: systemConfig.enableHealthChecks,
          function_timeout_ms: systemConfig.functionTimeoutMs
        }
      })
    } catch (error) {
      tests.push({
        service: 'system',
        success: false,
        message: `System service config error: ${error.message}`,
        details: null
      })
    }
    
    // Test 6: Security service config
    try {
      const securityConfig = getServiceConfig('security')
      tests.push({
        service: 'security',
        success: !!securityConfig,
        message: 'Security service config retrieved successfully',
        details: {
          enable_cors: securityConfig.enableCors,
          allowed_origins: securityConfig.allowedOrigins,
          enable_rate_limiting: securityConfig.enableRateLimiting,
          enable_auth: securityConfig.enableAuth,
          api_rate_limit: securityConfig.apiRateLimit
        }
      })
    } catch (error) {
      tests.push({
        service: 'security',
        success: false,
        message: `Security service config error: ${error.message}`,
        details: null
      })
    }
    
    const allTestsPassed = tests.every(test => test.success)
    
    return response.success(
      {
        tests: tests,
        all_tests_passed: allTestsPassed,
        summary: {
          total_services: tests.length,
          successful_services: tests.filter(test => test.success).length,
          failed_services: tests.filter(test => !test.success).length
        }
      },
      'Service test completed',
      200
    )
    
  } catch (error) {
    logger.error('Service test failed:', 'config-manager-test', { error: error.message })
    return response.internalError('Service test failed', { error: error.message })
  }
}

async function handleFeatureTest(): Promise<Response> {
  try {
    const tests = []
    
    const features = ['metrics', 'healthChecks', 'cors', 'rateLimiting', 'auth']
    
    for (const feature of features) {
      try {
        const enabled = isFeatureEnabled(feature as any)
        tests.push({
          feature: feature,
          enabled: enabled,
          message: enabled ? `${feature} feature is enabled` : `${feature} feature is disabled`
        })
      } catch (error) {
        tests.push({
          feature: feature,
          enabled: false,
          message: `Error checking ${feature} feature: ${error.message}`
        })
      }
    }
    
    const enabledFeatures = tests.filter(test => test.enabled).length
    const totalFeatures = tests.length
    
    return response.success(
      {
        tests: tests,
        summary: {
          total_features: totalFeatures,
          enabled_features: enabledFeatures,
          disabled_features: totalFeatures - enabledFeatures,
          feature_status: tests.reduce((acc, test) => {
            acc[test.feature] = test.enabled
            return acc
          }, {} as Record<string, boolean>)
        }
      },
      'Feature test completed',
      200
    )
    
  } catch (error) {
    logger.error('Feature test failed:', 'config-manager-test', { error: error.message })
    return response.internalError('Feature test failed', { error: error.message })
  }
}

async function handleValidationTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Configuration validation
    try {
      const configStatus = getConfigStatus()
      tests.push({
        test: 'config_validation',
        success: configStatus.validation.valid,
        message: configStatus.validation.valid ? 'Configuration validation passed' : 'Configuration validation failed',
        details: {
          errors: configStatus.validation.errors,
          features: configStatus.features,
          services: configStatus.services
        }
      })
    } catch (error) {
      tests.push({
        test: 'config_validation',
        success: false,
        message: `Configuration validation error: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: External service validation
    try {
      const externalValidation = validateExternalServiceConfig()
      tests.push({
        test: 'external_service_validation',
        success: externalValidation.valid,
        message: externalValidation.valid ? 'External service validation passed' : 'External service validation failed',
        details: {
          errors: externalValidation.errors
        }
      })
    } catch (error) {
      tests.push({
        test: 'external_service_validation',
        success: false,
        message: `External service validation error: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: Auth environment validation
    try {
      const authValidation = validateAuthEnvironment()
      tests.push({
        test: 'auth_environment_validation',
        success: authValidation.valid,
        message: authValidation.valid ? 'Auth environment validation passed' : 'Auth environment validation failed',
        details: {
          errors: authValidation.errors
        }
      })
    } catch (error) {
      tests.push({
        test: 'auth_environment_validation',
        success: false,
        message: `Auth environment validation error: ${error.message}`,
        details: null
      })
    }
    
    const allTestsPassed = tests.every(test => test.success)
    
    return response.success(
      {
        tests: tests,
        all_tests_passed: allTestsPassed,
        summary: {
          total_validations: tests.length,
          passed_validations: tests.filter(test => test.success).length,
          failed_validations: tests.filter(test => !test.success).length
        }
      },
      'Validation test completed',
      200
    )
    
  } catch (error) {
    logger.error('Validation test failed:', 'config-manager-test', { error: error.message })
    return response.internalError('Validation test failed', { error: error.message })
  }
}

async function handleIntegrationTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Configuration and Auth integration
    try {
      const config = getConfig()
      const authStatus = getAuthStatus()
      
      tests.push({
        test: 'config_auth_integration',
        success: !!config && authStatus.initialized,
        message: 'Configuration and auth integration successful',
        details: {
          config_initialized: !!config,
          auth_initialized: authStatus.initialized,
          environment: config?.environment,
          log_level: config?.logLevel
        }
      })
    } catch (error) {
      tests.push({
        test: 'config_auth_integration',
        success: false,
        message: `Config auth integration error: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: Service configuration integration
    try {
      const supabaseConfig = getServiceConfig('supabase')
      const openaiConfig = getServiceConfig('openai')
      const wordpressConfig = getServiceConfig('wordpress')
      
      tests.push({
        test: 'service_config_integration',
        success: !!supabaseConfig && !!openaiConfig && !!wordpressConfig,
        message: 'Service configuration integration successful',
        details: {
          supabase_configured: !!supabaseConfig,
          openai_configured: !!openaiConfig,
          wordpress_configured: !!wordpressConfig
        }
      })
    } catch (error) {
      tests.push({
        test: 'service_config_integration',
        success: false,
        message: `Service config integration error: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: Feature integration
    try {
      const metricsEnabled = isFeatureEnabled('metrics')
      const healthChecksEnabled = isFeatureEnabled('healthChecks')
      const corsEnabled = isFeatureEnabled('cors')
      
      tests.push({
        test: 'feature_integration',
        success: true, // Features can be enabled/disabled independently
        message: 'Feature integration successful',
        details: {
          metrics_enabled: metricsEnabled,
          health_checks_enabled: healthChecksEnabled,
          cors_enabled: corsEnabled
        }
      })
    } catch (error) {
      tests.push({
        test: 'feature_integration',
        success: false,
        message: `Feature integration error: ${error.message}`,
        details: null
      })
    }
    
    const allTestsPassed = tests.every(test => test.success)
    
    return response.success(
      {
        tests: tests,
        all_tests_passed: allTestsPassed,
        summary: {
          total_integrations: tests.length,
          successful_integrations: tests.filter(test => test.success).length,
          failed_integrations: tests.filter(test => !test.success).length
        }
      },
      'Integration test completed',
      200
    )
    
  } catch (error) {
    logger.error('Integration test failed:', 'config-manager-test', { error: error.message })
    return response.internalError('Integration test failed', { error: error.message })
  }
}

async function handlePerformanceTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Configuration initialization performance
    const startTime1 = Date.now()
    try {
      const config = getConfig()
      const duration1 = Date.now() - startTime1
      
      tests.push({
        test: 'config_initialization_performance',
        success: !!config,
        duration_ms: duration1,
        message: `Configuration initialization took ${duration1}ms`
      })
    } catch (error) {
      tests.push({
        test: 'config_initialization_performance',
        success: false,
        duration_ms: Date.now() - startTime1,
        message: `Configuration initialization failed: ${error.message}`
      })
    }
    
    // Test 2: Service config retrieval performance
    const startTime2 = Date.now()
    try {
      const supabaseConfig = getServiceConfig('supabase')
      const openaiConfig = getServiceConfig('openai')
      const wordpressConfig = getServiceConfig('wordpress')
      const duration2 = Date.now() - startTime2
      
      tests.push({
        test: 'service_config_retrieval_performance',
        success: !!supabaseConfig && !!openaiConfig && !!wordpressConfig,
        duration_ms: duration2,
        message: `Service config retrieval took ${duration2}ms`
      })
    } catch (error) {
      tests.push({
        test: 'service_config_retrieval_performance',
        success: false,
        duration_ms: Date.now() - startTime2,
        message: `Service config retrieval failed: ${error.message}`
      })
    }
    
    // Test 3: Feature check performance
    const startTime3 = Date.now()
    try {
      const features = ['metrics', 'healthChecks', 'cors', 'rateLimiting', 'auth']
      const featureResults = features.map(feature => isFeatureEnabled(feature as any))
      const duration3 = Date.now() - startTime3
      
      tests.push({
        test: 'feature_check_performance',
        success: featureResults.every(result => typeof result === 'boolean'),
        duration_ms: duration3,
        message: `Feature checks took ${duration3}ms`
      })
    } catch (error) {
      tests.push({
        test: 'feature_check_performance',
        success: false,
        duration_ms: Date.now() - startTime3,
        message: `Feature checks failed: ${error.message}`
      })
    }
    
    // Test 4: Validation performance
    const startTime4 = Date.now()
    try {
      const configStatus = getConfigStatus()
      const externalValidation = validateExternalServiceConfig()
      const duration4 = Date.now() - startTime4
      
      tests.push({
        test: 'validation_performance',
        success: true,
        duration_ms: duration4,
        message: `Validation took ${duration4}ms`
      })
    } catch (error) {
      tests.push({
        test: 'validation_performance',
        success: false,
        duration_ms: Date.now() - startTime4,
        message: `Validation failed: ${error.message}`
      })
    }
    
    const allTestsPassed = tests.every(test => test.success)
    const averageDuration = tests.reduce((sum, test) => sum + test.duration_ms, 0) / tests.length
    
    return response.success(
      {
        tests: tests,
        all_tests_passed: allTestsPassed,
        performance_summary: {
          total_tests: tests.length,
          passed_tests: tests.filter(test => test.success).length,
          failed_tests: tests.filter(test => !test.success).length,
          average_duration_ms: averageDuration,
          max_duration_ms: Math.max(...tests.map(test => test.duration_ms)),
          min_duration_ms: Math.min(...tests.map(test => test.duration_ms))
        }
      },
      'Performance test completed',
      200
    )
    
  } catch (error) {
    logger.error('Performance test failed:', 'config-manager-test', { error: error.message })
    return response.internalError('Performance test failed', { error: error.message })
  }
}

// Test helper functions
async function testBasicConfig(): Promise<any> {
  try {
    const config = getConfig()
    const configStatus = getConfigStatus()
    
    return {
      config: {
        environment: config.environment,
        log_level: config.logLevel,
        enable_metrics: config.enableMetrics,
        enable_health_checks: config.enableHealthChecks
      },
      status: configStatus,
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testConfigInitialization(): Promise<any> {
  try {
    resetConfig()
    const config = initializeConfig()
    
    return {
      initialized: !!config,
      environment: config.environment,
      log_level: config.logLevel,
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testConfigValidation(): Promise<any> {
  try {
    const configStatus = getConfigStatus()
    const externalValidation = validateExternalServiceConfig()
    
    return {
      config_valid: configStatus.validation.valid,
      external_valid: externalValidation.valid,
      all_valid: configStatus.validation.valid && externalValidation.valid,
      errors: [...configStatus.validation.errors, ...externalValidation.errors],
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testConfigUpdate(): Promise<any> {
  try {
    const originalConfig = getConfig()
    const testUpdate = { logLevel: 'debug' }
    
    const updatedConfig = updateConfig(testUpdate)
    
    return {
      updated: updatedConfig.logLevel === 'debug',
      original_log_level: originalConfig.logLevel,
      new_log_level: updatedConfig.logLevel,
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testConfigReset(): Promise<any> {
  try {
    resetConfig()
    
    return {
      reset: true,
      success: true
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
