// Shared error handling utilities for Edge Functions
// PRD Reference: Configuration & Deployment (6.1)

import { logger } from './logger.ts'

export enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  AUTHORIZATION_ERROR = 'authorization_error',
  NOT_FOUND_ERROR = 'not_found_error',
  CONFLICT_ERROR = 'conflict_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  EXTERNAL_SERVICE_ERROR = 'external_service_error',
  DATABASE_ERROR = 'database_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  CONFIGURATION_ERROR = 'configuration_error',
  INTERNAL_ERROR = 'internal_error',
  UNKNOWN_ERROR = 'unknown_error'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface AppError extends Error {
  type: ErrorType
  severity: ErrorSeverity
  statusCode: number
  isOperational: boolean
  context?: Record<string, any>
  timestamp: string
  requestId?: string
  functionName?: string
}

export class ErrorHandler {
  private static instance: ErrorHandler
  
  private constructor() {}
  
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }
  
  createError(
    message: string,
    type: ErrorType,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    statusCode: number = 500,
    isOperational: boolean = true,
    context?: Record<string, any>
  ): AppError {
    const error = new Error(message) as AppError
    error.type = type
    error.severity = severity
    error.statusCode = statusCode
    error.isOperational = isOperational
    error.context = context
    error.timestamp = new Date().toISOString()
    
    return error
  }
  
  handleError(error: Error | AppError, context?: Record<string, any>): AppError {
    let appError: AppError
    
    if (this.isAppError(error)) {
      appError = error
    } else {
      appError = this.createError(
        error.message,
        this.classifyError(error),
        this.determineSeverity(error),
        this.getStatusCode(error),
        this.isOperationalError(error),
        { ...context, originalError: error.message }
      )
    }
    
    // Log the error
    this.logError(appError, context)
    
    return appError
  }
  
  private isAppError(error: Error): error is AppError {
    return 'type' in error && 'severity' in error && 'statusCode' in error
  }
  
  private classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase()
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorType.VALIDATION_ERROR
    }
    
    if (message.includes('unauthorized') || message.includes('authentication')) {
      return ErrorType.AUTHENTICATION_ERROR
    }
    
    if (message.includes('forbidden') || message.includes('permission')) {
      return ErrorType.AUTHORIZATION_ERROR
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return ErrorType.NOT_FOUND_ERROR
    }
    
    if (message.includes('conflict') || message.includes('duplicate')) {
      return ErrorType.CONFLICT_ERROR
    }
    
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return ErrorType.RATE_LIMIT_ERROR
    }
    
    if (message.includes('external') || message.includes('api') || message.includes('service')) {
      return ErrorType.EXTERNAL_SERVICE_ERROR
    }
    
    if (message.includes('database') || message.includes('sql') || message.includes('connection')) {
      return ErrorType.DATABASE_ERROR
    }
    
    if (message.includes('network') || message.includes('connection') || message.includes('timeout')) {
      return ErrorType.NETWORK_ERROR
    }
    
    if (message.includes('timeout')) {
      return ErrorType.TIMEOUT_ERROR
    }
    
    if (message.includes('configuration') || message.includes('config')) {
      return ErrorType.CONFIGURATION_ERROR
    }
    
    return ErrorType.UNKNOWN_ERROR
  }
  
  private determineSeverity(error: Error): ErrorSeverity {
    const message = error.message.toLowerCase()
    
    if (message.includes('critical') || message.includes('fatal')) {
      return ErrorSeverity.CRITICAL
    }
    
    if (message.includes('error') || message.includes('failed')) {
      return ErrorSeverity.HIGH
    }
    
    if (message.includes('warning') || message.includes('caution')) {
      return ErrorSeverity.MEDIUM
    }
    
    return ErrorSeverity.LOW
  }
  
  private getStatusCode(error: Error): number {
    const message = error.message.toLowerCase()
    
    if (message.includes('unauthorized') || message.includes('401')) {
      return 401
    }
    
    if (message.includes('forbidden') || message.includes('403')) {
      return 403
    }
    
    if (message.includes('not found') || message.includes('404')) {
      return 404
    }
    
    if (message.includes('conflict') || message.includes('409')) {
      return 409
    }
    
    if (message.includes('rate limit') || message.includes('429')) {
      return 429
    }
    
    if (message.includes('validation') || message.includes('400')) {
      return 400
    }
    
    if (message.includes('timeout') || message.includes('408')) {
      return 408
    }
    
    if (message.includes('service unavailable') || message.includes('503')) {
      return 503
    }
    
    return 500
  }
  
  private isOperationalError(error: Error): boolean {
    const message = error.message.toLowerCase()
    
    // Operational errors are expected and can be handled gracefully
    if (message.includes('validation') || 
        message.includes('not found') || 
        message.includes('conflict') ||
        message.includes('rate limit') ||
        message.includes('timeout')) {
      return true
    }
    
    // Non-operational errors are unexpected and indicate bugs
    return false
  }
  
  private logError(error: AppError, context?: Record<string, any>): void {
    const logLevel = this.getLogLevel(error.severity)
    const logMessage = `Error: ${error.message}`
    const logContext = 'error_handling'
    const logMetadata = {
      error_type: error.type,
      error_severity: error.severity,
      status_code: error.statusCode,
      is_operational: error.isOperational,
      timestamp: error.timestamp,
      request_id: error.requestId,
      function_name: error.functionName,
      context: error.context,
      additional_context: context,
      stack: error.stack
    }
    
    switch (logLevel) {
      case 'debug':
        logger.debug(logMessage, logContext, logMetadata)
        break
      case 'info':
        logger.info(logMessage, logContext, logMetadata)
        break
      case 'warn':
        logger.warn(logMessage, logContext, logMetadata)
        break
      case 'error':
        logger.error(logMessage, logContext, logMetadata)
        break
    }
  }
  
  private getLogLevel(severity: ErrorSeverity): 'debug' | 'info' | 'warn' | 'error' {
    switch (severity) {
      case ErrorSeverity.LOW:
        return 'debug'
      case ErrorSeverity.MEDIUM:
        return 'info'
      case ErrorSeverity.HIGH:
        return 'warn'
      case ErrorSeverity.CRITICAL:
        return 'error'
    }
  }
  
  formatErrorResponse(error: AppError): {
    success: false
    error: {
      message: string
      type: string
      severity: string
      status_code: number
      timestamp: string
      request_id?: string
    }
  } {
    return {
      success: false,
      error: {
        message: error.message,
        type: error.type,
        severity: error.severity,
        status_code: error.statusCode,
        timestamp: error.timestamp,
        request_id: error.requestId
      }
    }
  }
  
  shouldRetry(error: AppError): boolean {
    // Retry for operational errors that are temporary
    if (!error.isOperational) {
      return false
    }
    
    switch (error.type) {
      case ErrorType.RATE_LIMIT_ERROR:
      case ErrorType.EXTERNAL_SERVICE_ERROR:
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
        return true
      case ErrorType.DATABASE_ERROR:
        // Retry for connection issues, not data issues
        return error.message.toLowerCase().includes('connection')
      default:
        return false
    }
  }
  
  getRetryDelay(error: AppError, attempt: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000 // 1 second
    const maxDelay = 30000 // 30 seconds
    const jitter = Math.random() * 0.1 // 10% jitter
    
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay)
    return Math.floor(delay * (1 + jitter))
  }
}

