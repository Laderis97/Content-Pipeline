// Comprehensive execution logging to job_runs table
// PRD Reference: Functional Requirements 10, 44, 50, 77, 90

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  JobRun, 
  ProcessingResult, 
  PerformanceMetrics,
  ErrorDetails
} from './types.ts'

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface LoggingContext {
  job_id: string
  function_name: string
  execution_id: string
  start_time: number
  retry_attempt: number
}

interface StepTiming {
  step_name: string
  start_time: number
  end_time: number
  duration_ms: number
  success: boolean
  error?: string
}

interface DetailedTimings {
  total_duration_ms: number
  function_duration_ms: number
  openai_duration_ms?: number
  wordpress_duration_ms?: number
  validation_duration_ms?: number
  database_duration_ms?: number
  steps: StepTiming[]
}

/**
 * Creates a new job run record for tracking execution
 */
export async function createJobRunLog(
  jobId: string, 
  status: JobRun['status'] = 'started',
  retryAttempt: number = 0
): Promise<JobRun> {
  try {
    const executionTime = new Date().toISOString()
    
    const { data, error } = await supabase
      .from('job_runs')
      .insert({
        job_id: jobId,
        status,
        execution_time: executionTime,
        retry_attempt: retryAttempt,
        timings: {
          function_start: Date.now(),
          steps: []
        }
      })
      .select()
      .single()
    
    if (error) {
      throw new Error(`Failed to create job run log: ${error.message}`)
    }
    
    console.log(`Created job run log: ${data.id} for job: ${jobId}`)
    return data
    
  } catch (error) {
    console.error('Error creating job run log:', error)
    throw error
  }
}

/**
 * Updates job run with detailed timing information
 */
export async function updateJobRunLog(
  jobRunId: string,
  updates: {
    status?: JobRun['status']
    timings?: DetailedTimings
    error_details?: ErrorDetails
    performance_metrics?: PerformanceMetrics
  }
): Promise<void> {
  try {
    const updateData: any = {}
    
    if (updates.status) {
      updateData.status = updates.status
    }
    
    if (updates.timings) {
      updateData.timings = updates.timings
      updateData.function_duration_ms = updates.timings.function_duration_ms
      updateData.openai_duration_ms = updates.timings.openai_duration_ms
      updateData.wordpress_duration_ms = updates.timings.wordpress_duration_ms
      updateData.total_duration_ms = updates.timings.total_duration_ms
    }
    
    if (updates.error_details) {
      updateData.error_details = updates.error_details
    }
    
    if (updates.performance_metrics) {
      updateData.timings = {
        ...updateData.timings,
        performance_metrics: updates.performance_metrics
      }
    }
    
    const { error } = await supabase
      .from('job_runs')
      .update(updateData)
      .eq('id', jobRunId)
    
    if (error) {
      console.error('Failed to update job run log:', error)
      throw new Error(`Failed to update job run log: ${error.message}`)
    }
    
    console.log(`Updated job run log: ${jobRunId}`)
    
  } catch (error) {
    console.error('Error updating job run log:', error)
    throw error
  }
}

/**
 * Logs a processing step with timing information
 */
export async function logProcessingStep(
  jobRunId: string,
  stepName: string,
  startTime: number,
  endTime: number,
  success: boolean,
  error?: string,
  metadata?: any
): Promise<void> {
  try {
    const duration = endTime - startTime
    const stepTiming: StepTiming = {
      step_name: stepName,
      start_time: startTime,
      end_time: endTime,
      duration_ms: duration,
      success,
      error
    }
    
    // Get current job run to update timings
    const { data: currentRun, error: fetchError } = await supabase
      .from('job_runs')
      .select('timings')
      .eq('id', jobRunId)
      .single()
    
    if (fetchError) {
      console.error('Error fetching current job run:', fetchError)
      return
    }
    
    const currentTimings = currentRun.timings || { steps: [] }
    const updatedTimings = {
      ...currentTimings,
      steps: [...(currentTimings.steps || []), stepTiming]
    }
    
    // Add metadata if provided
    if (metadata) {
      stepTiming.metadata = metadata
    }
    
    const { error: updateError } = await supabase
      .from('job_runs')
      .update({ timings: updatedTimings })
      .eq('id', jobRunId)
    
    if (updateError) {
      console.error('Error updating job run with step timing:', updateError)
    } else {
      console.log(`Logged step: ${stepName} (${duration}ms) for job run: ${jobRunId}`)
    }
    
  } catch (error) {
    console.error('Error logging processing step:', error)
  }
}

/**
 * Logs the completion of a job run with comprehensive results
 */
export async function logJobCompletion(
  jobRunId: string,
  result: ProcessingResult,
  performanceMetrics?: PerformanceMetrics
): Promise<void> {
  try {
    const endTime = Date.now()
    const totalDuration = endTime - result.timings.function_start
    
    const detailedTimings: DetailedTimings = {
      total_duration_ms: totalDuration,
      function_duration_ms: result.timings.total_duration,
      openai_duration_ms: result.timings.openai_duration,
      wordpress_duration_ms: result.timings.wordpress_duration,
      steps: [] // Will be populated from existing steps
    }
    
    const errorDetails: ErrorDetails | undefined = result.error ? {
      message: result.error,
      timestamp: new Date().toISOString(),
      job_id: result.job_id,
      function_name: 'content-automation',
      retry_attempt: 0
    } : undefined
    
    await updateJobRunLog(jobRunId, {
      status: result.success ? 'completed' : 'failed',
      timings: detailedTimings,
      error_details: errorDetails,
      performance_metrics: performanceMetrics
    })
    
    console.log(`Logged job completion: ${jobRunId} - Success: ${result.success}`)
    
  } catch (error) {
    console.error('Error logging job completion:', error)
  }
}

