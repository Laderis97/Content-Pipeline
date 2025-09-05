// API response validation and error handling for external services
// PRD Reference: Error Handling & Monitoring (D1-D3), Data & Security (E2)

// API response validation schemas
const OPENAI_RESPONSE_SCHEMA = {
  required_fields: ['id', 'object', 'created', 'model', 'choices'],
  choices_schema: {
    required_fields: ['index', 'message', 'finish_reason'],
    message_schema: {
      required_fields: ['role', 'content']
    }
  },
  usage_schema: {
    required_fields: ['prompt_tokens', 'completion_tokens', 'total_tokens']
  }
}

const WORDPRESS_RESPONSE_SCHEMA = {
  required_fields: ['id', 'date', 'date_gmt', 'guid', 'modified', 'modified_gmt', 'slug', 'status', 'type', 'link', 'title', 'content', 'excerpt', 'author', 'featured_media', 'comment_status', 'ping_status', 'sticky', 'template', 'format', 'meta', 'categories', 'tags', 'permalink_template', 'generated_slug'],
  title_schema: {
    required_fields: ['rendered']
  },
  content_schema: {
    required_fields: ['rendered', 'protected']
  }
}

// Error classification
const ERROR_TYPES = {
  NETWORK: 'network',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  RATE_LIMIT: 'rate_limit',
  VALIDATION: 'validation',
  SERVER: 'server',
  CLIENT: 'client',
  TIMEOUT: 'timeout',
  UNKNOWN: 'unknown'
}

// Retryable error patterns
const RETRYABLE_ERRORS = {
  network: ['ECONNRESET', 'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT'],
  server: ['500', '502', '503', '504'],
  rate_limit: ['429', 'rate limit', 'too many requests'],
  timeout: ['timeout', 'TIMEOUT', 'ETIMEDOUT']
}

interface APIResponse {
  success: boolean
  data?: any
  error?: APIError
  status_code?: number
  response_time_ms?: number
  retry_after?: number
}

interface APIError {
  type: string
  code: string
  message: string
  details?: any
  retryable: boolean
  retry_after?: number
  original_error?: any
}

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  sanitized_data?: any
}

interface ErrorClassification {
  type: string
  retryable: boolean
  retry_after?: number
  user_message: string
  technical_message: string
}

/**
 * API response validator and error handler
 */
export class APIValidator {
  private service: 'openai' | 'wordpress'
  private responseTime: number = 0

  constructor(service: 'openai' | 'wordpress') {
    this.service = service
  }

  /**
   * Validates API response and handles errors
   */
  async validateResponse(
    response: Response,
    responseTime: number = 0
  ): Promise<APIResponse> {
    this.responseTime = responseTime
    
    try {
      // Check HTTP status
      if (!response.ok) {
        return await this.handleErrorResponse(response)
      }

      // Parse response body
      const data = await this.parseResponseBody(response)
      
      // Validate response structure
      const validation = this.validateResponseStructure(data)
      
      if (!validation.valid) {
        return {
          success: false,
          error: {
            type: ERROR_TYPES.VALIDATION,
            code: 'INVALID_RESPONSE_STRUCTURE',
            message: 'API response structure is invalid',
            details: validation.errors,
            retryable: false
          },
          status_code: response.status,
          response_time_ms: responseTime
        }
      }

      // Sanitize response data
      const sanitizedData = this.sanitizeResponseData(data)

      return {
        success: true,
        data: sanitizedData,
        status_code: response.status,
        response_time_ms: responseTime
      }

    } catch (error) {
      return this.handleUnexpectedError(error, responseTime)
    }
  }

  /**
   * Handles error responses
   */
  private async handleErrorResponse(response: Response): Promise<APIResponse> {
    try {
      const errorData = await this.parseResponseBody(response)
      const classification = this.classifyError(response.status, errorData)
      
      return {
        success: false,
        error: {
          type: classification.type,
          code: this.extractErrorCode(errorData),
          message: classification.user_message,
          details: errorData,
          retryable: classification.retryable,
          retry_after: classification.retry_after,
          original_error: errorData
        },
        status_code: response.status,
        response_time_ms: this.responseTime,
        retry_after: classification.retry_after
      }

    } catch (parseError) {
      // If we can't parse the error response, create a generic error
      const classification = this.classifyError(response.status, null)
      
      return {
        success: false,
        error: {
          type: classification.type,
          code: 'UNPARSEABLE_ERROR_RESPONSE',
          message: classification.user_message,
          details: { status: response.status, statusText: response.statusText },
          retryable: classification.retryable,
          retry_after: classification.retry_after
        },
        status_code: response.status,
        response_time_ms: this.responseTime,
        retry_after: classification.retry_after
      }
    }
  }

