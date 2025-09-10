// WordPress Connection Test Function
// Tests WordPress REST API connectivity and authentication

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { logger } from '../_shared/logger.ts'

interface WordPressTestResult {
  success: boolean
  message: string
  details?: {
    url: string
    status: number
    response_time: number
    api_available: boolean
    auth_working: boolean
    endpoints_tested: string[]
  }
  error?: string
}

/**
 * Test WordPress REST API connectivity
 */
async function testWordPressConnection(): Promise<WordPressTestResult> {
  const startTime = Date.now()
  
  try {
    // Get WordPress configuration from environment
    const wordpressUrl = Deno.env.get('WORDPRESS_URL')
    const wordpressUsername = Deno.env.get('WORDPRESS_USERNAME')
    const wordpressPassword = Deno.env.get('WORDPRESS_PASSWORD')
    const wordpressApiPath = Deno.env.get('WORDPRESS_API_PATH') || '/wp-json/wp/v2'

    // Validate required environment variables
    if (!wordpressUrl || !wordpressUsername || !wordpressPassword) {
      return {
        success: false,
        message: 'Missing WordPress configuration',
        error: 'WORDPRESS_URL, WORDPRESS_USERNAME, and WORDPRESS_PASSWORD are required'
      }
    }

    // Clean URL (remove trailing slash)
    const baseUrl = wordpressUrl.replace(/\/$/, '')
    const apiUrl = `${baseUrl}${wordpressApiPath}`
    
    // Test endpoints to check
    const testEndpoints = [
      '/',           // API root
      '/users/me',   // Authenticated user info
      '/posts',      // Posts endpoint
      '/categories'  // Categories endpoint
    ]

    const results = {
      url: apiUrl,
      status: 0,
      response_time: 0,
      api_available: false,
      auth_working: false,
      endpoints_tested: [] as string[]
    }

    // Test 1: Check if WordPress REST API is available
    try {
      const apiResponse = await fetch(`${apiUrl}/`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Content-Pipeline-Test/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      results.status = apiResponse.status
      results.api_available = apiResponse.ok
      results.endpoints_tested.push('/')

      if (!apiResponse.ok) {
        throw new Error(`API not available: ${apiResponse.status} ${apiResponse.statusText}`)
      }

      logger.info('WordPress API root accessible', 'wordpress-test', {
        url: apiUrl,
        status: apiResponse.status
      })

    } catch (error) {
      results.response_time = Date.now() - startTime
      return {
        success: false,
        message: 'WordPress REST API not accessible',
        details: results,
        error: error.message
      }
    }

    // Test 2: Check authentication
    try {
      const authResponse = await fetch(`${apiUrl}/users/me`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${wordpressUsername}:${wordpressPassword}`)}`,
          'User-Agent': 'Content-Pipeline-Test/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })

      results.auth_working = authResponse.ok
      results.endpoints_tested.push('/users/me')

      if (!authResponse.ok) {
        throw new Error(`Authentication failed: ${authResponse.status} ${authResponse.statusText}`)
      }

      const userData = await authResponse.json()
      logger.info('WordPress authentication successful', 'wordpress-test', {
        user_id: userData.id,
        username: userData.username,
        roles: userData.roles
      })

    } catch (error) {
      results.response_time = Date.now() - startTime
      return {
        success: false,
        message: 'WordPress authentication failed',
        details: results,
        error: error.message
      }
    }

    // Test 3: Check posts endpoint
    try {
      const postsResponse = await fetch(`${apiUrl}/posts?per_page=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${wordpressUsername}:${wordpressPassword}`)}`,
          'User-Agent': 'Content-Pipeline-Test/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })

      results.endpoints_tested.push('/posts')

      if (!postsResponse.ok) {
        throw new Error(`Posts endpoint failed: ${postsResponse.status} ${postsResponse.statusText}`)
      }

      logger.info('WordPress posts endpoint accessible', 'wordpress-test', {
        status: postsResponse.status
      })

    } catch (error) {
      logger.warn('WordPress posts endpoint test failed', 'wordpress-test', {
        error: error.message
      })
    }

    // Test 4: Check categories endpoint
    try {
      const categoriesResponse = await fetch(`${apiUrl}/categories`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${wordpressUsername}:${wordpressPassword}`)}`,
          'User-Agent': 'Content-Pipeline-Test/1.0'
        },
        signal: AbortSignal.timeout(10000)
      })

      results.endpoints_tested.push('/categories')

      if (!categoriesResponse.ok) {
        throw new Error(`Categories endpoint failed: ${categoriesResponse.status} ${categoriesResponse.statusText}`)
      }

      logger.info('WordPress categories endpoint accessible', 'wordpress-test', {
        status: categoriesResponse.status
      })

    } catch (error) {
      logger.warn('WordPress categories endpoint test failed', 'wordpress-test', {
        error: error.message
      })
    }

    results.response_time = Date.now() - startTime

    return {
      success: true,
      message: 'WordPress connection test successful',
      details: results
    }

  } catch (error) {
    logger.error('WordPress connection test failed', 'wordpress-test', {
      error: error.message
    })

    return {
      success: false,
      message: 'WordPress connection test failed',
      error: error.message
    }
  }
}

/**
 * Main function handler
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    logger.info('WordPress connection test requested', 'wordpress-test')

    const result = await testWordPressConnection()

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 400
      }
    )

  } catch (error) {
    logger.error('WordPress connection test error', 'wordpress-test', {
      error: error.message
    })

    return new Response(
      JSON.stringify({
        success: false,
        message: 'Internal server error',
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

