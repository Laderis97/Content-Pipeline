// Manual retry override capability for admin users
// PRD Reference: Edge Cases (G3), Error Handling & Monitoring (D1-D3), Data & Security (E1)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ContentJob, ProcessingResult } from './types.ts'
import { 
  transitionJobToPending, 
  transitionJobToFailed, 
  getJobStatus,
  getJobStatusHistory,
  validateJobStatusConsistency
} from './job-status-manager.ts'
import { recordRetryAttempt } from './retry-tracker.ts'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Admin retry configuration
const ADMIN_RETRY_CONFIG = {
  // Admin user roles and permissions
  ADMIN_ROLES: ['admin', 'super_admin', 'content_manager'],
  
  // Retry limits and constraints
  MAX_MANUAL_RETRIES: 5,
  MAX_TOTAL_RETRIES: 10, // Including automatic retries
  
  // Retry delay settings
  MANUAL_RETRY_DELAY: 0, // Immediate retry for manual overrides
  FORCE_RETRY_DELAY: 5000, // 5 seconds for force retries
  
  // Audit and logging
  AUDIT_LOG_RETENTION_DAYS: 90,
  REQUIRED_AUDIT_FIELDS: ['admin_user_id', 'reason', 'override_type', 'timestamp']
}

// Admin retry types
export const ADMIN_RETRY_TYPES = {
  MANUAL_RETRY: 'manual_retry',
  FORCE_RETRY: 'force_retry',
  RESET_RETRY_COUNT: 'reset_retry_count',
  OVERRIDE_MAX_RETRIES: 'override_max_retries',
  EMERGENCY_RETRY: 'emergency_retry'
} as const

export type AdminRetryType = typeof ADMIN_RETRY_TYPES[keyof typeof ADMIN_RETRY_TYPES]

interface AdminRetryRequest {
  job_id: string
  admin_user_id: string
  admin_role: string
  retry_type: AdminRetryType
  reason: string
  force_override?: boolean
  reset_retry_count?: boolean
  custom_delay?: number
  metadata?: any
}

interface AdminRetryResult {
  success: boolean
  job_id: string
  retry_type: AdminRetryType
  new_status: string
  retry_count: number
  admin_user_id: string
  reason: string
  timestamp: string
  error?: string
  warnings?: string[]
}

interface AdminRetryAuditLog {
  id: string
  job_id: string
  admin_user_id: string
  admin_role: string
  retry_type: AdminRetryType
  reason: string
  previous_status: string
  new_status: string
  previous_retry_count: number
  new_retry_count: number
  force_override: boolean
  reset_retry_count: boolean
  custom_delay?: number
  metadata?: any
  timestamp: string
  ip_address?: string
  user_agent?: string
}

interface AdminRetryStatistics {
  total_manual_retries: number
  retries_by_type: Record<string, number>
  retries_by_admin: Record<string, number>
  success_rate: number
  most_common_reasons: Record<string, number>
  recent_retries: AdminRetryAuditLog[]
}

/**
 * Admin retry manager for manual job retry overrides
 */
export class AdminRetryManager {
  private adminUserId: string
  private adminRole: string
  private ipAddress?: string
  private userAgent?: string

  constructor(adminUserId: string, adminRole: string, ipAddress?: string, userAgent?: string) {
    this.adminUserId = adminUserId
    this.adminRole = adminRole
    this.ipAddress = ipAddress
    this.userAgent = userAgent
  }

  /**
   * Performs manual retry override for a job
   */
  async performManualRetry(request: AdminRetryRequest): Promise<AdminRetryResult> {
    try {
      console.log(`[AdminRetryManager] Admin ${this.adminUserId} requesting manual retry for job ${request.job_id}`)
      
      // Validate admin permissions
      const permissionCheck = await this.validateAdminPermissions(request)
      if (!permissionCheck.valid) {
        return {
          success: false,
          job_id: request.job_id,
          retry_type: request.retry_type,
          new_status: 'failed',
          retry_count: 0,
          admin_user_id: this.adminUserId,
          reason: request.reason,
          timestamp: new Date().toISOString(),
          error: permissionCheck.error
        }
      }
      
      // Get current job status
      const jobStatus = await this.getJobDetails(request.job_id)
      if (!jobStatus.exists) {
        return {
          success: false,
          job_id: request.job_id,
          retry_type: request.retry_type,
          new_status: 'failed',
          retry_count: 0,
          admin_user_id: this.adminUserId,
          reason: request.reason,
          timestamp: new Date().toISOString(),
          error: 'Job not found'
        }
      }
      
      // Validate retry eligibility
      const eligibilityCheck = await this.validateRetryEligibility(request, jobStatus)
      if (!eligibilityCheck.eligible) {
        return {
          success: false,
          job_id: request.job_id,
          retry_type: request.retry_type,
          new_status: jobStatus.status,
          retry_count: jobStatus.retry_count,
          admin_user_id: this.adminUserId,
          reason: request.reason,
          timestamp: new Date().toISOString(),
          error: eligibilityCheck.error,
          warnings: eligibilityCheck.warnings
        }
      }
      
      // Perform the retry operation
      const retryResult = await this.executeRetryOperation(request, jobStatus)
      
      // Log the admin retry action
      await this.logAdminRetryAction(request, jobStatus, retryResult)
      
      console.log(`[AdminRetryManager] Manual retry completed for job ${request.job_id} by admin ${this.adminUserId}`)
      
      return retryResult
      
    } catch (error) {
      console.error(`[AdminRetryManager] Failed to perform manual retry for job ${request.job_id}:`, error)
      
      return {
        success: false,
        job_id: request.job_id,
        retry_type: request.retry_type,
        new_status: 'failed',
        retry_count: 0,
        admin_user_id: this.adminUserId,
        reason: request.reason,
        timestamp: new Date().toISOString(),
        error: error.message
      }
    }
  }

