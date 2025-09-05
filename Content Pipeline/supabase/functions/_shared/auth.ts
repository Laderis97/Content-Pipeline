import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logger } from './logger.ts'
import { response } from './response.ts'

// Authentication and authorization utilities
// PRD Reference: Configuration & Deployment (6.5), Data & Security (E1-E3)

export interface AuthConfig {
  supabaseUrl: string
  supabaseServiceRoleKey: string
  supabaseAnonKey: string
  jwtSecret?: string
  allowedOrigins?: string[]
  rateLimitConfig?: {
    maxRequests: number
    windowMs: number
  }
}

export interface UserContext {
  userId?: string
  email?: string
  role?: string
  permissions?: string[]
  isAuthenticated: boolean
  isServiceRole: boolean
}

export interface ServiceRoleContext {
  isServiceRole: true
  permissions: string[]
  rateLimitKey?: string
}

// Default configuration
const DEFAULT_CONFIG: Partial<AuthConfig> = {
  allowedOrigins: ['*'],
  rateLimitConfig: {
    maxRequests: 100,
    windowMs: 60000 // 1 minute
  }
}

// Global auth configuration
let authConfig: AuthConfig | null = null

// Rate limiting storage (in-memory for Edge Functions)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

/**
 * Initialize authentication configuration
 */
export function initializeAuth(config: Partial<AuthConfig> = {}): AuthConfig {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')

  if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables')
  }

  authConfig = {
    supabaseUrl,
    supabaseServiceRoleKey,
    supabaseAnonKey,
    jwtSecret: Deno.env.get('JWT_SECRET'),
    ...DEFAULT_CONFIG,
    ...config
  }

  logger.info('Authentication initialized', 'auth', {
    supabaseUrl: authConfig.supabaseUrl,
    hasServiceRoleKey: !!authConfig.supabaseServiceRoleKey,
    hasAnonKey: !!authConfig.supabaseAnonKey,
    allowedOrigins: authConfig.allowedOrigins
  })

  return authConfig
}

/**
 * Get current authentication configuration
 */
export function getAuthConfig(): AuthConfig {
  if (!authConfig) {
    return initializeAuth()
  }
  return authConfig
}

/**
 * Create Supabase client with service role
 */
export function createServiceRoleClient() {
  const config = getAuthConfig()
  
  return createClient(
    config.supabaseUrl,
    config.supabaseServiceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Create Supabase client with anon key
 */
export function createAnonClient() {
  const config = getAuthConfig()
  
  return createClient(
    config.supabaseUrl,
    config.supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      }
    }
  )
}

/**
 * Extract and validate JWT token from request
 */
export async function extractToken(request: Request): Promise<string | null> {
  try {
    // Check Authorization header
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7)
    }

    // Check query parameter
    const url = new URL(request.url)
    const tokenParam = url.searchParams.get('token')
    if (tokenParam) {
      return tokenParam
    }

    // Check cookie
    const cookieHeader = request.headers.get('Cookie')
    if (cookieHeader) {
      const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        acc[key] = value
        return acc
      }, {} as Record<string, string>)

      if (cookies['sb-access-token']) {
        return cookies['sb-access-token']
      }
    }

    return null
  } catch (error) {
    logger.error('Failed to extract token', 'auth', { error: error.message })
    return null
  }
}

/**
 * Verify JWT token and get user context
 */
export async function verifyToken(token: string): Promise<UserContext> {
  try {
    const config = getAuthConfig()
    const supabase = createAnonClient()

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      logger.warn('Token verification failed', 'auth', { error: error?.message })
      return {
        isAuthenticated: false,
        isServiceRole: false
      }
    }

    // Get user role and permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, permissions')
      .eq('id', user.id)
      .single()

    if (profileError) {
      logger.warn('Failed to get user profile', 'auth', { error: profileError.message })
    }

    return {
      userId: user.id,
      email: user.email,
      role: profile?.role || 'user',
      permissions: profile?.permissions || [],
      isAuthenticated: true,
      isServiceRole: false
    }
  } catch (error) {
    logger.error('Token verification error', 'auth', { error: error.message })
    return {
      isAuthenticated: false,
      isServiceRole: false
    }
  }
}

