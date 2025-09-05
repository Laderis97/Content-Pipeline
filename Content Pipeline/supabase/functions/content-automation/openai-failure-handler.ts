// OpenAI API failure handling with proper error categorization
// PRD Reference: Error Handling & Monitoring (D1-D3), Edge Cases (G2), Performance & Scalability (F1-F3)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ContentJob, ProcessingResult } from './types.ts'
import { transitionJobToPending, transitionJobToFailed } from './job-status-manager.ts'
import { recordRetryAttempt } from './retry-tracker.ts'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// OpenAI API failure patterns and categorization
const OPENAI_FAILURE_PATTERNS = {
  // Authentication and authorization errors
  AUTH_ERRORS: [
    'invalid_api_key',
    'insufficient_quota',
    'billing_not_active',
    'account_suspended',
    'access_denied',
    'unauthorized',
    'forbidden'
  ],
  
  // Rate limiting errors
  RATE_LIMIT_ERRORS: [
    'rate_limit_exceeded',
    'requests_per_minute_limit_exceeded',
    'requests_per_day_limit_exceeded',
    'tokens_per_minute_limit_exceeded',
    'tokens_per_day_limit_exceeded',
    'quota_exceeded',
    'too_many_requests'
  ],
  
  // Model and content errors
  MODEL_ERRORS: [
    'model_not_found',
    'model_overloaded',
    'model_unavailable',
    'invalid_model',
    'unsupported_model',
    'model_deployment_not_found'
  ],
  
  // Content policy and safety errors
  CONTENT_POLICY_ERRORS: [
    'content_filter',
    'content_policy_violation',
    'safety_violation',
    'inappropriate_content',
    'harmful_content',
    'policy_violation'
  ],
  
  // Request format and validation errors
  VALIDATION_ERRORS: [
    'invalid_request',
    'missing_required_field',
    'invalid_parameter',
    'request_too_large',
    'invalid_json',
    'malformed_request',
    'unsupported_media_type'
  ],
  
  // Network and connectivity errors
  NETWORK_ERRORS: [
    'connection_error',
    'timeout',
    'network_error',
    'dns_error',
    'connection_refused',
    'connection_reset',
    'host_unreachable'
  ],
  
  // Server and infrastructure errors
  SERVER_ERRORS: [
    'internal_server_error',
    'service_unavailable',
    'bad_gateway',
    'gateway_timeout',
    'server_error',
    'temporary_failure',
    'infrastructure_error'
  ],
  
  // Token and usage errors
  TOKEN_ERRORS: [
    'context_length_exceeded',
    'max_tokens_exceeded',
    'token_limit_exceeded',
    'input_too_long',
    'output_too_long',
    'token_count_exceeded'
  ]
}

// OpenAI failure handling configuration
const OPENAI_FAILURE_CONFIG = {
  // Retry configuration
  MAX_RETRIES: 3,
  BASE_RETRY_DELAY: 1000, // 1 second
  MAX_RETRY_DELAY: 60000, // 1 minute
  RETRY_MULTIPLIER: 2,
  
  // Error categorization thresholds
  RATE_LIMIT_RETRY_DELAY: 60000, // 1 minute
  SERVER_ERROR_RETRY_DELAY: 30000, // 30 seconds
  NETWORK_ERROR_RETRY_DELAY: 15000, // 15 seconds
  
  // Circuit breaker configuration
  CIRCUIT_BREAKER_THRESHOLD: 5,
  CIRCUIT_BREAKER_TIMEOUT: 300000, // 5 minutes
  CIRCUIT_BREAKER_RESET_TIMEOUT: 60000, // 1 minute
  
  // Error classification weights
  ERROR_SEVERITY_WEIGHTS: {
    critical: 10,
    high: 7,
    medium: 4,
    low: 1
  }
}

interface OpenAIErrorCategory {
  category: 'auth' | 'rate_limit' | 'model' | 'content_policy' | 'validation' | 'network' | 'server' | 'token' | 'unknown'
  severity: 'critical' | 'high' | 'medium' | 'low'
  retryable: boolean
  retry_delay?: number
  description: string
  suggested_action: string
}

