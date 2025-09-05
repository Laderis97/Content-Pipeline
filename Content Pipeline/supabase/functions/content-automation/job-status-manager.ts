// Job status management (pending → processing → completed/error)
// PRD Reference: Error Handling & Monitoring (D1-D3), Database Schema (1.1-1.7)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ContentJob } from './types.ts'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Job status definitions
export const JOB_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
} as const

export type JobStatus = typeof JOB_STATUS[keyof typeof JOB_STATUS]

// Status transition rules
const STATUS_TRANSITIONS = {
  [JOB_STATUS.PENDING]: [JOB_STATUS.PROCESSING, JOB_STATUS.CANCELLED],
  [JOB_STATUS.PROCESSING]: [JOB_STATUS.COMPLETED, JOB_STATUS.FAILED, JOB_STATUS.CANCELLED],
  [JOB_STATUS.COMPLETED]: [], // Terminal state
  [JOB_STATUS.FAILED]: [JOB_STATUS.PENDING], // Can be retried
  [JOB_STATUS.CANCELLED]: [] // Terminal state
}

// Status validation rules
const STATUS_VALIDATION = {
  [JOB_STATUS.PENDING]: {
    required_fields: ['topic'],
    optional_fields: ['prompt_template', 'model', 'retry_count', 'tags', 'categories']
  },
  [JOB_STATUS.PROCESSING]: {
    required_fields: ['topic', 'claimed_at'],
    optional_fields: ['prompt_template', 'model', 'retry_count', 'tags', 'categories']
  },
  [JOB_STATUS.COMPLETED]: {
    required_fields: ['topic', 'generated_title', 'generated_content', 'wordpress_post_id', 'completed_at'],
    optional_fields: ['prompt_template', 'model', 'retry_count', 'tags', 'categories', 'claimed_at']
  },
  [JOB_STATUS.FAILED]: {
    required_fields: ['topic', 'last_error'],
    optional_fields: ['prompt_template', 'model', 'retry_count', 'tags', 'categories', 'claimed_at']
  },
  [JOB_STATUS.CANCELLED]: {
    required_fields: ['topic'],
    optional_fields: ['prompt_template', 'model', 'retry_count', 'tags', 'categories', 'claimed_at']
  }
}

interface StatusTransition {
  from_status: JobStatus
  to_status: JobStatus
  timestamp: number
  reason?: string
  metadata?: any
}

interface StatusValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

interface JobStatusUpdate {
  job_id: string
  old_status: JobStatus
  new_status: JobStatus
  timestamp: number
  reason?: string
  metadata?: any
}

/**
 * Job status management system
 */
export class JobStatusManager {
  private jobId: string
  private currentStatus: JobStatus | null = null
  private statusHistory: StatusTransition[] = []

  constructor(jobId: string) {
    this.jobId = jobId
  }

