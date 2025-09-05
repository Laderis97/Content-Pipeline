// Environment configuration and validation for Edge Functions
// PRD Reference: Configuration & Deployment (6.1)

// Environment variable definitions
export interface EnvironmentConfig {
  // Supabase configuration
  SUPABASE_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string
  SUPABASE_ANON_KEY: string
  
  // OpenAI configuration
  OPENAI_API_KEY: string
  OPENAI_ORGANIZATION?: string
  
  // WordPress configuration
  WORDPRESS_URL: string
  WORDPRESS_USERNAME: string
  WORDPRESS_PASSWORD: string
  
  // External service configuration
  SLACK_WEBHOOK_URL?: string
  ALERT_WEBHOOK_URL?: string
  
  // Feature flags
  ENABLE_GRACEFUL_DEGRADATION: boolean
  ENABLE_METRICS_COLLECTION: boolean
  ENABLE_HEALTH_MONITORING: boolean
  ENABLE_ALERTING: boolean
  
  // Performance configuration
  MAX_CONCURRENT_JOBS: number
  JOB_TIMEOUT_MS: number
  RETRY_MAX_ATTEMPTS: number
  
  // Monitoring configuration
  HEALTH_CHECK_INTERVAL_MS: number
  METRICS_COLLECTION_INTERVAL_MS: number
  CLEANUP_INTERVAL_MS: number
}

// Default configuration values
const DEFAULT_CONFIG: Partial<EnvironmentConfig> = {
  ENABLE_GRACEFUL_DEGRADATION: true,
  ENABLE_METRICS_COLLECTION: true,
  ENABLE_HEALTH_MONITORING: true,
  ENABLE_ALERTING: true,
  MAX_CONCURRENT_JOBS: 5,
  JOB_TIMEOUT_MS: 300000, // 5 minutes
  RETRY_MAX_ATTEMPTS: 3,
  HEALTH_CHECK_INTERVAL_MS: 60000, // 1 minute
  METRICS_COLLECTION_INTERVAL_MS: 300000, // 5 minutes
  CLEANUP_INTERVAL_MS: 86400000 // 24 hours
}

// Environment configuration class
export class EnvironmentManager {
  private config: EnvironmentConfig
  private validationErrors: string[] = []
  private validationWarnings: string[] = []
  
  constructor() {
    this.config = this.loadConfiguration()
    this.validateConfiguration()
  }
  
  private loadConfiguration(): EnvironmentConfig {
    const config: EnvironmentConfig = {
      // Required environment variables
      SUPABASE_URL: Deno.env.get('SUPABASE_URL') || '',
      SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
      SUPABASE_ANON_KEY: Deno.env.get('SUPABASE_ANON_KEY') || '',
      OPENAI_API_KEY: Deno.env.get('OPENAI_API_KEY') || '',
      WORDPRESS_URL: Deno.env.get('WORDPRESS_URL') || '',
      WORDPRESS_USERNAME: Deno.env.get('WORDPRESS_USERNAME') || '',
      WORDPRESS_PASSWORD: Deno.env.get('WORDPRESS_PASSWORD') || '',
      
      // Optional environment variables
      OPENAI_ORGANIZATION: Deno.env.get('OPENAI_ORGANIZATION'),
      SLACK_WEBHOOK_URL: Deno.env.get('SLACK_WEBHOOK_URL'),
      ALERT_WEBHOOK_URL: Deno.env.get('ALERT_WEBHOOK_URL'),
      
      // Feature flags
      ENABLE_GRACEFUL_DEGRADATION: this.getBooleanEnv('ENABLE_GRACEFUL_DEGRADATION', DEFAULT_CONFIG.ENABLE_GRACEFUL_DEGRADATION!),
      ENABLE_METRICS_COLLECTION: this.getBooleanEnv('ENABLE_METRICS_COLLECTION', DEFAULT_CONFIG.ENABLE_METRICS_COLLECTION!),
      ENABLE_HEALTH_MONITORING: this.getBooleanEnv('ENABLE_HEALTH_MONITORING', DEFAULT_CONFIG.ENABLE_HEALTH_MONITORING!),
      ENABLE_ALERTING: this.getBooleanEnv('ENABLE_ALERTING', DEFAULT_CONFIG.ENABLE_ALERTING!),
      
      // Performance configuration
      MAX_CONCURRENT_JOBS: this.getNumberEnv('MAX_CONCURRENT_JOBS', DEFAULT_CONFIG.MAX_CONCURRENT_JOBS!),
      JOB_TIMEOUT_MS: this.getNumberEnv('JOB_TIMEOUT_MS', DEFAULT_CONFIG.JOB_TIMEOUT_MS!),
      RETRY_MAX_ATTEMPTS: this.getNumberEnv('RETRY_MAX_ATTEMPTS', DEFAULT_CONFIG.RETRY_MAX_ATTEMPTS!),
      
      // Monitoring configuration
      HEALTH_CHECK_INTERVAL_MS: this.getNumberEnv('HEALTH_CHECK_INTERVAL_MS', DEFAULT_CONFIG.HEALTH_CHECK_INTERVAL_MS!),
      METRICS_COLLECTION_INTERVAL_MS: this.getNumberEnv('METRICS_COLLECTION_INTERVAL_MS', DEFAULT_CONFIG.METRICS_COLLECTION_INTERVAL_MS!),
      CLEANUP_INTERVAL_MS: this.getNumberEnv('CLEANUP_INTERVAL_MS', DEFAULT_CONFIG.CLEANUP_INTERVAL_MS!)
    }
    
    return config
  }
  
