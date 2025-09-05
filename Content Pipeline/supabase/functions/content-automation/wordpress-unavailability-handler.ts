// WordPress unavailability handling with job requeuing
// PRD Reference: Error Handling & Monitoring (D1-D3), Edge Cases (G1), Performance & Scalability (F1-F3)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ContentJob, ProcessingResult } from './types.ts'
import { transitionJobToPending, transitionJobToFailed } from './job-status-manager.ts'
import { recordRetryAttempt } from './retry-tracker.ts'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// WordPress unavailability detection patterns
const WORDPRESS_UNAVAILABILITY_PATTERNS = {
  // Network connectivity issues
  NETWORK_ERRORS: [
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT',
    'ECONNRESET',
    'EHOSTUNREACHABLE',
    'Network request failed',
    'fetch failed',
    'Connection refused',
    'Connection timeout'
  ],
  
  // HTTP status codes indicating unavailability
  HTTP_ERRORS: [
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504, // Gateway Timeout
    521, // Web Server Is Down
    522, // Connection Timed Out
    523, // Origin Is Unreachable
    524  // A Timeout Occurred
  ],
  
  // WordPress-specific error messages
  WORDPRESS_ERRORS: [
    'WordPress site is down',
    'WordPress maintenance mode',
    'WordPress database connection failed',
    'WordPress plugin error',
    'WordPress theme error',
    'WordPress memory limit exceeded',
    'WordPress fatal error',
    'WordPress REST API disabled',
    'WordPress authentication failed'
  ],
  
  // Rate limiting and throttling
  RATE_LIMIT_ERRORS: [
    'Rate limit exceeded',
    'Too many requests',
    'Request throttled',
    'API quota exceeded',
    '429 Too Many Requests'
  ]
}

// WordPress availability check configuration
const WORDPRESS_AVAILABILITY_CONFIG = {
  // Health check endpoints
  HEALTH_CHECK_ENDPOINTS: [
    '/wp-json/wp/v2/',
    '/wp-json/wp/v2/users/me',
    '/wp-json/wp/v2/posts',
    '/wp-json/wp/v2/categories'
  ],
  
  // Timeout settings
  CONNECT_TIMEOUT: 10000, // 10 seconds
  READ_TIMEOUT: 15000,    // 15 seconds
  
  // Retry settings
  MAX_HEALTH_CHECKS: 3,
  HEALTH_CHECK_INTERVAL: 5000, // 5 seconds
  
  // Availability thresholds
  MIN_SUCCESS_RATE: 0.8, // 80% success rate
  MAX_RESPONSE_TIME: 10000, // 10 seconds
  
  // Circuit breaker settings
  CIRCUIT_BREAKER_THRESHOLD: 5, // 5 consecutive failures
  CIRCUIT_BREAKER_TIMEOUT: 300000, // 5 minutes
  CIRCUIT_BREAKER_RESET_TIMEOUT: 60000 // 1 minute
}

interface WordPressAvailabilityStatus {
  available: boolean
  response_time: number
  status_code: number
  error_message?: string
  last_checked: number
  consecutive_failures: number
  circuit_breaker_open: boolean
}

interface WordPressUnavailabilityResult {
  is_unavailable: boolean
  reason: string
  error_type: 'network' | 'http' | 'wordpress' | 'rate_limit' | 'timeout' | 'unknown'
  retry_after?: number
  should_requeue: boolean
  requeue_delay?: number
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

/**
 * WordPress unavailability handler
 */
export class WordPressUnavailabilityHandler {
  private wordpressUrl: string
  private availabilityStatus: WordPressAvailabilityStatus
  private circuitBreakerOpen: boolean = false
  private circuitBreakerOpenTime: number = 0
  private consecutiveFailures: number = 0

  constructor(wordpressUrl: string) {
    this.wordpressUrl = wordpressUrl
    this.availabilityStatus = {
      available: true,
      response_time: 0,
      status_code: 200,
      last_checked: 0,
      consecutive_failures: 0,
      circuit_breaker_open: false
    }
  }

