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
    const action = url.searchParams.get('action') || 'status'
    const jobName = url.searchParams.get('job') || ''
    const enable = url.searchParams.get('enable') === 'true'
    
    logger.info(`Scheduler management - Action: ${action}`, 'scheduler')
    
    switch (action) {
      case 'status':
        return await handleGetStatus()
      
      case 'jobs':
        return await handleGetJobs()
      
      case 'health':
        return await handleGetHealth()
      
      case 'initialize':
        return await handleInitialize()
      
      case 'toggle':
        return await handleToggleJob(jobName, enable)
      
      case 'trigger':
        return await handleTriggerJob(jobName)
      
      case 'test':
        return await handleTestScheduler()
      
      default:
        return response.validationError(
          'Invalid action. Supported actions: status, jobs, health, initialize, toggle, trigger, test'
        )
    }
    
  } catch (error) {
    logger.error('Scheduler management error:', 'scheduler', { error: error.message })
    return response.internalError('Scheduler management failed', { error: error.message })
  }
})

async function handleGetStatus(): Promise<Response> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_cron_job_status')
      .single()
    
    if (error) {
      throw new Error(`Failed to get cron job status: ${error.message}`)
    }
    
    return response.success(
      data,
      'Scheduler status retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get scheduler status:', 'scheduler', { error: error.message })
    return response.internalError('Failed to get scheduler status', { error: error.message })
  }
}

async function handleGetJobs(): Promise<Response> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('manage_cron_jobs')
    
    if (error) {
      throw new Error(`Failed to get cron jobs: ${error.message}`)
    }
    
    return response.success(
      {
        jobs: data,
        count: data?.length || 0
      },
      `Retrieved ${data?.length || 0} cron jobs`,
      200
    )
    
  } catch (error) {
    logger.error('Failed to get cron jobs:', 'scheduler', { error: error.message })
    return response.internalError('Failed to get cron jobs', { error: error.message })
  }
}

async function handleGetHealth(): Promise<Response> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_scheduler_health')
    
    if (error) {
      throw new Error(`Failed to get scheduler health: ${error.message}`)
    }
    
    const healthSummary = {
      total_jobs: data?.length || 0,
      healthy_jobs: data?.filter((job: any) => job.status === 'healthy').length || 0,
      inactive_jobs: data?.filter((job: any) => job.status === 'inactive').length || 0,
      overall_health: data?.length > 0 ? 
        (data.filter((job: any) => job.status === 'healthy').length / data.length) * 100 : 0
    }
    
    return response.success(
      {
        health: data,
        summary: healthSummary
      },
      'Scheduler health retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get scheduler health:', 'scheduler', { error: error.message })
    return response.internalError('Failed to get scheduler health', { error: error.message })
  }
}

async function handleInitialize(): Promise<Response> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('initialize_scheduler')
    
    if (error) {
      throw new Error(`Failed to initialize scheduler: ${error.message}`)
    }
    
    const successCount = data?.filter((job: any) => job.status === 'active').length || 0
    const errorCount = data?.filter((job: any) => job.status === 'error').length || 0
    
    return response.success(
      {
        initialization_results: data,
        success_count: successCount,
        error_count: errorCount,
        initialized: errorCount === 0
      },
      `Scheduler initialization completed - ${successCount} jobs active, ${errorCount} errors`,
      errorCount > 0 ? 400 : 200
    )
    
  } catch (error) {
    logger.error('Failed to initialize scheduler:', 'scheduler', { error: error.message })
    return response.internalError('Failed to initialize scheduler', { error: error.message })
  }
}

async function handleToggleJob(jobName: string, enable: boolean): Promise<Response> {
  try {
    if (!jobName) {
      return response.validationError('Job name is required')
    }
    
    const { data, error } = await supabaseAdmin
      .rpc('toggle_cron_job', {
        job_name: jobName,
        enable_job: enable
      })
      .single()
    
    if (error) {
      throw new Error(`Failed to toggle cron job: ${error.message}`)
    }
    
    return response.success(
      data,
      data.success ? data.message : 'Failed to toggle job',
      data.success ? 200 : 400
    )
    
  } catch (error) {
    logger.error(`Failed to toggle job ${jobName}:`, 'scheduler', { error: error.message })
    return response.internalError(`Failed to toggle job ${jobName}`, { error: error.message })
  }
}

