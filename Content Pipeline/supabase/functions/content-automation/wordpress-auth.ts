// WordPress authentication using app password for content-bot user
// PRD Reference: WordPress Integration (C2), Data & Security (E1)

import { WordPressUser } from './wordpress-client.ts'

// WordPress authentication configuration
const WORDPRESS_BASE_URL = Deno.env.get('WORDPRESS_BASE_URL')
const WORDPRESS_USERNAME = Deno.env.get('WORDPRESS_USERNAME') || 'content-bot'
const WORDPRESS_APP_PASSWORD = Deno.env.get('WORDPRESS_APP_PASSWORD')
const WORDPRESS_DEFAULT_AUTHOR_ID = parseInt(Deno.env.get('WORDPRESS_DEFAULT_AUTHOR_ID') || '1')

// WordPress API endpoints
const WORDPRESS_ENDPOINTS = {
  users: '/wp-json/wp/v2/users',
  users_me: '/wp-json/wp/v2/users/me',
  application_passwords: '/wp-json/wp/v2/users/me/application-passwords'
}

// Authentication timeout
const AUTH_TIMEOUT = 10000 // 10 seconds

interface WordPressAuthConfig {
  base_url: string
  username: string
  app_password: string
  default_author_id: number
  timeout_ms: number
}

interface AuthResult {
  success: boolean
  user?: WordPressUser
  error?: string
  status_code?: number
}

interface AppPasswordInfo {
  uuid: string
  name: string
  created: string
  last_used: string | null
  last_ip: string | null
}

/**
 * WordPress authentication manager for content-bot user
 */
export class WordPressAuthManager {
  private config: WordPressAuthConfig
  private cachedUser: WordPressUser | null = null
  private lastAuthCheck: number = 0
  private authCacheTimeout: number = 300000 // 5 minutes

  constructor(config?: Partial<WordPressAuthConfig>) {
    this.config = {
      base_url: config?.base_url || WORDPRESS_BASE_URL || '',
      username: config?.username || WORDPRESS_USERNAME,
      app_password: config?.app_password || WORDPRESS_APP_PASSWORD || '',
      default_author_id: config?.default_author_id || WORDPRESS_DEFAULT_AUTHOR_ID,
      timeout_ms: config?.timeout_ms || AUTH_TIMEOUT
    }

    if (!this.config.base_url) {
      throw new Error('WordPress base URL not found in environment variables')
    }

    if (!this.config.app_password) {
      throw new Error('WordPress app password not found in environment variables')
    }

    // Ensure base URL doesn't end with slash
    this.config.base_url = this.config.base_url.replace(/\/$/, '')
  }

