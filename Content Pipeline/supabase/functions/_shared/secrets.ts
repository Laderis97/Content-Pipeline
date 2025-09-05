// Shared secrets management utilities for Edge Functions
// PRD Reference: Configuration & Deployment (6.2), Data & Security (E1)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { logger } from './logger.ts'
import { errorHandler, ConfigurationError, InternalError } from './error-handler.ts'

// Supabase configuration
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new ConfigurationError('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for secrets management')
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Secrets configuration
const SECRETS_CONFIG = {
  // Secret names in Supabase Vault
  SECRET_NAMES: {
    OPENAI_API_KEY: 'openai_api_key',
    OPENAI_ORGANIZATION: 'openai_organization',
    WORDPRESS_URL: 'wordpress_url',
    WORDPRESS_USERNAME: 'wordpress_username',
    WORDPRESS_PASSWORD: 'wordpress_password',
    SLACK_WEBHOOK_URL: 'slack_webhook_url',
    ALERT_WEBHOOK_URL: 'alert_webhook_url',
    ENCRYPTION_KEY: 'encryption_key'
  },
  
  // Secret categories
  CATEGORIES: {
    API_KEYS: ['openai_api_key', 'openai_organization'],
    EXTERNAL_SERVICES: ['wordpress_url', 'wordpress_username', 'wordpress_password'],
    NOTIFICATIONS: ['slack_webhook_url', 'alert_webhook_url'],
    SECURITY: ['encryption_key']
  },
  
  // Secret validation rules
  VALIDATION: {
    openai_api_key: {
      required: true,
      pattern: /^sk-[a-zA-Z0-9]{20,}$/,
      description: 'OpenAI API key starting with sk-'
    },
    openai_organization: {
      required: false,
      pattern: /^org-[a-zA-Z0-9]{20,}$/,
      description: 'OpenAI organization ID starting with org-'
    },
    wordpress_url: {
      required: true,
      pattern: /^https?:\/\/.+/,
      description: 'WordPress site URL with protocol'
    },
    wordpress_username: {
      required: true,
      pattern: /^[a-zA-Z0-9_-]{3,}$/,
      description: 'WordPress username (3+ characters, alphanumeric, underscore, dash)'
    },
    wordpress_password: {
      required: true,
      pattern: /^.{8,}$/,
      description: 'WordPress password (8+ characters)'
    },
    slack_webhook_url: {
      required: false,
      pattern: /^https:\/\/hooks\.slack\.com\/services\/.+/,
      description: 'Slack webhook URL'
    },
    alert_webhook_url: {
      required: false,
      pattern: /^https?:\/\/.+/,
      description: 'Alert webhook URL'
    },
    encryption_key: {
      required: false,
      pattern: /^[a-zA-Z0-9+/]{32,}$/,
      description: 'Base64 encryption key (32+ characters)'
    }
  },
  
  // Cache configuration
  CACHE: {
    TTL_SECONDS: 300, // 5 minutes
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000
  }
}

interface SecretInfo {
  name: string
  category: string
  required: boolean
  description: string
  pattern?: RegExp
  cached?: boolean
  last_updated?: string
}

interface SecretValue {
  value: string
  cached: boolean
  last_updated: string
  expires_at?: string
}

interface SecretsStatus {
  total_secrets: number
  required_secrets: number
  optional_secrets: number
  cached_secrets: number
  missing_required: string[]
  validation_errors: Record<string, string[]>
  last_updated: string
}

export class SecretsManager {
  private static instance: SecretsManager
  private cache: Map<string, SecretValue> = new Map()
  private lastCacheUpdate: number = 0
  
  private constructor() {}
  
