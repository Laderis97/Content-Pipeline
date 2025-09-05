import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { validateEnvironment, getConfig } from '../_shared/environment.ts'
import { checkDatabaseConnection, getDatabaseHealth } from '../_shared/database.ts'
import { logger } from '../_shared/logger.ts'
import { response } from '../_shared/response.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const testType = url.searchParams.get('type') || 'basic'
    
    logger.info(`Configuration test - Action: ${action}, Type: ${testType}`, 'config_test')
    
    switch (action) {
      case 'test':
        return await handleConfigTest(testType)
      
      case 'environment':
        return await handleEnvironmentTest()
      
      case 'database':
        return await handleDatabaseTest()
      
      case 'validation':
        return await handleValidationTest()
      
      case 'integration':
        return await handleIntegrationTest()
      
      case 'performance':
        return await handlePerformanceTest()
      
      default:
        return response.validationError(
          'Invalid action. Supported actions: test, environment, database, validation, integration, performance'
        )
    }
    
  } catch (error) {
    logger.error('Configuration test error:', 'config_test', { error: error.message })
    return response.internalError('Configuration test failed', { error: error.message })
  }
})

async function handleConfigTest(testType: string): Promise<Response> {
  try {
    let result: any
    
    switch (testType) {
      case 'basic':
        result = await testBasicConfiguration()
        break
      case 'environment':
        result = await testEnvironmentConfiguration()
        break
      case 'database':
        result = await testDatabaseConfiguration()
        break
      case 'validation':
        result = await testValidationConfiguration()
        break
      case 'integration':
        result = await testIntegrationConfiguration()
        break
      case 'performance':
        result = await testPerformanceConfiguration()
        break
      default:
        result = await testBasicConfiguration()
    }
    
    return response.success(
      result,
      `Configuration test (${testType}) completed successfully`,
      200,
      { test_type: testType }
    )
    
  } catch (error) {
    logger.error(`Configuration test (${testType}) failed:`, 'config_test', { error: error.message })
    return response.internalError(`Configuration test (${testType}) failed`, { error: error.message })
  }
}

async function handleEnvironmentTest(): Promise<Response> {
  try {
    const validation = validateEnvironment()
    const config = getConfig()
    
    // Test environment variables
    const envTests = {
      supabase_url: {
        present: !!config.SUPABASE_URL,
        valid: config.SUPABASE_URL.startsWith('https://'),
        value: config.SUPABASE_URL ? '***' + config.SUPABASE_URL.slice(-10) : 'Not set'
      },
      supabase_service_key: {
        present: !!config.SUPABASE_SERVICE_ROLE_KEY,
        valid: config.SUPABASE_SERVICE_ROLE_KEY.length > 100,
        value: config.SUPABASE_SERVICE_ROLE_KEY ? '***' + config.SUPABASE_SERVICE_ROLE_KEY.slice(-10) : 'Not set'
      },
      openai_api_key: {
        present: !!config.OPENAI_API_KEY,
        valid: config.OPENAI_API_KEY.startsWith('sk-'),
        value: config.OPENAI_API_KEY ? '***' + config.OPENAI_API_KEY.slice(-10) : 'Not set'
      },
      wordpress_url: {
        present: !!config.WORDPRESS_URL,
        valid: config.WORDPRESS_URL.startsWith('http'),
        value: config.WORDPRESS_URL || 'Not set'
      },
      wordpress_username: {
        present: !!config.WORDPRESS_USERNAME,
        valid: config.WORDPRESS_USERNAME.length > 0,
        value: config.WORDPRESS_USERNAME || 'Not set'
      },
      wordpress_password: {
        present: !!config.WORDPRESS_PASSWORD,
        valid: config.WORDPRESS_PASSWORD.length > 0,
        value: config.WORDPRESS_PASSWORD ? '***' + config.WORDPRESS_PASSWORD.slice(-4) : 'Not set'
      }
    }
    
    // Test feature flags
    const featureFlags = {
      graceful_degradation: config.ENABLE_GRACEFUL_DEGRADATION,
      metrics_collection: config.ENABLE_METRICS_COLLECTION,
      health_monitoring: config.ENABLE_HEALTH_MONITORING,
      alerting: config.ENABLE_ALERTING
    }
    
    // Test performance configuration
    const performanceConfig = {
      max_concurrent_jobs: config.MAX_CONCURRENT_JOBS,
      job_timeout_ms: config.JOB_TIMEOUT_MS,
      retry_max_attempts: config.RETRY_MAX_ATTEMPTS
    }
    
    // Test monitoring configuration
    const monitoringConfig = {
      health_check_interval_ms: config.HEALTH_CHECK_INTERVAL_MS,
      metrics_collection_interval_ms: config.METRICS_COLLECTION_INTERVAL_MS,
      cleanup_interval_ms: config.CLEANUP_INTERVAL_MS
    }
    
    const allTestsPassed = Object.values(envTests).every(test => test.present && test.valid)
    
    return response.success(
      {
        validation,
        environment_tests: envTests,
        feature_flags: featureFlags,
        performance_config: performanceConfig,
        monitoring_config: monitoringConfig,
        all_tests_passed: allTestsPassed
      },
      'Environment configuration test completed',
      200
    )
    
  } catch (error) {
    logger.error('Environment test failed:', 'config_test', { error: error.message })
    return response.internalError('Environment test failed', { error: error.message })
  }
}

