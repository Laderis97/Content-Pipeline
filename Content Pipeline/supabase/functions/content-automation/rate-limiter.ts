// Rate limiting compliance for OpenAI and WordPress APIs
// PRD Reference: Performance & Scalability (F3), Error Handling & Monitoring (D1-D3)

// Rate limiting configuration
const RATE_LIMITS = {
  openai: {
    requests_per_minute: 60, // OpenAI free tier: 60 requests/minute
    requests_per_hour: 3600, // OpenAI free tier: 3,600 requests/hour
    tokens_per_minute: 150000, // OpenAI free tier: 150K tokens/minute
    tokens_per_hour: 9000000, // OpenAI free tier: 9M tokens/hour
    burst_limit: 10, // Burst requests allowed
    burst_window_ms: 10000 // 10 second burst window
  },
  wordpress: {
    requests_per_minute: 100, // WordPress typical limit: 100 requests/minute
    requests_per_hour: 1000, // WordPress typical limit: 1,000 requests/hour
    burst_limit: 20, // Burst requests allowed
    burst_window_ms: 5000 // 5 second burst window
  }
}

interface RateLimitInfo {
  service: 'openai' | 'wordpress'
  remaining: number
  reset_time: number
  limit: number
  burst_remaining: number
  burst_reset_time: number
}

interface RateLimitConfig {
  requests_per_minute: number
  requests_per_hour: number
  tokens_per_minute?: number
  tokens_per_hour?: number
  burst_limit: number
  burst_window_ms: number
}

interface RequestMetrics {
  timestamp: number
  tokens_used?: number
  response_time_ms: number
  success: boolean
}

interface ServiceMetrics {
  requests: RequestMetrics[]
  total_requests: number
  total_tokens: number
  successful_requests: number
  failed_requests: number
  avg_response_time: number
}

/**
 * Rate limiter for API compliance
 */
export class RateLimiter {
  private metrics: Map<string, ServiceMetrics> = new Map()
  private rateLimitInfo: Map<string, RateLimitInfo> = new Map()
  private config: Map<string, RateLimitConfig> = new Map()

  constructor() {
    this.initializeConfigs()
  }

  /**
   * Checks if a request can be made without exceeding rate limits
   */
  async canMakeRequest(
    service: 'openai' | 'wordpress',
    estimatedTokens?: number
  ): Promise<{ allowed: boolean; waitTime?: number; reason?: string }> {
    try {
      const serviceMetrics = this.getServiceMetrics(service)
      const config = this.config.get(service)!
      const now = Date.now()

      // Check burst limit
      const burstCheck = this.checkBurstLimit(service, now)
      if (!burstCheck.allowed) {
        return {
          allowed: false,
          waitTime: burstCheck.waitTime,
          reason: `Burst limit exceeded. ${burstCheck.remaining} requests remaining in burst window.`
        }
      }

      // Check per-minute limit
      const minuteCheck = this.checkPerMinuteLimit(service, now)
      if (!minuteCheck.allowed) {
        return {
          allowed: false,
          waitTime: minuteCheck.waitTime,
          reason: `Per-minute limit exceeded. ${minuteCheck.remaining} requests remaining.`
        }
      }

      // Check per-hour limit
      const hourCheck = this.checkPerHourLimit(service, now)
      if (!hourCheck.allowed) {
        return {
          allowed: false,
          waitTime: hourCheck.waitTime,
          reason: `Per-hour limit exceeded. ${hourCheck.remaining} requests remaining.`
        }
      }

      // Check token limits (OpenAI only)
      if (service === 'openai' && estimatedTokens) {
        const tokenCheck = this.checkTokenLimits(service, estimatedTokens, now)
        if (!tokenCheck.allowed) {
          return {
            allowed: false,
            waitTime: tokenCheck.waitTime,
            reason: `Token limit exceeded. ${tokenCheck.remaining} tokens remaining.`
          }
        }
      }

      return { allowed: true }

    } catch (error) {
      console.error(`[RateLimiter] Error checking rate limits for ${service}:`, error)
      // Allow request on error to avoid blocking legitimate requests
      return { allowed: true }
    }
  }

