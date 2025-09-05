import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { response } from '../_shared/response.ts'
import { logger } from '../_shared/logger.ts'
import { initializeConfig, getConfig, getConfigStatus, updateConfig, resetConfig, validateExternalServiceConfig } from '../_shared/env-config.ts'
import { initializeAuth, getAuthStatus } from '../_shared/auth.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'status'
    
    logger.info(`Config manager - Action: ${action}`, 'config-manager')
    
    switch (action) {
      case 'status':
        return await handleGetStatus()
      
      case 'init':
        return await handleInitialize(req)
      
      case 'validate':
        return await handleValidate()
      
      case 'update':
        return await handleUpdate(req)
      
      case 'reset':
        return await handleReset()
      
      case 'services':
        return await handleGetServices()
      
      case 'features':
        return await handleGetFeatures()
      
      case 'environment':
        return await handleGetEnvironment()
      
      case 'external':
        return await handleValidateExternal()
      
      case 'test':
        return await handleTestConfig()
      
      default:
        return response.validationError(
          'Invalid action. Supported actions: status, init, validate, update, reset, services, features, environment, external, test'
        )
    }
    
  } catch (error) {
    logger.error('Config manager error:', 'config-manager', { error: error.message })
    return response.internalError('Config manager failed', { error: error.message })
  }
})

async function handleGetStatus(): Promise<Response> {
  try {
    const configStatus = getConfigStatus()
    const authStatus = getAuthStatus()
    
    return response.success(
      {
        config: configStatus,
        auth: authStatus,
        timestamp: new Date().toISOString()
      },
      'Configuration status retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get config status:', 'config-manager', { error: error.message })
    return response.internalError('Failed to get configuration status', { error: error.message })
  }
}

async function handleInitialize(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { customConfig = {} } = body
    
    const config = initializeConfig(customConfig)
    const authConfig = initializeAuth()
    
    return response.success(
      {
        config: {
          environment: config.environment,
          logLevel: config.logLevel,
          enableMetrics: config.enableMetrics,
          enableHealthChecks: config.enableHealthChecks,
          enableCors: config.enableCors,
          enableRateLimiting: config.enableRateLimiting,
          enableAuth: config.enableAuth
        },
        auth: {
          initialized: true,
          allowedOrigins: authConfig.allowedOrigins,
          rateLimitConfig: authConfig.rateLimitConfig
        }
      },
      'Configuration initialized successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to initialize config:', 'config-manager', { error: error.message })
    return response.internalError('Failed to initialize configuration', { error: error.message })
  }
}

async function handleValidate(): Promise<Response> {
  try {
    const configStatus = getConfigStatus()
    const externalValidation = validateExternalServiceConfig()
    
    const allValid = configStatus.validation.valid && externalValidation.valid
    const allErrors = [
      ...configStatus.validation.errors,
      ...externalValidation.errors
    ]
    
    return response.success(
      {
        valid: allValid,
        errors: allErrors,
        config_validation: configStatus.validation,
        external_validation: externalValidation,
        timestamp: new Date().toISOString()
      },
      allValid ? 'Configuration validation passed' : 'Configuration validation failed',
      allValid ? 200 : 400
    )
    
  } catch (error) {
    logger.error('Failed to validate config:', 'config-manager', { error: error.message })
    return response.internalError('Failed to validate configuration', { error: error.message })
  }
}

async function handleUpdate(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { updates = {} } = body
    
    if (Object.keys(updates).length === 0) {
      return response.validationError('No updates provided')
    }
    
    const updatedConfig = updateConfig(updates)
    
    return response.success(
      {
        updated_fields: Object.keys(updates),
        config: {
          environment: updatedConfig.environment,
          logLevel: updatedConfig.logLevel,
          enableMetrics: updatedConfig.enableMetrics,
          enableHealthChecks: updatedConfig.enableHealthChecks,
          enableCors: updatedConfig.enableCors,
          enableRateLimiting: updatedConfig.enableRateLimiting,
          enableAuth: updatedConfig.enableAuth
        }
      },
      'Configuration updated successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to update config:', 'config-manager', { error: error.message })
    return response.internalError('Failed to update configuration', { error: error.message })
  }
}

async function handleReset(): Promise<Response> {
  try {
    resetConfig()
    
    return response.success(
      { reset: true },
      'Configuration reset successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to reset config:', 'config-manager', { error: error.message })
    return response.internalError('Failed to reset configuration', { error: error.message })
  }
}

async function handleGetServices(): Promise<Response> {
  try {
    const config = getConfig()
    
    const services = {
      supabase: {
        url: config.supabaseUrl,
        has_service_role_key: !!config.supabaseServiceRoleKey,
        has_anon_key: !!config.supabaseAnonKey
      },
      openai: {
        has_api_key: !!config.openaiApiKey,
        model: config.openaiModel,
        max_tokens: config.openaiMaxTokens,
        temperature: config.openaiTemperature,
        timeout_ms: config.openaiTimeoutMs,
        rate_limit: config.openaiRateLimit
      },
      wordpress: {
        url: config.wordpressUrl,
        username: config.wordpressUsername,
        has_password: !!config.wordpressPassword,
        api_path: config.wordpressApiPath,
        timeout_ms: config.wordpressTimeoutMs,
        rate_limit: config.wordpressRateLimit
      }
    }
    
    return response.success(
      { services },
      'Service configurations retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get service configs:', 'config-manager', { error: error.message })
    return response.internalError('Failed to get service configurations', { error: error.message })
  }
}