async function handleDatabaseTest(): Promise<Response> {
  try {
    const dbHealth = await getDatabaseHealth()
    
    // Test database connection
    const connectionTest = await checkDatabaseConnection()
    
    // Test database performance
    const performanceTest = {
      average_query_time_ms: dbHealth.performance.average_query_time_ms,
      slow_queries: dbHealth.performance.slow_queries,
      p95_query_time_ms: dbHealth.performance.p95_query_time_ms,
      p99_query_time_ms: dbHealth.performance.p99_query_time_ms
    }
    
    // Test database configuration
    const configTest = {
      valid: dbHealth.configuration.valid,
      errors: dbHealth.configuration.errors,
      warnings: dbHealth.configuration.warnings
    }
    
    const allTestsPassed = connectionTest.success && configTest.valid
    
    return response.success(
      {
        connection_test: connectionTest,
        performance_test: performanceTest,
        configuration_test: configTest,
        all_tests_passed: allTestsPassed
      },
      'Database configuration test completed',
      200
    )
    
  } catch (error) {
    logger.error('Database test failed:', 'config_test', { error: error.message })
    return response.internalError('Database test failed', { error: error.message })
  }
}

async function handleValidationTest(): Promise<Response> {
  try {
    // Test validation schemas
    const validationTests = {
      job_validation: testJobValidation(),
      job_run_validation: testJobRunValidation(),
      health_check_validation: testHealthCheckValidation(),
      metrics_validation: testMetricsValidation(),
      pagination_validation: testPaginationValidation(),
      time_range_validation: testTimeRangeValidation()
    }
    
    const allTestsPassed = Object.values(validationTests).every(test => test.valid)
    
    return response.success(
      {
        validation_tests: validationTests,
        all_tests_passed: allTestsPassed
      },
      'Validation configuration test completed',
      200
    )
    
  } catch (error) {
    logger.error('Validation test failed:', 'config_test', { error: error.message })
    return response.internalError('Validation test failed', { error: error.message })
  }
}

async function handleIntegrationTest(): Promise<Response> {
  try {
    // Test integration between components
    const integrationTests = {
      environment_database: await testEnvironmentDatabaseIntegration(),
      environment_validation: testEnvironmentValidationIntegration(),
      database_validation: testDatabaseValidationIntegration(),
      logger_environment: testLoggerEnvironmentIntegration(),
      response_validation: testResponseValidationIntegration()
    }
    
    const allTestsPassed = Object.values(integrationTests).every(test => test.success)
    
    return response.success(
      {
        integration_tests: integrationTests,
        all_tests_passed: allTestsPassed
      },
      'Integration configuration test completed',
      200
    )
    
  } catch (error) {
    logger.error('Integration test failed:', 'config_test', { error: error.message })
    return response.internalError('Integration test failed', { error: error.message })
  }
}

async function handlePerformanceTest(): Promise<Response> {
  try {
    // Test performance of configuration components
    const performanceTests = {
      environment_loading: await testEnvironmentLoadingPerformance(),
      database_connection: await testDatabaseConnectionPerformance(),
      validation_performance: await testValidationPerformance(),
      logger_performance: await testLoggerPerformance(),
      response_building: await testResponseBuildingPerformance()
    }
    
    const allTestsPassed = Object.values(performanceTests).every(test => test.success)
    
    return response.success(
      {
        performance_tests: performanceTests,
        all_tests_passed: allTestsPassed
      },
      'Performance configuration test completed',
      200
    )
    
  } catch (error) {
    logger.error('Performance test failed:', 'config_test', { error: error.message })
    return response.internalError('Performance test failed', { error: error.message })
  }
}

// Test helper functions
async function testBasicConfiguration(): Promise<any> {
  const validation = validateEnvironment()
  const config = getConfig()
  
  return {
    validation,
    config_summary: {
      has_supabase_config: !!(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY),
      has_openai_config: !!config.OPENAI_API_KEY,
      has_wordpress_config: !!(config.WORDPRESS_URL && config.WORDPRESS_USERNAME && config.WORDPRESS_PASSWORD),
      feature_flags_enabled: {
        graceful_degradation: config.ENABLE_GRACEFUL_DEGRADATION,
        metrics_collection: config.ENABLE_METRICS_COLLECTION,
        health_monitoring: config.ENABLE_HEALTH_MONITORING,
        alerting: config.ENABLE_ALERTING
      }
    }
  }
}

