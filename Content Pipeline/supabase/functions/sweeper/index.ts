import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Sweeper configuration
const SWEEPER_CONFIG = {
  // Stale job detection thresholds
  STALE_THRESHOLDS: {
    processing_timeout: 10 * 60 * 1000, // 10 minutes
    max_processing_time: 30 * 60 * 1000, // 30 minutes
    health_check_interval: 5 * 60 * 1000, // 5 minutes
  },
  
  // Batch processing limits
  BATCH_LIMITS: {
    max_jobs_per_batch: 50,
    max_processing_time: 5 * 60 * 1000, // 5 minutes
    retry_delay: 1000, // 1 second between batches
  },
  
  // Retry and failure handling
  RETRY_CONFIG: {
    max_retry_attempts: 3,
    retry_delay: 30 * 1000, // 30 seconds
    exponential_backoff: true,
  },
  
  // Logging and monitoring
  LOGGING: {
    log_level: 'info',
    log_stale_jobs: true,
    log_reset_actions: true,
    log_performance_metrics: true,
  }
}

interface StaleJob {
  id: string
  topic: string
  status: string
  claimed_at: string
  retry_count: number
  last_error?: string
  processing_duration: number
  is_stale: boolean
  stale_reason: string
}

interface SweeperResult {
  success: boolean
  total_jobs_checked: number
  stale_jobs_found: number
  jobs_reset: number
  jobs_failed: number
  processing_time_ms: number
  errors: string[]
  warnings: string[]
  stale_jobs: StaleJob[]
  performance_metrics: {
    database_query_time: number
    job_processing_time: number
    total_execution_time: number
  }
}

interface SweeperStatistics {
  total_sweeps: number
  total_jobs_checked: number
  total_stale_jobs_found: number
  total_jobs_reset: number
  average_processing_time: number
  success_rate: number
  last_sweep_time: string
  health_status: 'healthy' | 'degraded' | 'critical'
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'sweep'
    const dryRun = url.searchParams.get('dry_run') === 'true'
    const maxJobs = parseInt(url.searchParams.get('max_jobs') || '50')
    
    console.log(`Sweeper function - Action: ${action}, Dry run: ${dryRun}, Max jobs: ${maxJobs}`)
    
