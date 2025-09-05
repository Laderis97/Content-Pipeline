import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { response } from '../_shared/response.ts'
import { logger } from '../_shared/logger.ts'
import { supabaseAdmin } from '../_shared/database.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const testType = url.searchParams.get('type') || 'basic'
    
    logger.info(`Scheduler test - Action: ${action}, Type: ${testType}`, 'scheduler_test')
    
    switch (action) {
      case 'test':
        return await handleSchedulerTest(testType)
      
      case 'job-test':
        return await handleJobTest(req)
      
      case 'trigger-test':
        return await handleTriggerTest(req)
      
      case 'performance-test':
        return await handlePerformanceTest()
      
      case 'integration-test':
        return await handleIntegrationTest()
      
      case 'configuration-test':
        return await handleConfigurationTest()
      
      default:
        return response.validationError(
          'Invalid action. Supported actions: test, job-test, trigger-test, performance-test, integration-test, configuration-test'
        )
    }
    
  } catch (error) {
    logger.error('Scheduler test error:', 'scheduler_test', { error: error.message })
    return response.internalError('Scheduler test failed', { error: error.message })
  }
})

async function handleSchedulerTest(testType: string): Promise<Response> {
  try {
    let result: any
    
    switch (testType) {
      case 'basic':
        result = await testBasicScheduler()
        break
      case 'status':
        result = await testSchedulerStatus()
        break
      case 'jobs':
        result = await testSchedulerJobs()
        break
      case 'health':
        result = await testSchedulerHealth()
        break
      case 'configuration':
        result = await testSchedulerConfiguration()
        break
      default:
        result = await testBasicScheduler()
    }
    
    return response.success(
      result,
      `Scheduler test (${testType}) completed successfully`,
      200,
      { test_type: testType }
    )
    
  } catch (error) {
    logger.error(`Scheduler test (${testType}) failed:`, 'scheduler_test', { error: error.message })
    return response.internalError(`Scheduler test (${testType}) failed`, { error: error.message })
  }
}

async function handleJobTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      job_tests = [
        {
          name: 'content_pipeline_main',
          description: 'Main content automation job',
          expected_schedule: '*/5 * * * *',
          expected_function: 'trigger_content_automation'
        },
        {
          name: 'content_pipeline_sweeper',
          description: 'Sweeper job for stale jobs',
          expected_schedule: '*/15 * * * *',
          expected_function: 'trigger_sweeper'
        },
        {
          name: 'content_pipeline_monitor',
          description: 'Monitoring job',
          expected_schedule: '0 * * * *',
          expected_function: 'trigger_monitoring'
        },
        {
          name: 'content_pipeline_metrics',
          description: 'Metrics collection job',
          expected_schedule: '*/30 * * * *',
          expected_function: 'trigger_metrics_collection'
        },
        {
          name: 'content_pipeline_health',
          description: 'Health checks job',
          expected_schedule: '*/10 * * * *',
          expected_function: 'trigger_health_checks'
        },
        {
          name: 'content_pipeline_cleanup',
          description: 'Cleanup job',
          expected_schedule: '0 2 * * *',
          expected_function: 'trigger_cleanup'
        }
      ]
    } = body
    
    const results = []
    
    for (const test of job_tests) {
      try {
        const { data: jobs, error } = await supabaseAdmin
          .rpc('manage_cron_jobs')
        
        if (error) {
          results.push({
            job: test,
            success: false,
            error: error.message
          })
          continue
        }
        
        const job = jobs?.find((j: any) => j.job_name === test.name)
        
        if (!job) {
          results.push({
            job: test,
            success: false,
            error: 'Job not found'
          })
          continue
        }
        
        const scheduleMatch = job.schedule === test.expected_schedule
        const activeStatus = job.active === true
        const hasLastRun = job.last_run !== null
        const hasNextRun = job.next_run !== null
        
        results.push({
          job: test,
          success: scheduleMatch && activeStatus,
          details: {
            found: true,
            schedule_match: scheduleMatch,
            active: activeStatus,
            has_last_run: hasLastRun,
            has_next_run: hasNextRun,
            actual_schedule: job.schedule,
            last_run: job.last_run,
            next_run: job.next_run
          }
        })
        
      } catch (error) {
        results.push({
          job: test,
          success: false,
          error: error.message
        })
      }
    }
    
    return response.success(
      {
        job_tests: job_tests,
        results: results,
        overall_success: results.every(result => result.success)
      },
      'Job test completed',
      200
    )
    
  } catch (error) {
    logger.error('Job test failed:', 'scheduler_test', { error: error.message })
    return response.internalError('Job test failed', { error: error.message })
  }
}