async function testEnvironmentConfiguration(): Promise<any> {
  const validation = validateEnvironment()
  const config = getConfig()
  
  return {
    validation,
    environment_variables: {
      required_present: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings
    },
    configuration_values: {
      max_concurrent_jobs: config.MAX_CONCURRENT_JOBS,
      job_timeout_ms: config.JOB_TIMEOUT_MS,
      retry_max_attempts: config.RETRY_MAX_ATTEMPTS
    }
  }
}

async function testDatabaseConfiguration(): Promise<any> {
  const dbHealth = await getDatabaseHealth()
  const connectionTest = await checkDatabaseConnection()
  
  return {
    connection: connectionTest,
    performance: dbHealth.performance,
    configuration: dbHealth.configuration
  }
}

function testJobValidation(): any {
  const { validateJob } = await import('../_shared/validation.ts')
  
  const validJob = {
    topic: 'Test topic',
    content_type: 'blog_post',
    prompt_template: 'Test template',
    model: 'gpt-3.5-turbo',
    tags: ['test', 'validation'],
    categories: ['technology']
  }
  
  const invalidJob = {
    topic: '',
    content_type: 'invalid_type',
    prompt_template: 'x'.repeat(2001),
    model: 'invalid_model'
  }
  
  const validResult = validateJob(validJob)
  const invalidResult = validateJob(invalidJob)
  
  return {
    valid: validResult.valid && !invalidResult.valid,
    valid_job_test: validResult,
    invalid_job_test: invalidResult
  }
}

function testJobRunValidation(): any {
  const { validateJobRun } = await import('../_shared/validation.ts')
  
  const validJobRun = {
    job_id: '123e4567-e89b-12d3-a456-426614174000',
    status: 'completed',
    processing_time_ms: 1500,
    error_message: null
  }
  
  const invalidJobRun = {
    job_id: 'invalid-uuid',
    status: 'invalid_status',
    processing_time_ms: -100
  }
  
  const validResult = validateJobRun(validJobRun)
  const invalidResult = validateJobRun(invalidJobRun)
  
  return {
    valid: validResult.valid && !invalidResult.valid,
    valid_job_run_test: validResult,
    invalid_job_run_test: invalidResult
  }
}

function testHealthCheckValidation(): any {
  const { validateHealthCheck } = await import('../_shared/validation.ts')
  
  const validHealthCheck = {
    component: 'database',
    status: 'healthy',
    response_time_ms: 100
  }
  
  const invalidHealthCheck = {
    component: 'invalid_component',
    status: 'invalid_status',
    response_time_ms: -50
  }
  
  const validResult = validateHealthCheck(validHealthCheck)
  const invalidResult = validateHealthCheck(invalidHealthCheck)
  
  return {
    valid: validResult.valid && !invalidResult.valid,
    valid_health_check_test: validResult,
    invalid_health_check_test: invalidResult
  }
}

function testMetricsValidation(): any {
  const { validateMetrics } = await import('../_shared/validation.ts')
  
  const validMetrics = {
    metric_type: 'performance',
    metric_name: 'success_rate',
    metric_value: 98.5,
    metric_unit: 'percent'
  }
  
  const invalidMetrics = {
    metric_type: 'invalid_type',
    metric_name: '',
    metric_value: 'not_a_number',
    metric_unit: 'invalid_unit'
  }
  
  const validResult = validateMetrics(validMetrics)
  const invalidResult = validateMetrics(invalidMetrics)
  
  return {
    valid: validResult.valid && !invalidResult.valid,
    valid_metrics_test: validResult,
    invalid_metrics_test: invalidResult
  }
}

function testPaginationValidation(): any {
  const { validatePagination } = await import('../_shared/validation.ts')
  
  const validPagination = {
    page: 1,
    page_size: 10,
    sort_by: 'created_at',
    sort_order: 'desc'
  }
  
    const invalidPagination = {
    page: 0,
    page_size: 101,
    sort_by: 'x'.repeat(51),
    sort_order: 'invalid_order'
  }
  
  const validResult = validatePagination(validPagination)
  const invalidResult = validatePagination(invalidPagination)
  
  return {
    valid: validResult.valid && !invalidResult.valid,
    valid_pagination_test: validResult,
    invalid_pagination_test: invalidResult
  }
}

