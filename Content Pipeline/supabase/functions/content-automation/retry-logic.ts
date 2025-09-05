// Exponential backoff retry mechanism with max 3 attempts
// PRD Reference: Error Handling & Monitoring (D1-D3), Performance & Scalability (F3)

// Retry configuration
const RETRY_CONFIG = {
  max_attempts: 3,
  base_delay_ms: 1000, // 1 second
  max_delay_ms: 30000, // 30 seconds
  backoff_multiplier: 2,
  jitter_factor: 0.1, // 10% jitter
  timeout_ms: 60000 // 1 minute total timeout
}

// Retryable error types
const RETRYABLE_ERROR_TYPES = {
  NETWORK: 'network',
  SERVER: 'server',
  RATE_LIMIT: 'rate_limit',
  TIMEOUT: 'timeout',
  THROTTLE: 'throttle'
}

// Non-retryable error types
const NON_RETRYABLE_ERROR_TYPES = {
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  VALIDATION: 'validation',
  NOT_FOUND: 'not_found',
  BAD_REQUEST: 'bad_request'
}

interface RetryConfig {
  max_attempts: number
  base_delay_ms: number
  max_delay_ms: number
  backoff_multiplier: number
  jitter_factor: number
  timeout_ms: number
}

interface RetryAttempt {
  attempt_number: number
  timestamp: number
  error?: any
  delay_ms?: number
  success: boolean
}

interface RetryResult<T> {
  success: boolean
  data?: T
  error?: any
  attempts: RetryAttempt[]
  total_duration_ms: number
  final_attempt: number
}

interface RetryableError {
  type: string
  retryable: boolean
  retry_after?: number
  message: string
  original_error?: any
}

/**
 * Exponential backoff retry mechanism
 */
