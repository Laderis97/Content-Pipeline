// Retry count increment and last_error storage logic
// PRD Reference: Error Handling & Monitoring (D1-D3), Database Schema (1.1-1.7)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ContentJob, JobRun } from './types.ts'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Retry tracking configuration
const RETRY_CONFIG = {
  max_retries: 3,
  retry_delay_ms: 1000,
  error_retention_days: 30
}

interface RetryAttempt {
  attempt_number: number
  timestamp: number
  error_type: string
  error_message: string
  error_details?: any
  retryable: boolean
  next_retry_at?: number
}

interface RetryTrackingResult {
  success: boolean
  job_id: string
  retry_count: number
  last_error: string | null
  next_retry_at: number | null
  max_retries_reached: boolean
  error?: string
}

interface RetryHistory {
  job_id: string
  total_attempts: number
  successful_attempts: number
  failed_attempts: number
  last_success_at: number | null
  last_failure_at: number | null
  retry_attempts: RetryAttempt[]
}

/**
 * Retry tracking and management system
 */
export class RetryTracker {
  private jobId: string
  private currentRetryCount: number = 0
  private retryAttempts: RetryAttempt[] = []

  constructor(jobId: string) {
    this.jobId = jobId
  }

  /**
   * Records a retry attempt and updates job retry count
   */
  async recordRetryAttempt(
    error: any,
    retryable: boolean = true
  ): Promise<RetryTrackingResult> {
    try {
      console.log(`[RetryTracker] Recording retry attempt for job ${this.jobId}`)
      
      // Increment retry count
      this.currentRetryCount++
      
      // Create retry attempt record
      const retryAttempt: RetryAttempt = {
        attempt_number: this.currentRetryCount,
        timestamp: Date.now(),
        error_type: this.classifyError(error),
        error_message: this.sanitizeErrorMessage(error.message || 'Unknown error'),
        error_details: this.sanitizeErrorDetails(error),
        retryable: retryable,
        next_retry_at: retryable && this.currentRetryCount < RETRY_CONFIG.max_retries 
          ? Date.now() + this.calculateRetryDelay(this.currentRetryCount)
          : undefined
      }
      
      this.retryAttempts.push(retryAttempt)
      
      // Update job in database
      const updateResult = await this.updateJobRetryInfo(retryAttempt)
      
      if (!updateResult.success) {
        throw new Error(`Failed to update job retry info: ${updateResult.error}`)
      }
      
      // Check if max retries reached
      const maxRetriesReached = this.currentRetryCount >= RETRY_CONFIG.max_retries
      
      console.log(`[RetryTracker] Retry attempt ${this.currentRetryCount}/${RETRY_CONFIG.max_retries} recorded for job ${this.jobId}`)
      
      return {
        success: true,
        job_id: this.jobId,
        retry_count: this.currentRetryCount,
        last_error: retryAttempt.error_message,
        next_retry_at: retryAttempt.next_retry_at || null,
        max_retries_reached: maxRetriesReached
      }
      
    } catch (error) {
      console.error(`[RetryTracker] Failed to record retry attempt for job ${this.jobId}:`, error)
      
      return {
        success: false,
        job_id: this.jobId,
        retry_count: this.currentRetryCount,
        last_error: error.message,
        next_retry_at: null,
        max_retries_reached: false,
        error: error.message
      }
    }
  }

  /**
   * Records a successful attempt and resets retry count
   */
  async recordSuccess(): Promise<RetryTrackingResult> {
    try {
      console.log(`[RetryTracker] Recording success for job ${this.jobId}`)
      
      // Reset retry count and clear last error
      const updateResult = await this.resetJobRetryInfo()
      
      if (!updateResult.success) {
        throw new Error(`Failed to reset job retry info: ${updateResult.error}`)
      }
      
      console.log(`[RetryTracker] Success recorded for job ${this.jobId}, retry count reset`)
      
      return {
        success: true,
        job_id: this.jobId,
        retry_count: 0,
        last_error: null,
        next_retry_at: null,
        max_retries_reached: false
      }
      
    } catch (error) {
      console.error(`[RetryTracker] Failed to record success for job ${this.jobId}:`, error)
      
      return {
        success: false,
        job_id: this.jobId,
        retry_count: this.currentRetryCount,
        last_error: error.message,
        next_retry_at: null,
        max_retries_reached: false,
        error: error.message
      }
    }
  }