  static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager()
    }
    return SecretsManager.instance
  }
  
  /**
   * Gets a secret value from Supabase Vault or cache
   */
  async getSecret(secretName: string): Promise<string> {
    try {
      // Check cache first
      const cached = this.getCachedSecret(secretName)
      if (cached) {
        logger.debug(`Secret ${secretName} retrieved from cache`, 'secrets')
        return cached.value
      }
      
      // Fetch from Supabase Vault
      const secret = await this.fetchSecretFromVault(secretName)
      
      // Cache the secret
      this.cacheSecret(secretName, secret)
      
      logger.info(`Secret ${secretName} retrieved from vault`, 'secrets')
      return secret
      
    } catch (error) {
      logger.error(`Failed to get secret ${secretName}:`, 'secrets', { error: error.message })
      throw error
    }
  }
  
  /**
   * Gets multiple secrets at once
   */
  async getSecrets(secretNames: string[]): Promise<Record<string, string>> {
    const secrets: Record<string, string> = {}
    const uncachedSecrets: string[] = []
    
    // Check cache for all secrets
    for (const secretName of secretNames) {
      const cached = this.getCachedSecret(secretName)
      if (cached) {
        secrets[secretName] = cached.value
      } else {
        uncachedSecrets.push(secretName)
      }
    }
    
    // Fetch uncached secrets from vault
    if (uncachedSecrets.length > 0) {
      const vaultSecrets = await this.fetchSecretsFromVault(uncachedSecrets)
      
      for (const [secretName, secretValue] of Object.entries(vaultSecrets)) {
        secrets[secretName] = secretValue
        this.cacheSecret(secretName, secretValue)
      }
    }
    
    logger.info(`Retrieved ${secretNames.length} secrets`, 'secrets', {
      cached: secretNames.length - uncachedSecrets.length,
      from_vault: uncachedSecrets.length
    })
    
    return secrets
  }
  
  /**
   * Gets all secrets for a specific category
   */
  async getSecretsByCategory(category: string): Promise<Record<string, string>> {
    const secretNames = SECRETS_CONFIG.CATEGORIES[category as keyof typeof SECRETS_CONFIG.CATEGORIES] || []
    return await this.getSecrets(secretNames)
  }
  
  /**
   * Gets all required secrets
   */
  async getRequiredSecrets(): Promise<Record<string, string>> {
    const requiredSecrets = Object.entries(SECRETS_CONFIG.VALIDATION)
      .filter(([_, config]) => config.required)
      .map(([name, _]) => name)
    
    return await this.getSecrets(requiredSecrets)
  }
  
  /**
   * Validates a secret value
   */
  validateSecret(secretName: string, value: string): {
    valid: boolean
    errors: string[]
  } {
    const config = SECRETS_CONFIG.VALIDATION[secretName as keyof typeof SECRETS_CONFIG.VALIDATION]
    
    if (!config) {
      return {
        valid: false,
        errors: [`Unknown secret: ${secretName}`]
      }
    }
    
    const errors: string[] = []
    
    // Check required
    if (config.required && (!value || value.trim() === '')) {
      errors.push(`${secretName} is required`)
      return { valid: false, errors }
    }
    
    // Skip validation if not required and empty
    if (!config.required && (!value || value.trim() === '')) {
      return { valid: true, errors: [] }
    }
    
    // Check pattern
    if (config.pattern && !config.pattern.test(value)) {
      errors.push(`${secretName} format is invalid: ${config.description}`)
    }
    
    return {
      valid: errors.length === 0,
      errors
    }
  }
  
  /**
   * Validates all secrets
   */
  async validateAllSecrets(): Promise<{
    valid: boolean
    errors: Record<string, string[]>
    warnings: string[]
  }> {
    const errors: Record<string, string[]> = {}
    const warnings: string[] = []
    
    for (const [secretName, config] of Object.entries(SECRETS_CONFIG.VALIDATION)) {
      try {
        const value = await this.getSecret(secretName)
        const validation = this.validateSecret(secretName, value)
        
        if (!validation.valid) {
          errors[secretName] = validation.errors
        }
      } catch (error) {
        if (config.required) {
          errors[secretName] = [`Failed to retrieve secret: ${error.message}`]
        } else {
          warnings.push(`Optional secret ${secretName} not available: ${error.message}`)
        }
      }
    }
    
    return {
      valid: Object.keys(errors).length === 0,
      errors,
      warnings
    }
  }
  
  /**
   * Gets secrets status and health
   */
  async getSecretsStatus(): Promise<SecretsStatus> {
    const totalSecrets = Object.keys(SECRETS_CONFIG.VALIDATION).length
    const requiredSecrets = Object.values(SECRETS_CONFIG.VALIDATION).filter(config => config.required).length
    const optionalSecrets = totalSecrets - requiredSecrets
    
    const validation = await this.validateAllSecrets()
    const cachedSecrets = this.cache.size
    
    const missingRequired: string[] = []
    for (const [secretName, config] of Object.entries(SECRETS_CONFIG.VALIDATION)) {
      if (config.required && validation.errors[secretName]) {
        missingRequired.push(secretName)
      }
    }
    
    return {
      total_secrets: totalSecrets,
      required_secrets: requiredSecrets,
      optional_secrets: optionalSecrets,
      cached_secrets: cachedSecrets,
      missing_required: missingRequired,
      validation_errors: validation.errors,
      last_updated: new Date().toISOString()
    }
  }
  
  /**
   * Gets secret information
   */
  getSecretInfo(secretName: string): SecretInfo | null {
    const config = SECRETS_CONFIG.VALIDATION[secretName as keyof typeof SECRETS_CONFIG.VALIDATION]
    
    if (!config) {
      return null
    }
    
    const category = Object.entries(SECRETS_CONFIG.CATEGORIES)
      .find(([_, secrets]) => secrets.includes(secretName))?.[0] || 'unknown'
    
    const cached = this.cache.has(secretName)
    const cachedValue = this.cache.get(secretName)
    
    return {
      name: secretName,
      category,
      required: config.required,
      description: config.description,
      pattern: config.pattern,
      cached,
      last_updated: cachedValue?.last_updated
    }
  }
  
  /**
   * Gets all secret information
   */
  getAllSecretInfo(): SecretInfo[] {
    return Object.keys(SECRETS_CONFIG.VALIDATION).map(secretName => 
      this.getSecretInfo(secretName)!
    )
  }
  
  /**
   * Clears the secrets cache
   */
  clearCache(): void {
    this.cache.clear()
    this.lastCacheUpdate = 0
    logger.info('Secrets cache cleared', 'secrets')
  }
  
  /**
   * Refreshes the secrets cache
   */
  async refreshCache(): Promise<void> {
    this.clearCache()
    
    // Pre-load all required secrets
    const requiredSecrets = Object.entries(SECRETS_CONFIG.VALIDATION)
      .filter(([_, config]) => config.required)
      .map(([name, _]) => name)
    
    try {
      await this.getSecrets(requiredSecrets)
      logger.info('Secrets cache refreshed', 'secrets', { secrets_loaded: requiredSecrets.length })
    } catch (error) {
      logger.error('Failed to refresh secrets cache:', 'secrets', { error: error.message })
      throw error
    }
  }
  
  /**
   * Gets cached secret if available and not expired
   */
  private getCachedSecret(secretName: string): SecretValue | null {
    const cached = this.cache.get(secretName)
    
    if (!cached) {
      return null
    }
    
    // Check if cache is expired
    if (cached.expires_at && new Date(cached.expires_at) < new Date()) {
      this.cache.delete(secretName)
      return null
    }
    
    return cached
  }
  
  /**
   * Caches a secret value
   */
  private cacheSecret(secretName: string, value: string): void {
    const expiresAt = new Date(Date.now() + SECRETS_CONFIG.CACHE.TTL_SECONDS * 1000)
    
    this.cache.set(secretName, {
      value,
      cached: true,
      last_updated: new Date().toISOString(),
      expires_at: expiresAt.toISOString()
    })
  }
  
  /**
   * Fetches a single secret from Supabase Vault
   */
  private async fetchSecretFromVault(secretName: string): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('vault.secrets')
        .select('value')
        .eq('name', secretName)
        .single()
      
      if (error) {
        throw new Error(`Failed to fetch secret ${secretName}: ${error.message}`)
      }
      
      if (!data || !data.value) {
        throw new Error(`Secret ${secretName} not found in vault`)
      }
      
      return data.value
      
    } catch (error) {
      logger.error(`Failed to fetch secret ${secretName} from vault:`, 'secrets', { error: error.message })
      throw error
    }
  }
  
  /**
   * Fetches multiple secrets from Supabase Vault
   */
  private async fetchSecretsFromVault(secretNames: string[]): Promise<Record<string, string>> {
    try {
      const { data, error } = await supabase
        .from('vault.secrets')
        .select('name, value')
        .in('name', secretNames)
      
      if (error) {
        throw new Error(`Failed to fetch secrets from vault: ${error.message}`)
      }
      
      const secrets: Record<string, string> = {}
      
      for (const row of data || []) {
        if (row.name && row.value) {
          secrets[row.name] = row.value
        }
      }
      
      // Check for missing secrets
      const missingSecrets = secretNames.filter(name => !secrets[name])
      if (missingSecrets.length > 0) {
        logger.warn('Some secrets not found in vault:', 'secrets', { missing_secrets: missingSecrets })
      }
      
      return secrets
      
    } catch (error) {
      logger.error('Failed to fetch secrets from vault:', 'secrets', { error: error.message })
      throw error
    }
  }
}