async function handleTriggerJob(jobName: string): Promise<Response> {
  try {
    if (!jobName) {
      return response.validationError('Job name is required')
    }
    
    let functionName: string
    let jobDescription: string
    
    switch (jobName) {
      case 'content_pipeline_main':
        functionName = 'trigger_content_automation'
        jobDescription = 'Content automation'
        break
      case 'content_pipeline_sweeper':
        functionName = 'trigger_sweeper'
        jobDescription = 'Sweeper'
        break
      case 'content_pipeline_monitor':
        functionName = 'trigger_monitoring'
        jobDescription = 'Monitoring'
        break
      case 'content_pipeline_metrics':
        functionName = 'trigger_metrics_collection'
        jobDescription = 'Metrics collection'
        break
      case 'content_pipeline_health':
        functionName = 'trigger_health_checks'
        jobDescription = 'Health checks'
        break
      case 'content_pipeline_cleanup':
        functionName = 'trigger_cleanup'
        jobDescription = 'Cleanup'
        break
      default:
        return response.validationError(`Unknown job: ${jobName}`)
    }
    
    const { data, error } = await supabaseAdmin
      .rpc(functionName)
    
    if (error) {
      throw new Error(`Failed to trigger ${jobDescription}: ${error.message}`)
    }
    
    return response.success(
      { job_name: jobName, function: functionName },
      `${jobDescription} triggered successfully`,
      200
    )
    
  } catch (error) {
    logger.error(`Failed to trigger job ${jobName}:`, 'scheduler', { error: error.message })
    return response.internalError(`Failed to trigger job ${jobName}`, { error: error.message })
  }
}

async function handleTestScheduler(): Promise<Response> {
  try {
    const tests = []
    
    // Test 1: Check if pg_cron extension is available
    try {
      const { data: extensionData, error: extensionError } = await supabaseAdmin
        .from('pg_extension')
        .select('extname')
        .eq('extname', 'pg_cron')
        .single()
      
      tests.push({
        test: 'pg_cron_extension',
        success: !extensionError && extensionData,
        message: extensionError ? 'pg_cron extension not found' : 'pg_cron extension available'
      })
    } catch (error) {
      tests.push({
        test: 'pg_cron_extension',
        success: false,
        message: `Failed to check pg_cron extension: ${error.message}`
      })
    }
    
    // Test 2: Check if cron jobs exist
    try {
      const { data: jobsData, error: jobsError } = await supabaseAdmin
        .rpc('manage_cron_jobs')
      
      tests.push({
        test: 'cron_jobs_exist',
        success: !jobsError && jobsData && jobsData.length > 0,
        message: jobsError ? 'Failed to get cron jobs' : `Found ${jobsData?.length || 0} cron jobs`
      })
    } catch (error) {
      tests.push({
        test: 'cron_jobs_exist',
        success: false,
        message: `Failed to check cron jobs: ${error.message}`
      })
    }
    
    // Test 3: Check scheduler health
    try {
      const { data: healthData, error: healthError } = await supabaseAdmin
        .rpc('get_scheduler_health')
      
      const healthyJobs = healthData?.filter((job: any) => job.status === 'healthy').length || 0
      const totalJobs = healthData?.length || 0
      
      tests.push({
        test: 'scheduler_health',
        success: !healthError && totalJobs > 0,
        message: healthError ? 'Failed to get scheduler health' : `${healthyJobs}/${totalJobs} jobs healthy`
      })
    } catch (error) {
      tests.push({
        test: 'scheduler_health',
        success: false,
        message: `Failed to check scheduler health: ${error.message}`
      })
    }
    
    // Test 4: Check configuration
    try {
      const { data: configData, error: configError } = await supabaseAdmin
        .rpc('initialize_scheduler')
      
      const errorJobs = configData?.filter((job: any) => job.status === 'error').length || 0
      
      tests.push({
        test: 'scheduler_configuration',
        success: !configError && errorJobs === 0,
        message: configError ? 'Failed to check configuration' : 
                errorJobs > 0 ? `${errorJobs} configuration errors` : 'Configuration valid'
      })
    } catch (error) {
      tests.push({
        test: 'scheduler_configuration',
        success: false,
        message: `Failed to check configuration: ${error.message}`
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
      `Scheduler test completed - ${tests.filter(test => test.success).length}/${tests.length} tests passed`,
      allTestsPassed ? 200 : 400
    )
    
  } catch (error) {
    logger.error('Scheduler test failed:', 'scheduler', { error: error.message })
    return response.internalError('Scheduler test failed', { error: error.message })
  }
}
