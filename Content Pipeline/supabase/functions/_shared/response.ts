// Shared response utilities for Edge Functions
// PRD Reference: Configuration & Deployment (6.1)

import { corsHeaders } from './cors.ts'
import { logger } from './logger.ts'
import { AppError, formatErrorResponse } from './error-handler.ts'

export interface SuccessResponse<T = any> {
  success: true
  data?: T
  message?: string
  timestamp: string
  request_id?: string
  metadata?: Record<string, any>
}

export interface ErrorResponse {
  success: false
  error: {
    message: string
    type: string
    severity: string
    status_code: number
    timestamp: string
    request_id?: string
  }
  metadata?: Record<string, any>
}

export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

export class ResponseBuilder {
  private static instance: ResponseBuilder
  
  private constructor() {}
  
  static getInstance(): ResponseBuilder {
    if (!ResponseBuilder.instance) {
      ResponseBuilder.instance = new ResponseBuilder()
    }
    return ResponseBuilder.instance
  }
  
  success<T>(
    data?: T,
    message?: string,
    statusCode: number = 200,
    metadata?: Record<string, any>
  ): Response {
    const response: SuccessResponse<T> = {
      success: true,
      data,
      message,
      timestamp: new Date().toISOString(),
      metadata
    }
    
    logger.info(`Response: ${message || 'Success'}`, 'response', {
      status_code: statusCode,
      has_data: !!data,
      metadata
    })
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: statusCode
      }
    )
  }
  
  error(
    error: AppError,
    statusCode?: number,
    metadata?: Record<string, any>
  ): Response {
    const response: ErrorResponse = {
      ...formatErrorResponse(error),
      metadata
    }
    
    const finalStatusCode = statusCode || error.statusCode
    
    logger.error(`Response: ${error.message}`, 'response', {
      status_code: finalStatusCode,
      error_type: error.type,
      error_severity: error.severity,
      metadata
    })
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: finalStatusCode
      }
    )
  }
  
  validationError(
    message: string,
    validationErrors?: Record<string, string[]>,
    metadata?: Record<string, any>
  ): Response {
    const response: ErrorResponse = {
      success: false,
      error: {
        message,
        type: 'validation_error',
        severity: 'medium',
        status_code: 400,
        timestamp: new Date().toISOString()
      },
      metadata: {
        ...metadata,
        validation_errors: validationErrors
      }
    }
    
    logger.warn(`Response: ${message}`, 'response', {
      status_code: 400,
      error_type: 'validation_error',
      validation_errors: validationErrors,
      metadata
    })
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
  
  notFound(
    message: string = 'Resource not found',
    metadata?: Record<string, any>
  ): Response {
    const response: ErrorResponse = {
      success: false,
      error: {
        message,
        type: 'not_found_error',
        severity: 'medium',
        status_code: 404,
        timestamp: new Date().toISOString()
      },
      metadata
    }
    
    logger.warn(`Response: ${message}`, 'response', {
      status_code: 404,
      error_type: 'not_found_error',
      metadata
    })
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      }
    )
  }
  
  unauthorized(
    message: string = 'Unauthorized',
    metadata?: Record<string, any>
  ): Response {
    const response: ErrorResponse = {
      success: false,
      error: {
        message,
        type: 'authentication_error',
        severity: 'high',
        status_code: 401,
        timestamp: new Date().toISOString()
      },
      metadata
    }
    
    logger.warn(`Response: ${message}`, 'response', {
      status_code: 401,
      error_type: 'authentication_error',
      metadata
    })
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      }
    )
  }
  
  forbidden(
    message: string = 'Forbidden',
    metadata?: Record<string, any>
  ): Response {
    const response: ErrorResponse = {
      success: false,
      error: {
        message,
        type: 'authorization_error',
        severity: 'high',
        status_code: 403,
        timestamp: new Date().toISOString()
      },
      metadata
    }
    
    logger.warn(`Response: ${message}`, 'response', {
      status_code: 403,
      error_type: 'authorization_error',
      metadata
    })
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403
      }
    )
  }
  
  rateLimited(
    message: string = 'Rate limit exceeded',
    retryAfter?: number,
    metadata?: Record<string, any>
  ): Response {
    const response: ErrorResponse = {
      success: false,
      error: {
        message,
        type: 'rate_limit_error',
        severity: 'medium',
        status_code: 429,
        timestamp: new Date().toISOString()
      },
      metadata: {
        ...metadata,
        retry_after: retryAfter
      }
    }
    
    logger.warn(`Response: ${message}`, 'response', {
      status_code: 429,
      error_type: 'rate_limit_error',
      retry_after: retryAfter,
      metadata
    })
    
    const headers = { ...corsHeaders, 'Content-Type': 'application/json' }
    if (retryAfter) {
      headers['Retry-After'] = retryAfter.toString()
    }
    
    return new Response(
      JSON.stringify(response),
      {
        headers,
        status: 429
      }
    )
  }
  
  internalError(
    message: string = 'Internal server error',
    metadata?: Record<string, any>
  ): Response {
    const response: ErrorResponse = {
      success: false,
      error: {
        message,
        type: 'internal_error',
        severity: 'critical',
        status_code: 500,
        timestamp: new Date().toISOString()
      },
      metadata
    }
    
    logger.error(`Response: ${message}`, 'response', {
      status_code: 500,
      error_type: 'internal_error',
      metadata
    })
    
    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
  
  serviceUnavailable(
    message: string = 'Service temporarily unavailable',
    retryAfter?: number,
    metadata?: Record<string, any>
  ): Response {
    const response: ErrorResponse = {
      success: false,
      error: {
        message,
        type: 'external_service_error',
        severity: 'high',
        status_code: 503,
        timestamp: new Date().toISOString()
      },
      metadata: {
        ...metadata,
        retry_after: retryAfter
      }
    }
    
    logger.warn(`Response: ${message}`, 'response', {
      status_code: 503,
      error_type: 'external_service_error',
      retry_after: retryAfter,
      metadata
    })
    
    const headers = { ...corsHeaders, 'Content-Type': 'application/json' }
    if (retryAfter) {
      headers['Retry-After'] = retryAfter.toString()
    }
    
    return new Response(
      JSON.stringify(response),
      {
        headers,
        status: 503
      }
    )
  }
  
  // Specialized response methods for common use cases
  
  jobStarted(jobId: string, jobType: string, metadata?: Record<string, any>): Response {
    return this.success(
      { job_id: jobId, job_type: jobType, status: 'started' },
      `Job ${jobType} started successfully`,
      201,
      metadata
    )
  }
  
  jobCompleted(jobId: string, jobType: string, result: any, metadata?: Record<string, any>): Response {
    return this.success(
      { job_id: jobId, job_type: jobType, status: 'completed', result },
      `Job ${jobType} completed successfully`,
      200,
      metadata
    )
  }
  
  jobFailed(jobId: string, jobType: string, error: string, metadata?: Record<string, any>): Response {
    return this.error(
      {
        message: `Job ${jobType} failed: ${error}`,
        type: 'internal_error',
        severity: 'high',
        statusCode: 500,
        isOperational: true,
        context: { job_id: jobId, job_type: jobType }
      } as AppError,
      500,
      metadata
    )
  }
  
  metricsCollected(metricsCount: number, metadata?: Record<string, any>): Response {
    return this.success(
      { metrics_collected: metricsCount },
      `Successfully collected ${metricsCount} metrics`,
      200,
      metadata
    )
  }
  
  healthCheck(component: string, status: 'healthy' | 'warning' | 'critical' | 'down', metadata?: Record<string, any>): Response {
    const statusCode = status === 'down' ? 503 : status === 'critical' ? 500 : status === 'warning' ? 200 : 200
    
    return this.success(
      { component, status },
      `Health check for ${component}: ${status}`,
      statusCode,
      metadata
    )
  }
  
  cleanupCompleted(operation: string, recordsProcessed: number, metadata?: Record<string, any>): Response {
    return this.success(
      { operation, records_processed: recordsProcessed },
      `Cleanup operation ${operation} completed successfully`,
      200,
      metadata
    )
  }
  
  // Pagination support
  paginated<T>(
    data: T[],
    page: number,
    pageSize: number,
    total: number,
    message?: string,
    metadata?: Record<string, any>
  ): Response {
    const totalPages = Math.ceil(total / pageSize)
    const hasNextPage = page < totalPages
    const hasPreviousPage = page > 1
    
    return this.success(
      {
        data,
        pagination: {
          page,
          page_size: pageSize,
          total,
          total_pages: totalPages,
          has_next_page: hasNextPage,
          has_previous_page: hasPreviousPage
        }
      },
      message || 'Data retrieved successfully',
      200,
      metadata
    )
  }
  
  // CORS preflight response
  corsPreflight(): Response {
    return new Response('ok', { headers: corsHeaders })
  }
}

