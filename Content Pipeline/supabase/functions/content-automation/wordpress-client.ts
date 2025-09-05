// WordPress REST API client for draft post creation
// PRD Reference: WordPress Integration (C1-C3), Data & Security (E1), Performance & Scalability (F3)

import { WordPressPostRequest, WordPressPostResponse } from './types.ts'
import { WordPressAuthManager, createWordPressAuthManager } from './wordpress-auth.ts'
import { WordPressTaxonomyManager, createWordPressTaxonomyManager } from './wordpress-taxonomy.ts'
import { 
  canMakeWordPressRequest, 
  recordWordPressRequest, 
  waitForWordPressRateLimit 
} from './rate-limiter.ts'
import { validateWordPressResponse } from './api-validator.ts'
import { executeWithRetry } from './retry-logic.ts'
import { 
  createWordPressUnavailabilityHandler,
  checkWordPressUnavailability,
  requeueJobForWordPressUnavailability
} from './wordpress-unavailability-handler.ts'

// WordPress API configuration
const WORDPRESS_BASE_URL = Deno.env.get('WORDPRESS_BASE_URL')
const WORDPRESS_USERNAME = Deno.env.get('WORDPRESS_USERNAME') || 'content-bot'
const WORDPRESS_APP_PASSWORD = Deno.env.get('WORDPRESS_APP_PASSWORD')
const WORDPRESS_DEFAULT_AUTHOR_ID = parseInt(Deno.env.get('WORDPRESS_DEFAULT_AUTHOR_ID') || '1')

// WordPress API endpoints
const WORDPRESS_ENDPOINTS = {
  posts: '/wp-json/wp/v2/posts',
  categories: '/wp-json/wp/v2/categories',
  tags: '/wp-json/wp/v2/tags',
  users: '/wp-json/wp/v2/users',
  media: '/wp-json/wp/v2/media'
}

// Rate limiting configuration
const RATE_LIMITS = {
  requests_per_minute: 100,
  requests_per_hour: 1000,
  burst_limit: 10
}

// Request timeout configuration
const REQUEST_TIMEOUT = 30000 // 30 seconds
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second base delay

interface WordPressConfig {
  base_url: string
  username: string
  app_password: string
  default_author_id: number
  timeout_ms: number
  max_retries: number
  retry_delay_ms: number
}

interface WordPressCategory {
  id: number
  name: string
  slug: string
  description: string
  count: number
}

interface WordPressTag {
  id: number
  name: string
  slug: string
  description: string
  count: number
}

interface WordPressUser {
  id: number
  name: string
  slug: string
  description: string
}

interface RateLimitInfo {
  remaining: number
  reset_time: number
  limit: number
}

/**
 * WordPress REST API client for content automation
 */
export class WordPressClient {
  private config: WordPressConfig
  private rateLimitInfo: RateLimitInfo | null = null
  private authManager: WordPressAuthManager
  private taxonomyManager: WordPressTaxonomyManager
  private unavailabilityHandler: any

  constructor(config?: Partial<WordPressConfig>) {
    this.config = {
      base_url: config?.base_url || WORDPRESS_BASE_URL || '',
      username: config?.username || WORDPRESS_USERNAME,
      app_password: config?.app_password || WORDPRESS_APP_PASSWORD || '',
      default_author_id: config?.default_author_id || WORDPRESS_DEFAULT_AUTHOR_ID,
      timeout_ms: config?.timeout_ms || REQUEST_TIMEOUT,
      max_retries: config?.max_retries || MAX_RETRIES,
      retry_delay_ms: config?.retry_delay_ms || RETRY_DELAY
    }

    if (!this.config.base_url) {
      throw new Error('WordPress base URL not found in environment variables')
    }

    if (!this.config.app_password) {
      throw new Error('WordPress app password not found in environment variables')
    }

    // Ensure base URL doesn't end with slash
    this.config.base_url = this.config.base_url.replace(/\/$/, '')
    
    // Initialize authentication manager
    this.authManager = createWordPressAuthManager()
    
    // Initialize taxonomy manager
    this.taxonomyManager = createWordPressTaxonomyManager()
    
    // Initialize unavailability handler
    this.unavailabilityHandler = createWordPressUnavailabilityHandler(this.config.base_url)
  }

  /**
   * Creates a draft post in WordPress
   */
  async createDraftPost(request: WordPressPostRequest): Promise<WordPressPostResponse> {
    const startTime = Date.now()
    
    try {
      console.log(`[WordPress] Creating draft post: ${request.title}`)
      
      // Validate authentication first
      const authResult = await this.authManager.validateAppPassword()
      if (!authResult.success) {
        return {
          success: false,
          error: `Authentication failed: ${authResult.error}`,
          status_code: authResult.status_code || 401
        }
      }
      
      // Validate request
      const validation = this.validatePostRequest(request)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          status_code: 400
        }
      }

