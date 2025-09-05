import { logger } from './logger.ts'
import { response } from './response.ts'

// Environment configuration management
// PRD Reference: Configuration & Deployment (6.5), Data & Security (E1-E3)

export interface EnvironmentConfig {
  // Supabase Configuration
  supabaseUrl: string
  supabaseServiceRoleKey: string
  supabaseAnonKey: string
  
  // OpenAI Configuration
  openaiApiKey: string
  openaiModel: string
  openaiMaxTokens: number
  openaiTemperature: number
  
  // WordPress Configuration
  wordpressUrl: string
  wordpressUsername: string
  wordpressPassword: string
  wordpressApiPath: string
  
  // Content Configuration
  defaultWordCount: number
  minWordCount: number
  maxWordCount: number
  defaultModel: string
  
  // System Configuration
  environment: string
  logLevel: string
  enableMetrics: boolean
  enableHealthChecks: boolean
  
  // Rate Limiting
  openaiRateLimit: number
  wordpressRateLimit: number
  apiRateLimit: number
  
  // Retry Configuration
  maxRetries: number
  retryDelayMs: number
  retryBackoffMultiplier: number
  
  // Timeout Configuration
  openaiTimeoutMs: number
  wordpressTimeoutMs: number
  functionTimeoutMs: number
  
  // Security Configuration
  enableCors: boolean
  allowedOrigins: string[]
  enableRateLimiting: boolean
  enableAuth: boolean
}

// Default configuration values
const DEFAULT_CONFIG: Partial<EnvironmentConfig> = {
  // OpenAI defaults
  openaiModel: 'gpt-4',
  openaiMaxTokens: 2000,
  openaiTemperature: 0.7,
  
  // WordPress defaults
  wordpressApiPath: '/wp-json/wp/v2',
  
  // Content defaults
  defaultWordCount: 700,
  minWordCount: 600,
  maxWordCount: 800,
  defaultModel: 'gpt-4',
  
  // System defaults
  environment: 'development',
  logLevel: 'info',
  enableMetrics: true,
  enableHealthChecks: true,
  
  // Rate limiting defaults
  openaiRateLimit: 60, // requests per minute
  wordpressRateLimit: 100, // requests per minute
  apiRateLimit: 1000, // requests per minute
  
  // Retry defaults
  maxRetries: 3,
  retryDelayMs: 1000,
  retryBackoffMultiplier: 2,
  
  // Timeout defaults
  openaiTimeoutMs: 30000,
  wordpressTimeoutMs: 10000,
  functionTimeoutMs: 300000, // 5 minutes
  
  // Security defaults
  enableCors: true,
  allowedOrigins: ['*'],
  enableRateLimiting: true,
  enableAuth: true
}

// Global configuration instance
let config: EnvironmentConfig | null = null

/**
 * Initialize environment configuration
 */