  /**
   * Gets retry history for a job
   */
  async getRetryHistory(): Promise<RetryHistory | null> {
    try {
      // Get job retry information
      const { data: job, error: jobError } = await supabase
        .from('content_jobs')
        .select('retry_count, last_error, updated_at')
        .eq('id', this.jobId)
        .single()
      
      if (jobError) {
        console.error(`[RetryTracker] Failed to get job retry info:`, jobError)
        return null
      }
      
      // Get job run history
      const { data: jobRuns, error: runsError } = await supabase
        .from('job_runs')
        .select('*')
        .eq('job_id', this.jobId)
        .order('created_at', { ascending: false })
      
      if (runsError) {
        console.error(`[RetryTracker] Failed to get job runs:`, runsError)
        return null
      }
      
      // Process retry attempts from job runs
      const retryAttempts: RetryAttempt[] = jobRuns
        .filter(run => run.status === 'failed' || run.status === 'retrying')
        .map((run, index) => ({
          attempt_number: index + 1,
          timestamp: new Date(run.created_at).getTime(),
          error_type: this.extractErrorType(run.error_details),
          error_message: run.error_details?.message || 'Unknown error',
          error_details: run.error_details,
          retryable: run.status === 'retrying',
          next_retry_at: run.status === 'retrying' ? new Date(run.updated_at).getTime() + RETRY_CONFIG.retry_delay_ms : undefined
        }))
      
      const successfulAttempts = jobRuns.filter(run => run.status === 'completed').length
      const failedAttempts = jobRuns.filter(run => run.status === 'failed').length
      
      const lastSuccessRun = jobRuns.find(run => run.status === 'completed')
      const lastFailureRun = jobRuns.find(run => run.status === 'failed')
      
      return {
        job_id: this.jobId,
        total_attempts: jobRuns.length,
        successful_attempts: successfulAttempts,
        failed_attempts: failedAttempts,
        last_success_at: lastSuccessRun ? new Date(lastSuccessRun.created_at).getTime() : null,
        last_failure_at: lastFailureRun ? new Date(lastFailureRun.created_at).getTime() : null,
        retry_attempts: retryAttempts
      }
      
    } catch (error) {
      console.error(`[RetryTracker] Failed to get retry history for job ${this.jobId}:`, error)
      return null
    }
  }

  /**
   * Checks if job can be retried
   */
  async canRetry(): Promise<{ can_retry: boolean; reason?: string; next_retry_at?: number }> {
    try {
      // Get current job status
      const { data: job, error } = await supabase
        .from('content_jobs')
        .select('retry_count, status, last_error')
        .eq('id', this.jobId)
        .single()
      
      if (error) {
        return { can_retry: false, reason: `Failed to get job status: ${error.message}` }
      }
      
      // Check if max retries reached
      if (job.retry_count >= RETRY_CONFIG.max_retries) {
        return { can_retry: false, reason: 'Maximum retry attempts reached' }
      }
      
      // Check if job is in retryable state
      if (!['pending', 'failed'].includes(job.status)) {
        return { can_retry: false, reason: `Job is in non-retryable state: ${job.status}` }
      }
      
      // Check if last error is retryable
      const lastError = job.last_error
      if (lastError && !this.isRetryableError(lastError)) {
        return { can_retry: false, reason: 'Last error is not retryable' }
      }
      
      return { can_retry: true }
      
    } catch (error) {
      console.error(`[RetryTracker] Failed to check retry eligibility for job ${this.jobId}:`, error)
      return { can_retry: false, reason: `Error checking retry eligibility: ${error.message}` }
    }
  }