interface OpenAIFailureResult {
  is_failure: boolean
  category: OpenAIErrorCategory
  error_message: string
  error_code?: string
  status_code?: number
  retry_after?: number
  should_requeue: boolean
  requeue_delay?: number
  circuit_breaker_triggered: boolean
}

interface JobRequeueResult {
  success: boolean
  job_id: string
  new_status: string
  requeue_reason: string
  retry_count: number
  next_retry_at?: string
  error?: string
}

interface OpenAIFailureStatistics {
  total_failures: number
  failures_by_category: Record<string, number>
  failures_by_severity: Record<string, number>
  retry_success_rate: number
  circuit_breaker_activations: number
  average_retry_delay: number
}

/**
 * OpenAI failure handler
 */
export class OpenAIFailureHandler {
  private consecutiveFailures: number = 0
  private circuitBreakerOpen: boolean = false
  private circuitBreakerOpenTime: number = 0
  private failureStatistics: OpenAIFailureStatistics = {
    total_failures: 0,
    failures_by_category: {},
    failures_by_severity: {},
    retry_success_rate: 0,
    circuit_breaker_activations: 0,
    average_retry_delay: 0
  }

  /**
   * Analyzes OpenAI API error and categorizes it
   */
  async analyzeOpenAIFailure(error: any): Promise<OpenAIFailureResult> {
    try {
      console.log('[OpenAIFailureHandler] Analyzing OpenAI API failure...')
      
      const errorMessage = error.message || error.toString()
      const errorCode = error.code || error.type || error.error?.code
      const statusCode = error.status || error.statusCode || error.response?.status
      
      // Categorize the error
      const category = this.categorizeError(errorMessage, errorCode, statusCode)
      
      // Determine if failure should trigger requeuing
      const shouldRequeue = this.shouldRequeueForFailure(category, error)
      
      // Calculate requeue delay
      const requeueDelay = this.calculateRequeueDelay(category, error)
      
      // Check circuit breaker
      const circuitBreakerTriggered = this.updateCircuitBreakerState(category.severity)
      
      // Update failure statistics
      this.updateFailureStatistics(category)
      
      console.log(`[OpenAIFailureHandler] OpenAI failure categorized: ${category.category} (${category.severity})`)
      
      return {
        is_failure: true,
        category: category,
        error_message: errorMessage,
        error_code: errorCode,
        status_code: statusCode,
        retry_after: this.getRetryAfterFromError(error),
        should_requeue: shouldRequeue,
        requeue_delay: requeueDelay,
        circuit_breaker_triggered: circuitBreakerTriggered
      }
      
    } catch (error) {
      console.error('[OpenAIFailureHandler] Error analyzing OpenAI failure:', error)
      
      return {
        is_failure: true,
        category: {
          category: 'unknown',
          severity: 'high',
          retryable: false,
          description: 'Failed to analyze error',
          suggested_action: 'Manual investigation required'
        },
        error_message: error.message,
        should_requeue: false,
        circuit_breaker_triggered: false
      }
    }
  }