async function handleTriggerTest(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { 
      trigger_tests = [
        {
          job_name: 'content_pipeline_main',
          function_name: 'trigger_content_automation',
          description: 'Content automation trigger'
        },
        {
          job_name: 'content_pipeline_sweeper',
          function_name: 'trigger_sweeper',
          description: 'Sweeper trigger'
        },
        {
          job_name: 'content_pipeline_monitor',
          function_name: 'trigger_monitoring',
          description: 'Monitoring trigger'
        },
        {
          job_name: 'content_pipeline_metrics',
          function_name: 'trigger_metrics_collection',
          description: 'Metrics collection trigger'
        },
        {
          job_name: 'content_pipeline_health',
          function_name: 'trigger_health_checks',
          description: 'Health checks trigger'
        },
        {
          job_name: 'content_pipeline_cleanup',
          function_name: 'trigger_cleanup',
          description: 'Cleanup trigger'
        }
      ]
    } = body
    
    const results = []
    
    for (const test of trigger_tests) {
      try {
        const startTime = Date.now()
        
        // Test the trigger function
        const { data, error } = await supabaseAdmin
          .rpc(test.function_name)
        
        const duration = Date.now() - startTime
        
        results.push({
          trigger: test,
          success: !error,
          duration_ms: duration,
          error: error?.message,
          details: {
            function_executed: !error,
            response_time_ms: duration,
            has_data: !!data
          }
        })
        
      } catch (error) {
        results.push({
          trigger: test,
          success: false,
          duration_ms: 0,
          error: error.message,
          details: {
            function_executed: false,
            response_time_ms: 0,
            has_data: false
          }
        })
      }
    }
    
    return response.success(
      {
        trigger_tests: trigger_tests,
        results: results,
        overall_success: results.every(result => result.success),
        average_duration_ms: results.reduce((sum, result) => sum + result.duration_ms, 0) / results.length
      },
      'Trigger test completed',
      200
    )
    
  } catch (error) {
    logger.error('Trigger test failed:', 'scheduler_test', { error: error.message })
    return response.internalError('Trigger test failed', { error: error.message })
  }
}

