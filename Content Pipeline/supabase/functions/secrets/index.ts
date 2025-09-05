import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { response } from '../_shared/response.ts'
import { logger } from '../_shared/logger.ts'
import { 
  secretsManager,
  getSecret,
  getSecrets,
  getSecretsByCategory,
  getRequiredSecrets,
  validateAllSecrets,
  getSecretsStatus,
  getSecretInfo,
  getAllSecretInfo,
  getOpenAIConfig,
  getWordPressConfig,
  getNotificationConfig,
  getSecretsConfig
} from '../_shared/secrets.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'status'
    const secretName = url.searchParams.get('name') || ''
    const category = url.searchParams.get('category') || ''
    
    logger.info(`Secrets management - Action: ${action}`, 'secrets')
    
    switch (action) {
      case 'status':
        return await handleGetStatus()
      
      case 'get':
        return await handleGetSecret(secretName)
      
      case 'get-multiple':
        return await handleGetSecrets(req)
      
      case 'get-by-category':
        return await handleGetSecretsByCategory(category)
      
      case 'get-required':
        return await handleGetRequiredSecrets()
      
      case 'validate':
        return await handleValidateSecrets()
      
      case 'info':
        return await handleGetSecretInfo(secretName)
      
      case 'info-all':
        return await handleGetAllSecretInfo()
      
      case 'openai-config':
        return await handleGetOpenAIConfig()
      
      case 'wordpress-config':
        return await handleGetWordPressConfig()
      
      case 'notification-config':
        return await handleGetNotificationConfig()
      
      case 'config':
        return await handleGetConfig()
      
      case 'refresh-cache':
        return await handleRefreshCache()
      
      case 'clear-cache':
        return await handleClearCache()
      
      default:
        return response.validationError(
          'Invalid action. Supported actions: status, get, get-multiple, get-by-category, get-required, validate, info, info-all, openai-config, wordpress-config, notification-config, config, refresh-cache, clear-cache'
        )
    }
    
  } catch (error) {
    logger.error('Secrets management error:', 'secrets', { error: error.message })
    return response.internalError('Secrets management failed', { error: error.message })
  }
})

async function handleGetStatus(): Promise<Response> {
  try {
    const status = await getSecretsStatus()
    
    return response.success(
      status,
      'Secrets status retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get secrets status:', 'secrets', { error: error.message })
    return response.internalError('Failed to get secrets status', { error: error.message })
  }
}

async function handleGetSecret(secretName: string): Promise<Response> {
  try {
    if (!secretName) {
      return response.validationError('Secret name is required')
    }
    
    const value = await getSecret(secretName)
    const info = getSecretInfo(secretName)
    
    return response.success(
      {
        name: secretName,
        value: value,
        info: info
      },
      `Secret ${secretName} retrieved successfully`,
      200
    )
    
  } catch (error) {
    logger.error(`Failed to get secret ${secretName}:`, 'secrets', { error: error.message })
    return response.internalError(`Failed to get secret ${secretName}`, { error: error.message })
  }
}

async function handleGetSecrets(req: Request): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({}))
    const { secret_names = [] } = body
    
    if (!Array.isArray(secret_names) || secret_names.length === 0) {
      return response.validationError('secret_names array is required')
    }
    
    const secrets = await getSecrets(secret_names)
    
    return response.success(
      {
        secrets: secrets,
        count: Object.keys(secrets).length,
        requested: secret_names.length
      },
      `Retrieved ${Object.keys(secrets).length} secrets successfully`,
      200
    )
    
  } catch (error) {
    logger.error('Failed to get secrets:', 'secrets', { error: error.message })
    return response.internalError('Failed to get secrets', { error: error.message })
  }
}

async function handleGetSecretsByCategory(category: string): Promise<Response> {
  try {
    if (!category) {
      return response.validationError('Category is required')
    }
    
    const secrets = await getSecretsByCategory(category)
    
    return response.success(
      {
        category: category,
        secrets: secrets,
        count: Object.keys(secrets).length
      },
      `Retrieved ${Object.keys(secrets).length} secrets for category ${category}`,
      200
    )
    
  } catch (error) {
    logger.error(`Failed to get secrets for category ${category}:`, 'secrets', { error: error.message })
    return response.internalError(`Failed to get secrets for category ${category}`, { error: error.message })
  }
}

async function handleGetRequiredSecrets(): Promise<Response> {
  try {
    const secrets = await getRequiredSecrets()
    
    return response.success(
      {
        secrets: secrets,
        count: Object.keys(secrets).length
      },
      `Retrieved ${Object.keys(secrets).length} required secrets`,
      200
    )
    
  } catch (error) {
    logger.error('Failed to get required secrets:', 'secrets', { error: error.message })
    return response.internalError('Failed to get required secrets', { error: error.message })
  }
}