  /**
   * Checks if WordPress is unavailable and determines requeuing strategy
   */
  async checkWordPressUnavailability(error: any): Promise<WordPressUnavailabilityResult> {
    try {
      console.log('[WordPressUnavailabilityHandler] Checking WordPress availability...')
      
      // Analyze the error to determine unavailability type
      const unavailabilityAnalysis = this.analyzeUnavailabilityError(error)
      
      if (!unavailabilityAnalysis.is_unavailable) {
        return unavailabilityAnalysis
      }
      
      // Perform health check to confirm unavailability
      const healthCheckResult = await this.performHealthCheck()
      
      // Update circuit breaker state
      this.updateCircuitBreakerState(healthCheckResult.available)
      
      // Determine requeuing strategy
      const requeueStrategy = this.determineRequeueStrategy(
        unavailabilityAnalysis,
        healthCheckResult
      )
      
      console.log(`[WordPressUnavailabilityHandler] WordPress unavailability detected: ${unavailabilityAnalysis.reason}`)
      
      return {
        is_unavailable: true,
        reason: unavailabilityAnalysis.reason,
        error_type: unavailabilityAnalysis.error_type,
        retry_after: requeueStrategy.retry_after,
        should_requeue: requeueStrategy.should_requeue,
        requeue_delay: requeueStrategy.requeue_delay
      }
      
    } catch (error) {
      console.error('[WordPressUnavailabilityHandler] Error checking WordPress availability:', error)
      
      return {
        is_unavailable: true,
        reason: 'Health check failed',
        error_type: 'unknown',
        should_requeue: true,
        requeue_delay: 30000 // 30 seconds default delay
      }
    }
  }

  /**
   * Requeues a job due to WordPress unavailability
   */
  async requeueJobForWordPressUnavailability(
    jobId: string,
    error: any,
    retryCount: number
  ): Promise<JobRequeueResult> {
    try {
      console.log(`[WordPressUnavailabilityHandler] Requeuing job ${jobId} due to WordPress unavailability...`)
      
      // Check if job should be requeued
      const unavailabilityResult = await this.checkWordPressUnavailability(error)
      
      if (!unavailabilityResult.should_requeue) {
        return {
          success: false,
          job_id: jobId,
          new_status: 'failed',
          requeue_reason: 'WordPress is available, no requeue needed',
          retry_count: retryCount,
          error: 'WordPress is available'
        }
      }
      
      // Check retry count limit
      if (retryCount >= 3) {
        console.log(`[WordPressUnavailabilityHandler] Job ${jobId} exceeded max retries, marking as failed`)
        
        const failResult = await transitionJobToFailed(
          jobId,
          `WordPress unavailable after ${retryCount} retries: ${unavailabilityResult.reason}`,
          'WordPress unavailability - max retries exceeded'
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
      
      // Calculate requeue delay
      const requeueDelay = this.calculateRequeueDelay(retryCount, unavailabilityResult)
      const nextRetryAt = new Date(Date.now() + requeueDelay)
      
      // Record retry attempt
      const retryResult = await recordRetryAttempt(
        jobId,
        `WordPress unavailable: ${unavailabilityResult.reason}`,
        retryCount + 1
      )
      
      if (!retryResult.success) {
        console.error(`[WordPressUnavailabilityHandler] Failed to record retry attempt: ${retryResult.error}`)
      }
      
      // Transition job back to pending status
      const requeueResult = await transitionJobToPending(
        jobId,
        `WordPress unavailable - requeued for retry ${retryCount + 1}: ${unavailabilityResult.reason}`
      )
      
      if (!requeueResult.success) {
        throw new Error(`Failed to requeue job: ${requeueResult.error}`)
      }
      
      console.log(`[WordPressUnavailabilityHandler] Successfully requeued job ${jobId} for retry ${retryCount + 1}`)
      
      return {
        success: true,
        job_id: jobId,
        new_status: 'pending',
        requeue_reason: unavailabilityResult.reason,
        retry_count: retryCount + 1,
        next_retry_at: nextRetryAt.toISOString()
      }
      
    } catch (error) {
      console.error(`[WordPressUnavailabilityHandler] Failed to requeue job ${jobId}:`, error)
      
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
   * Performs WordPress health check
   */
  async performHealthCheck(): Promise<{ available: boolean; response_time: number; status_code: number; error?: string }> {
    try {
      const startTime = Date.now()
      
      // Try multiple endpoints to get a comprehensive health check
      const healthChecks = await Promise.allSettled(
        WORDPRESS_AVAILABILITY_CONFIG.HEALTH_CHECK_ENDPOINTS.map(endpoint => 
          this.checkEndpoint(`${this.wordpressUrl}${endpoint}`)
        )
      )
      
      const responseTime = Date.now() - startTime
      const successfulChecks = healthChecks.filter(result => 
        result.status === 'fulfilled' && result.value.available
      ).length
      
      const successRate = successfulChecks / healthChecks.length
      const isAvailable = successRate >= WORDPRESS_AVAILABILITY_CONFIG.MIN_SUCCESS_RATE && 
                         responseTime <= WORDPRESS_AVAILABILITY_CONFIG.MAX_RESPONSE_TIME
      
      // Update availability status
      this.availabilityStatus = {
        available: isAvailable,
        response_time: responseTime,
        status_code: isAvailable ? 200 : 503,
        last_checked: Date.now(),
        consecutive_failures: isAvailable ? 0 : this.availabilityStatus.consecutive_failures + 1,
        circuit_breaker_open: this.circuitBreakerOpen
      }
      
      return {
        available: isAvailable,
        response_time: responseTime,
        status_code: this.availabilityStatus.status_code
      }
      
    } catch (error) {
      console.error('[WordPressUnavailabilityHandler] Health check failed:', error)
      
      this.availabilityStatus = {
        available: false,
        response_time: 0,
        status_code: 0,
        error_message: error.message,
        last_checked: Date.now(),
        consecutive_failures: this.availabilityStatus.consecutive_failures + 1,
        circuit_breaker_open: this.circuitBreakerOpen
      }
      
      return {
        available: false,
        response_time: 0,
        status_code: 0,
        error: error.message
      }
    }
  }

  /**
   * Checks a specific WordPress endpoint
   */
  private async checkEndpoint(url: string): Promise<{ available: boolean; status_code: number; error?: string }> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), WORDPRESS_AVAILABILITY_CONFIG.CONNECT_TIMEOUT)
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Content-Automation-Health-Check/1.0'
        }
      })
      