  private getBooleanEnv(key: string, defaultValue: boolean): boolean {
    const value = Deno.env.get(key)
    if (value === undefined) return defaultValue
    return value.toLowerCase() === 'true'
  }
  
  private getNumberEnv(key: string, defaultValue: number): number {
    const value = Deno.env.get(key)
    if (value === undefined) return defaultValue
    const parsed = parseInt(value, 10)
    return isNaN(parsed) ? defaultValue : parsed
  }
  
  private validateConfiguration(): void {
    this.validationErrors = []
    this.validationWarnings = []
    
    // Required environment variables
    if (!this.config.SUPABASE_URL) {
      this.validationErrors.push('SUPABASE_URL is required')
    } else if (!this.config.SUPABASE_URL.startsWith('https://')) {
      this.validationWarnings.push('SUPABASE_URL should use HTTPS in production')
    }
    
    if (!this.config.SUPABASE_SERVICE_ROLE_KEY) {
      this.validationErrors.push('SUPABASE_SERVICE_ROLE_KEY is required')
    } else if (this.config.SUPABASE_SERVICE_ROLE_KEY.length < 100) {
      this.validationWarnings.push('SUPABASE_SERVICE_ROLE_KEY appears to be invalid (too short)')
    }
    
    if (!this.config.SUPABASE_ANON_KEY) {
      this.validationErrors.push('SUPABASE_ANON_KEY is required')
    } else if (this.config.SUPABASE_ANON_KEY.length < 100) {
      this.validationWarnings.push('SUPABASE_ANON_KEY appears to be invalid (too short)')
    }
    
    if (!this.config.OPENAI_API_KEY) {
      this.validationErrors.push('OPENAI_API_KEY is required')
    } else if (!this.config.OPENAI_API_KEY.startsWith('sk-')) {
      this.validationWarnings.push('OPENAI_API_KEY appears to be invalid (should start with sk-)')
    }
    
    if (!this.config.WORDPRESS_URL) {
      this.validationErrors.push('WORDPRESS_URL is required')
    } else if (!this.config.WORDPRESS_URL.startsWith('http')) {
      this.validationWarnings.push('WORDPRESS_URL should include protocol (http:// or https://)')
    }
    
    if (!this.config.WORDPRESS_USERNAME) {
      this.validationErrors.push('WORDPRESS_USERNAME is required')
    }
    
    if (!this.config.WORDPRESS_PASSWORD) {
      this.validationErrors.push('WORDPRESS_PASSWORD is required')
    }
    
    // Optional environment variables validation
    if (this.config.SLACK_WEBHOOK_URL && !this.config.SLACK_WEBHOOK_URL.startsWith('https://hooks.slack.com/')) {
      this.validationWarnings.push('SLACK_WEBHOOK_URL appears to be invalid')
    }
    
    if (this.config.ALERT_WEBHOOK_URL && !this.config.ALERT_WEBHOOK_URL.startsWith('http')) {
      this.validationWarnings.push('ALERT_WEBHOOK_URL should include protocol')
    }
    
    // Performance configuration validation
    if (this.config.MAX_CONCURRENT_JOBS < 1 || this.config.MAX_CONCURRENT_JOBS > 20) {
      this.validationWarnings.push('MAX_CONCURRENT_JOBS should be between 1 and 20')
    }
    
    if (this.config.JOB_TIMEOUT_MS < 30000 || this.config.JOB_TIMEOUT_MS > 600000) {
      this.validationWarnings.push('JOB_TIMEOUT_MS should be between 30 seconds and 10 minutes')
    }
    
    if (this.config.RETRY_MAX_ATTEMPTS < 1 || this.config.RETRY_MAX_ATTEMPTS > 10) {
      this.validationWarnings.push('RETRY_MAX_ATTEMPTS should be between 1 and 10')
    }
  }
  
  getConfig(): EnvironmentConfig {
    return { ...this.config }
  }
  
