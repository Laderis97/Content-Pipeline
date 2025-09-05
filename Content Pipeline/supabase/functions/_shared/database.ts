// Shared database utilities for Edge Functions
// PRD Reference: Configuration & Deployment (6.1)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Database configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required')
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('SUPABASE_ANON_KEY environment variable is required')
}

// Create Supabase clients
export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Database connection health check
export async function checkDatabaseConnection(): Promise<{
  success: boolean
  response_time_ms: number
  error?: string
}> {
  const startTime = Date.now()
  
  try {
    const { data, error } = await supabaseAdmin
      .from('content_jobs')
      .select('id')
      .limit(1)
    
    const responseTime = Date.now() - startTime
    
    if (error) {
      return {
        success: false,
        response_time_ms: responseTime,
        error: error.message
      }
    }
    
    return {
      success: true,
      response_time_ms: responseTime
    }
    
  } catch (error) {
    return {
      success: false,
      response_time_ms: Date.now() - startTime,
      error: error.message
    }
  }
}

// Database transaction wrapper
export async function withTransaction<T>(
  operation: (client: typeof supabaseAdmin) => Promise<T>
): Promise<{
  success: boolean
  data?: T
  error?: string
}> {
  try {
    const data = await operation(supabaseAdmin)
    return {
      success: true,
      data
    }
  } catch (error) {
    return {
      success: false,
      error: error.message
    }
  }
}

// Database query with retry logic
export async function queryWithRetry<T>(
  query: (client: typeof supabaseAdmin) => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<{
  success: boolean
  data?: T
  error?: string
  retries: number
}> {
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const data = await query(supabaseAdmin)
      return {
        success: true,
        data,
        retries: attempt
      }
    } catch (error) {
      lastError = error as Error
      
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
      }
    }
  }
  
  return {
    success: false,
    error: lastError?.message || 'Unknown error',
    retries: maxRetries
  }
}

// Database connection pool management
export class DatabasePool {
  private static instance: DatabasePool
  private connections: Map<string, typeof supabaseAdmin> = new Map()
  private maxConnections = 10
  
  private constructor() {}
  
  static getInstance(): DatabasePool {
    if (!DatabasePool.instance) {
      DatabasePool.instance = new DatabasePool()
    }
    return DatabasePool.instance
  }
  
  getConnection(connectionId: string = 'default'): typeof supabaseAdmin {
    if (!this.connections.has(connectionId)) {
      if (this.connections.size >= this.maxConnections) {
        // Remove oldest connection
        const oldestKey = this.connections.keys().next().value
        this.connections.delete(oldestKey)
      }
      
      this.connections.set(connectionId, createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }))
    }
    
    return this.connections.get(connectionId)!
  }
  
  closeConnection(connectionId: string): void {
    this.connections.delete(connectionId)
  }
  
  closeAllConnections(): void {
    this.connections.clear()
  }
  
  getConnectionCount(): number {
    return this.connections.size
  }
}

// Database configuration validation
export function validateDatabaseConfig(): {
  valid: boolean
  errors: string[]
  warnings: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!SUPABASE_URL) {
    errors.push('SUPABASE_URL is not set')
  } else if (!SUPABASE_URL.startsWith('https://')) {
    warnings.push('SUPABASE_URL should use HTTPS in production')
  }
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY is not set')
  } else if (SUPABASE_SERVICE_ROLE_KEY.length < 100) {
    warnings.push('SUPABASE_SERVICE_ROLE_KEY appears to be invalid (too short)')
  }
  
  if (!SUPABASE_ANON_KEY) {
    errors.push('SUPABASE_ANON_KEY is not set')
  } else if (SUPABASE_ANON_KEY.length < 100) {
    warnings.push('SUPABASE_ANON_KEY appears to be invalid (too short)')
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

// Database performance monitoring
export class DatabasePerformanceMonitor {
  private queryTimes: number[] = []
  private maxSamples = 100
  
  recordQueryTime(timeMs: number): void {
    this.queryTimes.push(timeMs)
    
    if (this.queryTimes.length > this.maxSamples) {
      this.queryTimes.shift()
    }
  }
  
  getAverageQueryTime(): number {
    if (this.queryTimes.length === 0) return 0
    return this.queryTimes.reduce((sum, time) => sum + time, 0) / this.queryTimes.length
  }
  
  getSlowQueries(thresholdMs: number = 1000): number {
    return this.queryTimes.filter(time => time > thresholdMs).length
  }
  
  getQueryTimePercentile(percentile: number): number {
    if (this.queryTimes.length === 0) return 0
    
    const sorted = [...this.queryTimes].sort((a, b) => a - b)
    const index = Math.floor(sorted.length * (percentile / 100))
    return sorted[index] || 0
  }
  
  reset(): void {
    this.queryTimes = []
  }
}

// Global performance monitor instance
export const dbPerformanceMonitor = new DatabasePerformanceMonitor()

// Enhanced query function with performance monitoring
export async function monitoredQuery<T>(
  query: (client: typeof supabaseAdmin) => Promise<T>,
  queryName?: string
): Promise<{
  success: boolean
  data?: T
  error?: string
  performance: {
    query_time_ms: number
    average_query_time_ms: number
    slow_queries: number
  }
}> {
  const startTime = Date.now()
  
  try {
    const data = await query(supabaseAdmin)
    const queryTime = Date.now() - startTime
    
    dbPerformanceMonitor.recordQueryTime(queryTime)
    
    return {
      success: true,
      data,
      performance: {
        query_time_ms: queryTime,
        average_query_time_ms: dbPerformanceMonitor.getAverageQueryTime(),
        slow_queries: dbPerformanceMonitor.getSlowQueries()
      }
    }
  } catch (error) {
    const queryTime = Date.now() - startTime
    
    return {
      success: false,
      error: error.message,
      performance: {
        query_time_ms: queryTime,
        average_query_time_ms: dbPerformanceMonitor.getAverageQueryTime(),
        slow_queries: dbPerformanceMonitor.getSlowQueries()
      }
    }
  }
}

// Database health check with detailed metrics
export async function getDatabaseHealth(): Promise<{
  connection: {
    success: boolean
    response_time_ms: number
    error?: string
  }
  performance: {
    average_query_time_ms: number
    slow_queries: number
    p95_query_time_ms: number
    p99_query_time_ms: number
  }
  configuration: {
    valid: boolean
    errors: string[]
    warnings: string[]
  }
}> {
  const connection = await checkDatabaseConnection()
  const config = validateDatabaseConfig()
  
  return {
    connection,
    performance: {
      average_query_time_ms: dbPerformanceMonitor.getAverageQueryTime(),
      slow_queries: dbPerformanceMonitor.getSlowQueries(),
      p95_query_time_ms: dbPerformanceMonitor.getQueryTimePercentile(95),
      p99_query_time_ms: dbPerformanceMonitor.getQueryTimePercentile(99)
    },
    configuration: config
  }
}