  /**
   * Records a request and updates metrics
   */
  recordRequest(
    service: 'openai' | 'wordpress',
    tokensUsed?: number,
    responseTimeMs: number = 0,
    success: boolean = true
  ): void {
    try {
      const serviceMetrics = this.getServiceMetrics(service)
      const now = Date.now()

      // Add request to metrics
      serviceMetrics.requests.push({
        timestamp: now,
        tokens_used: tokensUsed,
        response_time_ms: responseTimeMs,
        success
      })

      // Update totals
      serviceMetrics.total_requests++
      if (tokensUsed) {
        serviceMetrics.total_tokens += tokensUsed
      }
      if (success) {
        serviceMetrics.successful_requests++
      } else {
        serviceMetrics.failed_requests++
      }

      // Update average response time
      const totalResponseTime = serviceMetrics.requests.reduce(
        (sum, req) => sum + req.response_time_ms, 0
      )
      serviceMetrics.avg_response_time = totalResponseTime / serviceMetrics.requests.length

      // Clean up old requests (keep only last hour)
      this.cleanupOldRequests(service, now)

      // Update rate limit info
      this.updateRateLimitInfo(service, now)

    } catch (error) {
      console.error(`[RateLimiter] Error recording request for ${service}:`, error)
    }
  }

  /**
   * Waits for rate limit reset if necessary
   */
  async waitForRateLimit(
    service: 'openai' | 'wordpress',
    estimatedTokens?: number
  ): Promise<void> {
    const check = await this.canMakeRequest(service, estimatedTokens)
    
    if (!check.allowed && check.waitTime) {
      console.log(`[RateLimiter] Waiting ${check.waitTime}ms for ${service} rate limit reset: ${check.reason}`)
      await new Promise(resolve => setTimeout(resolve, check.waitTime))
    }
  }

  /**
   * Gets current rate limit information
   */
  getRateLimitInfo(service: 'openai' | 'wordpress'): RateLimitInfo | null {
    return this.rateLimitInfo.get(service) || null
  }

  /**
   * Gets service metrics
   */
  getServiceMetrics(service: 'openai' | 'wordpress'): ServiceMetrics {
    if (!this.metrics.has(service)) {
      this.metrics.set(service, {
        requests: [],
        total_requests: 0,
        total_tokens: 0,
        successful_requests: 0,
        failed_requests: 0,
        avg_response_time: 0
      })
    }
    return this.metrics.get(service)!
  }

  /**
   * Gets rate limit statistics
   */
  getRateLimitStats(service: 'openai' | 'wordpress'): {
    requests_last_minute: number
    requests_last_hour: number
    tokens_last_minute: number
    tokens_last_hour: number
    success_rate: number
    avg_response_time: number
    rate_limit_utilization: number
  } {
    const serviceMetrics = this.getServiceMetrics(service)
    const config = this.config.get(service)!
    const now = Date.now()

    // Calculate requests in last minute and hour
    const minuteAgo = now - 60000
    const hourAgo = now - 3600000

    const requestsLastMinute = serviceMetrics.requests.filter(
      req => req.timestamp >= minuteAgo
    ).length

    const requestsLastHour = serviceMetrics.requests.filter(
      req => req.timestamp >= hourAgo
    ).length

    // Calculate tokens in last minute and hour
    const tokensLastMinute = serviceMetrics.requests
      .filter(req => req.timestamp >= minuteAgo && req.tokens_used)
      .reduce((sum, req) => sum + (req.tokens_used || 0), 0)

    const tokensLastHour = serviceMetrics.requests
      .filter(req => req.timestamp >= hourAgo && req.tokens_used)
      .reduce((sum, req) => sum + (req.tokens_used || 0), 0)

    // Calculate success rate
    const successRate = serviceMetrics.total_requests > 0 
      ? (serviceMetrics.successful_requests / serviceMetrics.total_requests) * 100
      : 100

    // Calculate rate limit utilization
    const rateLimitUtilization = Math.max(
      (requestsLastMinute / config.requests_per_minute) * 100,
      (requestsLastHour / config.requests_per_hour) * 100
    )

    return {
      requests_last_minute: requestsLastMinute,
      requests_last_hour: requestsLastHour,
      tokens_last_minute: tokensLastMinute,
      tokens_last_hour: tokensLastHour,
      success_rate: Math.round(successRate * 100) / 100,
      avg_response_time: Math.round(serviceMetrics.avg_response_time * 100) / 100,
      rate_limit_utilization: Math.round(rateLimitUtilization * 100) / 100
    }
  }