  /**
   * Transitions job to a new status with validation
   */
  async transitionTo(
    newStatus: JobStatus,
    reason?: string,
    metadata?: any
  ): Promise<{ success: boolean; error?: string; validation?: StatusValidationResult }> {
    try {
      console.log(`[JobStatusManager] Transitioning job ${this.jobId} to status: ${newStatus}`)
      
      // Get current job status
      const currentJob = await this.getCurrentJob()
      if (!currentJob) {
        return { success: false, error: 'Job not found' }
      }
      
      const oldStatus = currentJob.status as JobStatus
      this.currentStatus = oldStatus
      
      // Validate status transition
      const transitionValid = this.validateStatusTransition(oldStatus, newStatus)
      if (!transitionValid.valid) {
        return { 
          success: false, 
          error: `Invalid status transition: ${transitionValid.errors.join(', ')}`,
          validation: transitionValid
        }
      }
      
      // Validate new status requirements
      const statusValidation = await this.validateStatusRequirements(newStatus, currentJob)
      if (!statusValidation.valid) {
        return { 
          success: false, 
          error: `Status validation failed: ${statusValidation.errors.join(', ')}`,
          validation: statusValidation
        }
      }
      
      // Prepare update data
      const updateData = this.prepareStatusUpdateData(newStatus, reason, metadata)
      
      // Update job status in database
      const updateResult = await this.updateJobStatus(updateData)
      if (!updateResult.success) {
        return { success: false, error: updateResult.error }
      }
      
      // Record status transition
      const transition: StatusTransition = {
        from_status: oldStatus,
        to_status: newStatus,
        timestamp: Date.now(),
        reason: reason,
        metadata: metadata
      }
      
      this.statusHistory.push(transition)
      this.currentStatus = newStatus
      
      console.log(`[JobStatusManager] Successfully transitioned job ${this.jobId} from ${oldStatus} to ${newStatus}`)
      
      return { success: true }
      
    } catch (error) {
      console.error(`[JobStatusManager] Failed to transition job ${this.jobId} to ${newStatus}:`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Transitions job to pending status (for retries)
   */
  async transitionToPending(reason: string = 'Retry requested'): Promise<{ success: boolean; error?: string }> {
    return await this.transitionTo(JOB_STATUS.PENDING, reason, { retry_initiated: true })
  }

  /**
   * Transitions job to processing status
   */
  async transitionToProcessing(claimedAt: Date = new Date()): Promise<{ success: boolean; error?: string }> {
    return await this.transitionTo(JOB_STATUS.PROCESSING, 'Job claimed for processing', { 
      claimed_at: claimedAt.toISOString() 
    })
  }

  /**
   * Transitions job to completed status
   */
  async transitionToCompleted(
    generatedTitle: string,
    generatedContent: string,
    wordpressPostId: number,
    reason: string = 'Content generated and posted successfully'
  ): Promise<{ success: boolean; error?: string }> {
    return await this.transitionTo(JOB_STATUS.COMPLETED, reason, {
      generated_title: generatedTitle,
      generated_content: generatedContent,
      wordpress_post_id: wordpressPostId,
      completed_at: new Date().toISOString()
    })
  }

  /**
   * Transitions job to failed status
   */
  async transitionToFailed(
    errorMessage: string,
    reason: string = 'Job processing failed'
  ): Promise<{ success: boolean; error?: string }> {
    return await this.transitionTo(JOB_STATUS.FAILED, reason, {
      last_error: errorMessage,
      failed_at: new Date().toISOString()
    })
  }

  /**
   * Transitions job to cancelled status
   */
  async transitionToCancelled(reason: string = 'Job cancelled'): Promise<{ success: boolean; error?: string }> {
    return await this.transitionTo(JOB_STATUS.CANCELLED, reason, {
      cancelled_at: new Date().toISOString()
    })
  }

  /**
   * Gets current job status
   */
  async getCurrentStatus(): Promise<JobStatus | null> {
    try {
      const job = await this.getCurrentJob()
      return job ? (job.status as JobStatus) : null
    } catch (error) {
      console.error(`[JobStatusManager] Failed to get current status for job ${this.jobId}:`, error)
      return null
    }
  }

  /**
   * Gets job status history
   */
  async getStatusHistory(): Promise<StatusTransition[]> {
    try {
      // Get status history from job_runs table
      const { data: jobRuns, error } = await supabase
        .from('job_runs')
        .select('status, created_at, updated_at, error_details')
        .eq('job_id', this.jobId)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error(`[JobStatusManager] Failed to get status history:`, error)
        return []
      }
      
      // Convert job runs to status transitions
      const transitions: StatusTransition[] = jobRuns.map((run, index) => ({
        from_status: index === 0 ? JOB_STATUS.PENDING : (jobRuns[index - 1].status as JobStatus),
        to_status: run.status as JobStatus,
        timestamp: new Date(run.created_at).getTime(),
        reason: run.error_details?.message || 'Status change',
        metadata: run.error_details
      }))
      
      return transitions
      
    } catch (error) {
      console.error(`[JobStatusManager] Failed to get status history for job ${this.jobId}:`, error)
      return []
    }
  }

  /**
   * Validates if a status transition is allowed
   */
  private validateStatusTransition(fromStatus: JobStatus, toStatus: JobStatus): StatusValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check if transition is allowed
    const allowedTransitions = STATUS_TRANSITIONS[fromStatus]
    if (!allowedTransitions.includes(toStatus)) {
      errors.push(`Transition from ${fromStatus} to ${toStatus} is not allowed`)
    }
    
    // Check for terminal state transitions
    if (fromStatus === JOB_STATUS.COMPLETED && toStatus !== JOB_STATUS.COMPLETED) {
      errors.push('Cannot transition from completed status')
    }
    
    if (fromStatus === JOB_STATUS.CANCELLED && toStatus !== JOB_STATUS.CANCELLED) {
      errors.push('Cannot transition from cancelled status')
    }
    
    // Check for invalid transitions
    if (fromStatus === toStatus) {
      warnings.push(`Job is already in ${toStatus} status`)
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Validates status requirements
   */
  private async validateStatusRequirements(
    status: JobStatus,
    job: any
  ): Promise<StatusValidationResult> {
    const errors: string[] = []
    const warnings: string[] = []
    
    const requirements = STATUS_VALIDATION[status]
    
    // Check required fields
    for (const field of requirements.required_fields) {
      if (!job[field] || (typeof job[field] === 'string' && job[field].trim() === '')) {
        errors.push(`Required field '${field}' is missing or empty for status ${status}`)
      }
    }
    
    // Check field validity based on status
    if (status === JOB_STATUS.COMPLETED) {
      if (job.wordpress_post_id && typeof job.wordpress_post_id !== 'number') {
        errors.push('wordpress_post_id must be a number for completed status')
      }
      
      if (job.generated_title && job.generated_title.length < 5) {
        warnings.push('generated_title seems too short')
      }
      
      if (job.generated_content && job.generated_content.length < 100) {
        warnings.push('generated_content seems too short')
      }
    }
    
    if (status === JOB_STATUS.FAILED) {
      if (job.last_error && job.last_error.length > 1000) {
        warnings.push('last_error is very long, consider truncating')
      }
    }
    
    if (status === JOB_STATUS.PROCESSING) {
      if (job.claimed_at && isNaN(new Date(job.claimed_at).getTime())) {
        errors.push('claimed_at must be a valid date for processing status')
      }
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }

  /**
   * Prepares update data for status transition
   */
  private prepareStatusUpdateData(
    newStatus: JobStatus,
    reason?: string,
    metadata?: any
  ): any {
    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }
    
    // Add status-specific fields
    if (newStatus === JOB_STATUS.PROCESSING && metadata?.claimed_at) {
      updateData.claimed_at = metadata.claimed_at
    }
    
    if (newStatus === JOB_STATUS.COMPLETED) {
      if (metadata?.generated_title) updateData.generated_title = metadata.generated_title
      if (metadata?.generated_content) updateData.generated_content = metadata.generated_content
      if (metadata?.wordpress_post_id) updateData.wordpress_post_id = metadata.wordpress_post_id
      if (metadata?.completed_at) updateData.completed_at = metadata.completed_at
    }
    
    if (newStatus === JOB_STATUS.FAILED) {
      if (metadata?.last_error) updateData.last_error = metadata.last_error
      if (metadata?.failed_at) updateData.failed_at = metadata.failed_at
    }
    
    if (newStatus === JOB_STATUS.CANCELLED && metadata?.cancelled_at) {
      updateData.cancelled_at = metadata.cancelled_at
    }
    
    return updateData
  }

  /**
   * Updates job status in database
   */
  private async updateJobStatus(updateData: any): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('content_jobs')
        .update(updateData)
        .eq('id', this.jobId)
      
      if (error) {
        throw new Error(`Database update failed: ${error.message}`)
      }
      
      return { success: true }
      
    } catch (error) {
      console.error(`[JobStatusManager] Failed to update job status:`, error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Gets current job data
   */
  private async getCurrentJob(): Promise<any | null> {
    try {
      const { data: job, error } = await supabase
        .from('content_jobs')
        .select('*')
        .eq('id', this.jobId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return null // Job not found
        }
        throw new Error(`Failed to get job: ${error.message}`)
      }
      
      return job
      
    } catch (error) {
      console.error(`[JobStatusManager] Failed to get current job:`, error)
      throw error
    }
  }
}

/**
 * Creates a job status manager for a job
 */
export function createJobStatusManager(jobId: string): JobStatusManager {
  return new JobStatusManager(jobId)
}

/**
 * Transitions a job to pending status
 */
export async function transitionJobToPending(
  jobId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const manager = createJobStatusManager(jobId)
  return await manager.transitionToPending(reason)
}

/**
 * Transitions a job to processing status
 */
export async function transitionJobToProcessing(
  jobId: string,
  claimedAt?: Date
): Promise<{ success: boolean; error?: string }> {
  const manager = createJobStatusManager(jobId)
  return await manager.transitionToProcessing(claimedAt)
}

/**
 * Transitions a job to completed status
 */
export async function transitionJobToCompleted(
  jobId: string,
  generatedTitle: string,
  generatedContent: string,
  wordpressPostId: number,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const manager = createJobStatusManager(jobId)
  return await manager.transitionToCompleted(generatedTitle, generatedContent, wordpressPostId, reason)
}

/**
 * Transitions a job to failed status
 */
export async function transitionJobToFailed(
  jobId: string,
  errorMessage: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const manager = createJobStatusManager(jobId)
  return await manager.transitionToFailed(errorMessage, reason)
}

/**
 * Transitions a job to cancelled status
 */
export async function transitionJobToCancelled(
  jobId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const manager = createJobStatusManager(jobId)
  return await manager.transitionToCancelled(reason)
}

/**
 * Gets current job status
 */
export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  const manager = createJobStatusManager(jobId)
  return await manager.getCurrentStatus()
}

/**
 * Gets job status history
 */
export async function getJobStatusHistory(jobId: string): Promise<StatusTransition[]> {
  const manager = createJobStatusManager(jobId)
  return await manager.getStatusHistory()
}

/**
 * Validates job status consistency
 */
export async function validateJobStatusConsistency(jobId: string): Promise<{
  consistent: boolean
  issues: string[]
  recommendations: string[]
}> {
  try {
    const manager = createJobStatusManager(jobId)
    const currentStatus = await manager.getCurrentStatus()
    const statusHistory = await manager.getStatusHistory()
    
    const issues: string[] = []
    const recommendations: string[] = []
    
    if (!currentStatus) {
      issues.push('Job not found')
      return { consistent: false, issues, recommendations }
    }
    
    // Check for invalid status transitions in history
    for (let i = 1; i < statusHistory.length; i++) {
      const prevTransition = statusHistory[i - 1]
      const currentTransition = statusHistory[i]
      
      if (prevTransition.to_status !== currentTransition.from_status) {
        issues.push(`Status history inconsistency: ${prevTransition.to_status} != ${currentTransition.from_status}`)
      }
    }
    
    // Check for terminal state violations
    if (currentStatus === JOB_STATUS.COMPLETED || currentStatus === JOB_STATUS.CANCELLED) {
      const lastTransition = statusHistory[statusHistory.length - 1]
      if (lastTransition && lastTransition.to_status !== currentStatus) {
        issues.push(`Terminal state violation: job marked as ${currentStatus} but last transition was to ${lastTransition.to_status}`)
      }
    }
    
    // Generate recommendations
    if (issues.length === 0) {
      recommendations.push('Job status is consistent')
    } else {
      recommendations.push('Review job status transitions and fix inconsistencies')
      recommendations.push('Consider resetting job to pending status if appropriate')
    }
    
    return {
      consistent: issues.length === 0,
      issues,
      recommendations
    }
    
  } catch (error) {
    console.error(`[JobStatusManager] Failed to validate status consistency for job ${jobId}:`, error)
    return {
      consistent: false,
      issues: [`Validation error: ${error.message}`],
      recommendations: ['Check job data integrity and database connectivity']
    }
  }
}

/**
 * Gets jobs by status
 */
export async function getJobsByStatus(status: JobStatus): Promise<ContentJob[]> {
  try {
    const { data: jobs, error } = await supabase
      .from('content_jobs')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
    
    if (error) {
      throw new Error(`Failed to get jobs by status: ${error.message}`)
    }
    
    return jobs || []
    
  } catch (error) {
    console.error(`[JobStatusManager] Failed to get jobs by status ${status}:`, error)
    throw error
  }
}

/**
 * Gets job status statistics
 */
export async function getJobStatusStatistics(): Promise<{
  total_jobs: number
  pending_jobs: number
  processing_jobs: number
  completed_jobs: number
  failed_jobs: number
  cancelled_jobs: number
  success_rate: number
}> {
  try {
    const { data: jobs, error } = await supabase
      .from('content_jobs')
      .select('status')
    
    if (error) {
      throw new Error(`Failed to get job status statistics: ${error.message}`)
    }
    
    const totalJobs = jobs.length
    const pendingJobs = jobs.filter(job => job.status === JOB_STATUS.PENDING).length
    const processingJobs = jobs.filter(job => job.status === JOB_STATUS.PROCESSING).length
    const completedJobs = jobs.filter(job => job.status === JOB_STATUS.COMPLETED).length
    const failedJobs = jobs.filter(job => job.status === JOB_STATUS.FAILED).length
    const cancelledJobs = jobs.filter(job => job.status === JOB_STATUS.CANCELLED).length
    
    const successRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0
    
    return {
      total_jobs: totalJobs,
      pending_jobs: pendingJobs,
      processing_jobs: processingJobs,
      completed_jobs: completedJobs,
      failed_jobs: failedJobs,
      cancelled_jobs: cancelledJobs,
      success_rate: Math.round(successRate * 100) / 100
    }
    
  } catch (error) {
    console.error('[JobStatusManager] Failed to get job status statistics:', error)
    throw error
  }
}