export class RetryLogic {
  private config: RetryConfig
  private attempts: RetryAttempt[] = []
  private startTime: number = 0

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...RETRY_CONFIG, ...config }
  }

  /**
   * Executes a function with exponential backoff retry logic
   */
  async execute<T>(
    operation: () => Promise<T>,
    context: string = 'operation'
  ): Promise<RetryResult<T>> {
    this.startTime = Date.now()
    this.attempts = []

    console.log(`[RetryLogic] Starting ${context} with max ${this.config.max_attempts} attempts`)

    for (let attempt = 1; attempt <= this.config.max_attempts; attempt++) {
      const attemptStart = Date.now()
      
      try {
        console.log(`[RetryLogic] ${context} - Attempt ${attempt}/${this.config.max_attempts}`)
        
        // Check if we've exceeded total timeout
        if (this.hasExceededTimeout()) {
          const timeoutError = new Error(`Operation timed out after ${this.config.timeout_ms}ms`)
          this.recordAttempt(attempt, attemptStart, timeoutError, false)
          break
        }

        // Execute the operation
        const result = await operation()
        
        // Record successful attempt
        this.recordAttempt(attempt, attemptStart, null, true)
        
        console.log(`[RetryLogic] ${context} succeeded on attempt ${attempt}`)
        
        return {
          success: true,
          data: result,
          attempts: this.attempts,
          total_duration_ms: Date.now() - this.startTime,
          final_attempt: attempt
        }

      } catch (error) {
        const attemptEnd = Date.now()
        console.warn(`[RetryLogic] ${context} failed on attempt ${attempt}:`, error.message)
        
        // Analyze error to determine if retryable
        const errorAnalysis = this.analyzeError(error)
        
        // Record failed attempt
        this.recordAttempt(attempt, attemptStart, error, false)
        
        // If not retryable or last attempt, return error
        if (!errorAnalysis.retryable || attempt === this.config.max_attempts) {
          console.error(`[RetryLogic] ${context} failed permanently:`, errorAnalysis.message)
          
          return {
            success: false,
            error: error,
            attempts: this.attempts,
            total_duration_ms: Date.now() - this.startTime,
            final_attempt: attempt
          }
        }
        
        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, errorAnalysis)
        
        console.log(`[RetryLogic] ${context} - Waiting ${delay}ms before retry ${attempt + 1}`)
        
        // Wait before next attempt
        await this.wait(delay)
      }
    }

    // This should never be reached, but just in case
    return {
      success: false,
      error: new Error('Retry logic exhausted all attempts'),
      attempts: this.attempts,
      total_duration_ms: Date.now() - this.startTime,
      final_attempt: this.config.max_attempts
    }
  }

  /**
   * Analyzes an error to determine if it's retryable
   */
  private analyzeError(error: any): RetryableError {
    const errorMessage = error.message?.toLowerCase() || ''
    const errorStatus = error.status || error.statusCode || 0
    
    // Check for specific retryable error patterns
    if (this.isNetworkError(errorMessage, errorStatus)) {
      return {
        type: RETRYABLE_ERROR_TYPES.NETWORK,
        retryable: true,
        message: 'Network error - retryable',
        original_error: error
      }
    }
    
    if (this.isServerError(errorMessage, errorStatus)) {
      return {
        type: RETRYABLE_ERROR_TYPES.SERVER,
        retryable: true,
        message: 'Server error - retryable',
        original_error: error
      }
    }
    
    if (this.isRateLimitError(errorMessage, errorStatus)) {
      return {
        type: RETRYABLE_ERROR_TYPES.RATE_LIMIT,
        retryable: true,
        retry_after: error.retry_after || 60000, // Default 1 minute
        message: 'Rate limit error - retryable',
        original_error: error
      }
    }
    
    if (this.isTimeoutError(errorMessage, errorStatus)) {
      return {
        type: RETRYABLE_ERROR_TYPES.TIMEOUT,
        retryable: true,
        message: 'Timeout error - retryable',
        original_error: error
      }
    }
    
    if (this.isThrottleError(errorMessage, errorStatus)) {
      return {
        type: RETRYABLE_ERROR_TYPES.THROTTLE,
        retryable: true,
        message: 'Throttle error - retryable',
        original_error: error
      }
    }
    
    // Check for non-retryable errors
    if (this.isAuthenticationError(errorMessage, errorStatus)) {
      return {
        type: NON_RETRYABLE_ERROR_TYPES.AUTHENTICATION,
        retryable: false,
        message: 'Authentication error - not retryable',
        original_error: error
      }
    }
    
    if (this.isAuthorizationError(errorMessage, errorStatus)) {
      return {
        type: NON_RETRYABLE_ERROR_TYPES.AUTHORIZATION,
        retryable: false,
        message: 'Authorization error - not retryable',
        original_error: error
      }
    }
    
    if (this.isValidationError(errorMessage, errorStatus)) {
      return {
        type: NON_RETRYABLE_ERROR_TYPES.VALIDATION,
        retryable: false,
        message: 'Validation error - not retryable',
        original_error: error
      }
    }
    
    if (this.isNotFoundError(errorMessage, errorStatus)) {
      return {
        type: NON_RETRYABLE_ERROR_TYPES.NOT_FOUND,
        retryable: false,
        message: 'Not found error - not retryable',
        original_error: error
      }
    }
    
    if (this.isBadRequestError(errorMessage, errorStatus)) {
      return {
        type: NON_RETRYABLE_ERROR_TYPES.BAD_REQUEST,
        retryable: false,
        message: 'Bad request error - not retryable',
        original_error: error
      }
    }
    
    // Default to retryable for unknown errors
    return {
      type: 'unknown',
      retryable: true,
      message: 'Unknown error - defaulting to retryable',
      original_error: error
    }
  }

  /**
   * Calculates delay for next retry attempt
   */
  private calculateDelay(attempt: number, errorAnalysis: RetryableError): number {
    // Use retry_after if provided (e.g., for rate limits)
    if (errorAnalysis.retry_after) {
      return Math.min(errorAnalysis.retry_after, this.config.max_delay_ms)
    }
    
    // Calculate exponential backoff delay
    const exponentialDelay = this.config.base_delay_ms * Math.pow(this.config.backoff_multiplier, attempt - 1)
    
    // Apply jitter to prevent thundering herd
    const jitter = exponentialDelay * this.config.jitter_factor * Math.random()
    const delay = exponentialDelay + jitter
    
    // Cap at maximum delay
    return Math.min(delay, this.config.max_delay_ms)
  }

  /**
   * Records a retry attempt
   */
  private recordAttempt(attempt: number, startTime: number, error: any, success: boolean): void {
    const attemptRecord: RetryAttempt = {
      attempt_number: attempt,
      timestamp: startTime,
      error: error,
      success: success
    }
    
    // Add delay information for failed attempts (except the last one)
    if (!success && attempt < this.config.max_attempts) {
      const errorAnalysis = this.analyzeError(error)
      attemptRecord.delay_ms = this.calculateDelay(attempt, errorAnalysis)
    }
    
    this.attempts.push(attemptRecord)
  }

  /**
   * Waits for specified delay
   */
  private async wait(delayMs: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, delayMs))
  }

  /**
   * Checks if total timeout has been exceeded
   */
  private hasExceededTimeout(): boolean {
    return (Date.now() - this.startTime) > this.config.timeout_ms
  }

  /**
   * Error type detection methods
   */
  private isNetworkError(message: string, status: number): boolean {
    const networkPatterns = ['econnreset', 'enotfound', 'econnrefused', 'etimedout', 'network', 'connection']
    return networkPatterns.some(pattern => message.includes(pattern)) || status === 0
  }
  
  private isServerError(message: string, status: number): boolean {
    return status >= 500 && status < 600
  }
  
  private isRateLimitError(message: string, status: number): boolean {
    const rateLimitPatterns = ['rate limit', 'too many requests', 'quota exceeded', 'throttle']
    return status === 429 || rateLimitPatterns.some(pattern => message.includes(pattern))
  }
  
  private isTimeoutError(message: string, status: number): boolean {
    const timeoutPatterns = ['timeout', 'timed out', 'etimedout']
    return timeoutPatterns.some(pattern => message.includes(pattern)) || status === 408
  }
  
  private isThrottleError(message: string, status: number): boolean {
    const throttlePatterns = ['throttle', 'throttled', 'rate limit']
    return throttlePatterns.some(pattern => message.includes(pattern))
  }
  
  private isAuthenticationError(message: string, status: number): boolean {
    const authPatterns = ['unauthorized', 'authentication', 'invalid credentials', 'api key']
    return status === 401 || authPatterns.some(pattern => message.includes(pattern))
  }
  
  private isAuthorizationError(message: string, status: number): boolean {
    const authzPatterns = ['forbidden', 'access denied', 'insufficient permissions']
    return status === 403 || authzPatterns.some(pattern => message.includes(pattern))
  }
  
  private isValidationError(message: string, status: number): boolean {
    const validationPatterns = ['validation', 'invalid', 'malformed', 'bad request']
    return status === 400 || validationPatterns.some(pattern => message.includes(pattern))
  }
  
  private isNotFoundError(message: string, status: number): boolean {
    const notFoundPatterns = ['not found', '404', 'does not exist']
    return status === 404 || notFoundPatterns.some(pattern => message.includes(pattern))
  }
  
  private isBadRequestError(message: string, status: number): boolean {
    return status === 400
  }

  /**
   * Gets retry statistics
   */
  getRetryStats(): {
    total_attempts: number
    successful_attempts: number
    failed_attempts: number
    total_duration_ms: number
    average_attempt_duration_ms: number
    retry_success_rate: number
  } {
    const totalAttempts = this.attempts.length
    const successfulAttempts = this.attempts.filter(a => a.success).length
    const failedAttempts = totalAttempts - successfulAttempts
    const totalDuration = Date.now() - this.startTime
    const averageDuration = totalAttempts > 0 ? totalDuration / totalAttempts : 0
    const successRate = totalAttempts > 0 ? (successfulAttempts / totalAttempts) * 100 : 0

    return {
      total_attempts: totalAttempts,
      successful_attempts: successfulAttempts,
      failed_attempts: failedAttempts,
      total_duration_ms: totalDuration,
      average_attempt_duration_ms: Math.round(averageDuration),
      retry_success_rate: Math.round(successRate * 100) / 100
    }
  }

  /**
   * Resets retry state
   */
  reset(): void {
    this.attempts = []
    this.startTime = 0
  }
}