/**
 * Check if request is using service role
 */
export function isServiceRoleRequest(request: Request): boolean {
  try {
    const config = getAuthConfig()
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return false
    }

    const token = authHeader.substring(7)
    return token === config.supabaseServiceRoleKey
  } catch (error) {
    logger.error('Service role check error', 'auth', { error: error.message })
    return false
  }
}

/**
 * Get service role context
 */
export function getServiceRoleContext(request: Request): ServiceRoleContext | null {
  if (!isServiceRoleRequest(request)) {
    return null
  }

  return {
    isServiceRole: true,
    permissions: ['*'], // Service role has all permissions
    rateLimitKey: getRateLimitKey(request)
  }
}

/**
 * Get rate limit key for request
 */
export function getRateLimitKey(request: Request): string {
  try {
    // Use IP address as rate limit key
    const forwardedFor = request.headers.get('X-Forwarded-For')
    const realIp = request.headers.get('X-Real-IP')
    const ip = forwardedFor?.split(',')[0] || realIp || 'unknown'

    // Add user agent for additional uniqueness
    const userAgent = request.headers.get('User-Agent') || 'unknown'
    
    return `${ip}:${userAgent}`
  } catch (error) {
    logger.error('Rate limit key generation error', 'auth', { error: error.message })
    return 'unknown'
  }
}

/**
 * Check rate limit for request
 */
export function checkRateLimit(request: Request): { allowed: boolean; remaining: number; resetTime: number } {
  try {
    const config = getAuthConfig()
    const rateLimitKey = getRateLimitKey(request)
    const now = Date.now()
    const windowMs = config.rateLimitConfig?.windowMs || 60000
    const maxRequests = config.rateLimitConfig?.maxRequests || 100

    const current = rateLimitStore.get(rateLimitKey)
    
    if (!current || now > current.resetTime) {
      // Reset or initialize
      rateLimitStore.set(rateLimitKey, {
        count: 1,
        resetTime: now + windowMs
      })
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      }
    }

    if (current.count >= maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      }
    }

    // Increment count
    current.count++
    rateLimitStore.set(rateLimitKey, current)

    return {
      allowed: true,
      remaining: maxRequests - current.count,
      resetTime: current.resetTime
    }
  } catch (error) {
    logger.error('Rate limit check error', 'auth', { error: error.message })
    // Allow request on error
    return {
      allowed: true,
      remaining: 100,
      resetTime: Date.now() + 60000
    }
  }
}

/**
 * Authenticate request and return user context
 */
export async function authenticateRequest(request: Request): Promise<UserContext | ServiceRoleContext> {
  try {
    // Check if service role request
    const serviceRoleContext = getServiceRoleContext(request)
    if (serviceRoleContext) {
      return serviceRoleContext
    }

    // Check rate limit
    const rateLimit = checkRateLimit(request)
    if (!rateLimit.allowed) {
      logger.warn('Rate limit exceeded', 'auth', {
        key: getRateLimitKey(request),
        remaining: rateLimit.remaining,
        resetTime: rateLimit.resetTime
      })
      throw new Error('Rate limit exceeded')
    }

    // Extract and verify token
    const token = await extractToken(request)
    if (!token) {
      return {
        isAuthenticated: false,
        isServiceRole: false
      }
    }

    const userContext = await verifyToken(token)
    
    logger.info('Request authenticated', 'auth', {
      userId: userContext.userId,
      email: userContext.email,
      role: userContext.role,
      isAuthenticated: userContext.isAuthenticated,
      isServiceRole: userContext.isServiceRole
    })

    return userContext
  } catch (error) {
    logger.error('Authentication error', 'auth', { error: error.message })
    return {
      isAuthenticated: false,
      isServiceRole: false
    }
  }
}

/**
 * Check if user has required permission
 */