  /**
   * Updates job retry information in database
   */
  private async updateJobRetryInfo(retryAttempt: RetryAttempt): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData = {
        retry_count: this.currentRetryCount,
        last_error: retryAttempt.error_message,
        updated_at: new Date().toISOString()
      }
      
      // If max retries reached, mark as failed
      if (this.currentRetryCount >= RETRY_CONFIG.max_retries) {
        updateData.status = 'failed'
      }
      
      const { error } = await supabase
        .from('content_jobs')
        .update(updateData)
        .eq('id', this.jobId)
      
      if (error) {
        throw new Error(`Database update failed: ${error.message}`)
      }
      
      return { success: true }
      
    } catch (error) {
      console.error(`[RetryTracker] Failed to update job retry info:`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Resets job retry information in database
   */
  private async resetJobRetryInfo(): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('content_jobs')
        .update({
          retry_count: 0,
          last_error: null,
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', this.jobId)
      
      if (error) {
        throw new Error(`Database update failed: ${error.message}`)
      }
      
      return { success: true }
      
    } catch (error) {
      console.error(`[RetryTracker] Failed to reset job retry info:`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Classifies error type
   */
  private classifyError(error: any): string {
    const message = (error.message || '').toLowerCase()
    const status = error.status || error.statusCode || 0
    
    if (status === 429 || message.includes('rate limit')) return 'rate_limit'
    if (status === 401 || message.includes('unauthorized')) return 'authentication'
    if (status === 403 || message.includes('forbidden')) return 'authorization'
    if (status >= 500) return 'server_error'
    if (status >= 400) return 'client_error'
    if (message.includes('timeout') || message.includes('timed out')) return 'timeout'
    if (message.includes('network') || message.includes('connection')) return 'network'
    if (message.includes('validation') || message.includes('invalid')) return 'validation'
    
    return 'unknown'
  }

  /**
   * Sanitizes error message for storage
   */
  private sanitizeErrorMessage(message: string): string {
    // Remove sensitive information and limit length
    let sanitized = message
      .replace(/password[=:]\s*\S+/gi, 'password=***')
      .replace(/token[=:]\s*\S+/gi, 'token=***')
      .replace(/key[=:]\s*\S+/gi, 'key=***')
      .replace(/secret[=:]\s*\S+/gi, 'secret=***')
      .substring(0, 1000) // Limit to 1000 characters
    
    return sanitized
  }

  /**
   * Sanitizes error details for storage
   */
  private sanitizeErrorDetails(error: any): any {
    if (!error) return null
    
    const details = {
      type: this.classifyError(error),
      status: error.status || error.statusCode,
      code: error.code,
      timestamp: new Date().toISOString()
    }
    
    // Add stack trace if available (truncated)
    if (error.stack) {
      details.stack = error.stack.substring(0, 2000)
    }
    
    return details
  }

  /**
   * Calculates retry delay based on attempt number
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = RETRY_CONFIG.retry_delay_ms
    const exponentialDelay = baseDelay * Math.pow(2, attempt - 1)
    const maxDelay = 30000 // 30 seconds
    return Math.min(exponentialDelay, maxDelay)
  }

  /**
   * Extracts error type from job run error details
   */
  private extractErrorType(errorDetails: any): string {
    if (!errorDetails) return 'unknown'
    return errorDetails.type || 'unknown'
  }

  /**
   * Checks if error message indicates retryable error
   */
  private isRetryableError(errorMessage: string): boolean {
    const retryablePatterns = [
      'rate limit',
      'timeout',
      'network',
      'connection',
      'server error',
      'temporary',
      'unavailable'
    ]
    
    const nonRetryablePatterns = [
      'authentication',
      'authorization',
      'forbidden',
      'unauthorized',
      'validation',
      'invalid',
      'not found',
      'bad request'
    ]
    
    const message = errorMessage.toLowerCase()
    
    // Check for non-retryable patterns first
    if (nonRetryablePatterns.some(pattern => message.includes(pattern))) {
      return false
    }
    
    // Check for retryable patterns
    return retryablePatterns.some(pattern => message.includes(pattern))
  }
}

/**
 * Creates a retry tracker for a job
 */
export function createRetryTracker(jobId: string): RetryTracker {
  return new RetryTracker(jobId)
}

/**
 * Records a retry attempt for a job
 */
export async function recordRetryAttempt(
  jobId: string,
  error: any,
  retryable: boolean = true
): Promise<RetryTrackingResult> {
  const tracker = createRetryTracker(jobId)
  return await tracker.recordRetryAttempt(error, retryable)
}

/**
 * Records a successful attempt for a job
 */
export async function recordSuccess(jobId: string): Promise<RetryTrackingResult> {
  const tracker = createRetryTracker(jobId)
  return await tracker.recordSuccess()
}

/**
 * Gets retry history for a job
 */
export async function getRetryHistory(jobId: string): Promise<RetryHistory | null> {
  const tracker = createRetryTracker(jobId)
  return await tracker.getRetryHistory()
}

/**
 * Checks if a job can be retried
 */
export async function canRetryJob(jobId: string): Promise<{ can_retry: boolean; reason?: string; next_retry_at?: number }> {
  const tracker = createRetryTracker(jobId)
  return await tracker.canRetry()
}

/**
 * Gets retry statistics for multiple jobs
 */
export async function getRetryStatistics(jobIds: string[]): Promise<{
  total_jobs: number
  retryable_jobs: number
  max_retries_reached: number
  average_retry_count: number
  retry_success_rate: number
}> {
  try {
    const { data: jobs, error } = await supabase
      .from('content_jobs')
      .select('id, retry_count, status, last_error')
      .in('id', jobIds)
    
    if (error) {
      throw new Error(`Failed to get retry statistics: ${error.message}`)
    }
    
    const totalJobs = jobs.length
    const retryableJobs = jobs.filter(job => 
      job.retry_count < RETRY_CONFIG.max_retries && 
      ['pending', 'failed'].includes(job.status)
    ).length
    
    const maxRetriesReached = jobs.filter(job => job.retry_count >= RETRY_CONFIG.max_retries).length
    const averageRetryCount = totalJobs > 0 ? jobs.reduce((sum, job) => sum + job.retry_count, 0) / totalJobs : 0
    
    const successfulJobs = jobs.filter(job => job.status === 'completed').length
    const retrySuccessRate = totalJobs > 0 ? (successfulJobs / totalJobs) * 100 : 0
    
    return {
      total_jobs: totalJobs,
      retryable_jobs: retryableJobs,
      max_retries_reached: maxRetriesReached,
      average_retry_count: Math.round(averageRetryCount * 100) / 100,
      retry_success_rate: Math.round(retrySuccessRate * 100) / 100
    }
    
  } catch (error) {
    console.error('[RetryTracker] Failed to get retry statistics:', error)
    throw error
  }
}

/**
 * Cleans up old retry data
 */
export async function cleanupRetryData(): Promise<{ success: boolean; cleaned_count: number; error?: string }> {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - RETRY_CONFIG.error_retention_days)
    
    // Clean up old job runs with failed status
    const { data: deletedRuns, error: runsError } = await supabase
      .from('job_runs')
      .delete()
      .eq('status', 'failed')
      .lt('created_at', cutoffDate.toISOString())
      .select('id')
    
    if (runsError) {
      throw new Error(`Failed to cleanup job runs: ${runsError.message}`)
    }
    
    const cleanedCount = deletedRuns?.length || 0
    
    console.log(`[RetryTracker] Cleaned up ${cleanedCount} old retry records`)
    
    return { success: true, cleaned_count: cleanedCount }
    
  } catch (error) {
    console.error('[RetryTracker] Failed to cleanup retry data:', error)
    return { success: false, cleaned_count: 0, error: error.message }
  }
}
