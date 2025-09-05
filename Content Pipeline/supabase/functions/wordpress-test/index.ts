import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createWordPressClient, 
  validateWordPressConfig,
  getWordPressConfig 
} from '../content-automation/wordpress-client.ts'
import { 
  createWordPressAuthManager,
  validateWordPressAuthConfig,
  getWordPressAuthConfig
} from '../content-automation/wordpress-auth.ts'
import { 
  createWordPressTaxonomyManager,
  getDefaultCategories,
  getDefaultTags
} from '../content-automation/wordpress-taxonomy.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    
    console.log(`WordPress test - Action: ${action}`)
    
    switch (action) {
      case 'test':
        return await handleConnectionTest()
      
      case 'config':
        return await handleConfigTest()
      
      case 'categories':
        return await handleCategoriesTest()
      
      case 'tags':
        return await handleTagsTest()
      
      case 'users':
        return await handleUsersTest()
      
      case 'create':
        return await handleCreateTest(req)
      
      case 'auth':
        return await handleAuthTest()
      
      case 'auth-config':
        return await handleAuthConfigTest()
      
      case 'taxonomy':
        return await handleTaxonomyTest()
      
      case 'taxonomy-suggestions':
        return await handleTaxonomySuggestionsTest(req)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, config, categories, tags, users, create, auth, auth-config, taxonomy, taxonomy-suggestions' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('WordPress test error:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function handleConnectionTest() {
  try {
    const client = createWordPressClient()
    const result = await client.testConnection()
    
    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success ? 'WordPress connection successful' : 'WordPress connection failed',
        error: result.error,
        rate_limit_info: client.getRateLimitInfo()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    )
    
  } catch (error) {
    console.error('Error testing WordPress connection:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleConfigTest() {
  try {
    const config = getWordPressConfig()
    const validation = validateWordPressConfig()
    
    return new Response(
      JSON.stringify({
        success: validation.valid,
        config: {
          base_url: config.base_url,
          username: config.username,
          default_author_id: config.default_author_id,
          timeout_ms: config.timeout_ms,
          max_retries: config.max_retries,
          retry_delay_ms: config.retry_delay_ms
        },
        validation: {
          valid: validation.valid,
          errors: validation.errors
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: validation.valid ? 200 : 400
      }
    )
    
  } catch (error) {
    console.error('Error testing WordPress config:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleCategoriesTest() {
  try {
    const client = createWordPressClient()
    const categories = await client.getCategories()
    
    return new Response(
      JSON.stringify({
        success: true,
        categories: categories.slice(0, 10), // Limit to first 10 categories
        total_count: categories.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing WordPress categories:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleTagsTest() {
  try {
    const client = createWordPressClient()
    const tags = await client.getTags()
    
    return new Response(
      JSON.stringify({
        success: true,
        tags: tags.slice(0, 10), // Limit to first 10 tags
        total_count: tags.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing WordPress tags:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleUsersTest() {
  try {
    const client = createWordPressClient()
    const users = await client.getUsers()
    
    return new Response(
      JSON.stringify({
        success: true,
        users: users.slice(0, 10), // Limit to first 10 users
        total_count: users.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing WordPress users:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleCreateTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { title, content, tags, categories } = body
    
    if (!title || !content) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Title and content are required for test post creation'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }
    
    const client = createWordPressClient()
    const result = await client.createDraftPost({
      title: title || 'Test Post from Content Automation',
      content: content || '<p>This is a test post created by the content automation system.</p>',
      status: 'draft',
      tags: tags || ['test', 'automation'],
      categories: categories || ['Uncategorized']
    })
    
    return new Response(
      JSON.stringify({
        success: result.success,
        post_id: result.post_id,
        post_url: result.post_url,
        error: result.error,
        status_code: result.status_code
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 201 : 500
      }
    )
    
  } catch (error) {
    console.error('Error testing WordPress post creation:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleAuthTest() {
  try {
    const authManager = createWordPressAuthManager()
    const result = await authManager.testAuthentication()
    
    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success ? 'WordPress authentication successful' : 'WordPress authentication failed',
        user: result.user,
        app_passwords: result.app_passwords,
        error: result.error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: result.success ? 200 : 500
      }
    )
    
  } catch (error) {
    console.error('Error testing WordPress authentication:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleAuthConfigTest() {
  try {
    const config = getWordPressAuthConfig()
    const validation = validateWordPressAuthConfig()
    
    return new Response(
      JSON.stringify({
        success: validation.valid,
        config: {
          base_url: config.base_url,
          username: config.username,
          default_author_id: config.default_author_id,
          timeout_ms: config.timeout_ms
        },
        validation: {
          valid: validation.valid,
          errors: validation.errors
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: validation.valid ? 200 : 400
      }
    )
    
  } catch (error) {
    console.error('Error testing WordPress auth config:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleTaxonomyTest() {
  try {
    const taxonomyManager = createWordPressTaxonomyManager()
    
    // Get available categories and tags
    const categories = taxonomyManager.getAvailableCategories()
    const tags = taxonomyManager.getAvailableTags()
    
    // Get default categories and tags
    const defaultCategories = getDefaultCategories()
    const defaultTags = getDefaultTags()
    
    return new Response(
      JSON.stringify({
        success: true,
        available_categories: categories.slice(0, 10), // Limit to first 10
        available_tags: tags.slice(0, 10), // Limit to first 10
        default_categories: defaultCategories,
        default_tags: defaultTags,
        total_categories: categories.length,
        total_tags: tags.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing WordPress taxonomy:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}

async function handleTaxonomySuggestionsTest(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { topic, content_type, tags, categories } = body
    
    if (!topic) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Topic is required for taxonomy suggestions test'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        }
      )
    }
    
    const taxonomyManager = createWordPressTaxonomyManager()
    
    // Get taxonomy suggestions
    const suggestions = taxonomyManager.getTaxonomySuggestions({
      topic,
      content_type: content_type || 'blog_post'
    })
    
    // Get resolved taxonomy
    const taxonomyResult = await taxonomyManager.getTaxonomyForJob({
      topic,
      content_type: content_type || 'blog_post',
      tags,
      categories
    })
    
    return new Response(
      JSON.stringify({
        success: true,
        topic,
        content_type: content_type || 'blog_post',
        suggestions,
        resolved_taxonomy: taxonomyResult,
        input_tags: tags || [],
        input_categories: categories || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing WordPress taxonomy suggestions:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
}