  getConfigValue<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
    return this.config[key]
  }
  
  isConfigValid(): boolean {
    return this.validationErrors.length === 0
  }
  
  getValidationErrors(): string[] {
    return [...this.validationErrors]
  }
  
  getValidationWarnings(): string[] {
    return [...this.validationWarnings]
  }
  
  getValidationReport(): {
    valid: boolean
    errors: string[]
    warnings: string[]
    summary: string
  } {
    const valid = this.isConfigValid()
    const errors = this.getValidationErrors()
    const warnings = this.getValidationWarnings()
    
    let summary = ''
    if (valid) {
      summary = 'Configuration is valid'
      if (warnings.length > 0) {
        summary += ` with ${warnings.length} warning(s)`
      }
    } else {
      summary = `Configuration has ${errors.length} error(s)`
      if (warnings.length > 0) {
        summary += ` and ${warnings.length} warning(s)`
      }
    }
    
    return {
      valid,
      errors,
      warnings,
      summary
    }
  }
  
  // Feature flag helpers
  isFeatureEnabled(feature: keyof Pick<EnvironmentConfig, 'ENABLE_GRACEFUL_DEGRADATION' | 'ENABLE_METRICS_COLLECTION' | 'ENABLE_HEALTH_MONITORING' | 'ENABLE_ALERTING'>): boolean {
    return this.config[feature]
  }
  
  // Performance configuration helpers
  getMaxConcurrentJobs(): number {
    return this.config.MAX_CONCURRENT_JOBS
  }
  
  getJobTimeoutMs(): number {
    return this.config.JOB_TIMEOUT_MS
  }
  
  getRetryMaxAttempts(): number {
    return this.config.RETRY_MAX_ATTEMPTS
  }
  
  // Monitoring configuration helpers
  getHealthCheckIntervalMs(): number {
    return this.config.HEALTH_CHECK_INTERVAL_MS
  }
  
  getMetricsCollectionIntervalMs(): number {
    return this.config.METRICS_COLLECTION_INTERVAL_MS
  }
  
  getCleanupIntervalMs(): number {
    return this.config.CLEANUP_INTERVAL_MS
  }
  
  // External service configuration helpers
  getOpenAIConfig(): {
    apiKey: string
    organization?: string
  } {
    return {
      apiKey: this.config.OPENAI_API_KEY,
      organization: this.config.OPENAI_ORGANIZATION
    }
  }
  
  getWordPressConfig(): {
    url: string
    username: string
    password: string
  } {
    return {
      url: this.config.WORDPRESS_URL,
      username: this.config.WORDPRESS_USERNAME,
      password: this.config.WORDPRESS_PASSWORD
    }
  }
  
  getNotificationConfig(): {
    slackWebhookUrl?: string
    alertWebhookUrl?: string
  } {
    return {
      slackWebhookUrl: this.config.SLACK_WEBHOOK_URL,
      alertWebhookUrl: this.config.ALERT_WEBHOOK_URL
    }
  }
}

// Global environment manager instance
export const env = new EnvironmentManager()

// Environment validation helper
export function validateEnvironment(): {
  valid: boolean
  errors: string[]
  warnings: string[]
  summary: string
} {
  return env.getValidationReport()
}

// Feature flag helpers
export function isFeatureEnabled(feature: keyof Pick<EnvironmentConfig, 'ENABLE_GRACEFUL_DEGRADATION' | 'ENABLE_METRICS_COLLECTION' | 'ENABLE_HEALTH_MONITORING' | 'ENABLE_ALERTING'>): boolean {
  return env.isFeatureEnabled(feature)
}

// Configuration getters
export function getConfig(): EnvironmentConfig {
  return env.getConfig()
}

export function getConfigValue<K extends keyof EnvironmentConfig>(key: K): EnvironmentConfig[K] {
  return env.getConfigValue(key)
}

// Performance configuration getters
export function getMaxConcurrentJobs(): number {
  return env.getMaxConcurrentJobs()
}

export function getJobTimeoutMs(): number {
  return env.getJobTimeoutMs()
}

export function getRetryMaxAttempts(): number {
  return env.getRetryMaxAttempts()
}

// Monitoring configuration getters
export function getHealthCheckIntervalMs(): number {
  return env.getHealthCheckIntervalMs()
}

export function getMetricsCollectionIntervalMs(): number {
  return env.getMetricsCollectionIntervalMs()
}

export function getCleanupIntervalMs(): number {
  return env.getCleanupIntervalMs()
}

// External service configuration getters
export function getOpenAIConfig(): {
  apiKey: string
  organization?: string
} {
  return env.getOpenAIConfig()
}

export function getWordPressConfig(): {
  url: string
  username: string
  password: string
} {
  return env.getWordPressConfig()
}

export function getNotificationConfig(): {
  slackWebhookUrl?: string
  alertWebhookUrl?: string
} {
  return env.getNotificationConfig()
}
