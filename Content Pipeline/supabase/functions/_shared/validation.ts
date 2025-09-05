// Shared validation utilities for Edge Functions
// PRD Reference: Configuration & Deployment (6.1)

export interface ValidationRule {
  required?: boolean
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'email' | 'url' | 'uuid'
  minLength?: number
  maxLength?: number
  min?: number
  max?: number
  pattern?: RegExp
  enum?: any[]
  custom?: (value: any) => boolean | string
  message?: string
}

export interface ValidationSchema {
  [key: string]: ValidationRule
}

export interface ValidationResult {
  valid: boolean
  errors: Record<string, string[]>
  warnings: Record<string, string[]>
}

export class Validator {
  private static instance: Validator
  
  private constructor() {}
  
  static getInstance(): Validator {
    if (!Validator.instance) {
      Validator.instance = new Validator()
    }
    return Validator.instance
  }
  
  validate(data: any, schema: ValidationSchema): ValidationResult {
    const errors: Record<string, string[]> = {}
    const warnings: Record<string, string[]> = {}
    
    for (const [field, rule] of Object.entries(schema)) {
      const value = data[field]
      const fieldErrors: string[] = []
      const fieldWarnings: string[] = []
      
      // Required validation
      if (rule.required && (value === undefined || value === null || value === '')) {
        fieldErrors.push(rule.message || `${field} is required`)
        continue
      }
      
      // Skip validation if value is not provided and not required
      if (value === undefined || value === null) {
        continue
      }
      
      // Type validation
      if (rule.type && !this.validateType(value, rule.type)) {
        fieldErrors.push(rule.message || `${field} must be of type ${rule.type}`)
        continue
      }
      
      // String validations
      if (rule.type === 'string' || typeof value === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          fieldErrors.push(rule.message || `${field} must be at least ${rule.minLength} characters long`)
        }
        
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          fieldErrors.push(rule.message || `${field} must be no more than ${rule.maxLength} characters long`)
        }
        
        if (rule.pattern && !rule.pattern.test(value)) {
          fieldErrors.push(rule.message || `${field} format is invalid`)
        }
        
        if (rule.type === 'email' && !this.isValidEmail(value)) {
          fieldErrors.push(rule.message || `${field} must be a valid email address`)
        }
        
        if (rule.type === 'url' && !this.isValidUrl(value)) {
          fieldErrors.push(rule.message || `${field} must be a valid URL`)
        }
        
        if (rule.type === 'uuid' && !this.isValidUuid(value)) {
          fieldErrors.push(rule.message || `${field} must be a valid UUID`)
        }
      }
      
      // Number validations
      if (rule.type === 'number' || typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          fieldErrors.push(rule.message || `${field} must be at least ${rule.min}`)
        }
        