// Global error handler instance
export const errorHandler = ErrorHandler.getInstance()

// Convenience functions
export function createError(
  message: string,
  type: ErrorType,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM,
  statusCode: number = 500,
  isOperational: boolean = true,
  context?: Record<string, any>
): AppError {
  return errorHandler.createError(message, type, severity, statusCode, isOperational, context)
}

export function handleError(error: Error | AppError, context?: Record<string, any>): AppError {
  return errorHandler.handleError(error, context)
}

export function formatErrorResponse(error: AppError): {
  success: false
  error: {
    message: string
    type: string
    severity: string
    status_code: number
    timestamp: string
    request_id?: string
  }
} {
  return errorHandler.formatErrorResponse(error)
}

export function shouldRetry(error: AppError): boolean {
  return errorHandler.shouldRetry(error)
}

export function getRetryDelay(error: AppError, attempt: number): number {
  return errorHandler.getRetryDelay(error, attempt)
}

// Error type constants for common errors
export const ValidationError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.VALIDATION_ERROR, ErrorSeverity.MEDIUM, 400, true, context)

export const AuthenticationError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.AUTHENTICATION_ERROR, ErrorSeverity.HIGH, 401, true, context)

export const AuthorizationError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.AUTHORIZATION_ERROR, ErrorSeverity.HIGH, 403, true, context)

export const NotFoundError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.NOT_FOUND_ERROR, ErrorSeverity.MEDIUM, 404, true, context)

export const ConflictError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.CONFLICT_ERROR, ErrorSeverity.MEDIUM, 409, true, context)

export const RateLimitError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.RATE_LIMIT_ERROR, ErrorSeverity.MEDIUM, 429, true, context)

export const ExternalServiceError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.EXTERNAL_SERVICE_ERROR, ErrorSeverity.HIGH, 502, true, context)

export const DatabaseError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.DATABASE_ERROR, ErrorSeverity.HIGH, 500, true, context)

export const NetworkError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.NETWORK_ERROR, ErrorSeverity.MEDIUM, 503, true, context)

export const TimeoutError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.TIMEOUT_ERROR, ErrorSeverity.MEDIUM, 408, true, context)

export const ConfigurationError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.CONFIGURATION_ERROR, ErrorSeverity.CRITICAL, 500, false, context)

export const InternalError = (message: string, context?: Record<string, any>) =>
  createError(message, ErrorType.INTERNAL_ERROR, ErrorSeverity.CRITICAL, 500, false, context)