// Global response builder instance
export const response = ResponseBuilder.getInstance()

// Convenience functions
export function success<T>(
  data?: T,
  message?: string,
  statusCode: number = 200,
  metadata?: Record<string, any>
): Response {
  return response.success(data, message, statusCode, metadata)
}

export function error(
  error: AppError,
  statusCode?: number,
  metadata?: Record<string, any>
): Response {
  return response.error(error, statusCode, metadata)
}

export function validationError(
  message: string,
  validationErrors?: Record<string, string[]>,
  metadata?: Record<string, any>
): Response {
  return response.validationError(message, validationErrors, metadata)
}

export function notFound(
  message: string = 'Resource not found',
  metadata?: Record<string, any>
): Response {
  return response.notFound(message, metadata)
}

export function unauthorized(
  message: string = 'Unauthorized',
  metadata?: Record<string, any>
): Response {
  return response.unauthorized(message, metadata)
}

export function forbidden(
  message: string = 'Forbidden',
  metadata?: Record<string, any>
): Response {
  return response.forbidden(message, metadata)
}

export function rateLimited(
  message: string = 'Rate limit exceeded',
  retryAfter?: number,
  metadata?: Record<string, any>
): Response {
  return response.rateLimited(message, retryAfter, metadata)
}

export function internalError(
  message: string = 'Internal server error',
  metadata?: Record<string, any>
): Response {
  return response.internalError(message, metadata)
}