  /**
   * Requeues a job due to OpenAI API failure
   */
  async requeueJobForOpenAIFailure(
    jobId: string,
    error: any,
    retryCount: number
  ): Promise<JobRequeueResult> {
    try {
      console.log(`[OpenAIFailureHandler] Requeuing job ${jobId} due to OpenAI API failure...`)
      
      // Analyze the failure
      const failureResult = await this.analyzeOpenAIFailure(error)
      
      if (!failureResult.should_requeue) {
        return {
          success: false,
          job_id: jobId,
          new_status: 'failed',
          requeue_reason: 'OpenAI failure not retryable',
          retry_count: retryCount,
          error: failureResult.category.suggested_action
        }
      }
      
      // Check retry count limit
      if (retryCount >= OPENAI_FAILURE_CONFIG.MAX_RETRIES) {
        console.log(`[OpenAIFailureHandler] Job ${jobId} exceeded max retries, marking as failed`)
        
        const failResult = await transitionJobToFailed(
          jobId,
          `OpenAI API failure after ${retryCount} retries: ${failureResult.error_message}`,
          'OpenAI API failure - max retries exceeded'
        )
        
        if (!failResult.success) {
          throw new Error(`Failed to mark job as failed: ${failResult.error}`)
        }
        
        return {
          success: true,
          job_id: jobId,
          new_status: 'failed',
          requeue_reason: 'Max retries exceeded',
          retry_count: retryCount
        }
      }
      
      // Check circuit breaker
      if (failureResult.circuit_breaker_triggered) {
        console.log(`[OpenAIFailureHandler] Circuit breaker triggered for job ${jobId}`)
        
        return {
          success: false,
          job_id: jobId,
          new_status: 'failed',
          requeue_reason: 'Circuit breaker triggered',
          retry_count: retryCount,
          error: 'Circuit breaker is open, job will be retried later'
        }
      }
      
      // Calculate requeue delay
      const requeueDelay = this.calculateRequeueDelay(failureResult.category, error)
      const nextRetryAt = new Date(Date.now() + requeueDelay)
      
      // Record retry attempt
      const retryResult = await recordRetryAttempt(
        jobId,
        `OpenAI API failure: ${failureResult.error_message}`,
        retryCount + 1
      )
      
      if (!retryResult.success) {
        console.error(`[OpenAIFailureHandler] Failed to record retry attempt: ${retryResult.error}`)
      }
      
      // Transition job back to pending status
      const requeueResult = await transitionJobToPending(
        jobId,
        `OpenAI API failure - requeued for retry ${retryCount + 1}: ${failureResult.category.description}`
      )
      
      if (!requeueResult.success) {
        throw new Error(`Failed to requeue job: ${requeueResult.error}`)
      }
      
      console.log(`[OpenAIFailureHandler] Successfully requeued job ${jobId} for retry ${retryCount + 1}`)
      
      return {
        success: true,
        job_id: jobId,
        new_status: 'pending',
        requeue_reason: failureResult.category.description,
        retry_count: retryCount + 1,
        next_retry_at: nextRetryAt.toISOString()
      }
      
    } catch (error) {
      console.error(`[OpenAIFailureHandler] Failed to requeue job ${jobId}:`, error)
      
      return {
        success: false,
        job_id: jobId,
        new_status: 'failed',
        requeue_reason: 'Requeue failed',
        retry_count: retryCount,
        error: error.message
      }
    }
  }