  /**
   * Gets admin retry statistics
   */
  async getAdminRetryStatistics(days: number = 30): Promise<AdminRetryStatistics> {
    try {
      const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000))
      
      const { data: auditLogs, error } = await supabase
        .from('admin_retry_audit_log')
        .select('*')
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to get admin retry statistics: ${error.message}`)
      }
      
      const totalRetries = auditLogs.length
      const retriesByType: Record<string, number> = {}
      const retriesByAdmin: Record<string, number> = {}
      const reasons: Record<string, number> = {}
      let successfulRetries = 0
      
      for (const log of auditLogs) {
        // Count by type
        retriesByType[log.retry_type] = (retriesByType[log.retry_type] || 0) + 1
        
        // Count by admin
        retriesByAdmin[log.admin_user_id] = (retriesByAdmin[log.admin_user_id] || 0) + 1
        
        // Count reasons
        reasons[log.reason] = (reasons[log.reason] || 0) + 1
        
        // Count successful retries (jobs that moved from failed to pending)
        if (log.previous_status === 'failed' && log.new_status === 'pending') {
          successfulRetries++
        }
      }
      
      // Get most common reasons
      const mostCommonReasons = Object.entries(reasons)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .reduce((acc, [reason, count]) => ({ ...acc, [reason]: count }), {})
      
      return {
        total_manual_retries: totalRetries,
        retries_by_type: retriesByType,
        retries_by_admin: retriesByAdmin,
        success_rate: totalRetries > 0 ? (successfulRetries / totalRetries) * 100 : 0,
        most_common_reasons: mostCommonReasons,
        recent_retries: auditLogs.slice(0, 20) // Last 20 retries
      }
      
    } catch (error) {
      console.error('[AdminRetryManager] Failed to get admin retry statistics:', error)
      throw error
    }
  }

  /**
   * Gets retry history for a specific job
   */
  async getJobRetryHistory(jobId: string): Promise<AdminRetryAuditLog[]> {
    try {
      const { data: auditLogs, error } = await supabase
        .from('admin_retry_audit_log')
        .select('*')
        .eq('job_id', jobId)
        .order('timestamp', { ascending: false })
      
      if (error) {
        throw new Error(`Failed to get job retry history: ${error.message}`)
      }
      
      return auditLogs || []
      
    } catch (error) {
      console.error(`[AdminRetryManager] Failed to get retry history for job ${jobId}:`, error)
      throw error
    }
  }

  /**
   * Validates admin permissions for retry operation
   */
  private async validateAdminPermissions(request: AdminRetryRequest): Promise<{ valid: boolean; error?: string }> {
    // Check if user has admin role
    if (!ADMIN_RETRY_CONFIG.ADMIN_ROLES.includes(this.adminRole)) {
      return {
        valid: false,
        error: `User role '${this.adminRole}' does not have admin retry permissions`
      }
    }
    
    // Check for force override permissions
    if (request.force_override && !['super_admin', 'admin'].includes(this.adminRole)) {
      return {
        valid: false,
        error: 'Force override requires super_admin or admin role'
      }
    }
    
    // Check for emergency retry permissions
    if (request.retry_type === ADMIN_RETRY_TYPES.EMERGENCY_RETRY && this.adminRole !== 'super_admin') {
      return {
        valid: false,
        error: 'Emergency retry requires super_admin role'
      }
    }
    
    return { valid: true }
  }

  /**
   * Gets job details for retry validation
   */
  private async getJobDetails(jobId: string): Promise<{
    exists: boolean
    status: string
    retry_count: number
    last_error?: string
    created_at: string
    updated_at: string
  }> {
    try {
      const { data: job, error } = await supabase
        .from('content_jobs')
        .select('status, retry_count, last_error, created_at, updated_at')
        .eq('id', jobId)
        .single()
      
      if (error) {
        if (error.code === 'PGRST116') {
          return { exists: false, status: '', retry_count: 0, created_at: '', updated_at: '' }
        }
        throw new Error(`Failed to get job details: ${error.message}`)
      }
      
      return {
        exists: true,
        status: job.status,
        retry_count: job.retry_count || 0,
        last_error: job.last_error,
        created_at: job.created_at,
        updated_at: job.updated_at
      }
      
    } catch (error) {
      console.error(`[AdminRetryManager] Failed to get job details for ${jobId}:`, error)
      throw error
    }
  }

  /**
   * Validates retry eligibility based on job status and retry constraints
   */
  private async validateRetryEligibility(
    request: AdminRetryRequest,
    jobStatus: any
  ): Promise<{ eligible: boolean; error?: string; warnings?: string[] }> {
    const warnings: string[] = []
    
    // Check if job is in a retryable state
    if (!['failed', 'pending'].includes(jobStatus.status)) {
      return {
        eligible: false,
        error: `Job is in '${jobStatus.status}' status and cannot be retried`
      }
    }
    
    // Check retry count limits
    if (jobStatus.retry_count >= ADMIN_RETRY_CONFIG.MAX_TOTAL_RETRIES && !request.force_override) {
      return {
        eligible: false,
        error: `Job has exceeded maximum retry count (${ADMIN_RETRY_CONFIG.MAX_TOTAL_RETRIES}). Use force_override to bypass this limit.`
      }
    }
    
    // Check manual retry limits
    const manualRetryCount = await this.getManualRetryCount(request.job_id)
    if (manualRetryCount >= ADMIN_RETRY_CONFIG.MAX_MANUAL_RETRIES && !request.force_override) {
      return {
        eligible: false,
        error: `Job has exceeded maximum manual retry count (${ADMIN_RETRY_CONFIG.MAX_MANUAL_RETRIES}). Use force_override to bypass this limit.`
      }
    }
    
    // Add warnings for high retry counts
    if (jobStatus.retry_count >= 5) {
      warnings.push(`Job has been retried ${jobStatus.retry_count} times, which is unusually high`)
    }
    
    if (manualRetryCount >= 3) {
      warnings.push(`Job has been manually retried ${manualRetryCount} times`)
    }
    
    // Check for recent retries
    const recentRetries = await this.getRecentRetryCount(request.job_id, 1) // Last hour
    if (recentRetries > 0) {
      warnings.push(`Job was retried ${recentRetries} time(s) in the last hour`)
    }
    
    return { eligible: true, warnings: warnings.length > 0 ? warnings : undefined }
  }

  /**
   * Executes the retry operation based on retry type
   */
  private async executeRetryOperation(
    request: AdminRetryRequest,
    jobStatus: any
  ): Promise<AdminRetryResult> {
    let newRetryCount = jobStatus.retry_count
    let newStatus = 'pending'
    
    // Handle different retry types
    switch (request.retry_type) {
      case ADMIN_RETRY_TYPES.MANUAL_RETRY:
        // Standard manual retry - increment retry count and set to pending
        newRetryCount = jobStatus.retry_count + 1
        break
        
      case ADMIN_RETRY_TYPES.FORCE_RETRY:
        // Force retry - increment retry count and set to pending (bypasses some checks)
        newRetryCount = jobStatus.retry_count + 1
        break
        
      case ADMIN_RETRY_TYPES.RESET_RETRY_COUNT:
        // Reset retry count to 0
        newRetryCount = 0
        break
        
      case ADMIN_RETRY_TYPES.OVERRIDE_MAX_RETRIES:
        // Override max retries - increment but don't fail on max retries
        newRetryCount = jobStatus.retry_count + 1
        break
        
      case ADMIN_RETRY_TYPES.EMERGENCY_RETRY:
        // Emergency retry - reset retry count and force to pending
        newRetryCount = 0
        break
        
      default:
        throw new Error(`Unknown retry type: ${request.retry_type}`)
    }
    
    // Transition job to pending status
    const transitionResult = await transitionJobToPending(
      request.job_id,
      `Manual retry by admin ${this.adminUserId}: ${request.reason}`
    )
    
    if (!transitionResult.success) {
      throw new Error(`Failed to transition job to pending: ${transitionResult.error}`)
    }
    
    // Update retry count if needed
    if (newRetryCount !== jobStatus.retry_count) {
      const { error: updateError } = await supabase
        .from('content_jobs')
        .update({ retry_count: newRetryCount })
        .eq('id', request.job_id)
      
      if (updateError) {
        console.error(`[AdminRetryManager] Failed to update retry count: ${updateError.message}`)
        // Don't fail the operation, just log the error
      }
    }
    
    // Record retry attempt
    const retryResult = await recordRetryAttempt(
      request.job_id,
      `Manual retry by admin ${this.adminUserId}: ${request.reason}`,
      newRetryCount
    )
    
    if (!retryResult.success) {
      console.error(`[AdminRetryManager] Failed to record retry attempt: ${retryResult.error}`)
    }
    
    return {
      success: true,
      job_id: request.job_id,
      retry_type: request.retry_type,
      new_status: newStatus,
      retry_count: newRetryCount,
      admin_user_id: this.adminUserId,
      reason: request.reason,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Logs admin retry action for audit purposes
   */
  private async logAdminRetryAction(
    request: AdminRetryRequest,
    jobStatus: any,
    retryResult: AdminRetryResult
  ): Promise<void> {
    try {
      const auditLog: AdminRetryAuditLog = {
        id: crypto.randomUUID(),
        job_id: request.job_id,
        admin_user_id: this.adminUserId,
        admin_role: this.adminRole,
        retry_type: request.retry_type,
        reason: request.reason,
        previous_status: jobStatus.status,
        new_status: retryResult.new_status,
        previous_retry_count: jobStatus.retry_count,
        new_retry_count: retryResult.retry_count,
        force_override: request.force_override || false,
        reset_retry_count: request.reset_retry_count || false,
        custom_delay: request.custom_delay,
        metadata: request.metadata,
        timestamp: retryResult.timestamp,
        ip_address: this.ipAddress,
        user_agent: this.userAgent
      }
      
      const { error } = await supabase
        .from('admin_retry_audit_log')
        .insert(auditLog)
      
      if (error) {
        console.error(`[AdminRetryManager] Failed to log admin retry action: ${error.message}`)
        // Don't fail the operation, just log the error
      }
      
    } catch (error) {
      console.error(`[AdminRetryManager] Failed to log admin retry action:`, error)
    }
  }

  /**
   * Gets manual retry count for a job
   */
  private async getManualRetryCount(jobId: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from('admin_retry_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId)
        .in('retry_type', [ADMIN_RETRY_TYPES.MANUAL_RETRY, ADMIN_RETRY_TYPES.FORCE_RETRY])
      
      if (error) {
        console.error(`[AdminRetryManager] Failed to get manual retry count: ${error.message}`)
        return 0
      }
      
      return count || 0
      
    } catch (error) {
      console.error(`[AdminRetryManager] Failed to get manual retry count:`, error)
      return 0
    }
  }

  /**
   * Gets recent retry count for a job within specified hours
   */
  private async getRecentRetryCount(jobId: string, hours: number): Promise<number> {
    try {
      const cutoffTime = new Date(Date.now() - (hours * 60 * 60 * 1000))
      
      const { count, error } = await supabase
        .from('admin_retry_audit_log')
        .select('*', { count: 'exact', head: true })
        .eq('job_id', jobId)
        .gte('timestamp', cutoffTime.toISOString())
      
      if (error) {
        console.error(`[AdminRetryManager] Failed to get recent retry count: ${error.message}`)
        return 0
      }
      
      return count || 0
      
    } catch (error) {
      console.error(`[AdminRetryManager] Failed to get recent retry count:`, error)
      return 0
    }
  }
}

/**
 * Creates an admin retry manager
 */
export function createAdminRetryManager(
  adminUserId: string,
  adminRole: string,
  ipAddress?: string,
  userAgent?: string
): AdminRetryManager {
  return new AdminRetryManager(adminUserId, adminRole, ipAddress, userAgent)
}

/**
 * Performs manual retry for a job
 */
export async function performManualRetry(
  adminUserId: string,
  adminRole: string,
  request: AdminRetryRequest,
  ipAddress?: string,
  userAgent?: string
): Promise<AdminRetryResult> {
  const manager = createAdminRetryManager(adminUserId, adminRole, ipAddress, userAgent)
  return await manager.performManualRetry(request)
}

/**
 * Gets admin retry statistics
 */
export async function getAdminRetryStatistics(days: number = 30): Promise<AdminRetryStatistics> {
  const manager = createAdminRetryManager('system', 'system')
  return await manager.getAdminRetryStatistics(days)
}

/**
 * Gets job retry history
 */
export async function getJobRetryHistory(jobId: string): Promise<AdminRetryAuditLog[]> {
  const manager = createAdminRetryManager('system', 'system')
  return await manager.getJobRetryHistory(jobId)
}
