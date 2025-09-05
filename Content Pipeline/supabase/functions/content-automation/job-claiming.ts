// Job claiming logic with atomic database operations
// PRD Reference: Functional Requirements 1, 24, 32, 46, 63

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ContentJob, JobClaimResult, JobStatusUpdateResult } from './types.ts'
import { transitionJobToProcessing, transitionJobToCompleted, transitionJobToFailed } from './job-status-manager.ts'

// Initialize Supabase client with service role key
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

/**
 * Claims the next available job atomically using FOR UPDATE SKIP LOCKED
 * This prevents race conditions when multiple functions try to claim jobs simultaneously
 */
export async function claimNextJob(): Promise<JobClaimResult> {
  try {
    console.log('Attempting to claim next available job...')
    
    const { data, error } = await supabase.rpc('claim_next_job')
    
    if (error) {
      console.error('Error claiming job:', error)
      return { 
        success: false, 
        error: `Database error: ${error.message}` 
      }
    }
    
    if (!data || data.length === 0) {
      console.log('No pending jobs available for claiming')
      return { 
        success: false, 
        error: 'No pending jobs available' 
      }
    }
    
    const claimedJob = data[0] as ContentJob
    console.log(`Successfully claimed job: ${claimedJob.id} - Topic: ${claimedJob.topic}`)
    
    return { 
      success: true, 
      job: claimedJob 
    }
    
  } catch (error) {
    console.error('Exception claiming job:', error)
    return { 
      success: false, 
      error: `Unexpected error: ${error.message}` 
    }
  }
}

/**
 * Releases a claimed job back to pending status
 * Used when job processing fails and needs to be retried
 */
export async function releaseJob(
  jobId: string, 
  errorMessage?: string
): Promise<JobStatusUpdateResult> {
  try {
    console.log(`Releasing job ${jobId}${errorMessage ? ' with error: ' + errorMessage : ''}`)
    
    const { data, error } = await supabase.rpc('release_job', {
      p_job_id: jobId,
      p_error_message: errorMessage || null
    })
    
    if (error) {
      console.error('Error releasing job:', error)
      return { 
        success: false, 
        message: `Database error: ${error.message}` 
      }
    }
    
    if (!data) {
      return { 
        success: false, 
        message: 'Job not found or not in processing status' 
      }
    }
    
    console.log(`Successfully released job ${jobId}`)
    return { 
      success: true, 
      message: `Job ${jobId} released successfully` 
    }
    
  } catch (error) {
    console.error('Exception releasing job:', error)
    return { 
      success: false, 
      message: `Unexpected error: ${error.message}` 
    }
  }
}

/**
 * Completes a job successfully with generated content and WordPress post ID
 */
export async function completeJob(
  jobId: string,
  generatedTitle: string,
  generatedContent: string,
  wordpressPostId: number
): Promise<JobStatusUpdateResult> {
  try {
    console.log(`Completing job ${jobId} with WordPress post ID: ${wordpressPostId}`)
    
    // Use status manager for status transition
    const statusResult = await transitionJobToCompleted(
      jobId,
      generatedTitle,
      generatedContent,
      wordpressPostId,
      'Content generated and posted successfully'
    )
    
    if (!statusResult.success) {
      console.error('Error transitioning job to completed status:', statusResult.error)
      return { 
        success: false, 
        message: `Status transition error: ${statusResult.error}` 
      }
    }
    
    // Also call the RPC for backward compatibility
    const { data, error } = await supabase.rpc('complete_job', {
      p_job_id: jobId,
      p_generated_title: generatedTitle,
      p_generated_content: generatedContent,
      p_wordpress_post_id: wordpressPostId
    })
    
    if (error) {
      console.error('Error in RPC complete_job:', error)
      // Don't fail the operation if RPC fails but status manager succeeded
    }
    
    if (!data && error) {
      return { 
        success: false, 
        message: 'Job not found or not in processing status' 
      }
    }
    
    console.log(`Successfully completed job ${jobId}`)
    return { 
      success: true, 
      message: `Job ${jobId} completed successfully` 
    }
    
  } catch (error) {
    console.error('Exception completing job:', error)
    return { 
      success: false, 
      message: `Unexpected error: ${error.message}` 
    }
  }
}

/**
 * Marks a job as failed after maximum retry attempts
 */
export async function failJob(
  jobId: string,
  errorMessage: string
): Promise<JobStatusUpdateResult> {
  try {
    console.log(`Failing job ${jobId} with error: ${errorMessage}`)
    
    // Use status manager for status transition
    const statusResult = await transitionJobToFailed(
      jobId,
      errorMessage,
      'Job processing failed'
    )
    
    if (!statusResult.success) {
      console.error('Error transitioning job to failed status:', statusResult.error)
      return { 
        success: false, 
        message: `Status transition error: ${statusResult.error}` 
      }
    }
    
    // Also call the RPC for backward compatibility
    const { data, error } = await supabase.rpc('fail_job', {
      p_job_id: jobId,
      p_error_message: errorMessage
    })
    
    if (error) {
      console.error('Error in RPC fail_job:', error)
      // Don't fail the operation if RPC fails but status manager succeeded
    }
    
    if (!data && error) {
      return { 
        success: false, 
        message: 'Job not found or not in processing status' 
      }
    }
    
    console.log(`Successfully marked job ${jobId} as failed`)
    return { 
      success: true, 
      message: `Job ${jobId} marked as failed` 
    }
    
  } catch (error) {
    console.error('Exception failing job:', error)
    return { 
      success: false, 
      message: `Unexpected error: ${error.message}` 
    }
  }
}