  /**
   * Authenticates with WordPress using app password
   */
  async authenticate(): Promise<AuthResult> {
    try {
      console.log(`[WordPressAuth] Authenticating user: ${this.config.username}`)
      
      // Check cache first
      if (this.cachedUser && this.isAuthCacheValid()) {
        console.log('[WordPressAuth] Using cached authentication')
        return {
          success: true,
          user: this.cachedUser
        }
      }

      // Make authentication request
      const response = await this.makeAuthRequest()
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.message || `Authentication failed: ${response.status} ${response.statusText}`
        
        console.error(`[WordPressAuth] Authentication failed: ${errorMessage}`)
        
        return {
          success: false,
          error: errorMessage,
          status_code: response.status
        }
      }

      const userData = await response.json()
      const user: WordPressUser = {
        id: userData.id,
        name: userData.name,
        slug: userData.slug,
        description: userData.description || ''
      }

      // Cache the authenticated user
      this.cachedUser = user
      this.lastAuthCheck = Date.now()

      console.log(`[WordPressAuth] Authentication successful for user: ${user.name} (ID: ${user.id})`)
      
      return {
        success: true,
        user
      }

    } catch (error) {
      console.error('[WordPressAuth] Authentication error:', error)
      
      return {
        success: false,
        error: error.message,
        status_code: 500
      }
    }
  }

  /**
   * Validates app password and user permissions
   */
  async validateAppPassword(): Promise<AuthResult> {
    try {
      console.log('[WordPressAuth] Validating app password')
      
      const authResult = await this.authenticate()
      if (!authResult.success) {
        return authResult
      }

      // Check if user has required permissions
      const permissionsResult = await this.checkUserPermissions(authResult.user!)
      if (!permissionsResult.success) {
        return permissionsResult
      }

      console.log('[WordPressAuth] App password validation successful')
      
      return {
        success: true,
        user: authResult.user
      }

    } catch (error) {
      console.error('[WordPressAuth] App password validation error:', error)
      
      return {
        success: false,
        error: error.message,
        status_code: 500
      }
    }
  }

  /**
   * Gets the authenticated user information
   */
  async getAuthenticatedUser(): Promise<WordPressUser | null> {
    try {
      const authResult = await this.authenticate()
      return authResult.success ? authResult.user! : null
    } catch (error) {
      console.error('[WordPressAuth] Error getting authenticated user:', error)
      return null
    }
  }

  /**
   * Checks if the user has required permissions for content creation
   */
  async checkUserPermissions(user: WordPressUser): Promise<AuthResult> {
    try {
      console.log(`[WordPressAuth] Checking permissions for user: ${user.name}`)
      
      // Make a request to check user capabilities
      const response = await this.makeAuthRequest(WORDPRESS_ENDPOINTS.users_me)
      
      if (!response.ok) {
        return {
          success: false,
          error: `Permission check failed: ${response.status} ${response.statusText}`,
          status_code: response.status
        }
      }

      const userData = await response.json()
      
      // Check if user has required capabilities
      const capabilities = userData.capabilities || {}
      const requiredCapabilities = ['edit_posts', 'publish_posts']
      
      const hasRequiredCapabilities = requiredCapabilities.every(cap => capabilities[cap])
      
      if (!hasRequiredCapabilities) {
        return {
          success: false,
          error: `User ${user.name} lacks required capabilities: ${requiredCapabilities.join(', ')}`,
          status_code: 403
        }
      }

      console.log(`[WordPressAuth] User ${user.name} has required permissions`)
      
      return {
        success: true,
        user
      }

    } catch (error) {
      console.error('[WordPressAuth] Permission check error:', error)
      
      return {
        success: false,
        error: error.message,
        status_code: 500
      }
    }
  }

  /**
   * Gets application password information
   */
  async getAppPasswordInfo(): Promise<AppPasswordInfo[]> {
    try {
      console.log('[WordPressAuth] Getting application password information')
      
      const response = await this.makeAuthRequest(WORDPRESS_ENDPOINTS.application_passwords)
      
      if (!response.ok) {
        console.warn(`[WordPressAuth] Failed to get app password info: ${response.status}`)
        return []
      }

      const passwords = await response.json()
      
      return passwords.map((pwd: any) => ({
        uuid: pwd.uuid,
        name: pwd.name,
        created: pwd.created,
        last_used: pwd.last_used,
        last_ip: pwd.last_ip
      }))

    } catch (error) {
      console.error('[WordPressAuth] Error getting app password info:', error)
      return []
    }
  }

  /**
   * Tests WordPress authentication
   */
  async testAuthentication(): Promise<{
    success: boolean
    user?: WordPressUser
    error?: string
    app_passwords?: AppPasswordInfo[]
  }> {
    try {
      console.log('[WordPressAuth] Testing WordPress authentication')
      
      const authResult = await this.authenticate()
      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error
        }
      }

      const appPasswords = await this.getAppPasswordInfo()
      
      return {
        success: true,
        user: authResult.user,
        app_passwords: appPasswords
      }

    } catch (error) {
      console.error('[WordPressAuth] Authentication test error:', error)
      
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Makes an authenticated request to WordPress API
   */
  private async makeAuthRequest(endpoint: string = WORDPRESS_ENDPOINTS.users_me): Promise<Response> {
    const url = `${this.config.base_url}${endpoint}`
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${btoa(`${this.config.username}:${this.config.app_password}`)}`
    }

    const requestOptions: RequestInit = {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(this.config.timeout_ms)
    }

    return await fetch(url, requestOptions)
  }

  /**
   * Checks if authentication cache is still valid
   */
  private isAuthCacheValid(): boolean {
    return this.cachedUser !== null && 
           (Date.now() - this.lastAuthCheck) < this.authCacheTimeout
  }

  /**
   * Clears authentication cache
   */
  clearAuthCache(): void {
    this.cachedUser = null
    this.lastAuthCheck = 0
    console.log('[WordPressAuth] Authentication cache cleared')
  }

  /**
   * Gets authentication configuration
   */
  getConfig(): WordPressAuthConfig {
    return { ...this.config }
  }

  /**
   * Validates authentication configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!this.config.base_url) {
      errors.push('WordPress base URL is required')
    }

    if (!this.config.username) {
      errors.push('WordPress username is required')
    }

    if (!this.config.app_password) {
      errors.push('WordPress app password is required')
    }

    if (this.config.base_url && !this.config.base_url.startsWith('http')) {
      errors.push('WordPress base URL must be a valid HTTP/HTTPS URL')
    }

    if (this.config.username && this.config.username.length < 3) {
      errors.push('WordPress username must be at least 3 characters long')
    }

    if (this.config.app_password && this.config.app_password.length < 12) {
      errors.push('WordPress app password must be at least 12 characters long')
    }

    return {
      valid: errors.length === 0,
      errors
    }
  }
}

/**
 * Creates WordPress authentication manager with default configuration
 */
export function createWordPressAuthManager(): WordPressAuthManager {
  return new WordPressAuthManager()
}

/**
 * Authenticates with WordPress and returns user information
 */
export async function authenticateWordPress(): Promise<AuthResult> {
  try {
    const authManager = createWordPressAuthManager()
    return await authManager.authenticate()
  } catch (error) {
    console.error('Error in authenticateWordPress:', error)
    return {
      success: false,
      error: error.message,
      status_code: 500
    }
  }
}

/**
 * Validates WordPress app password and user permissions
 */
export async function validateWordPressAuth(): Promise<AuthResult> {
  try {
    const authManager = createWordPressAuthManager()
    return await authManager.validateAppPassword()
  } catch (error) {
    console.error('Error in validateWordPressAuth:', error)
    return {
      success: false,
      error: error.message,
      status_code: 500
    }
  }
}

/**
 * Gets WordPress authentication configuration
 */
export function getWordPressAuthConfig(): WordPressAuthConfig {
  return {
    base_url: WORDPRESS_BASE_URL || '',
    username: WORDPRESS_USERNAME,
    app_password: WORDPRESS_APP_PASSWORD || '',
    default_author_id: WORDPRESS_DEFAULT_AUTHOR_ID,
    timeout_ms: AUTH_TIMEOUT
  }
}

/**
 * Validates WordPress authentication configuration
 */
export function validateWordPressAuthConfig(): { valid: boolean; errors: string[] } {
  const authManager = createWordPressAuthManager()
  return authManager.validateConfig()
}