      // Check rate limits
      const rateLimitCheck = await canMakeWordPressRequest()
      if (!rateLimitCheck.allowed) {
        console.log(`[WordPress] Rate limit check failed: ${rateLimitCheck.reason}`)
        
        // Wait for rate limit reset
        if (rateLimitCheck.waitTime) {
          console.log(`[WordPress] Waiting ${rateLimitCheck.waitTime}ms for rate limit reset`)
          await waitForWordPressRateLimit()
        } else {
          return {
            success: false,
            error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
            status_code: 429
          }
        }
      }

      // Prepare post data
      const postData = await this.preparePostData(request)
      
      // Create the post with retries
      const response = await this.makeAPIRequestWithRetry(
        'POST',
        WORDPRESS_ENDPOINTS.posts,
        postData
      )

      // Parse response
      const postResponse = this.parsePostResponse(response)
      
      const duration = Date.now() - startTime
      console.log(`[WordPress] Draft post created successfully in ${duration}ms`)
      console.log(`[WordPress] Post ID: ${postResponse.post_id}, URL: ${postResponse.post_url}`)

      // Record successful request
      recordWordPressRequest(duration, true)

      return {
        success: true,
        post_id: postResponse.post_id,
        post_url: postResponse.post_url,
        status_code: 201
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[WordPress] Failed to create draft post after ${duration}ms:`, error)
      
      // Record failed request
      recordWordPressRequest(duration, false)
      
      // Check for WordPress unavailability
      const unavailabilityResult = await this.unavailabilityHandler.checkWordPressUnavailability(error)
      
      if (unavailabilityResult.is_unavailable) {
        console.log(`[WordPress] WordPress unavailability detected: ${unavailabilityResult.reason}`)
        
        return {
          success: false,
          error: `WordPress unavailable: ${unavailabilityResult.reason}`,
          status_code: error.status || 503,
          retryable: unavailabilityResult.should_requeue,
          retry_after: unavailabilityResult.retry_after,
          unavailability: {
            is_unavailable: true,
            reason: unavailabilityResult.reason,
            error_type: unavailabilityResult.error_type,
            should_requeue: unavailabilityResult.should_requeue,
            requeue_delay: unavailabilityResult.requeue_delay
          }
        }
      }
      
      return {
        success: false,
        error: error.message,
        status_code: error.status || 500,
        retryable: error.retryable || false
      }
    }
  }

  /**
   * Updates an existing WordPress post
   */
  async updatePost(postId: number, request: Partial<WordPressPostRequest>): Promise<WordPressPostResponse> {
    const startTime = Date.now()
    
    try {
      console.log(`[WordPress] Updating post ID: ${postId}`)
      
      // Check rate limits
      await this.checkRateLimit()

      // Prepare update data
      const updateData = await this.preparePostData(request as WordPressPostRequest)
      
      // Update the post with retries
      const response = await this.makeAPIRequestWithRetry(
        'PUT',
        `${WORDPRESS_ENDPOINTS.posts}/${postId}`,
        updateData
      )

      // Parse response
      const postResponse = this.parsePostResponse(response)
      
      const duration = Date.now() - startTime
      console.log(`[WordPress] Post updated successfully in ${duration}ms`)

      return {
        success: true,
        post_id: postResponse.post_id,
        post_url: postResponse.post_url,
        status_code: 200
      }

    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`[WordPress] Failed to update post after ${duration}ms:`, error)
      
      return {
        success: false,
        error: error.message,
        status_code: error.status || 500
      }
    }
  }

  /**
   * Gets available categories
   */
  async getCategories(): Promise<WordPressCategory[]> {
    try {
      console.log('[WordPress] Fetching categories')
      
      const response = await this.makeAPIRequestWithRetry(
        'GET',
        WORDPRESS_ENDPOINTS.categories
      )

      return response.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description || '',
        count: cat.count || 0
      }))

    } catch (error) {
      console.error('[WordPress] Failed to fetch categories:', error)
      return []
    }
  }

  /**
   * Gets available tags
   */
  async getTags(): Promise<WordPressTag[]> {
    try {
      console.log('[WordPress] Fetching tags')
      
      const response = await this.makeAPIRequestWithRetry(
        'GET',
        WORDPRESS_ENDPOINTS.tags
      )

      return response.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        description: tag.description || '',
        count: tag.count || 0
      }))

    } catch (error) {
      console.error('[WordPress] Failed to fetch tags:', error)
      return []
    }
  }

  /**
   * Gets WordPress users
   */
  async getUsers(): Promise<WordPressUser[]> {
    try {
      console.log('[WordPress] Fetching users')
      
      const response = await this.makeAPIRequestWithRetry(
        'GET',
        WORDPRESS_ENDPOINTS.users
      )

      return response.map((user: any) => ({
        id: user.id,
        name: user.name,
        slug: user.slug,
        description: user.description || ''
      }))

    } catch (error) {
      console.error('[WordPress] Failed to fetch users:', error)
      return []
    }
  }

  /**
   * Validates post request
   */
  private validatePostRequest(request: WordPressPostRequest): { valid: boolean; error?: string } {
    if (!request.title || request.title.trim().length === 0) {
      return { valid: false, error: 'Post title is required' }
    }

    if (!request.content || request.content.trim().length === 0) {
      return { valid: false, error: 'Post content is required' }
    }

    if (request.title.length > 200) {
      return { valid: false, error: 'Post title is too long (maximum 200 characters)' }
    }

    if (request.content.length > 100000) {
      return { valid: false, error: 'Post content is too long (maximum 100,000 characters)' }
    }

    if (request.status && !['draft', 'publish', 'private'].includes(request.status)) {
      return { valid: false, error: 'Invalid post status. Must be draft, publish, or private' }
    }

    return { valid: true }
  }

  /**
   * Prepares post data for WordPress API
   */
  private async preparePostData(request: WordPressPostRequest): Promise<any> {
    const postData: any = {
      title: request.title,
      content: request.content,
      status: request.status || 'draft',
      author: request.author_id || this.config.default_author_id
    }

    // Handle categories using taxonomy manager
    if (request.categories && request.categories.length > 0) {
      const categoryIds = await this.taxonomyManager.resolveCategories(request.categories)
      if (categoryIds.length > 0) {
        postData.categories = categoryIds
      }
    }

    // Handle tags using taxonomy manager
    if (request.tags && request.tags.length > 0) {
      const tagIds = await this.taxonomyManager.resolveTags(request.tags)
      if (tagIds.length > 0) {
        postData.tags = tagIds
      }
    }

    return postData
  }


  /**
   * Makes API request with retry logic
   */
  private async makeAPIRequestWithRetry(
    method: string,
    endpoint: string,
    data?: any
  ): Promise<any> {
    const operation = async () => {
      return await this.makeAPIRequest(method, endpoint, data)
    }

    // Execute with retry logic
    const retryResult = await executeWithRetry(
      operation,
      `WordPress API request: ${method} ${endpoint}`,
      {
        max_attempts: this.config.max_retries,
        base_delay_ms: 1000,
        max_delay_ms: 10000,
        timeout_ms: 60000
      }
    )

    if (!retryResult.success) {
      console.error(`[WordPress] API request failed after ${retryResult.final_attempt} attempts:`, retryResult.error?.message)
      throw retryResult.error || new Error('WordPress API request failed')
    }

    console.log(`[WordPress] API request succeeded on attempt ${retryResult.final_attempt}`)
    return retryResult.data
  }

  /**
   * Makes a single API request
   */
  private async makeAPIRequest(method: string, endpoint: string, data?: any): Promise<any> {
    const url = `${this.config.base_url}${endpoint}`
    const requestStart = Date.now()
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${this.config.username}:${this.config.app_password}`)}`
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(this.config.timeout_ms)
    }

    if (data && (method === 'POST' || method === 'PUT')) {
      requestOptions.body = JSON.stringify(data)
    }

    const response = await fetch(url, requestOptions)

    // Update rate limit info from headers
    this.updateRateLimitInfo(response.headers)

    // Validate response using API validator
    const responseTime = Date.now() - requestStart
    const validationResult = await validateWordPressResponse(response, responseTime)
    
    if (!validationResult.success) {
      const error = new Error(validationResult.error?.message || 'WordPress API validation failed')
      ;(error as any).status = validationResult.status_code
      ;(error as any).retryable = validationResult.error?.retryable
      ;(error as any).retry_after = validationResult.retry_after
      throw error
    }

    return validationResult.data
  }

  /**
   * Parses WordPress post response
   */
  private parsePostResponse(response: any): { post_id: number; post_url: string } {
    if (!response.id) {
      throw new Error('Invalid WordPress response: missing post ID')
    }

    return {
      post_id: response.id,
      post_url: response.link || response.guid?.rendered || ''
    }
  }

  /**
   * Updates rate limit information from response headers
   */
  private updateRateLimitInfo(headers: Headers): void {
    const remaining = headers.get('X-RateLimit-Remaining')
    const resetTime = headers.get('X-RateLimit-Reset')
    const limit = headers.get('X-RateLimit-Limit')

    if (remaining && resetTime && limit) {
      this.rateLimitInfo = {
        remaining: parseInt(remaining),
        reset_time: parseInt(resetTime),
        limit: parseInt(limit)
      }
    }
  }


  /**
   * Gets current rate limit information
   */
  getRateLimitInfo(): any {
    return this.rateLimitInfo
  }

  /**
   * Gets the authenticated user information
   */
  async getAuthenticatedUser(): Promise<any> {
    return await this.authManager.getAuthenticatedUser()
  }

  /**
   * Clears authentication cache
   */
  clearAuthCache(): void {
    this.authManager.clearAuthCache()
  }

  /**
   * Gets taxonomy manager
   */
  getTaxonomyManager(): WordPressTaxonomyManager {
    return this.taxonomyManager
  }

  /**
   * Refreshes taxonomy data
   */
  async refreshTaxonomies(): Promise<void> {
    await this.taxonomyManager.refreshTaxonomies()
  }

  /**
   * Tests WordPress connection and authentication
   */
  async testConnection(): Promise<{ success: boolean; error?: string; user?: any }> {
    try {
      console.log('[WordPress] Testing connection and authentication')
      
      // Test authentication
      const authResult = await this.authManager.testAuthentication()
      if (!authResult.success) {
        return { success: false, error: authResult.error }
      }
      
      console.log('[WordPress] Connection and authentication test successful')
      return { 
        success: true, 
        user: authResult.user,
        error: undefined
      }

    } catch (error) {
      console.error('[WordPress] Connection test failed:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Requeues a job due to WordPress unavailability
   */
  async requeueJobForUnavailability(
    jobId: string,
    error: any,
    retryCount: number
  ): Promise<{
    success: boolean
    job_id: string
    new_status: string
    requeue_reason: string
    retry_count: number
    next_retry_at?: string
    error?: string
  }> {
    try {
      console.log(`[WordPress] Requeuing job ${jobId} due to unavailability...`)
      
      return await this.unavailabilityHandler.requeueJobForWordPressUnavailability(
        jobId,
        error,
        retryCount
      )
      
    } catch (error) {
      console.error(`[WordPress] Failed to requeue job ${jobId}:`, error)
      
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
   * Gets WordPress availability status
   */
  getAvailabilityStatus(): any {
    return this.unavailabilityHandler.getAvailabilityStatus()
  }

  /**
   * Checks if WordPress circuit breaker is open
   */
  isCircuitBreakerOpen(): boolean {
    return this.unavailabilityHandler.isCircuitBreakerOpen()
  }

  /**
   * Resets WordPress circuit breaker
   */
  resetCircuitBreaker(): void {
    this.unavailabilityHandler.resetCircuitBreaker()
  }
}

/**
 * Creates WordPress client with default configuration
 */
export function createWordPressClient(): WordPressClient {
  return new WordPressClient()
}

/**
 * Creates a draft post in WordPress (main function for orchestration)
 */
export async function postToWordPress(
  title: string,
  content: string,
  tags?: string[],
  categories?: string[],
  authorId?: number
): Promise<WordPressPostResponse> {
  try {
    const client = createWordPressClient()
    
    const request: WordPressPostRequest = {
      title,
      content,
      status: 'draft', // Always create as draft per PRD requirement
      tags,
      categories,
      author_id: authorId
    }

    return await client.createDraftPost(request)
  } catch (error) {
    console.error('Error in postToWordPress:', error)
    return {
      success: false,
      error: error.message,
      status_code: 500
    }
  }
}

/**
 * Gets WordPress configuration
 */
export function getWordPressConfig(): WordPressConfig {
  return {
    base_url: WORDPRESS_BASE_URL || '',
    username: WORDPRESS_USERNAME,
    app_password: WORDPRESS_APP_PASSWORD || '',
    default_author_id: WORDPRESS_DEFAULT_AUTHOR_ID,
    timeout_ms: REQUEST_TIMEOUT,
    max_retries: MAX_RETRIES,
    retry_delay_ms: RETRY_DELAY
  }
}

/**
 * Validates WordPress configuration
 */
export function validateWordPressConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!WORDPRESS_BASE_URL) {
    errors.push('WORDPRESS_BASE_URL environment variable is required')
  }

  if (!WORDPRESS_APP_PASSWORD) {
    errors.push('WORDPRESS_APP_PASSWORD environment variable is required')
  }

  if (WORDPRESS_BASE_URL && !WORDPRESS_BASE_URL.startsWith('http')) {
    errors.push('WORDPRESS_BASE_URL must be a valid HTTP/HTTPS URL')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