export function hasPermission(userContext: UserContext | ServiceRoleContext, permission: string): boolean {
  if (userContext.isServiceRole) {
    return true // Service role has all permissions
  }

  if (!userContext.isAuthenticated) {
    return false
  }

  const userCtx = userContext as UserContext
  return userCtx.permissions?.includes(permission) || userCtx.permissions?.includes('*') || false
}

/**
 * Check if user has required role
 */
export function hasRole(userContext: UserContext | ServiceRoleContext, role: string): boolean {
  if (userContext.isServiceRole) {
    return true // Service role has all roles
  }

  if (!userContext.isAuthenticated) {
    return false
  }

  const userCtx = userContext as UserContext
  return userCtx.role === role || userCtx.role === 'admin'
}

/**
 * Require authentication middleware
 */
export function requireAuth(requiredPermission?: string, requiredRole?: string) {
  return async (request: Request): Promise<UserContext | ServiceRoleContext> => {
    const userContext = await authenticateRequest(request)

    if (!userContext.isAuthenticated && !userContext.isServiceRole) {
      throw new Error('Authentication required')
    }

    if (requiredPermission && !hasPermission(userContext, requiredPermission)) {
      throw new Error(`Permission '${requiredPermission}' required`)
    }

    if (requiredRole && !hasRole(userContext, requiredRole)) {
      throw new Error(`Role '${requiredRole}' required`)
    }

    return userContext
  }
}

/**
 * Require service role middleware
 */
export function requireServiceRole() {
  return async (request: Request): Promise<ServiceRoleContext> => {
    const userContext = await authenticateRequest(request)

    if (!userContext.isServiceRole) {
      throw new Error('Service role required')
    }

    return userContext as ServiceRoleContext
  }
}

/**
 * CORS headers for authenticated requests
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const config = getAuthConfig()
  const origin = request.headers.get('Origin')
  
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400'
  }

  if (config.allowedOrigins?.includes('*') || (origin && config.allowedOrigins?.includes(origin))) {
    headers['Access-Control-Allow-Origin'] = origin || '*'
    headers['Access-Control-Allow-Credentials'] = 'true'
  }

  return headers
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflight(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    const headers = getCorsHeaders(request)
    return new Response(null, { status: 204, headers })
  }
  return null
}

/**
 * Create authenticated response
 */
export function createAuthenticatedResponse(
  data: any,
  userContext: UserContext | ServiceRoleContext,
  request: Request,
  status: number = 200
): Response {
  const headers = getCorsHeaders(request)
  
  // Add rate limit headers
  const rateLimit = checkRateLimit(request)
  headers['X-RateLimit-Limit'] = (getAuthConfig().rateLimitConfig?.maxRequests || 100).toString()
  headers['X-RateLimit-Remaining'] = rateLimit.remaining.toString()
  headers['X-RateLimit-Reset'] = new Date(rateLimit.resetTime).toISOString()

  return response.success(data, 'Request processed successfully', status, headers)
}

/**
 * Create error response for authentication failures
 */
export function createAuthErrorResponse(
  message: string,
  request: Request,
  status: number = 401
): Response {
  const headers = getCorsHeaders(request)
  
  return response.error(message, status, headers)
}

/**
 * Validate environment variables
 */
export function validateAuthEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY'
  ]

  for (const varName of requiredVars) {
    if (!Deno.env.get(varName)) {
      errors.push(`Missing required environment variable: ${varName}`)
    }
  }

  // Validate Supabase URL format
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    errors.push('SUPABASE_URL must start with https://')
  }

  // Validate service role key format
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (serviceRoleKey && !serviceRoleKey.startsWith('eyJ')) {
    errors.push('SUPABASE_SERVICE_ROLE_KEY must be a valid JWT token')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get authentication status
 */
export function getAuthStatus(): {
  initialized: boolean
  config: Partial<AuthConfig>
  environment: { valid: boolean; errors: string[] }
} {
  const environment = validateAuthEnvironment()
  
  return {
    initialized: !!authConfig,
    config: authConfig ? {
      supabaseUrl: authConfig.supabaseUrl,
      allowedOrigins: authConfig.allowedOrigins,
      rateLimitConfig: authConfig.rateLimitConfig
    } : {},
    environment
  }
}