async function handleValidateSecrets(): Promise<Response> {
  try {
    const validation = await validateAllSecrets()
    
    return response.success(
      validation,
      validation.valid ? 'All secrets are valid' : 'Some secrets have validation errors',
      validation.valid ? 200 : 400
    )
    
  } catch (error) {
    logger.error('Failed to validate secrets:', 'secrets', { error: error.message })
    return response.internalError('Failed to validate secrets', { error: error.message })
  }
}

async function handleGetSecretInfo(secretName: string): Promise<Response> {
  try {
    if (!secretName) {
      return response.validationError('Secret name is required')
    }
    
    const info = getSecretInfo(secretName)
    
    if (!info) {
      return response.notFound(`Secret info not found for ${secretName}`)
    }
    
    return response.success(
      info,
      `Secret info for ${secretName} retrieved successfully`,
      200
    )
    
  } catch (error) {
    logger.error(`Failed to get secret info for ${secretName}:`, 'secrets', { error: error.message })
    return response.internalError(`Failed to get secret info for ${secretName}`, { error: error.message })
  }
}

async function handleGetAllSecretInfo(): Promise<Response> {
  try {
    const allInfo = getAllSecretInfo()
    
    return response.success(
      {
        secrets: allInfo,
        count: allInfo.length
      },
      `Retrieved info for ${allInfo.length} secrets`,
      200
    )
    
  } catch (error) {
    logger.error('Failed to get all secret info:', 'secrets', { error: error.message })
    return response.internalError('Failed to get all secret info', { error: error.message })
  }
}

async function handleGetOpenAIConfig(): Promise<Response> {
  try {
    const config = await getOpenAIConfig()
    
    return response.success(
      {
        api_key: config.apiKey ? '***' + config.apiKey.slice(-10) : 'Not set',
        organization: config.organization || 'Not set',
        has_api_key: !!config.apiKey,
        has_organization: !!config.organization
      },
      'OpenAI configuration retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get OpenAI config:', 'secrets', { error: error.message })
    return response.internalError('Failed to get OpenAI config', { error: error.message })
  }
}

async function handleGetWordPressConfig(): Promise<Response> {
  try {
    const config = await getWordPressConfig()
    
    return response.success(
      {
        url: config.url,
        username: config.username,
        password: config.password ? '***' + config.password.slice(-4) : 'Not set',
        has_url: !!config.url,
        has_username: !!config.username,
        has_password: !!config.password
      },
      'WordPress configuration retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get WordPress config:', 'secrets', { error: error.message })
    return response.internalError('Failed to get WordPress config', { error: error.message })
  }
}

async function handleGetNotificationConfig(): Promise<Response> {
  try {
    const config = await getNotificationConfig()
    
    return response.success(
      {
        slack_webhook_url: config.slackWebhookUrl ? '***' + config.slackWebhookUrl.slice(-20) : 'Not set',
        alert_webhook_url: config.alertWebhookUrl ? '***' + config.alertWebhookUrl.slice(-20) : 'Not set',
        has_slack_webhook: !!config.slackWebhookUrl,
        has_alert_webhook: !!config.alertWebhookUrl
      },
      'Notification configuration retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get notification config:', 'secrets', { error: error.message })
    return response.internalError('Failed to get notification config', { error: error.message })
  }
}

async function handleGetConfig(): Promise<Response> {
  try {
    const config = getSecretsConfig()
    
    return response.success(
      {
        secret_names: config.SECRET_NAMES,
        categories: config.CATEGORIES,
        validation: config.VALIDATION,
        cache: config.CACHE
      },
      'Secrets configuration retrieved successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to get secrets config:', 'secrets', { error: error.message })
    return response.internalError('Failed to get secrets config', { error: error.message })
  }
}

async function handleRefreshCache(): Promise<Response> {
  try {
    await secretsManager.refreshCache()
    
    return response.success(
      { cache_refreshed: true },
      'Secrets cache refreshed successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to refresh secrets cache:', 'secrets', { error: error.message })
    return response.internalError('Failed to refresh secrets cache', { error: error.message })
  }
}

async function handleClearCache(): Promise<Response> {
  try {
    secretsManager.clearCache()
    
    return response.success(
      { cache_cleared: true },
      'Secrets cache cleared successfully',
      200
    )
    
  } catch (error) {
    logger.error('Failed to clear secrets cache:', 'secrets', { error: error.message })
    return response.internalError('Failed to clear secrets cache', { error: error.message })
  }
}