  /**
   * Categorizes OpenAI API error
   */
  private categorizeError(errorMessage: string, errorCode?: string, statusCode?: number): OpenAIErrorCategory {
    const message = errorMessage.toLowerCase()
    const code = errorCode?.toLowerCase() || ''
    
    // Check authentication errors
    for (const pattern of OPENAI_FAILURE_PATTERNS.AUTH_ERRORS) {
      if (message.includes(pattern) || code.includes(pattern)) {
        return {
          category: 'auth',
          severity: 'critical',
          retryable: false,
          description: 'Authentication or authorization error',
          suggested_action: 'Check API key and account status'
        }
      }
    }
    
    // Check rate limiting errors
    for (const pattern of OPENAI_FAILURE_PATTERNS.RATE_LIMIT_ERRORS) {
      if (message.includes(pattern) || code.includes(pattern)) {
        return {
          category: 'rate_limit',
          severity: 'medium',
          retryable: true,
          retry_delay: OPENAI_FAILURE_CONFIG.RATE_LIMIT_RETRY_DELAY,
          description: 'Rate limit exceeded',
          suggested_action: 'Wait and retry with exponential backoff'
        }
      }
    }
    
    // Check model errors
    for (const pattern of OPENAI_FAILURE_PATTERNS.MODEL_ERRORS) {
      if (message.includes(pattern) || code.includes(pattern)) {
        return {
          category: 'model',
          severity: 'high',
          retryable: true,
          retry_delay: OPENAI_FAILURE_CONFIG.SERVER_ERROR_RETRY_DELAY,
          description: 'Model unavailable or overloaded',
          suggested_action: 'Retry with different model or wait for model availability'
        }
      }
    }
    
    // Check content policy errors
    for (const pattern of OPENAI_FAILURE_PATTERNS.CONTENT_POLICY_ERRORS) {
      if (message.includes(pattern) || code.includes(pattern)) {
        return {
          category: 'content_policy',
          severity: 'high',
          retryable: false,
          description: 'Content policy violation',
          suggested_action: 'Modify content to comply with OpenAI policies'
        }
      }
    }
    
    // Check validation errors
    for (const pattern of OPENAI_FAILURE_PATTERNS.VALIDATION_ERRORS) {
      if (message.includes(pattern) || code.includes(pattern)) {
        return {
          category: 'validation',
          severity: 'medium',
          retryable: false,
          description: 'Request validation error',
          suggested_action: 'Fix request format and parameters'
        }
      }
    }
    
    // Check network errors
    for (const pattern of OPENAI_FAILURE_PATTERNS.NETWORK_ERRORS) {
      if (message.includes(pattern) || code.includes(pattern)) {
        return {
          category: 'network',
          severity: 'medium',
          retryable: true,
          retry_delay: OPENAI_FAILURE_CONFIG.NETWORK_ERROR_RETRY_DELAY,
          description: 'Network connectivity error',
          suggested_action: 'Retry after network connectivity is restored'
        }
      }
    }
    
    // Check server errors
    if (statusCode >= 500) {
      return {
        category: 'server',
        severity: 'high',
        retryable: true,
        retry_delay: OPENAI_FAILURE_CONFIG.SERVER_ERROR_RETRY_DELAY,
        description: 'OpenAI server error',
        suggested_action: 'Retry after server issues are resolved'
      }
    }
    
    // Check token errors
    for (const pattern of OPENAI_FAILURE_PATTERNS.TOKEN_ERRORS) {
      if (message.includes(pattern) || code.includes(pattern)) {
        return {
          category: 'token',
          severity: 'medium',
          retryable: false,
          description: 'Token limit exceeded',
          suggested_action: 'Reduce input size or adjust token limits'
        }
      }
    }
    
    // Default: unknown error
    return {
      category: 'unknown',
      severity: 'medium',
      retryable: true,
      retry_delay: OPENAI_FAILURE_CONFIG.BASE_RETRY_DELAY,
      description: 'Unknown OpenAI API error',
      suggested_action: 'Investigate error and retry if appropriate'
    }
  }

  /**
   * Determines if failure should trigger requeuing
   */
  private shouldRequeueForFailure(category: OpenAIErrorCategory, error: any): boolean {
    // Don't requeue for non-retryable errors
    if (!category.retryable) {
      return false
    }
    
    // Don't requeue for critical errors
    if (category.severity === 'critical') {
      return false
    }
    
    // Don't requeue if circuit breaker is open
    if (this.circuitBreakerOpen) {
      return false
    }
    
    // Requeue for retryable errors
    return true
  }

  /**
   * Calculates requeue delay based on error category
   */
  private calculateRequeueDelay(category: OpenAIErrorCategory, error: any): number {
    // Use category-specific delay if available
    if (category.retry_delay) {
      return category.retry_delay
    }
    
    // Use retry-after header if available
    const retryAfter = this.getRetryAfterFromError(error)
    if (retryAfter) {
      return retryAfter
    }
    
    // Use base delay with exponential backoff
    const baseDelay = OPENAI_FAILURE_CONFIG.BASE_RETRY_DELAY
    const exponentialDelay = baseDelay * Math.pow(OPENAI_FAILURE_CONFIG.RETRY_MULTIPLIER, this.consecutiveFailures)
    const jitter = Math.random() * 0.1 * exponentialDelay // 10% jitter
    
    return Math.min(exponentialDelay + jitter, OPENAI_FAILURE_CONFIG.MAX_RETRY_DELAY)
  }