/**
 * Global retry logic instance
 */
export const globalRetryLogic = new RetryLogic()

/**
 * Executes an operation with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  context: string = 'operation',
  config?: Partial<RetryConfig>
): Promise<RetryResult<T>> {
  const retryLogic = config ? new RetryLogic(config) : globalRetryLogic
  return await retryLogic.execute(operation, context)
}

/**
 * Creates a retry logic instance with custom configuration
 */
export function createRetryLogic(config: Partial<RetryConfig>): RetryLogic {
  return new RetryLogic(config)
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: any): boolean {
  const retryLogic = new RetryLogic()
  const analysis = (retryLogic as any).analyzeError(error)
  return analysis.retryable
}

/**
 * Gets retry delay for an error
 */
export function getRetryDelay(error: any, attempt: number = 1): number {
  const retryLogic = new RetryLogic()
  const analysis = (retryLogic as any).analyzeError(error)
  return (retryLogic as any).calculateDelay(attempt, analysis)
}

/**
 * Formats retry result for logging
 */
export function formatRetryResult<T>(result: RetryResult<T>): string {
  const stats = {
    success: result.success,
    attempts: result.final_attempt,
    duration: result.total_duration_ms,
    error: result.error?.message || 'None'
  }
  
  return `Retry Result: ${JSON.stringify(stats)}`
}

/**
 * Gets retry configuration
 */
export function getRetryConfig(): RetryConfig {
  return { ...RETRY_CONFIG }
}

/**
 * Updates retry configuration
 */
export function updateRetryConfig(config: Partial<RetryConfig>): void {
  Object.assign(RETRY_CONFIG, config)
}