  /**
   * Checks burst limit
   */
  private checkBurstLimit(
    service: 'openai' | 'wordpress',
    now: number
  ): { allowed: boolean; remaining: number; waitTime?: number } {
    const serviceMetrics = this.getServiceMetrics(service)
    const config = this.config.get(service)!
    const burstWindow = config.burst_window_ms

    // Count requests in burst window
    const burstRequests = serviceMetrics.requests.filter(
      req => (now - req.timestamp) <= burstWindow
    ).length

    const remaining = Math.max(0, config.burst_limit - burstRequests)
    const allowed = remaining > 0

    let waitTime: number | undefined
    if (!allowed) {
      // Find oldest request in burst window to calculate wait time
      const oldestRequest = serviceMetrics.requests
        .filter(req => (now - req.timestamp) <= burstWindow)
        .sort((a, b) => a.timestamp - b.timestamp)[0]
      
      if (oldestRequest) {
        waitTime = burstWindow - (now - oldestRequest.timestamp)
      }
    }

    return { allowed, remaining, waitTime }
  }

  /**
   * Checks per-minute limit
   */
  private checkPerMinuteLimit(
    service: 'openai' | 'wordpress',
    now: number
  ): { allowed: boolean; remaining: number; waitTime?: number } {
    const serviceMetrics = this.getServiceMetrics(service)
    const config = this.config.get(service)!

    // Count requests in last minute
    const minuteAgo = now - 60000
    const requestsLastMinute = serviceMetrics.requests.filter(
      req => req.timestamp >= minuteAgo
    ).length

    const remaining = Math.max(0, config.requests_per_minute - requestsLastMinute)
    const allowed = remaining > 0

    let waitTime: number | undefined
    if (!allowed) {
      // Find oldest request in last minute to calculate wait time
      const oldestRequest = serviceMetrics.requests
        .filter(req => req.timestamp >= minuteAgo)
        .sort((a, b) => a.timestamp - b.timestamp)[0]
      
      if (oldestRequest) {
        waitTime = 60000 - (now - oldestRequest.timestamp)
      }
    }

    return { allowed, remaining, waitTime }
  }

  /**
   * Checks per-hour limit
   */
  private checkPerHourLimit(
    service: 'openai' | 'wordpress',
    now: number
  ): { allowed: boolean; remaining: number; waitTime?: number } {
    const serviceMetrics = this.getServiceMetrics(service)
    const config = this.config.get(service)!

    // Count requests in last hour
    const hourAgo = now - 3600000
    const requestsLastHour = serviceMetrics.requests.filter(
      req => req.timestamp >= hourAgo
    ).length

    const remaining = Math.max(0, config.requests_per_hour - requestsLastHour)
    const allowed = remaining > 0

    let waitTime: number | undefined
    if (!allowed) {
      // Find oldest request in last hour to calculate wait time
      const oldestRequest = serviceMetrics.requests
        .filter(req => req.timestamp >= hourAgo)
        .sort((a, b) => a.timestamp - b.timestamp)[0]
      
      if (oldestRequest) {
        waitTime = 3600000 - (now - oldestRequest.timestamp)
      }
    }

    return { allowed, remaining, waitTime }
  }

  /**
   * Checks token limits (OpenAI only)
   */
  private checkTokenLimits(
    service: 'openai' | 'wordpress',
    estimatedTokens: number,
    now: number
  ): { allowed: boolean; remaining: number; waitTime?: number } {
    if (service !== 'openai') {
      return { allowed: true, remaining: Infinity }
    }

    const serviceMetrics = this.getServiceMetrics(service)
    const config = this.config.get(service)!

    // Check per-minute token limit
    const minuteAgo = now - 60000
    const tokensLastMinute = serviceMetrics.requests
      .filter(req => req.timestamp >= minuteAgo && req.tokens_used)
      .reduce((sum, req) => sum + (req.tokens_used || 0), 0)

    if (config.tokens_per_minute && (tokensLastMinute + estimatedTokens) > config.tokens_per_minute) {
      return {
        allowed: false,
        remaining: Math.max(0, config.tokens_per_minute - tokensLastMinute),
        waitTime: 60000 // Wait 1 minute
      }
    }

    // Check per-hour token limit
    const hourAgo = now - 3600000
    const tokensLastHour = serviceMetrics.requests
      .filter(req => req.timestamp >= hourAgo && req.tokens_used)
      .reduce((sum, req) => sum + (req.tokens_used || 0), 0)

    if (config.tokens_per_hour && (tokensLastHour + estimatedTokens) > config.tokens_per_hour) {
      return {
        allowed: false,
        remaining: Math.max(0, config.tokens_per_hour - tokensLastHour),
        waitTime: 3600000 // Wait 1 hour
      }
    }

    return { allowed: true, remaining: Infinity }
  }