export function serviceUnavailable(
  message: string = 'Service temporarily unavailable',
  retryAfter?: number,
  metadata?: Record<string, any>
): Response {
  return response.serviceUnavailable(message, retryAfter, metadata)
}

// Specialized convenience functions
export function jobStarted(jobId: string, jobType: string, metadata?: Record<string, any>): Response {
  return response.jobStarted(jobId, jobType, metadata)
}

export function jobCompleted(jobId: string, jobType: string, result: any, metadata?: Record<string, any>): Response {
  return response.jobCompleted(jobId, jobType, result, metadata)
}

export function jobFailed(jobId: string, jobType: string, error: string, metadata?: Record<string, any>): Response {
  return response.jobFailed(jobId, jobType, error, metadata)
}

export function metricsCollected(metricsCount: number, metadata?: Record<string, any>): Response {
  return response.metricsCollected(metricsCount, metadata)
}

export function healthCheck(component: string, status: 'healthy' | 'warning' | 'critical' | 'down', metadata?: Record<string, any>): Response {
  return response.healthCheck(component, status, metadata)
}

export function cleanupCompleted(operation: string, recordsProcessed: number, metadata?: Record<string, any>): Response {
  return response.cleanupCompleted(operation, recordsProcessed, metadata)
}

export function paginated<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number,
  message?: string,
  metadata?: Record<string, any>
): Response {
  return response.paginated(data, page, pageSize, total, message, metadata)
}

export function corsPreflight(): Response {
  return response.corsPreflight()
}