      clearTimeout(timeoutId)
      
      return {
        available: response.ok,
        status_code: response.status
      }
      
    } catch (error) {
      if (error.name === 'AbortError') {
        return {
          available: false,
          status_code: 408,
          error: 'Request timeout'
        }
      }
      
      return {
        available: false,
        status_code: 0,
        error: error.message
      }
    }
  }

  /**
   * Analyzes error to determine unavailability type
   */
  private analyzeUnavailabilityError(error: any): WordPressUnavailabilityResult {
    const errorMessage = error.message || error.toString()
    const errorCode = error.code || error.status || 0
    
    // Check for network errors
    for (const pattern of WORDPRESS_UNAVAILABILITY_PATTERNS.NETWORK_ERRORS) {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return {
          is_unavailable: true,
          reason: `Network error: ${pattern}`,
          error_type: 'network',
          should_requeue: true,
          requeue_delay: 30000 // 30 seconds
        }
      }
    }
    
    // Check for HTTP errors
    if (WORDPRESS_UNAVAILABILITY_PATTERNS.HTTP_ERRORS.includes(errorCode)) {
      return {
        is_unavailable: true,
        reason: `HTTP error: ${errorCode}`,
        error_type: 'http',
        retry_after: this.getRetryAfterFromError(error),
        should_requeue: true,
        requeue_delay: this.getRequeueDelayForHttpError(errorCode)
      }
    }
    
    // Check for WordPress-specific errors
    for (const pattern of WORDPRESS_UNAVAILABILITY_PATTERNS.WORDPRESS_ERRORS) {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return {
          is_unavailable: true,
          reason: `WordPress error: ${pattern}`,
          error_type: 'wordpress',
          should_requeue: true,
          requeue_delay: 60000 // 1 minute
        }
      }
    }
    
    // Check for rate limiting
    for (const pattern of WORDPRESS_UNAVAILABILITY_PATTERNS.RATE_LIMIT_ERRORS) {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return {
          is_unavailable: true,
          reason: `Rate limit: ${pattern}`,
          error_type: 'rate_limit',
          retry_after: this.getRetryAfterFromError(error),
          should_requeue: true,
          requeue_delay: 120000 // 2 minutes
        }
      }
    }
    
    // Check for timeout errors
    if (errorMessage.toLowerCase().includes('timeout') || errorCode === 408) {
      return {
        is_unavailable: true,
        reason: 'Request timeout',
        error_type: 'timeout',
        should_requeue: true,
        requeue_delay: 45000 // 45 seconds
      }
    }
    
    // Default: not unavailable
    return {
      is_unavailable: false,
      reason: 'Error not related to WordPress unavailability',
      error_type: 'unknown',
      should_requeue: false
    }
  }

  /**
   * Updates circuit breaker state
   */
  private updateCircuitBreakerState(isAvailable: boolean): void {
    if (!isAvailable) {
      this.consecutiveFailures++
      
      if (this.consecutiveFailures >= WORDPRESS_AVAILABILITY_CONFIG.CIRCUIT_BREAKER_THRESHOLD) {
        this.circuitBreakerOpen = true
        this.circuitBreakerOpenTime = Date.now()
        console.log('[WordPressUnavailabilityHandler] Circuit breaker opened due to consecutive failures')
      }
    } else {
      this.consecutiveFailures = 0
      
      if (this.circuitBreakerOpen) {
        const timeSinceOpen = Date.now() - this.circuitBreakerOpenTime
        if (timeSinceOpen >= WORDPRESS_AVAILABILITY_CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT) {
          this.circuitBreakerOpen = false
          console.log('[WordPressUnavailabilityHandler] Circuit breaker closed after reset timeout')
        }
      }
    }
  }

  /**
   * Determines requeuing strategy based on unavailability analysis
   */
  private determineRequeueStrategy(
    unavailabilityAnalysis: WordPressUnavailabilityResult,
    healthCheckResult: { available: boolean; response_time: number; status_code: number }
  ): { should_requeue: boolean; requeue_delay?: number; retry_after?: number } {
    
    // If circuit breaker is open, don't requeue immediately
    if (this.circuitBreakerOpen) {
      return {
        should_requeue: true,
        requeue_delay: WORDPRESS_AVAILABILITY_CONFIG.CIRCUIT_BREAKER_TIMEOUT
      }
    }
    
    // If health check shows WordPress is available, don't requeue
    if (healthCheckResult.available) {
      return {
        should_requeue: false
      }
    }
    
    // Use the delay from unavailability analysis
    return {
      should_requeue: true,
      requeue_delay: unavailabilityAnalysis.requeue_delay,
      retry_after: unavailabilityAnalysis.retry_after
    }
  }

  /**
   * Calculates requeue delay based on retry count and error type
   */
  private calculateRequeueDelay(retryCount: number, unavailabilityResult: WordPressUnavailabilityResult): number {
    const baseDelay = unavailabilityResult.requeue_delay || 30000 // 30 seconds default
    
    // Exponential backoff with jitter
    const exponentialDelay = baseDelay * Math.pow(2, retryCount)
    const jitter = Math.random() * 0.1 * exponentialDelay // 10% jitter
    const totalDelay = exponentialDelay + jitter
    
    // Cap at 5 minutes
    return Math.min(totalDelay, 300000)
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
    
    return undefined
  }

  /**
   * Gets requeue delay for HTTP error codes
   */
  private getRequeueDelayForHttpError(statusCode: number): number {
    switch (statusCode) {
      case 500: return 60000  // 1 minute for server errors
      case 502: return 45000  // 45 seconds for bad gateway
      case 503: return 90000  // 1.5 minutes for service unavailable
      case 504: return 30000  // 30 seconds for gateway timeout
      case 521: return 120000 // 2 minutes for web server down
      case 522: return 60000  // 1 minute for connection timeout
      case 523: return 180000 // 3 minutes for origin unreachable
      case 524: return 45000  // 45 seconds for timeout occurred
      default: return 60000   // 1 minute default
    }
  }

  /**
   * Gets current availability status
   */
  getAvailabilityStatus(): WordPressAvailabilityStatus {
    return { ...this.availabilityStatus }
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
    console.log('[WordPressUnavailabilityHandler] Circuit breaker reset')
  }
}