async function handlePerformanceTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Get scheduler status performance
    const startTime1 = Date.now()
    try {
      const { data: statusData, error: statusError } = await supabaseAdmin
        .rpc('get_cron_job_status')
        .single()
      
      const duration1 = Date.now() - startTime1
      
      tests.push({
        test: 'get_scheduler_status',
        success: !statusError,
        duration_ms: duration1,
        error: statusError?.message
      })
    } catch (error) {
      tests.push({
        test: 'get_scheduler_status',
        success: false,
        duration_ms: Date.now() - startTime1,
        error: error.message
      })
    }
    
    // Test 2: Get cron jobs performance
    const startTime2 = Date.now()
    try {
      const { data: jobsData, error: jobsError } = await supabaseAdmin
        .rpc('manage_cron_jobs')
      
      const duration2 = Date.now() - startTime2
      
      tests.push({
        test: 'get_cron_jobs',
        success: !jobsError,
        duration_ms: duration2,
        error: jobsError?.message
      })
    } catch (error) {
      tests.push({
        test: 'get_cron_jobs',
        success: false,
        duration_ms: Date.now() - startTime2,
        error: error.message
      })
    }
    
    // Test 3: Get scheduler health performance
    const startTime3 = Date.now()
    try {
      const { data: healthData, error: healthError } = await supabaseAdmin
        .rpc('get_scheduler_health')
      
      const duration3 = Date.now() - startTime3
      
      tests.push({
        test: 'get_scheduler_health',
        success: !healthError,
        duration_ms: duration3,
        error: healthError?.message
      })
    } catch (error) {
      tests.push({
        test: 'get_scheduler_health',
        success: false,
        duration_ms: Date.now() - startTime3,
        error: error.message
      })
    }
    
    // Test 4: Initialize scheduler performance
    const startTime4 = Date.now()
    try {
      const { data: initData, error: initError } = await supabaseAdmin
        .rpc('initialize_scheduler')
      
      const duration4 = Date.now() - startTime4
      
      tests.push({
        test: 'initialize_scheduler',
        success: !initError,
        duration_ms: duration4,
        error: initError?.message
      })
    } catch (error) {
      tests.push({
        test: 'initialize_scheduler',
        success: false,
        duration_ms: Date.now() - startTime4,
        error: error.message
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
    logger.error('Performance test failed:', 'scheduler_test', { error: error.message })
    return response.internalError('Performance test failed', { error: error.message })
  }
}

async function handleIntegrationTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Scheduler with job_runs integration
    try {
      const { data: jobRunsData, error: jobRunsError } = await supabaseAdmin
        .from('job_runs')
        .select('id, status, metadata')
        .eq('metadata->>trigger_type', 'scheduled')
        .limit(5)
      
      tests.push({
        integration: 'scheduler_job_runs',
        success: !jobRunsError,
        message: jobRunsError ? 'Failed to query job_runs' : `Found ${jobRunsData?.length || 0} scheduled job runs`,
        data_count: jobRunsData?.length || 0
      })
    } catch (error) {
      tests.push({
        integration: 'scheduler_job_runs',
        success: false,
        message: `Error: ${error.message}`,
        data_count: 0
      })
    }
    
    // Test 2: Scheduler with sweeper_logs integration
    try {
      const { data: sweeperData, error: sweeperError } = await supabaseAdmin
        .from('sweeper_logs')
        .select('id, action, status, metadata')
        .eq('metadata->>trigger_type', 'scheduled')
        .limit(5)
      
      tests.push({
        integration: 'scheduler_sweeper_logs',
        success: !sweeperError,
        message: sweeperError ? 'Failed to query sweeper_logs' : `Found ${sweeperData?.length || 0} scheduled sweeper logs`,
        data_count: sweeperData?.length || 0
      })
    } catch (error) {
      tests.push({
        integration: 'scheduler_sweeper_logs',
        success: false,
        message: `Error: ${error.message}`,
        data_count: 0
      })
    }
    
    // Test 3: Scheduler with monitoring_alerts integration
    try {
      const { data: alertsData, error: alertsError } = await supabaseAdmin
        .from('monitoring_alerts')
        .select('id, alert_type, severity, metadata')
        .eq('metadata->>trigger_type', 'scheduled')
        .limit(5)
      
      tests.push({
        integration: 'scheduler_monitoring_alerts',
        success: !alertsError,
        message: alertsError ? 'Failed to query monitoring_alerts' : `Found ${alertsData?.length || 0} scheduled monitoring alerts`,
        data_count: alertsData?.length || 0
      })
    } catch (error) {
      tests.push({
        integration: 'scheduler_monitoring_alerts',
        success: false,
        message: `Error: ${error.message}`,
        data_count: 0
      })
    }
    
    // Test 4: Scheduler with metrics_data integration
    try {
      const { data: metricsData, error: metricsError } = await supabaseAdmin
        .from('metrics_data')
        .select('id, metric_type, metric_name, metadata')
        .eq('metadata->>trigger_type', 'scheduled')
        .limit(5)
      
      tests.push({
        integration: 'scheduler_metrics_data',
        success: !metricsError,
        message: metricsError ? 'Failed to query metrics_data' : `Found ${metricsData?.length || 0} scheduled metrics`,
        data_count: metricsData?.length || 0
      })
    } catch (error) {
      tests.push({
        integration: 'scheduler_metrics_data',
        success: false,
        message: `Error: ${error.message}`,
        data_count: 0
      })
    }
    
    // Test 5: Scheduler with health_checks integration
    try {
      const { data: healthData, error: healthError } = await supabaseAdmin
        .from('health_checks')
        .select('id, component, status, metadata')
        .eq('metadata->>trigger_type', 'scheduled')
        .limit(5)
      
      tests.push({
        integration: 'scheduler_health_checks',
        success: !healthError,
        message: healthError ? 'Failed to query health_checks' : `Found ${healthData?.length || 0} scheduled health checks`,
        data_count: healthData?.length || 0
      })
    } catch (error) {
      tests.push({
        integration: 'scheduler_health_checks',
        success: false,
        message: `Error: ${error.message}`,
        data_count: 0
      })
    }
    
    // Test 6: Scheduler with cleanup_logs integration
    try {
      const { data: cleanupData, error: cleanupError } = await supabaseAdmin
        .from('cleanup_logs')
        .select('id, operation_type, status, metadata')
        .eq('metadata->>trigger_type', 'scheduled')
        .limit(5)
      
      tests.push({
        integration: 'scheduler_cleanup_logs',
        success: !cleanupError,
        message: cleanupError ? 'Failed to query cleanup_logs' : `Found ${cleanupData?.length || 0} scheduled cleanup logs`,
        data_count: cleanupData?.length || 0
      })
    } catch (error) {
      tests.push({
        integration: 'scheduler_cleanup_logs',
        success: false,
        message: `Error: ${error.message}`,
        data_count: 0
      })
    }
    
    const allTestsPassed = tests.every(test => test.success)
    const totalDataCount = tests.reduce((sum, test) => sum + test.data_count, 0)
    
    return response.success(
      {
        tests: tests,
        all_tests_passed: allTestsPassed,
        integration_summary: {
          total_integrations: tests.length,
          successful_integrations: tests.filter(test => test.success).length,
          failed_integrations: tests.filter(test => !test.success).length,
          total_data_records: totalDataCount
        }
      },
      'Integration test completed',
      200
    )
    
  } catch (error) {
    logger.error('Integration test failed:', 'scheduler_test', { error: error.message })
    return response.internalError('Integration test failed', { error: error.message })
  }
}