export function initializeConfig(customConfig: Partial<EnvironmentConfig> = {}): EnvironmentConfig {
  try {
    // Required environment variables
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ANON_KEY',
      'OPENAI_API_KEY',
      'WORDPRESS_URL',
      'WORDPRESS_USERNAME',
      'WORDPRESS_PASSWORD'
    ]

    // Check for missing required variables
    const missingVars = requiredVars.filter(varName => !Deno.env.get(varName))
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }

    // Build configuration from environment variables
    const envConfig: EnvironmentConfig = {
      // Supabase Configuration
      supabaseUrl: Deno.env.get('SUPABASE_URL')!,
      supabaseServiceRoleKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      supabaseAnonKey: Deno.env.get('SUPABASE_ANON_KEY')!,
      
      // OpenAI Configuration
      openaiApiKey: Deno.env.get('OPENAI_API_KEY')!,
      openaiModel: Deno.env.get('OPENAI_MODEL') || DEFAULT_CONFIG.openaiModel!,
      openaiMaxTokens: parseInt(Deno.env.get('OPENAI_MAX_TOKENS') || DEFAULT_CONFIG.openaiMaxTokens!.toString()),
      openaiTemperature: parseFloat(Deno.env.get('OPENAI_TEMPERATURE') || DEFAULT_CONFIG.openaiTemperature!.toString()),
      
      // WordPress Configuration
      wordpressUrl: Deno.env.get('WORDPRESS_URL')!,
      wordpressUsername: Deno.env.get('WORDPRESS_USERNAME')!,
      wordpressPassword: Deno.env.get('WORDPRESS_PASSWORD')!,
      wordpressApiPath: Deno.env.get('WORDPRESS_API_PATH') || DEFAULT_CONFIG.wordpressApiPath!,
      
      // Content Configuration
      defaultWordCount: parseInt(Deno.env.get('DEFAULT_WORD_COUNT') || DEFAULT_CONFIG.defaultWordCount!.toString()),
      minWordCount: parseInt(Deno.env.get('MIN_WORD_COUNT') || DEFAULT_CONFIG.minWordCount!.toString()),
      maxWordCount: parseInt(Deno.env.get('MAX_WORD_COUNT') || DEFAULT_CONFIG.maxWordCount!.toString()),
      defaultModel: Deno.env.get('DEFAULT_MODEL') || DEFAULT_CONFIG.defaultModel!,
      
      // System Configuration
      environment: Deno.env.get('ENVIRONMENT') || DEFAULT_CONFIG.environment!,
      logLevel: Deno.env.get('LOG_LEVEL') || DEFAULT_CONFIG.logLevel!,
      enableMetrics: Deno.env.get('ENABLE_METRICS') !== 'false',
      enableHealthChecks: Deno.env.get('ENABLE_HEALTH_CHECKS') !== 'false',
      
      // Rate Limiting
      openaiRateLimit: parseInt(Deno.env.get('OPENAI_RATE_LIMIT') || DEFAULT_CONFIG.openaiRateLimit!.toString()),
      wordpressRateLimit: parseInt(Deno.env.get('WORDPRESS_RATE_LIMIT') || DEFAULT_CONFIG.wordpressRateLimit!.toString()),
      apiRateLimit: parseInt(Deno.env.get('API_RATE_LIMIT') || DEFAULT_CONFIG.apiRateLimit!.toString()),
      
      // Retry Configuration
      maxRetries: parseInt(Deno.env.get('MAX_RETRIES') || DEFAULT_CONFIG.maxRetries!.toString()),
      retryDelayMs: parseInt(Deno.env.get('RETRY_DELAY_MS') || DEFAULT_CONFIG.retryDelayMs!.toString()),
      retryBackoffMultiplier: parseFloat(Deno.env.get('RETRY_BACKOFF_MULTIPLIER') || DEFAULT_CONFIG.retryBackoffMultiplier!.toString()),
      
      // Timeout Configuration
      openaiTimeoutMs: parseInt(Deno.env.get('OPENAI_TIMEOUT_MS') || DEFAULT_CONFIG.openaiTimeoutMs!.toString()),
      wordpressTimeoutMs: parseInt(Deno.env.get('WORDPRESS_TIMEOUT_MS') || DEFAULT_CONFIG.wordpressTimeoutMs!.toString()),
      functionTimeoutMs: parseInt(Deno.env.get('FUNCTION_TIMEOUT_MS') || DEFAULT_CONFIG.functionTimeoutMs!.toString()),
      
      // Security Configuration
      enableCors: Deno.env.get('ENABLE_CORS') !== 'false',
      allowedOrigins: Deno.env.get('ALLOWED_ORIGINS')?.split(',') || DEFAULT_CONFIG.allowedOrigins!,
      enableRateLimiting: Deno.env.get('ENABLE_RATE_LIMITING') !== 'false',
      enableAuth: Deno.env.get('ENABLE_AUTH') !== 'false',
      
      // Apply custom configuration
      ...customConfig
    }

    // Validate configuration
    const validation = validateConfig(envConfig)
    if (!validation.valid) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
    }

    config = envConfig

    logger.info('Environment configuration initialized', 'env-config', {
      environment: config.environment,
      logLevel: config.logLevel,
      enableMetrics: config.enableMetrics,
      enableHealthChecks: config.enableHealthChecks,
      enableCors: config.enableCors,
      enableRateLimiting: config.enableRateLimiting,
      enableAuth: config.enableAuth
    })

    return config
  } catch (error) {
    logger.error('Failed to initialize environment configuration', 'env-config', { error: error.message })
    throw error
  }
}

/**
 * Get current configuration
 */
export function getConfig(): EnvironmentConfig {
  if (!config) {
    return initializeConfig()
  }
  return config
}

/**
 * Validate configuration
 */