/**
 * Creates a WordPress unavailability handler
 */
export function createWordPressUnavailabilityHandler(wordpressUrl: string): WordPressUnavailabilityHandler {
  return new WordPressUnavailabilityHandler(wordpressUrl)
}

/**
 * Checks if WordPress is unavailable
 */
export async function checkWordPressUnavailability(
  wordpressUrl: string,
  error: any
): Promise<WordPressUnavailabilityResult> {
  const handler = createWordPressUnavailabilityHandler(wordpressUrl)
  return await handler.checkWordPressUnavailability(error)
}

/**
 * Requeues a job due to WordPress unavailability
 */
export async function requeueJobForWordPressUnavailability(
  wordpressUrl: string,
  jobId: string,
  error: any,
  retryCount: number
): Promise<JobRequeueResult> {
  const handler = createWordPressUnavailabilityHandler(wordpressUrl)
  return await handler.requeueJobForWordPressUnavailability(jobId, error, retryCount)
}

/**
 * Performs WordPress health check
 */
export async function performWordPressHealthCheck(wordpressUrl: string): Promise<{
  available: boolean
  response_time: number
  status_code: number
  error?: string
}> {
  const handler = createWordPressUnavailabilityHandler(wordpressUrl)
  return await handler.performHealthCheck()
}

/**
 * Gets WordPress availability status
 */
export async function getWordPressAvailabilityStatus(wordpressUrl: string): Promise<WordPressAvailabilityStatus> {
  const handler = createWordPressUnavailabilityHandler(wordpressUrl)
  return handler.getAvailabilityStatus()
}

/**
 * Resets WordPress circuit breaker
 */
export async function resetWordPressCircuitBreaker(wordpressUrl: string): Promise<void> {
  const handler = createWordPressUnavailabilityHandler(wordpressUrl)
  handler.resetCircuitBreaker()
}