// Global secrets manager instance
export const secretsManager = SecretsManager.getInstance()

// Convenience functions
export async function getSecret(secretName: string): Promise<string> {
  return await secretsManager.getSecret(secretName)
}

export async function getSecrets(secretNames: string[]): Promise<Record<string, string>> {
  return await secretsManager.getSecrets(secretNames)
}

export async function getSecretsByCategory(category: string): Promise<Record<string, string>> {
  return await secretsManager.getSecretsByCategory(category)
}

export async function getRequiredSecrets(): Promise<Record<string, string>> {
  return await secretsManager.getRequiredSecrets()
}

export function validateSecret(secretName: string, value: string): {
  valid: boolean
  errors: string[]
} {
  return secretsManager.validateSecret(secretName, value)
}

export async function validateAllSecrets(): Promise<{
  valid: boolean
  errors: Record<string, string[]>
  warnings: string[]
}> {
  return await secretsManager.validateAllSecrets()
}

export async function getSecretsStatus(): Promise<SecretsStatus> {
  return await secretsManager.getSecretsStatus()
}

export function getSecretInfo(secretName: string): SecretInfo | null {
  return secretsManager.getSecretInfo(secretName)
}

export function getAllSecretInfo(): SecretInfo[] {
  return secretsManager.getAllSecretInfo()
}

