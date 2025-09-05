// Shared logging utilities for Edge Functions
// PRD Reference: Configuration & Deployment (6.1)

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: string
  metadata?: Record<string, any>
  requestId?: string
  functionName?: string
}

export class Logger {
  private static instance: Logger
  private logLevel: LogLevel
  private requestId?: string
  private functionName?: string
  
  private constructor() {
    this.logLevel = this.getLogLevelFromEnv()
  }
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger()
    }
    return Logger.instance
  }
  
  private getLogLevelFromEnv(): LogLevel {
    const level = Deno.env.get('LOG_LEVEL')?.toUpperCase()
    switch (level) {
      case 'DEBUG': return LogLevel.DEBUG
      case 'INFO': return LogLevel.INFO
      case 'WARN': return LogLevel.WARN
      case 'ERROR': return LogLevel.ERROR
      default: return LogLevel.INFO
    }
  }
  
  setRequestId(requestId: string): void {
    this.requestId = requestId
  }
  
  setFunctionName(functionName: string): void {
    this.functionName = functionName
  }
  
  setLogLevel(level: LogLevel): void {
    this.logLevel = level
  }
  
  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel
  }
  
  private formatLogEntry(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      metadata,
      requestId: this.requestId,
      functionName: this.functionName
    }
  }
  
  private log(level: LogLevel, message: string, context?: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) return
    
    const logEntry = this.formatLogEntry(level, message, context, metadata)
    
    // Console output with appropriate level
    const levelName = LogLevel[level]
    const logMessage = `[${logEntry.timestamp}] [${levelName}] [${logEntry.functionName || 'unknown'}] ${logEntry.requestId ? `[${logEntry.requestId}] ` : ''}${message}`
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, metadata ? { metadata } : '')
        break
      case LogLevel.INFO:
        console.info(logMessage, metadata ? { metadata } : '')
        break
      case LogLevel.WARN:
        console.warn(logMessage, metadata ? { metadata } : '')
        break
      case LogLevel.ERROR:
        console.error(logMessage, metadata ? { metadata } : '')
        break
    }
  }
  
  debug(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata)
  }
  
  info(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata)
  }
  
  warn(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata)
  }
  
  error(message: string, context?: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, metadata)
  }
  
  // Structured logging methods
  logJobStart(jobId: string, jobType: string, metadata?: Record<string, any>): void {
    this.info(`Job started: ${jobType}`, 'job_lifecycle', {
      job_id: jobId,
      job_type: jobType,
      action: 'start',
      ...metadata
    })
  }
  
  logJobComplete(jobId: string, jobType: string, duration: number, metadata?: Record<string, any>): void {
    this.info(`Job completed: ${jobType}`, 'job_lifecycle', {
      job_id: jobId,
      job_type: jobType,
      action: 'complete',
      duration_ms: duration,
      ...metadata
    })
  }
  
  logJobError(jobId: string, jobType: string, error: Error, metadata?: Record<string, any>): void {
    this.error(`Job failed: ${jobType}`, 'job_lifecycle', {
      job_id: jobId,
      job_type: jobType,
      action: 'error',
      error_message: error.message,
      error_stack: error.stack,
      ...metadata
    })
  }
  
  logApiCall(service: string, endpoint: string, method: string, statusCode: number, duration: number, metadata?: Record<string, any>): void {
    const level = statusCode >= 400 ? LogLevel.ERROR : statusCode >= 300 ? LogLevel.WARN : LogLevel.INFO
    this.log(level, `API call: ${method} ${endpoint}`, 'api_call', {
      service,
      endpoint,
      method,
      status_code: statusCode,
      duration_ms: duration,
      ...metadata
    })
  }
  
  logDatabaseQuery(query: string, duration: number, rowCount?: number, metadata?: Record<string, any>): void {
    this.debug(`Database query executed`, 'database', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      duration_ms: duration,
      row_count: rowCount,
      ...metadata
    })
  }
  
  logPerformanceMetric(metric: string, value: number, unit: string, metadata?: Record<string, any>): void {
    this.info(`Performance metric: ${metric}`, 'performance', {
      metric,
      value,
      unit,
      ...metadata
    })
  }
  
  logHealthCheck(component: string, status: 'healthy' | 'warning' | 'critical' | 'down', responseTime: number, metadata?: Record<string, any>): void {
    const level = status === 'down' ? LogLevel.ERROR : status === 'critical' ? LogLevel.ERROR : status === 'warning' ? LogLevel.WARN : LogLevel.INFO
    this.log(level, `Health check: ${component}`, 'health_check', {
      component,
      status,
      response_time_ms: responseTime,
      ...metadata
    })
  }
  
  logAlert(alertType: string, severity: 'info' | 'warning' | 'critical' | 'emergency', message: string, metadata?: Record<string, any>): void {
    const level = severity === 'emergency' || severity === 'critical' ? LogLevel.ERROR : severity === 'warning' ? LogLevel.WARN : LogLevel.INFO
    this.log(level, `Alert: ${message}`, 'alert', {
      alert_type: alertType,
      severity,
      message,
      ...metadata
    })
  }
  
  logMetricsCollection(metricsCount: number, duration: number, metadata?: Record<string, any>): void {
    this.info(`Metrics collected: ${metricsCount}`, 'metrics', {
      metrics_count: metricsCount,
      duration_ms: duration,
      ...metadata
    })
  }
  
  logCleanupOperation(operation: string, recordsProcessed: number, duration: number, metadata?: Record<string, any>): void {
    this.info(`Cleanup operation: ${operation}`, 'cleanup', {
      operation,
      records_processed: recordsProcessed,
      duration_ms: duration,
      ...metadata
    })
  }
}