async function handleConfigurationTest(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Check if pg_cron extension is enabled
    try {
      const { data: extensionData, error: extensionError } = await supabaseAdmin
        .from('pg_extension')
        .select('extname, extversion')
        .eq('extname', 'pg_cron')
        .single()
      
      tests.push({
        configuration: 'pg_cron_extension',
        success: !extensionError && extensionData,
        message: extensionError ? 'pg_cron extension not found' : `pg_cron extension enabled (version: ${extensionData?.extversion})`,
        details: extensionData
      })
    } catch (error) {
      tests.push({
        configuration: 'pg_cron_extension',
        success: false,
        message: `Error checking pg_cron extension: ${error.message}`,
        details: null
      })
    }
    
    // Test 2: Check if required functions exist
    const requiredFunctions = [
      'trigger_content_automation',
      'trigger_sweeper',
      'trigger_monitoring',
      'trigger_metrics_collection',
      'trigger_health_checks',
      'trigger_cleanup',
      'manage_cron_jobs',
      'get_cron_job_status',
      'toggle_cron_job',
      'initialize_scheduler',
      'get_scheduler_health'
    ]
    
    for (const functionName of requiredFunctions) {
      try {
        const { data: functionData, error: functionError } = await supabaseAdmin
          .from('pg_proc')
          .select('proname')
          .eq('proname', functionName)
          .single()
        
        tests.push({
          configuration: `function_${functionName}`,
          success: !functionError && functionData,
          message: functionError ? `Function ${functionName} not found` : `Function ${functionName} exists`,
          details: functionData
        })
      } catch (error) {
        tests.push({
          configuration: `function_${functionName}`,
          success: false,
          message: `Error checking function ${functionName}: ${error.message}`,
          details: null
        })
      }
    }
    
    // Test 3: Check if required tables exist
    const requiredTables = [
      'job_runs',
      'sweeper_logs',
      'monitoring_alerts',
      'metrics_data',
      'health_checks',
      'cleanup_logs'
    ]
    
    for (const tableName of requiredTables) {
      try {
        const { data: tableData, error: tableError } = await supabaseAdmin
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_name', tableName)
          .single()
        
        tests.push({
          configuration: `table_${tableName}`,
          success: !tableError && tableData,
          message: tableError ? `Table ${tableName} not found` : `Table ${tableName} exists`,
          details: tableData
        })
      } catch (error) {
        tests.push({
          configuration: `table_${tableName}`,
          success: false,
          message: `Error checking table ${tableName}: ${error.message}`,
          details: null
        })
      }
    }
    
    // Test 4: Check application settings
    try {
      const { data: settingsData, error: settingsError } = await supabaseAdmin
        .from('pg_settings')
        .select('name, setting')
        .like('name', 'app.%')
        .limit(10)
      
      tests.push({
        configuration: 'application_settings',
        success: !settingsError,
        message: settingsError ? 'Failed to get application settings' : `Found ${settingsData?.length || 0} application settings`,
        details: settingsData
      })
    } catch (error) {
      tests.push({
        configuration: 'application_settings',
        success: false,
        message: `Error checking application settings: ${error.message}`,
        details: null
      })
    }
    
    const allTestsPassed = tests.every(test => test.success)
    const configurationSummary = {
      total_configurations: tests.length,
      successful_configurations: tests.filter(test => test.success).length,
      failed_configurations: tests.filter(test => !test.success).length,
      extension_enabled: tests.find(test => test.configuration === 'pg_cron_extension')?.success || false,
      functions_available: tests.filter(test => test.configuration.startsWith('function_') && test.success).length,
      tables_available: tests.filter(test => test.configuration.startsWith('table_') && test.success).length
    }
    
    return response.success(
      {
        tests: tests,
        all_tests_passed: allTestsPassed,
        configuration_summary: configurationSummary
      },
      'Configuration test completed',
      200
    )
    
  } catch (error) {
    logger.error('Configuration test failed:', 'scheduler_test', { error: error.message })
    return response.internalError('Configuration test failed', { error: error.message })
  }
}