        if (rule.max !== undefined && value > rule.max) {
          fieldErrors.push(rule.message || `${field} must be no more than ${rule.max}`)
        }
      }
      
      // Array validations
      if (rule.type === 'array' || Array.isArray(value)) {
        if (rule.min !== undefined && value.length < rule.min) {
          fieldErrors.push(rule.message || `${field} must have at least ${rule.min} items`)
        }
        
        if (rule.max !== undefined && value.length > rule.max) {
          fieldErrors.push(rule.message || `${field} must have no more than ${rule.max} items`)
        }
      }
      
      // Enum validation
      if (rule.enum && !rule.enum.includes(value)) {
        fieldErrors.push(rule.message || `${field} must be one of: ${rule.enum.join(', ')}`)
      }
      
      // Custom validation
      if (rule.custom) {
        const customResult = rule.custom(value)
        if (customResult !== true) {
          const errorMessage = typeof customResult === 'string' ? customResult : `${field} is invalid`
          fieldErrors.push(rule.message || errorMessage)
        }
      }
      
      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors
      }
      
      if (fieldWarnings.length > 0) {
        warnings[field] = fieldWarnings
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors,
      warnings
    }
  }
  
  private validateType(value: any, type: string): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'array':
        return Array.isArray(value)
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      case 'email':
        return typeof value === 'string' && this.isValidEmail(value)
      case 'url':
        return typeof value === 'string' && this.isValidUrl(value)
      case 'uuid':
        return typeof value === 'string' && this.isValidUuid(value)
      default:
        return true
    }
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }
  
  private isValidUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
  
  private isValidUuid(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(uuid)
  }
  
  // Common validation schemas
  static getJobValidationSchema(): ValidationSchema {
    return {
      topic: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 500,
        message: 'Topic is required and must be between 1 and 500 characters'
      },
      content_type: {
        required: true,
        type: 'string',
        enum: ['blog_post', 'product_description'],
        message: 'Content type must be either blog_post or product_description'
      },
      prompt_template: {
        type: 'string',
        maxLength: 2000,
        message: 'Prompt template must be no more than 2000 characters'
      },
      model: {
        type: 'string',
        enum: ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
        message: 'Model must be a valid OpenAI model'
      },
      tags: {
        type: 'array',
        max: 10,
        message: 'Tags must be an array with no more than 10 items'
      },
      categories: {
        type: 'array',
        max: 5,
        message: 'Categories must be an array with no more than 5 items'
      }
    }
  }
  
  static getJobRunValidationSchema(): ValidationSchema {
    return {
      job_id: {
        required: true,
        type: 'uuid',
        message: 'Job ID is required and must be a valid UUID'
      },
      status: {
        required: true,
        type: 'string',
        enum: ['started', 'completed', 'failed', 'cancelled'],
        message: 'Status must be one of: started, completed, failed, cancelled'
      },
      processing_time_ms: {
        type: 'number',
        min: 0,
        message: 'Processing time must be a non-negative number'
      },
      error_message: {
        type: 'string',
        maxLength: 1000,
        message: 'Error message must be no more than 1000 characters'
      }
    }
  }
  
  static getHealthCheckValidationSchema(): ValidationSchema {
    return {
      component: {
        required: true,
        type: 'string',
        enum: ['database', 'openai', 'wordpress', 'system', 'performance'],
        message: 'Component must be one of: database, openai, wordpress, system, performance'
      },
      status: {
        required: true,
        type: 'string',
        enum: ['healthy', 'warning', 'critical', 'down'],
        message: 'Status must be one of: healthy, warning, critical, down'
      },
      response_time_ms: {
        type: 'number',
        min: 0,
        message: 'Response time must be a non-negative number'
      }
    }
  }
  
  static getMetricsValidationSchema(): ValidationSchema {
    return {
      metric_type: {
        required: true,
        type: 'string',
        enum: ['performance', 'system', 'content_generation', 'wordpress_posting', 'custom'],
        message: 'Metric type must be one of: performance, system, content_generation, wordpress_posting, custom'
      },
      metric_name: {
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 100,
        message: 'Metric name is required and must be between 1 and 100 characters'
      },
      metric_value: {
        required: true,
        type: 'number',
        message: 'Metric value is required and must be a number'
      },
      metric_unit: {
        required: true,
        type: 'string',
        enum: ['percent', 'milliseconds', 'jobs_per_hour', 'jobs', 'connections', 'queries', 'count'],
        message: 'Metric unit must be one of: percent, milliseconds, jobs_per_hour, jobs, connections, queries, count'
      }
    }
  }
  
  static getPaginationValidationSchema(): ValidationSchema {
    return {
      page: {
        type: 'number',
        min: 1,
        message: 'Page must be a positive integer'
      },
      page_size: {
        type: 'number',
        min: 1,
        max: 100,
        message: 'Page size must be between 1 and 100'
      },
      sort_by: {
        type: 'string',
        maxLength: 50,
        message: 'Sort by must be no more than 50 characters'
      },
      sort_order: {
        type: 'string',
        enum: ['asc', 'desc'],
        message: 'Sort order must be either asc or desc'
      }
    }
  }
  
  static getTimeRangeValidationSchema(): ValidationSchema {
    return {
      start_time: {
        type: 'string',
        custom: (value) => {
          if (!value) return true
          const date = new Date(value)
          return !isNaN(date.getTime()) || 'Start time must be a valid ISO date string'
        },
        message: 'Start time must be a valid ISO date string'
      },
      end_time: {
        type: 'string',
        custom: (value) => {
          if (!value) return true
          const date = new Date(value)
          return !isNaN(date.getTime()) || 'End time must be a valid ISO date string'
        },
        message: 'End time must be a valid ISO date string'
      },
      hours_back: {
        type: 'number',
        min: 1,
        max: 8760, // 1 year
        message: 'Hours back must be between 1 and 8760'
      }
    }
  }
}

// Global validator instance
export const validator = Validator.getInstance()

// Convenience functions
export function validate(data: any, schema: ValidationSchema): ValidationResult {
  return validator.validate(data, schema)
}

export function validateJob(data: any): ValidationResult {
  return validator.validate(data, Validator.getJobValidationSchema())
}

export function validateJobRun(data: any): ValidationResult {
  return validator.validate(data, Validator.getJobRunValidationSchema())
}

export function validateHealthCheck(data: any): ValidationResult {
  return validator.validate(data, Validator.getHealthCheckValidationSchema())
}

export function validateMetrics(data: any): ValidationResult {
  return validator.validate(data, Validator.getMetricsValidationSchema())
}

export function validatePagination(data: any): ValidationResult {
  return validator.validate(data, Validator.getPaginationValidationSchema())
}

export function validateTimeRange(data: any): ValidationResult {
  return validator.validate(data, Validator.getTimeRangeValidationSchema())
}

// Validation helper for request bodies
export function validateRequestBody<T>(
  body: any,
  schema: ValidationSchema
): {
  valid: boolean
  data?: T
  errors?: Record<string, string[]>
} {
  const result = validate(body, schema)
  
  if (result.valid) {
    return {
      valid: true,
      data: body as T
    }
  } else {
    return {
      valid: false,
      errors: result.errors
    }
  }
}

// Validation helper for query parameters
export function validateQueryParams(
  params: URLSearchParams,
  schema: ValidationSchema
): {
  valid: boolean
  data?: Record<string, any>
  errors?: Record<string, string[]>
} {
  const data: Record<string, any> = {}
  
  // Convert URLSearchParams to object
  for (const [key, value] of params.entries()) {
    // Try to parse as number
    const numValue = Number(value)
    if (!isNaN(numValue) && value !== '') {
      data[key] = numValue
    } else if (value === 'true') {
      data[key] = true
    } else if (value === 'false') {
      data[key] = false
    } else {
      data[key] = value
    }
  }
  
  const result = validate(data, schema)
  
  if (result.valid) {
    return {
      valid: true,
      data
    }
  } else {
    return {
      valid: false,
      errors: result.errors
    }
  }
}