export function validateConfig(config: EnvironmentConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Validate URLs
  try {
    new URL(config.supabaseUrl)
  } catch {
    errors.push('Invalid SUPABASE_URL format')
  }

  try {
    new URL(config.wordpressUrl)
  } catch {
    errors.push('Invalid WORDPRESS_URL format')
  }

  // Validate numeric values
  if (config.openaiMaxTokens <= 0) {
    errors.push('OPENAI_MAX_TOKENS must be positive')
  }

  if (config.openaiTemperature < 0 || config.openaiTemperature > 2) {
    errors.push('OPENAI_TEMPERATURE must be between 0 and 2')
  }

  if (config.defaultWordCount <= 0) {
    errors.push('DEFAULT_WORD_COUNT must be positive')
  }

  if (config.minWordCount <= 0) {
    errors.push('MIN_WORD_COUNT must be positive')
  }

  if (config.maxWordCount <= 0) {
    errors.push('MAX_WORD_COUNT must be positive')
  }

  if (config.minWordCount >= config.maxWordCount) {
    errors.push('MIN_WORD_COUNT must be less than MAX_WORD_COUNT')
  }

  if (config.maxRetries < 0) {
    errors.push('MAX_RETRIES must be non-negative')
  }

  if (config.retryDelayMs <= 0) {
    errors.push('RETRY_DELAY_MS must be positive')
  }

  if (config.retryBackoffMultiplier <= 0) {
    errors.push('RETRY_BACKOFF_MULTIPLIER must be positive')
  }

  if (config.openaiTimeoutMs <= 0) {
    errors.push('OPENAI_TIMEOUT_MS must be positive')
  }

  if (config.wordpressTimeoutMs <= 0) {
    errors.push('WORDPRESS_TIMEOUT_MS must be positive')
  }

  if (config.functionTimeoutMs <= 0) {
    errors.push('FUNCTION_TIMEOUT_MS must be positive')
  }

  // Validate rate limits
  if (config.openaiRateLimit <= 0) {
    errors.push('OPENAI_RATE_LIMIT must be positive')
  }

  if (config.wordpressRateLimit <= 0) {
    errors.push('WORDPRESS_RATE_LIMIT must be positive')
  }

  if (config.apiRateLimit <= 0) {
    errors.push('API_RATE_LIMIT must be positive')
  }

  // Validate environment
  const validEnvironments = ['development', 'staging', 'production']
  if (!validEnvironments.includes(config.environment)) {
    errors.push(`ENVIRONMENT must be one of: ${validEnvironments.join(', ')}`)
  }

  // Validate log level
  const validLogLevels = ['debug', 'info', 'warn', 'error']
  if (!validLogLevels.includes(config.logLevel)) {
    errors.push(`LOG_LEVEL must be one of: ${validLogLevels.join(', ')}`)
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get configuration for specific service
 */
export function getServiceConfig(service: 'openai' | 'wordpress' | 'supabase' | 'content' | 'system' | 'security') {
  const config = getConfig()

  switch (service) {
    case 'openai':
      return {
        apiKey: config.openaiApiKey,
        model: config.openaiModel,
        maxTokens: config.openaiMaxTokens,
        temperature: config.openaiTemperature,
        timeoutMs: config.openaiTimeoutMs,
        rateLimit: config.openaiRateLimit
      }

    case 'wordpress':
      return {
        url: config.wordpressUrl,
        username: config.wordpressUsername,
        password: config.wordpressPassword,
        apiPath: config.wordpressApiPath,
        timeoutMs: config.wordpressTimeoutMs,
        rateLimit: config.wordpressRateLimit
      }

    case 'supabase':
      return {
        url: config.supabaseUrl,
        serviceRoleKey: config.supabaseServiceRoleKey,
        anonKey: config.supabaseAnonKey
      }

    case 'content':
      return {
        defaultWordCount: config.defaultWordCount,
        minWordCount: config.minWordCount,
        maxWordCount: config.maxWordCount,
        defaultModel: config.defaultModel
      }

    case 'system':
      return {
        environment: config.environment,
        logLevel: config.logLevel,
        enableMetrics: config.enableMetrics,
        enableHealthChecks: config.enableHealthChecks,
        functionTimeoutMs: config.functionTimeoutMs
      }

    case 'security':
      return {
        enableCors: config.enableCors,
        allowedOrigins: config.allowedOrigins,
        enableRateLimiting: config.enableRateLimiting,
        enableAuth: config.enableAuth,
        apiRateLimit: config.apiRateLimit
      }

    default:
      throw new Error(`Unknown service: ${service}`)
  }
}

/**
 * Get retry configuration
 */
export function getRetryConfig() {
  const config = getConfig()
  
  return {
    maxRetries: config.maxRetries,
    delayMs: config.retryDelayMs,
    backoffMultiplier: config.retryBackoffMultiplier
  }
}

/**
 * Check if feature is enabled
 */
export function isFeatureEnabled(feature: 'metrics' | 'healthChecks' | 'cors' | 'rateLimiting' | 'auth'): boolean {
  const config = getConfig()

  switch (feature) {
    case 'metrics':
      return config.enableMetrics
    case 'healthChecks':
      return config.enableHealthChecks
    case 'cors':
      return config.enableCors
    case 'rateLimiting':
      return config.enableRateLimiting
    case 'auth':
      return config.enableAuth
    default:
      return false
  }
}

/**
 * Get environment-specific configuration
 */
export function getEnvironmentConfig() {
  const config = getConfig()
  
  // Environment-specific overrides
  const envOverrides: Record<string, Partial<EnvironmentConfig>> = {
    development: {
      logLevel: 'debug',
      enableMetrics: true,
      enableHealthChecks: true,
      openaiRateLimit: 30,
      wordpressRateLimit: 50,
      apiRateLimit: 500
    },
    staging: {
      logLevel: 'info',
      enableMetrics: true,
      enableHealthChecks: true,
      openaiRateLimit: 45,
      wordpressRateLimit: 75,
      apiRateLimit: 750
    },
    production: {
      logLevel: 'warn',
      enableMetrics: true,
      enableHealthChecks: true,
      openaiRateLimit: 60,
      wordpressRateLimit: 100,
      apiRateLimit: 1000
    }
  }

  const overrides = envOverrides[config.environment] || {}
  
  return {
    ...config,
    ...overrides
  }
}

/**
 * Get configuration status
 */
export function getConfigStatus(): {
  initialized: boolean
  environment: string
  validation: { valid: boolean; errors: string[] }
  features: Record<string, boolean>
  services: Record<string, boolean>
} {
  const config = getConfig()
  const validation = validateConfig(config)

  return {
    initialized: !!config,
    environment: config.environment,
    validation,
    features: {
      metrics: config.enableMetrics,
      healthChecks: config.enableHealthChecks,
      cors: config.enableCors,
      rateLimiting: config.enableRateLimiting,
      auth: config.enableAuth
    },
    services: {
      supabase: !!config.supabaseUrl && !!config.supabaseServiceRoleKey,
      openai: !!config.openaiApiKey,
      wordpress: !!config.wordpressUrl && !!config.wordpressUsername && !!config.wordpressPassword
    }
  }
}

/**
 * Reset configuration (for testing)
 */
export function resetConfig(): void {
  config = null
}

/**
 * Update configuration at runtime
 */
export function updateConfig(updates: Partial<EnvironmentConfig>): EnvironmentConfig {
  if (!config) {
    throw new Error('Configuration not initialized')
  }

  const newConfig = { ...config, ...updates }
  const validation = validateConfig(newConfig)
  
  if (!validation.valid) {
    throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`)
  }

  config = newConfig
  
  logger.info('Configuration updated', 'env-config', {
    updates: Object.keys(updates),
    environment: config.environment
  })

  return config
}

/**
 * Get configuration for external services
 */
export function getExternalServiceConfig() {
  const config = getConfig()
  
  return {
    openai: {
      apiKey: config.openaiApiKey,
      model: config.openaiModel,
      maxTokens: config.openaiMaxTokens,
      temperature: config.openaiTemperature,
      timeout: config.openaiTimeoutMs,
      rateLimit: config.openaiRateLimit
    },
    wordpress: {
      url: config.wordpressUrl,
      username: config.wordpressUsername,
      password: config.wordpressPassword,
      apiPath: config.wordpressApiPath,
      timeout: config.wordpressTimeoutMs,
      rateLimit: config.wordpressRateLimit
    }
  }
}

/**
 * Validate external service configuration
 */
export function validateExternalServiceConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const config = getConfig()

  // Validate OpenAI configuration
  if (!config.openaiApiKey || !config.openaiApiKey.startsWith('sk-')) {
    errors.push('Invalid OpenAI API key format')
  }

  // Validate WordPress configuration
  try {
    new URL(config.wordpressUrl)
  } catch {
    errors.push('Invalid WordPress URL format')
  }

  if (!config.wordpressUsername || config.wordpressUsername.length === 0) {
    errors.push('WordPress username is required')
  }

  if (!config.wordpressPassword || config.wordpressPassword.length === 0) {
    errors.push('WordPress password is required')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