export function clearSecretsCache(): void {
  secretsManager.clearCache()
}

export async function refreshSecretsCache(): Promise<void> {
  await secretsManager.refreshCache()
}

// Secret-specific getters
export async function getOpenAIConfig(): Promise<{
  apiKey: string
  organization?: string
}> {
  const secrets = await getSecrets(['openai_api_key', 'openai_organization'])
  
  return {
    apiKey: secrets.openai_api_key,
    organization: secrets.openai_organization
  }
}

export async function getWordPressConfig(): Promise<{
  url: string
  username: string
  password: string
}> {
  const secrets = await getSecrets(['wordpress_url', 'wordpress_username', 'wordpress_password'])
  
  return {
    url: secrets.wordpress_url,
    username: secrets.wordpress_username,
    password: secrets.wordpress_password
  }
}

export async function getNotificationConfig(): Promise<{
  slackWebhookUrl?: string
  alertWebhookUrl?: string
}> {
  const secrets = await getSecrets(['slack_webhook_url', 'alert_webhook_url'])
  
  return {
    slackWebhookUrl: secrets.slack_webhook_url,
    alertWebhookUrl: secrets.alert_webhook_url
  }
}

// Configuration getter
export function getSecretsConfig(): typeof SECRETS_CONFIG {
  return SECRETS_CONFIG
}