    switch (action) {
      case 'sweep':
        return await handleSweep(dryRun, maxJobs)
      
      case 'stats':
        return await handleStatistics()
      
      case 'health':
        return await handleHealthCheck()
      
      case 'reset':
        return await handleManualReset(req)
      
      case 'monitor':
        return await handleMonitoring()
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: sweep, stats, health, reset, monitor' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('Sweeper function error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function handleSweep(dryRun: boolean = false, maxJobs: number = 50): Promise<Response> {
  const startTime = Date.now()
  const errors: string[] = []
  const warnings: string[] = []
  
  try {
    console.log(`[Sweeper] Starting sweep - Dry run: ${dryRun}, Max jobs: ${maxJobs}`)
    
    // Find stale processing jobs
    const staleJobs = await findStaleProcessingJobs(maxJobs)
    console.log(`[Sweeper] Found ${staleJobs.length} stale jobs`)
    
    if (staleJobs.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          action: 'sweep',
          dry_run: dryRun,
          total_jobs_checked: 0,
          stale_jobs_found: 0,
          jobs_reset: 0,
          jobs_failed: 0,
          processing_time_ms: Date.now() - startTime,
          errors: [],
          warnings: ['No stale jobs found'],
          stale_jobs: [],
          performance_metrics: {
            database_query_time: 0,
            job_processing_time: 0,
            total_execution_time: Date.now() - startTime
          },
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }
    
    let jobsReset = 0
    let jobsFailed = 0
    
    if (!dryRun) {
      // Reset stale jobs
      for (const job of staleJobs) {
        try {
          const resetResult = await resetStaleJob(job)
          if (resetResult.success) {
            jobsReset++
            console.log(`[Sweeper] Reset stale job ${job.id}`)
          } else {
            jobsFailed++
            errors.push(`Failed to reset job ${job.id}: ${resetResult.error}`)
            console.error(`[Sweeper] Failed to reset job ${job.id}:`, resetResult.error)
          }
        } catch (error) {
          jobsFailed++
          errors.push(`Error resetting job ${job.id}: ${error.message}`)
          console.error(`[Sweeper] Error resetting job ${job.id}:`, error)
        }
      }
    } else {
      console.log(`[Sweeper] Dry run - would reset ${staleJobs.length} jobs`)
    }
    
    // Log sweep statistics
    await logSweepStatistics({
      total_jobs_checked: staleJobs.length,
      stale_jobs_found: staleJobs.length,
      jobs_reset: jobsReset,
      jobs_failed: jobsFailed,
      dry_run: dryRun
    })
    
    const processingTime = Date.now() - startTime
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'sweep',
        dry_run: dryRun,
        total_jobs_checked: staleJobs.length,
        stale_jobs_found: staleJobs.length,
        jobs_reset: jobsReset,
        jobs_failed: jobsFailed,
        processing_time_ms: processingTime,
        errors: errors,
        warnings: warnings,
        stale_jobs: staleJobs,
        performance_metrics: {
          database_query_time: processingTime * 0.3, // Estimate
          job_processing_time: processingTime * 0.7, // Estimate
          total_execution_time: processingTime
        },
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('[Sweeper] Sweep failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        action: 'sweep',
        dry_run: dryRun,
        error: error.message,
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleStatistics(): Promise<Response> {
  try {
    const stats = await getSweeperStatistics()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'stats',
        statistics: stats,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('[Sweeper] Failed to get statistics:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        action: 'stats',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleHealthCheck(): Promise<Response> {
  try {
    const health = await performHealthCheck()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'health',
        health_status: health,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('[Sweeper] Health check failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        action: 'health',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleManualReset(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { job_ids = [], reason = 'Manual reset' } = body
    
    if (!Array.isArray(job_ids) || job_ids.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'job_ids array is required and must not be empty'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }
    
    const results = []
    let successCount = 0
    let failureCount = 0
    
    for (const jobId of job_ids) {
      try {
        const result = await resetSpecificJob(jobId, reason)
        results.push({ job_id: jobId, success: result.success, error: result.error })
        
        if (result.success) {
          successCount++
        } else {
          failureCount++
        }
      } catch (error) {
        results.push({ job_id: jobId, success: false, error: error.message })
        failureCount++
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'reset',
        total_jobs: job_ids.length,
        successful_resets: successCount,
        failed_resets: failureCount,
        results: results,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('[Sweeper] Manual reset failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        action: 'reset',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleMonitoring(): Promise<Response> {
  try {
    const monitoring = await getMonitoringData()
    
    return new Response(
      JSON.stringify({
        success: true,
        action: 'monitor',
        monitoring: monitoring,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('[Sweeper] Monitoring failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        action: 'monitor',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

/**
 * Finds stale processing jobs
 */
async function findStaleProcessingJobs(maxJobs: number = 50): Promise<StaleJob[]> {
  try {
    const staleThreshold = new Date(Date.now() - SWEEPER_CONFIG.STALE_THRESHOLDS.processing_timeout)
    
    const { data: jobs, error } = await supabase
      .from('content_jobs')
      .select('id, topic, status, claimed_at, retry_count, last_error')
      .eq('status', 'processing')
      .lt('claimed_at', staleThreshold.toISOString())
      .order('claimed_at', { ascending: true })
      .limit(maxJobs)
    
    if (error) {
      throw new Error(`Failed to find stale jobs: ${error.message}`)
    }
    
    const staleJobs: StaleJob[] = jobs.map(job => {
      const claimedAt = new Date(job.claimed_at)
      const processingDuration = Date.now() - claimedAt.getTime()
      const isStale = processingDuration > SWEEPER_CONFIG.STALE_THRESHOLDS.processing_timeout
      
      let staleReason = 'Unknown'
      if (processingDuration > SWEEPER_CONFIG.STALE_THRESHOLDS.max_processing_time) {
        staleReason = 'Exceeded maximum processing time'
      } else if (processingDuration > SWEEPER_CONFIG.STALE_THRESHOLDS.processing_timeout) {
        staleReason = 'Processing timeout'
      }
      
      return {
        id: job.id,
        topic: job.topic,
        status: job.status,
        claimed_at: job.claimed_at,
        retry_count: job.retry_count || 0,
        last_error: job.last_error,
        processing_duration: processingDuration,
        is_stale: isStale,
        stale_reason: staleReason
      }
    })
    
    console.log(`[Sweeper] Found ${staleJobs.length} stale processing jobs`)
    return staleJobs
    
  } catch (error) {
    console.error('[Sweeper] Failed to find stale jobs:', error)
    throw error
  }
}

/**
 * Resets a stale job back to pending status
 */
async function resetStaleJob(job: StaleJob): Promise<{ success: boolean; error?: string }> {
  try {
    // Update job status to pending and clear claimed_at
    const { error: updateError } = await supabase
      .from('content_jobs')
      .update({
        status: 'pending',
        claimed_at: null,
        last_error: `Job reset by sweeper: ${job.stale_reason} (processing for ${Math.round(job.processing_duration / 1000)}s)`,
        updated_at: new Date().toISOString()
      })
      .eq('id', job.id)
      .eq('status', 'processing') // Ensure we only update if still processing
    
    if (updateError) {
      throw new Error(`Failed to update job: ${updateError.message}`)
    }
    
    // Log the reset action
    await logJobReset(job.id, job.stale_reason, job.processing_duration)
    
    return { success: true }
    
  } catch (error) {
    console.error(`[Sweeper] Failed to reset job ${job.id}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Resets a specific job by ID
 */
async function resetSpecificJob(jobId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get job details
    const { data: job, error: fetchError } = await supabase
      .from('content_jobs')
      .select('id, status, claimed_at')
      .eq('id', jobId)
      .single()
    
    if (fetchError) {
      throw new Error(`Job not found: ${fetchError.message}`)
    }
    
    if (job.status !== 'processing') {
      throw new Error(`Job is not in processing status (current: ${job.status})`)
    }
    
    // Update job status
    const { error: updateError } = await supabase
      .from('content_jobs')
      .update({
        status: 'pending',
        claimed_at: null,
        last_error: `Manual reset: ${reason}`,
        updated_at: new Date().toISOString()
      })
      .eq('id', jobId)
    
    if (updateError) {
      throw new Error(`Failed to update job: ${updateError.message}`)
    }
    
    // Log the reset action
    const processingDuration = job.claimed_at ? Date.now() - new Date(job.claimed_at).getTime() : 0
    await logJobReset(jobId, reason, processingDuration)
    
    return { success: true }
    
  } catch (error) {
    console.error(`[Sweeper] Failed to reset specific job ${jobId}:`, error)
    return { success: false, error: error.message }
  }
}

/**
 * Logs job reset action
 */
async function logJobReset(jobId: string, reason: string, processingDuration: number): Promise<void> {
  try {
    const { error } = await supabase
      .from('job_runs')
      .insert({
        job_id: jobId,
        status: 'retrying',
        retry_attempt: 0,
        execution_time: 0,
        error_details: {
          reset_reason: reason,
          processing_duration: processingDuration,
          reset_by: 'sweeper',
          reset_timestamp: new Date().toISOString()
        },
        timings: {
          reset_time: Date.now()
        }
      })
    
    if (error) {
      console.error(`[Sweeper] Failed to log job reset: ${error.message}`)
    }
  } catch (error) {
    console.error(`[Sweeper] Failed to log job reset:`, error)
  }
}

/**
 * Logs sweep statistics
 */
async function logSweepStatistics(stats: any): Promise<void> {
  try {
    const { error } = await supabase
      .from('sweeper_logs')
      .insert({
        total_jobs_checked: stats.total_jobs_checked,
        stale_jobs_found: stats.stale_jobs_found,
        jobs_reset: stats.jobs_reset,
        jobs_failed: stats.jobs_failed,
        dry_run: stats.dry_run,
        sweep_timestamp: new Date().toISOString()
      })
    
    if (error) {
      console.error(`[Sweeper] Failed to log sweep statistics: ${error.message}`)
    }
  } catch (error) {
    console.error(`[Sweeper] Failed to log sweep statistics:`, error)
  }
}

/**
 * Gets sweeper statistics
 */
async function getSweeperStatistics(): Promise<SweeperStatistics> {
  try {
    // Get recent sweep logs
    const { data: logs, error } = await supabase
      .from('sweeper_logs')
      .select('*')
      .order('sweep_timestamp', { ascending: false })
      .limit(100)
    
    if (error) {
      throw new Error(`Failed to get sweep logs: ${error.message}`)
    }
    
    const totalSweeps = logs.length
    const totalJobsChecked = logs.reduce((sum, log) => sum + log.total_jobs_checked, 0)
    const totalStaleJobsFound = logs.reduce((sum, log) => sum + log.stale_jobs_found, 0)
    const totalJobsReset = logs.reduce((sum, log) => sum + log.jobs_reset, 0)
    const averageProcessingTime = logs.length > 0 ? totalJobsChecked / logs.length : 0
    const successRate = totalJobsChecked > 0 ? (totalJobsReset / totalJobsChecked) * 100 : 0
    
    // Determine health status
    let healthStatus: 'healthy' | 'degraded' | 'critical' = 'healthy'
    if (successRate < 80) {
      healthStatus = 'degraded'
    }
    if (successRate < 50) {
      healthStatus = 'critical'
    }
    
    return {
      total_sweeps: totalSweeps,
      total_jobs_checked: totalJobsChecked,
      total_stale_jobs_found: totalStaleJobsFound,
      total_jobs_reset: totalJobsReset,
      average_processing_time: averageProcessingTime,
      success_rate: successRate,
      last_sweep_time: logs[0]?.sweep_timestamp || 'Never',
      health_status: healthStatus
    }
    
  } catch (error) {
    console.error('[Sweeper] Failed to get statistics:', error)
    throw error
  }
}

/**
 * Performs health check
 */
async function performHealthCheck(): Promise<any> {
  try {
    // Check for current processing jobs
    const { data: processingJobs, error: processingError } = await supabase
      .from('content_jobs')
      .select('id, claimed_at')
      .eq('status', 'processing')
    
    if (processingError) {
      throw new Error(`Failed to check processing jobs: ${processingError.message}`)
    }
    
    // Check for stale jobs
    const staleThreshold = new Date(Date.now() - SWEEPER_CONFIG.STALE_THRESHOLDS.processing_timeout)
    const staleJobs = processingJobs.filter(job => 
      new Date(job.claimed_at) < staleThreshold
    )
    
    // Check database connectivity
    const { error: dbError } = await supabase
      .from('content_jobs')
      .select('id')
      .limit(1)
    
    const dbHealthy = !dbError
    
    return {
      healthy: dbHealthy && staleJobs.length === 0,
      database_healthy: dbHealthy,
      processing_jobs_count: processingJobs.length,
      stale_jobs_count: staleJobs.length,
      stale_threshold_minutes: SWEEPER_CONFIG.STALE_THRESHOLDS.processing_timeout / (60 * 1000),
      last_check: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('[Sweeper] Health check failed:', error)
    throw error
  }
}

/**
 * Gets monitoring data
 */
async function getMonitoringData(): Promise<any> {
  try {
    const stats = await getSweeperStatistics()
    const health = await performHealthCheck()
    
    return {
      statistics: stats,
      health: health,
      configuration: SWEEPER_CONFIG,
      timestamp: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('[Sweeper] Failed to get monitoring data:', error)
    throw error
  }
}