  /**
   * Updates rate limit information
   */
  private updateRateLimitInfo(service: 'openai' | 'wordpress', now: number): void {
    const config = this.config.get(service)!
    const stats = this.getRateLimitStats(service)

    const rateLimitInfo: RateLimitInfo = {
      service,
      remaining: Math.max(0, config.requests_per_minute - stats.requests_last_minute),
      reset_time: now + 60000, // Reset in 1 minute
      limit: config.requests_per_minute,
      burst_remaining: Math.max(0, config.burst_limit - this.getBurstRequests(service, now)),
      burst_reset_time: now + config.burst_window_ms
    }

    this.rateLimitInfo.set(service, rateLimitInfo)
  }

  /**
   * Gets burst requests count
   */
  private getBurstRequests(service: 'openai' | 'wordpress', now: number): number {
    const serviceMetrics = this.getServiceMetrics(service)
    const config = this.config.get(service)!
    const burstWindow = config.burst_window_ms

    return serviceMetrics.requests.filter(
      req => (now - req.timestamp) <= burstWindow
    ).length
  }

  /**
   * Cleans up old requests
   */
  private cleanupOldRequests(service: 'openai' | 'wordpress', now: number): void {
    const serviceMetrics = this.getServiceMetrics(service)
    const hourAgo = now - 3600000

    serviceMetrics.requests = serviceMetrics.requests.filter(
      req => req.timestamp >= hourAgo
    )
  }

  /**
   * Initializes rate limit configurations
   */
  private initializeConfigs(): void {
    this.config.set('openai', RATE_LIMITS.openai)
    this.config.set('wordpress', RATE_LIMITS.wordpress)
  }

  /**
   * Resets rate limit data
   */
  reset(): void {
    this.metrics.clear()
    this.rateLimitInfo.clear()
    console.log('[RateLimiter] Rate limit data reset')
  }

  /**
   * Gets all rate limit statistics
   */
  getAllStats(): {
    openai: ReturnType<RateLimiter['getRateLimitStats']>
    wordpress: ReturnType<RateLimiter['getRateLimitStats']>
  } {
    return {
      openai: this.getRateLimitStats('openai'),
      wordpress: this.getRateLimitStats('wordpress')
    }
  }
}

/**
 * Global rate limiter instance
 */
export const globalRateLimiter = new RateLimiter()

/**
 * Checks if OpenAI request can be made
 */
export async function canMakeOpenAIRequest(estimatedTokens?: number): Promise<{
  allowed: boolean
  waitTime?: number
  reason?: string
}> {
  return await globalRateLimiter.canMakeRequest('openai', estimatedTokens)
}

/**
 * Checks if WordPress request can be made
 */
export async function canMakeWordPressRequest(): Promise<{
  allowed: boolean
  waitTime?: number
  reason?: string
}> {
  return await globalRateLimiter.canMakeRequest('wordpress')
}

/**
 * Records OpenAI request
 */
export function recordOpenAIRequest(
  tokensUsed?: number,
  responseTimeMs: number = 0,
  success: boolean = true
): void {
  globalRateLimiter.recordRequest('openai', tokensUsed, responseTimeMs, success)
}

/**
 * Records WordPress request
 */
export function recordWordPressRequest(
  responseTimeMs: number = 0,
  success: boolean = true
): void {
  globalRateLimiter.recordRequest('wordpress', undefined, responseTimeMs, success)
}

/**
 * Waits for OpenAI rate limit reset
 */
export async function waitForOpenAIRateLimit(estimatedTokens?: number): Promise<void> {
  await globalRateLimiter.waitForRateLimit('openai', estimatedTokens)
}

/**
 * Waits for WordPress rate limit reset
 */
export async function waitForWordPressRateLimit(): Promise<void> {
  await globalRateLimiter.waitForRateLimit('wordpress')
}

/**
 * Gets rate limit statistics
 */
export function getRateLimitStats(): {
  openai: ReturnType<RateLimiter['getRateLimitStats']>
  wordpress: ReturnType<RateLimiter['getRateLimitStats']>
} {
  return globalRateLimiter.getAllStats()
}

/**
 * Gets rate limit information
 */
export function getRateLimitInfo(service: 'openai' | 'wordpress'): RateLimitInfo | null {
  return globalRateLimiter.getRateLimitInfo(service)
}