// Global logger instance
export const logger = Logger.getInstance()

// Convenience functions
export function debug(message: string, context?: string, metadata?: Record<string, any>): void {
  logger.debug(message, context, metadata)
}

export function info(message: string, context?: string, metadata?: Record<string, any>): void {
  logger.info(message, context, metadata)
}

export function warn(message: string, context?: string, metadata?: Record<string, any>): void {
  logger.warn(message, context, metadata)
}

export function error(message: string, context?: string, metadata?: Record<string, any>): void {
  logger.error(message, context, metadata)
}

// Request context helper
export function withRequestContext<T>(
  requestId: string,
  functionName: string,
  operation: () => T
): T {
  const originalRequestId = logger['requestId']
  const originalFunctionName = logger['functionName']
  
  logger.setRequestId(requestId)
  logger.setFunctionName(functionName)
  
  try {
    return operation()
  } finally {
    logger.setRequestId(originalRequestId || '')
    logger.setFunctionName(originalFunctionName || '')
  }
}

// Async request context helper
export async function withAsyncRequestContext<T>(
  requestId: string,
  functionName: string,
  operation: () => Promise<T>
): Promise<T> {
  const originalRequestId = logger['requestId']
  const originalFunctionName = logger['functionName']
  
  logger.setRequestId(requestId)
  logger.setFunctionName(functionName)
  
  try {
    return await operation()
  } finally {
    logger.setRequestId(originalRequestId || '')
    logger.setFunctionName(originalFunctionName || '')
  }
}

// Performance timing helper
export class PerformanceTimer {
  private startTime: number
  private context: string
  
  constructor(context: string) {
    this.context = context
    this.startTime = Date.now()
  }
  
  end(message?: string): number {
    const duration = Date.now() - this.startTime
    logger.logPerformanceMetric(
      message || this.context,
      duration,
      'milliseconds',
      { context: this.context }
    )
    return duration
  }
}

// Performance timing helper function
export function timeOperation<T>(
  context: string,
  operation: () => T,
  message?: string
): T {
  const timer = new PerformanceTimer(context)
  try {
    return operation()
  } finally {
    timer.end(message)
  }
}

// Async performance timing helper function
export async function timeAsyncOperation<T>(
  context: string,
  operation: () => Promise<T>,
  message?: string
): Promise<T> {
  const timer = new PerformanceTimer(context)
  try {
    return await operation()
  } finally {
    timer.end(message)
  }
}