// Test helper functions
async function testBasicScheduler(): Promise<any> {
  try {
    const { data: status, error: statusError } = await supabaseAdmin
      .rpc('get_cron_job_status')
      .single()
    
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .rpc('manage_cron_jobs')
    
    const { data: health, error: healthError } = await supabaseAdmin
      .rpc('get_scheduler_health')
    
    return {
      status: statusError ? null : status,
      jobs: jobsError ? null : jobs,
      health: healthError ? null : health,
      success: !statusError && !jobsError && !healthError,
      errors: {
        status: statusError?.message,
        jobs: jobsError?.message,
        health: healthError?.message
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testSchedulerStatus(): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_cron_job_status')
      .single()
    
    return {
      status: data,
      success: !error,
      error: error?.message
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testSchedulerJobs(): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('manage_cron_jobs')
    
    return {
      jobs: data,
      count: data?.length || 0,
      success: !error,
      error: error?.message
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testSchedulerHealth(): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_scheduler_health')
    
    const healthyJobs = data?.filter((job: any) => job.status === 'healthy').length || 0
    const totalJobs = data?.length || 0
    
    return {
      health: data,
      summary: {
        total_jobs: totalJobs,
        healthy_jobs: healthyJobs,
        health_percentage: totalJobs > 0 ? (healthyJobs / totalJobs) * 100 : 0
      },
      success: !error,
      error: error?.message
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

async function testSchedulerConfiguration(): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('initialize_scheduler')
    
    const successCount = data?.filter((job: any) => job.status === 'active').length || 0
    const errorCount = data?.filter((job: any) => job.status === 'error').length || 0
    
    return {
      configuration: data,
      summary: {
        total_jobs: data?.length || 0,
        active_jobs: successCount,
        error_jobs: errorCount,
        configuration_valid: errorCount === 0
      },
      success: !error,
      error: error?.message
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}