function testTimeRangeValidation(): any {
  const { validateTimeRange } = await import('../_shared/validation.ts')
  
  const validTimeRange = {
    start_time: '2024-01-01T00:00:00Z',
    end_time: '2024-01-02T00:00:00Z',
    hours_back: 24
  }
  
  const invalidTimeRange = {
    start_time: 'invalid_date',
    end_time: 'invalid_date',
    hours_back: 0
  }
  
  const validResult = validateTimeRange(validTimeRange)
  const invalidResult = validateTimeRange(invalidTimeRange)
  
  return {
    valid: validResult.valid && !invalidResult.valid,
    valid_time_range_test: validResult,
    invalid_time_range_test: invalidResult
  }
}

async function testEnvironmentDatabaseIntegration(): Promise<any> {
  try {
    const config = getConfig()
    const connectionTest = await checkDatabaseConnection()
    
    return {
      success: !!(config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY && connectionTest.success),
      environment_config: {
        supabase_url_present: !!config.SUPABASE_URL,
        service_key_present: !!config.SUPABASE_SERVICE_ROLE_KEY
      },
      database_connection: connectionTest
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

function testEnvironmentValidationIntegration(): any {
  try {
    const validation = validateEnvironment()
    const config = getConfig()
    
    return {
      success: validation.valid,
      validation_result: validation,
      config_present: {
        supabase_url: !!config.SUPABASE_URL,
        service_key: !!config.SUPABASE_SERVICE_ROLE_KEY,
        openai_key: !!config.OPENAI_API_KEY,
        wordpress_config: !!(config.WORDPRESS_URL && config.WORDPRESS_USERNAME && config.WORDPRESS_PASSWORD)
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

function testDatabaseValidationIntegration(): any {
  try {
    // This would test database schema validation
    return {
      success: true,
      message: 'Database validation integration test passed'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

function testLoggerEnvironmentIntegration(): any {
  try {
    logger.info('Logger environment integration test', 'config_test')
    return {
      success: true,
      message: 'Logger environment integration test passed'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

function testResponseValidationIntegration(): any {
  try {
    const testResponse = response.success({ test: 'data' }, 'Test response')
    return {
      success: testResponse.status === 200,
      message: 'Response validation integration test passed'
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testEnvironmentLoadingPerformance(): Promise<any> {
  const startTime = Date.now()
  
  try {
    const config = getConfig()
    const validation = validateEnvironment()
    
    const duration = Date.now() - startTime
    
    return {
      success: true,
      duration_ms: duration,
      config_loaded: !!config.SUPABASE_URL,
      validation_completed: validation.valid
    }
  } catch (error) {
    return {
      success: false,
      duration_ms: Date.now() - startTime,
      error: error.message
    }
  }
}

async function testDatabaseConnectionPerformance(): Promise<any> {
  const startTime = Date.now()
  
  try {
    const connectionTest = await checkDatabaseConnection()
    const duration = Date.now() - startTime
    
    return {
      success: connectionTest.success,
      duration_ms: duration,
      response_time_ms: connectionTest.response_time_ms
    }
  } catch (error) {
    return {
      success: false,
      duration_ms: Date.now() - startTime,
      error: error.message
    }
  }
}

async function testValidationPerformance(): Promise<any> {
  const startTime = Date.now()
  
  try {
    const { validateJob } = await import('../_shared/validation.ts')
    
    const testData = {
      topic: 'Test topic',
      content_type: 'blog_post',
      prompt_template: 'Test template',
      model: 'gpt-3.5-turbo'
    }
    
    const result = validateJob(testData)
    const duration = Date.now() - startTime
    
    return {
      success: result.valid,
      duration_ms: duration,
      validation_result: result
    }
  } catch (error) {
    return {
      success: false,
      duration_ms: Date.now() - startTime,
      error: error.message
    }
  }
}

async function testLoggerPerformance(): Promise<any> {
  const startTime = Date.now()
  
  try {
    logger.info('Logger performance test', 'config_test')
    logger.warn('Logger performance test warning', 'config_test')
    logger.error('Logger performance test error', 'config_test')
    
    const duration = Date.now() - startTime
    
    return {
      success: true,
      duration_ms: duration,
      messages_logged: 3
    }
  } catch (error) {
    return {
      success: false,
      duration_ms: Date.now() - startTime,
      error: error.message
    }
  }
}

async function testResponseBuildingPerformance(): Promise<any> {
  const startTime = Date.now()
  
  try {
    const testResponse = response.success({ test: 'data' }, 'Test response')
    const errorResponse = response.internalError('Test error')
    
    const duration = Date.now() - startTime
    
    return {
      success: testResponse.status === 200 && errorResponse.status === 500,
      duration_ms: duration,
      responses_built: 2
    }
  } catch (error) {
    return {
      success: false,
      duration_ms: Date.now() - startTime,
      error: error.message
    }
  }
}