  /**
   * Updates circuit breaker state
   */
  private updateCircuitBreakerState(severity: string): boolean {
    if (severity === 'critical' || severity === 'high') {
      this.consecutiveFailures++
      
      if (this.consecutiveFailures >= OPENAI_FAILURE_CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
        this.circuitBreakerOpen = true
        this.circuitBreakerOpenTime = Date.now()
        this.failureStatistics.circuit_breaker_activations++
        console.log('[OpenAIFailureHandler] Circuit breaker opened due to consecutive failures')
        return true
      }
    } else {
      this.consecutiveFailures = 0
      
      if (this.circuitBreakerOpen) {
        const timeSinceOpen = Date.now() - this.circuitBreakerOpenTime
        if (timeSinceOpen >= OPENAI_FAILURE_CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT) {
          this.circuitBreakerOpen = false
          console.log('[OpenAIFailureHandler] Circuit breaker closed after reset timeout')
        }
      }
    }
    
    return false
  }

  /**
   * Updates failure statistics
   */
  private updateFailureStatistics(category: OpenAIErrorCategory): void {
    this.failureStatistics.total_failures++
    
    // Update category statistics
    if (!this.failureStatistics.failures_by_category[category.category]) {
      this.failureStatistics.failures_by_category[category.category] = 0
    }
    this.failureStatistics.failures_by_category[category.category]++
    
    // Update severity statistics
    if (!this.failureStatistics.failures_by_severity[category.severity]) {
      this.failureStatistics.failures_by_severity[category.severity] = 0
    }
    this.failureStatistics.failures_by_severity[category.severity]++
  }

  /**
   * Gets retry-after value from error response
   */
  private getRetryAfterFromError(error: any): number | undefined {
    if (error.headers && error.headers['retry-after']) {
      return parseInt(error.headers['retry-after']) * 1000 // Convert to milliseconds
    }
    
    if (error.retry_after) {
      return error.retry_after * 1000
    }
    
    if (error.response && error.response.headers && error.response.headers['retry-after']) {
      return parseInt(error.response.headers['retry-after']) * 1000
    }
    
    return undefined
  }

  /**
   * Gets failure statistics
   */
  getFailureStatistics(): OpenAIFailureStatistics {
    return { ...this.failureStatistics }
  }

  /**
   * Checks if circuit breaker is open
   */
  isCircuitBreakerOpen(): boolean {
    return this.circuitBreakerOpen
  }

  /**
   * Resets circuit breaker
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerOpen = false
    this.consecutiveFailures = 0
    this.circuitBreakerOpenTime = 0
    console.log('[OpenAIFailureHandler] Circuit breaker reset')
  }

  /**
   * Resets failure statistics
   */
  resetFailureStatistics(): void {
    this.failureStatistics = {
      total_failures: 0,
      failures_by_category: {},
      failures_by_severity: {},
      retry_success_rate: 0,
      circuit_breaker_activations: 0,
      average_retry_delay: 0
    }
    console.log('[OpenAIFailureHandler] Failure statistics reset')
  }
}

/**
 * Creates an OpenAI failure handler
 */
export function createOpenAIFailureHandler(): OpenAIFailureHandler {
  return new OpenAIFailureHandler()
}

/**
 * Analyzes OpenAI API failure
 */
export async function analyzeOpenAIFailure(error: any): Promise<OpenAIFailureResult> {
  const handler = createOpenAIFailureHandler()
  return await handler.analyzeOpenAIFailure(error)
}

/**
 * Requeues a job due to OpenAI API failure
 */
export async function requeueJobForOpenAIFailure(
  jobId: string,
  error: any,
  retryCount: number
): Promise<JobRequeueResult> {
  const handler = createOpenAIFailureHandler()
  return await handler.requeueJobForOpenAIFailure(jobId, error, retryCount)
}

/**
 * Gets OpenAI failure statistics
 */
export async function getOpenAIFailureStatistics(): Promise<OpenAIFailureStatistics> {
  const handler = createOpenAIFailureHandler()
  return handler.getFailureStatistics()
}

/**
 * Resets OpenAI circuit breaker
 */
export async function resetOpenAICircuitBreaker(): Promise<void> {
  const handler = createOpenAIFailureHandler()
  handler.resetCircuitBreaker()
}

/**
 * Checks if OpenAI circuit breaker is open
 */
export async function isOpenAICircuitBreakerOpen(): Promise<boolean> {
  const handler = createOpenAIFailureHandler()
  return handler.isCircuitBreakerOpen()
}