/**
 * Updates job status with enhanced validation and atomic transitions
 */
export async function updateJobStatus(
  jobId: string,
  newStatus: ContentJob['status'],
  options?: {
    errorMessage?: string
    generatedTitle?: string
    generatedContent?: string
    wordpressPostId?: number
  }
): Promise<JobStatusUpdateResult> {
  try {
    console.log(`Updating job ${jobId} status to: ${newStatus}`)
    
    const { data, error } = await supabase.rpc('update_job_status', {
      p_job_id: jobId,
      p_new_status: newStatus,
      p_error_message: options?.errorMessage || null,
      p_generated_title: options?.generatedTitle || null,
      p_generated_content: options?.generatedContent || null,
      p_wordpress_post_id: options?.wordpressPostId || null
    })
    
    if (error) {
      console.error('Error updating job status:', error)
      return { 
        success: false, 
        message: `Database error: ${error.message}` 
      }
    }
    
    if (!data || data.length === 0) {
      return { 
        success: false, 
        message: 'No data returned from status update' 
      }
    }
    
    const result = data[0]
    console.log(`Job status update result: ${result.message}`)
    
    return { 
      success: result.success, 
      old_status: result.old_status,
      new_status: result.new_status,
      message: result.message 
    }
    
  } catch (error) {
    console.error('Exception updating job status:', error)
    return { 
      success: false, 
      message: `Unexpected error: ${error.message}` 
    }
  }
}

/**
 * Gets job statistics for monitoring and alerting
 */
export async function getJobStatistics() {
  try {
    const { data, error } = await supabase.rpc('get_job_stats')
    
    if (error) {
      console.error('Error getting job statistics:', error)
      throw new Error(`Database error: ${error.message}`)
    }
    
    return data?.[0] || {
      total_jobs: 0,
      pending_jobs: 0,
      processing_jobs: 0,
      completed_jobs: 0,
      error_jobs: 0,
      avg_retry_count: 0,
      oldest_pending_job: null
    }
    
  } catch (error) {
    console.error('Exception getting job statistics:', error)
    throw error
  }
}

/**
 * Validates that a job can be claimed (not already processing, within retry limits)
 */
export async function validateJobForClaiming(jobId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('content_jobs')
      .select('id, status, retry_count, claimed_at')
      .eq('id', jobId)
      .single()
    
    if (error || !data) {
      console.error('Error validating job for claiming:', error)
      return false
    }
    
    // Check if job is in valid state for claiming
    if (data.status !== 'pending') {
      console.log(`Job ${jobId} is not pending (status: ${data.status})`)
      return false
    }
    
    // Check retry count
    if (data.retry_count >= 3) {
      console.log(`Job ${jobId} has exceeded maximum retry count (${data.retry_count})`)
      return false
    }
    
    // Check if job is not already claimed
    if (data.claimed_at) {
      console.log(`Job ${jobId} is already claimed at ${data.claimed_at}`)
      return false
    }
    
    return true
    
  } catch (error) {
    console.error('Exception validating job for claiming:', error)
    return false
  }
}

/**
 * Checks for stale processing jobs (claimed but not updated for too long)
 */
export async function findStaleProcessingJobs(staleThresholdMinutes: number = 60) {
  try {
    const staleThreshold = new Date(Date.now() - staleThresholdMinutes * 60 * 1000)
    
    const { data, error } = await supabase
      .from('content_jobs')
      .select('id, topic, claimed_at, retry_count')
      .eq('status', 'processing')
      .lt('claimed_at', staleThreshold.toISOString())
    
    if (error) {
      console.error('Error finding stale processing jobs:', error)
      throw new Error(`Database error: ${error.message}`)
    }
    
    return data || []
    
  } catch (error) {
    console.error('Exception finding stale processing jobs:', error)
    throw error
  }
}

/**
 * Resets stale processing jobs back to pending status
 */
export async function resetStaleProcessingJobs(staleThresholdMinutes: number = 60): Promise<number> {
  try {
    const staleJobs = await findStaleProcessingJobs(staleThresholdMinutes)
    
    if (staleJobs.length === 0) {
      console.log('No stale processing jobs found')
      return 0
    }
    
    console.log(`Found ${staleJobs.length} stale processing jobs, resetting to pending...`)
    
    const jobIds = staleJobs.map(job => job.id)
    
    const { data, error } = await supabase.rpc('bulk_update_job_status', {
      p_job_ids: jobIds,
      p_new_status: 'pending',
      p_reason: `Reset stale processing job (claimed >${staleThresholdMinutes} minutes ago)`
    })
    
    if (error) {
      console.error('Error resetting stale processing jobs:', error)
      throw new Error(`Database error: ${error.message}`)
    }
    
    const result = data?.[0]
    console.log(`Reset ${result?.updated_count || 0} stale processing jobs`)
    
    return result?.updated_count || 0
    
  } catch (error) {
    console.error('Exception resetting stale processing jobs:', error)
    throw error
  }
}