  /**
   * Parses response body safely
   */
  private async parseResponseBody(response: Response): Promise<any> {
    const contentType = response.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      return await response.json()
    } else if (contentType.includes('text/')) {
      return { text: await response.text() }
    } else {
      return { binary: 'Binary content received' }
    }
  }

  /**
   * Validates response structure based on service
   */
  private validateResponseStructure(data: any): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    if (this.service === 'openai') {
      return this.validateOpenAIResponse(data, errors, warnings)
    } else if (this.service === 'wordpress') {
      return this.validateWordPressResponse(data, errors, warnings)
    }

    return { valid: true, errors, warnings }
  }

  /**
   * Validates OpenAI response structure
   */
  private validateOpenAIResponse(data: any, errors: string[], warnings: string[]): ValidationResult {
    const schema = OPENAI_RESPONSE_SCHEMA

    // Check required top-level fields
    for (const field of schema.required_fields) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`)
      }
    }

    // Validate choices array
    if (data.choices && Array.isArray(data.choices)) {
      if (data.choices.length === 0) {
        errors.push('Choices array is empty')
      } else {
        data.choices.forEach((choice: any, index: number) => {
          for (const field of schema.choices_schema.required_fields) {
            if (!(field in choice)) {
              errors.push(`Missing required field in choice ${index}: ${field}`)
            }
          }

          // Validate message structure
          if (choice.message) {
            for (const field of schema.choices_schema.message_schema.required_fields) {
              if (!(field in choice.message)) {
                errors.push(`Missing required field in choice ${index}.message: ${field}`)
              }
            }
          }
        })
      }
    } else {
      errors.push('Choices field is missing or not an array')
    }

    // Validate usage information
    if (data.usage) {
      for (const field of schema.usage_schema.required_fields) {
        if (!(field in data.usage)) {
          warnings.push(`Missing usage field: ${field}`)
        }
      }
    } else {
      warnings.push('Usage information is missing')
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitized_data: errors.length === 0 ? data : undefined
    }
  }

  /**
   * Validates WordPress response structure
   */
  private validateWordPressResponse(data: any, errors: string[], warnings: string[]): ValidationResult {
    const schema = WORDPRESS_RESPONSE_SCHEMA

    // Check required top-level fields
    for (const field of schema.required_fields) {
      if (!(field in data)) {
        errors.push(`Missing required field: ${field}`)
      }
    }

    // Validate title structure
    if (data.title) {
      for (const field of schema.title_schema.required_fields) {
        if (!(field in data.title)) {
          errors.push(`Missing required field in title: ${field}`)
        }
      }
    }

    // Validate content structure
    if (data.content) {
      for (const field of schema.content_schema.required_fields) {
        if (!(field in data.content)) {
          errors.push(`Missing required field in content: ${field}`)
        }
      }
    }

    // Validate ID is a number
    if (data.id && typeof data.id !== 'number') {
      errors.push('ID field must be a number')
    }

    // Validate status
    if (data.status && !['draft', 'publish', 'private', 'pending'].includes(data.status)) {
      warnings.push(`Unexpected status: ${data.status}`)
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitized_data: errors.length === 0 ? data : undefined
    }
  }

  /**
   * Sanitizes response data
   */
  private sanitizeResponseData(data: any): any {
    if (this.service === 'openai') {
      return this.sanitizeOpenAIResponse(data)
    } else if (this.service === 'wordpress') {
      return this.sanitizeWordPressResponse(data)
    }
    
    return data
  }

  /**
   * Sanitizes OpenAI response data
   */
  private sanitizeOpenAIResponse(data: any): any {
    return {
      id: data.id,
      object: data.object,
      created: data.created,
      model: data.model,
      choices: data.choices?.map((choice: any) => ({
        index: choice.index,
        message: {
          role: choice.message?.role,
          content: choice.message?.content
        },
        finish_reason: choice.finish_reason
      })) || [],
      usage: data.usage ? {
        prompt_tokens: data.usage.prompt_tokens,
        completion_tokens: data.usage.completion_tokens,
        total_tokens: data.usage.total_tokens
      } : undefined
    }
  }

  /**
   * Sanitizes WordPress response data
   */
  private sanitizeWordPressResponse(data: any): any {
    return {
      id: data.id,
      date: data.date,
      date_gmt: data.date_gmt,
      guid: data.guid,
      modified: data.modified,
      modified_gmt: data.modified_gmt,
      slug: data.slug,
      status: data.status,
      type: data.type,
      link: data.link,
      title: data.title,
      content: data.content,
      excerpt: data.excerpt,
      author: data.author,
      featured_media: data.featured_media,
      comment_status: data.comment_status,
      ping_status: data.ping_status,
      sticky: data.sticky,
      template: data.template,
      format: data.format,
      meta: data.meta,
      categories: data.categories,
      tags: data.tags,
      permalink_template: data.permalink_template,
      generated_slug: data.generated_slug
    }
  }

  /**
   * Classifies errors based on status and response
   */
  private classifyError(status: number, errorData: any): ErrorClassification {
    const statusStr = status.toString()
    
    // Rate limit errors
    if (status === 429 || this.isRateLimitError(errorData)) {
      return {
        type: ERROR_TYPES.RATE_LIMIT,
        retryable: true,
        retry_after: this.extractRetryAfter(errorData),
        user_message: 'Rate limit exceeded. Please try again later.',
        technical_message: `Rate limit exceeded: ${status} ${JSON.stringify(errorData)}`
      }
    }

    // Authentication errors
    if (status === 401) {
      return {
        type: ERROR_TYPES.AUTHENTICATION,
        retryable: false,
        user_message: 'Authentication failed. Please check your credentials.',
        technical_message: `Authentication error: ${status} ${JSON.stringify(errorData)}`
      }
    }

    // Authorization errors
    if (status === 403) {
      return {
        type: ERROR_TYPES.AUTHORIZATION,
        retryable: false,
        user_message: 'Access denied. Insufficient permissions.',
        technical_message: `Authorization error: ${status} ${JSON.stringify(errorData)}`
      }
    }

    // Client errors (4xx)
    if (status >= 400 && status < 500) {
      return {
        type: ERROR_TYPES.CLIENT,
        retryable: false,
        user_message: 'Invalid request. Please check your input.',
        technical_message: `Client error: ${status} ${JSON.stringify(errorData)}`
      }
    }

    // Server errors (5xx)
    if (status >= 500) {
      return {
        type: ERROR_TYPES.SERVER,
        retryable: true,
        retry_after: 5000, // 5 seconds default
        user_message: 'Server error. Please try again later.',
        technical_message: `Server error: ${status} ${JSON.stringify(errorData)}`
      }
    }

    // Unknown errors
    return {
      type: ERROR_TYPES.UNKNOWN,
      retryable: false,
      user_message: 'An unexpected error occurred.',
      technical_message: `Unknown error: ${status} ${JSON.stringify(errorData)}`
    }
  }

  /**
   * Checks if error is rate limit related
   */
  private isRateLimitError(errorData: any): boolean {
    if (!errorData) return false
    
    const errorStr = JSON.stringify(errorData).toLowerCase()
    return RETRYABLE_ERRORS.rate_limit.some(pattern => 
      errorStr.includes(pattern.toLowerCase())
    )
  }

  /**
   * Extracts retry-after value from error response
   */
  private extractRetryAfter(errorData: any): number | undefined {
    if (!errorData) return undefined
    
    // Check for retry_after field
    if (errorData.retry_after) {
      return parseInt(errorData.retry_after) * 1000 // Convert to milliseconds
    }
    
    // Check for retryAfter field
    if (errorData.retryAfter) {
      return parseInt(errorData.retryAfter) * 1000
    }
    
    // Default retry after for rate limits
    return 60000 // 1 minute
  }

  /**
   * Extracts error code from error response
   */
  private extractErrorCode(errorData: any): string {
    if (!errorData) return 'UNKNOWN_ERROR'
    
    // Check for error code fields
    if (errorData.code) return errorData.code
    if (errorData.error?.code) return errorData.error.code
    if (errorData.type) return errorData.type
    
    return 'UNKNOWN_ERROR'
  }

  /**
   * Handles unexpected errors during validation
   */
  private handleUnexpectedError(error: any, responseTime: number): APIResponse {
    console.error(`[APIValidator] Unexpected error for ${this.service}:`, error)
    
    return {
      success: false,
      error: {
        type: ERROR_TYPES.UNKNOWN,
        code: 'VALIDATION_ERROR',
        message: 'An unexpected error occurred during response validation',
        details: { error: error.message, stack: error.stack },
        retryable: false,
        original_error: error
      },
      response_time_ms: responseTime
    }
  }
}

/**
 * Creates API validator for OpenAI
 */
export function createOpenAIValidator(): APIValidator {
  return new APIValidator('openai')
}

/**
 * Creates API validator for WordPress
 */
export function createWordPressValidator(): APIValidator {
  return new APIValidator('wordpress')
}

/**
 * Validates OpenAI response
 */
export async function validateOpenAIResponse(
  response: Response,
  responseTime: number = 0
): Promise<APIResponse> {
  const validator = createOpenAIValidator()
  return await validator.validateResponse(response, responseTime)
}

/**
 * Validates WordPress response
 */
export async function validateWordPressResponse(
  response: Response,
  responseTime: number = 0
): Promise<APIResponse> {
  const validator = createWordPressValidator()
  return await validator.validateResponse(response, responseTime)
}

/**
 * Checks if an error is retryable
 */
export function isRetryableError(error: APIError): boolean {
  return error.retryable || false
}

/**
 * Gets retry delay for an error
 */
export function getRetryDelay(error: APIError): number {
  if (error.retry_after) {
    return error.retry_after
  }
  
  // Default retry delays based on error type
  const defaultDelays = {
    [ERROR_TYPES.RATE_LIMIT]: 60000, // 1 minute
    [ERROR_TYPES.SERVER]: 5000, // 5 seconds
    [ERROR_TYPES.NETWORK]: 2000, // 2 seconds
    [ERROR_TYPES.TIMEOUT]: 3000 // 3 seconds
  }
  
  return defaultDelays[error.type] || 1000 // 1 second default
}

/**
 * Formats error for logging
 */
export function formatErrorForLogging(error: APIError): string {
  return `[${error.type.toUpperCase()}] ${error.code}: ${error.message}${error.details ? ` - ${JSON.stringify(error.details)}` : ''}`
}

/**
 * Gets user-friendly error message
 */
export function getUserFriendlyMessage(error: APIError): string {
  return error.message || 'An unexpected error occurred'
}