async function handleGetFeatures(): Promise<Response> {
  try {
    const config = getConfig()
    
    const features = {
      metrics: {
        enabled: config.enableMetrics,
        description: 'Performance and system metrics collection'
      },
      health_checks: {
        enabled: config.enableHealthChecks,
        description: 'System health monitoring and checks'
      },
      cors: {
        enabled: config.enableCors,
        allowed_origins: config.allowedOrigins,
        description: 'Cross-Origin Resource Sharing'
      },
      rate_limiting: {
        enabled: config.enableRateLimiting,
        api_rate_limit: config.apiRateLimit,
        description: 'API rate limiting and throttling'
      },
      auth: {
        enabled: config.enableAuth,
        description: 'Authentication and authorization'
      }
    }
    
    return response.success(
      { features },
      'Feature configurations retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get feature configs:', 'config-manager', { error: error.message })
    return response.internalError('Failed to get feature configurations', { error: error.message })
  }
}

async function handleGetEnvironment(): Promise<Response> {
  try {
    const config = getConfig()
    
    const environment = {
      name: config.environment,
      log_level: config.logLevel,
      function_timeout_ms: config.functionTimeoutMs,
      retry_config: {
        max_retries: config.maxRetries,
        delay_ms: config.retryDelayMs,
        backoff_multiplier: config.retryBackoffMultiplier
      },
      content_config: {
        default_word_count: config.defaultWordCount,
        min_word_count: config.minWordCount,
        max_word_count: config.maxWordCount,
        default_model: config.defaultModel
      }
    }
    
    return response.success(
      { environment },
      'Environment configuration retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get environment config:', 'config-manager', { error: error.message })
    return response.internalError('Failed to get environment configuration', { error: error.message })
  }
}

async function handleValidateExternal(): Promise<Response> {
  try {
    const validation = validateExternalServiceConfig()
    
    return response.success(
      {
        valid: validation.valid,
        errors: validation.errors,
        services: {
          openai: {
            has_api_key: !!Deno.env.get('OPENAI_API_KEY'),
            api_key_format_valid: Deno.env.get('OPENAI_API_KEY')?.startsWith('sk-') || false
          },
          wordpress: {
            has_url: !!Deno.env.get('WORDPRESS_URL'),
            has_username: !!Deno.env.get('WORDPRESS_USERNAME'),
            has_password: !!Deno.env.get('WORDPRESS_PASSWORD'),
            url_format_valid: (() => {
              try {
                new URL(Deno.env.get('WORDPRESS_URL') || '')
                return true
              } catch {
                return false
              }
            })()
          }
        }
      },
      validation.valid ? 'External service validation passed' : 'External service validation failed',
      validation.valid ? 200 : 400
    )
    
  } catch (error) {
    logger.error('Failed to validate external services:', 'config-manager', { error: error.message })
    return response.internalError('Failed to validate external services', { error: error.message })
  }
}

async function handleTestConfig(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Configuration initialization
    try {
      const config = getConfig()
      tests.push({
        test: 'config_initialization',
        success: true,
        message: 'Configuration initialized successfully',
        details: {
          environment: config.environment,
          log_level: config.logLevel
        }
      })
    } catch (error) {
      tests.push({
        test: 'config_initialization',
        success: false,
        message: `Configuration initialization failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: Authentication initialization
    try {
      const authStatus = getAuthStatus()
      tests.push({
        test: 'auth_initialization',
        success: authStatus.initialized,
        message: authStatus.initialized ? 'Authentication initialized successfully' : 'Authentication not initialized',
        details: authStatus
      })
    } catch (error) {
      tests.push({
        test: 'auth_initialization',
        success: false,
        message: `Authentication initialization failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 3: Configuration validation
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
        message: `Configuration validation failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 4: External service validation
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
        message: `External service validation failed: ${error.message}`,
        details: null
      })
    }
    
    // Test 5: Environment variables
    try {
      const requiredVars = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'SUPABASE_ANON_KEY',
        'OPENAI_API_KEY',
        'WORDPRESS_URL',
        'WORDPRESS_USERNAME',
        'WORDPRESS_PASSWORD'
      ]
      
      const missingVars = requiredVars.filter(varName => !Deno.env.get(varName))
      const presentVars = requiredVars.filter(varName => !!Deno.env.get(varName))
      
      tests.push({
        test: 'environment_variables',
        success: missingVars.length === 0,
        message: missingVars.length === 0 ? 'All required environment variables are present' : `Missing environment variables: ${missingVars.join(', ')}`,
        details: {
          required: requiredVars.length,
          present: presentVars.length,
          missing: missingVars.length,
          missing_vars: missingVars
        }
      })
    } catch (error) {
      tests.push({
        test: 'environment_variables',
        success: false,
        message: `Environment variable check failed: ${error.message}`,
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
      `Configuration test completed - ${tests.filter(test => test.success).length}/${tests.length} tests passed`,
      allTestsPassed ? 200 : 400
    )
    
  } catch (error) {
    logger.error('Configuration test failed:', 'config-manager', { error: error.message })
    return response.internalError('Configuration test failed', { error: error.message })
  }
}