/**
 * Creates a logging context for tracking execution
 */
export function createLoggingContext(
  jobId: string,
  functionName: string = 'content-automation',
  retryAttempt: number = 0
): LoggingContext {
  return {
    job_id: jobId,
    function_name: functionName,
    execution_id: `${jobId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    start_time: Date.now(),
    retry_attempt: retryAttempt
  }
}

/**
 * Logs function entry with context
 */
export function logFunctionEntry(context: LoggingContext, additionalInfo?: any): void {
  console.log(`[${context.execution_id}] Function entry: ${context.function_name}`, {
    job_id: context.job_id,
    retry_attempt: context.retry_attempt,
    start_time: new Date(context.start_time).toISOString(),
    ...additionalInfo
  })
}

/**
 * Logs function exit with timing and results
 */
export function logFunctionExit(
  context: LoggingContext, 
  success: boolean, 
  result?: any, 
  error?: string
): void {
  const endTime = Date.now()
  const duration = endTime - context.start_time
  
  console.log(`[${context.execution_id}] Function exit: ${context.function_name}`, {
    job_id: context.job_id,
    retry_attempt: context.retry_attempt,
    duration_ms: duration,
    success,
    result: success ? result : undefined,
    error: error || undefined
  })
}

/**
 * Logs performance metrics
 */
export async function logPerformanceMetrics(
  jobRunId: string,
  metrics: PerformanceMetrics
): Promise<void> {
  try {
    await updateJobRunLog(jobRunId, {
      performance_metrics: metrics
    })
    
    console.log(`Logged performance metrics for job run: ${jobRunId}`, metrics)
    
  } catch (error) {
    console.error('Error logging performance metrics:', error)
  }
}

/**
 * Gets execution statistics for monitoring
 */
export async function getExecutionStatistics(
  startDate?: Date,
  endDate?: Date
): Promise<{
  total_executions: number
  successful_executions: number
  failed_executions: number
  avg_duration_ms: number
  avg_openai_duration_ms: number
  avg_wordpress_duration_ms: number
  success_rate: number
  failure_rate: number
  performance_trends: any[]
}> {
  try {
    const start = startDate || new Date(Date.now() - 24 * 60 * 60 * 1000) // Default to last 24 hours
    const end = endDate || new Date()
    
    const { data, error } = await supabase.rpc('get_job_run_stats', {
      start_date: start.toISOString(),
      end_date: end.toISOString()
    })
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
    
    const stats = data?.[0] || {
      total_runs: 0,
      successful_runs: 0,
      failed_runs: 0,
      avg_duration_ms: 0
    }
    
    // Get detailed timing statistics
    const { data: timingData, error: timingError } = await supabase
      .from('job_runs')
      .select('function_duration_ms, openai_duration_ms, wordpress_duration_ms')
      .gte('execution_time', start.toISOString())
      .lte('execution_time', end.toISOString())
      .not('function_duration_ms', 'is', null)
    
    if (timingError) {
      console.error('Error getting timing statistics:', timingError)
    }
    
    const avgOpenAIDuration = timingData?.reduce((sum, run) => sum + (run.openai_duration_ms || 0), 0) / (timingData?.length || 1) || 0
    const avgWordPressDuration = timingData?.reduce((sum, run) => sum + (run.wordpress_duration_ms || 0), 0) / (timingData?.length || 1) || 0
    
    return {
      total_executions: stats.total_runs,
      successful_executions: stats.successful_runs,
      failed_executions: stats.failed_runs,
      avg_duration_ms: stats.avg_duration_ms,
      avg_openai_duration_ms: Math.round(avgOpenAIDuration),
      avg_wordpress_duration_ms: Math.round(avgWordPressDuration),
      success_rate: stats.success_rate || 0,
      failure_rate: stats.failure_rate || 0,
      performance_trends: [] // Could be enhanced with time-series data
    }
    
  } catch (error) {
    console.error('Error getting execution statistics:', error)
    throw error
  }
}

/**
 * Logs system health metrics
 */
export async function logSystemHealthMetrics(): Promise<void> {
  try {
    const stats = await getExecutionStatistics()
    
    // Log health metrics to console (could be extended to external monitoring)
    console.log('System Health Metrics:', {
      timestamp: new Date().toISOString(),
      total_executions: stats.total_executions,
      success_rate: stats.success_rate,
      avg_duration_ms: stats.avg_duration_ms,
      health_status: stats.success_rate > 80 ? 'healthy' : 'degraded'
    })
    
  } catch (error) {
    console.error('Error logging system health metrics:', error)
  }
}

/**
 * Cleans up old job run logs (for maintenance)
 */
export async function cleanupOldJobRuns(retentionDays: number = 30): Promise<number> {
  try {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
    
    const { data, error } = await supabase
      .from('job_runs')
      .delete()
      .lt('execution_time', cutoffDate.toISOString())
      .select('id')
    
    if (error) {
      throw new Error(`Database error: ${error.message}`)
    }
    
    const deletedCount = data?.length || 0
    console.log(`Cleaned up ${deletedCount} old job run logs (older than ${retentionDays} days)`)
    
    return deletedCount
    
  } catch (error) {
    console.error('Error cleaning up old job runs:', error)
    throw error
  }
}
