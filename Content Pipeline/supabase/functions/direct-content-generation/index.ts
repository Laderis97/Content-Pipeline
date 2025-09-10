import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

// Types
interface DirectContentRequest {
  topic: string
  contentType?: string
  targetAudience?: string
  tone?: string
  wordCount?: number
  includeExamples?: boolean
  publishToWordPress?: boolean
  testMode?: boolean
}

interface DirectContentResponse {
  success: boolean
  content?: {
    title: string
    content: string
    excerpt: string
  }
  wordpress?: {
    published: boolean
    postId?: number
    postUrl?: string
  }
  timings: {
    generationTime: number
    processingTime: number
    wordpressTime?: number
    totalTime: number
  }
  error?: string
}

// OpenAI API configuration
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

// WordPress configuration
const WORDPRESS_URL = Deno.env.get('WORDPRESS_URL')
const WORDPRESS_USERNAME = Deno.env.get('WORDPRESS_USERNAME')
const WORDPRESS_PASSWORD = Deno.env.get('WORDPRESS_PASSWORD')

async function generateContentWithOpenAI(
  topic: string,
  contentType: string,
  targetAudience: string,
  tone: string,
  wordCount: number
): Promise<string> {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured')
  }

  const prompt = `Create a professional ${contentType} about "${topic}". 

Requirements:
- Write for ${targetAudience}
- Use a ${tone} tone
- Length: approximately ${wordCount} words
- Include a compelling headline
- Structure with proper headings (H2, H3)
- Include practical insights or tips
- Format as HTML with proper tags

Make it engaging and valuable for readers.`;

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a professional content writer who creates engaging, well-structured blog posts and articles. Always format your content as clean HTML with proper headings and structure.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 1000,
      temperature: 0.7
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`OpenAI API error: ${response.status} - ${error}`)
  }

  const data = await response.json()
  
  if (!data.choices || !data.choices[0] || !data.choices[0].message) {
    throw new Error('Invalid response from OpenAI API')
  }

  return data.choices[0].message.content
}

function processContentForWordPress(content: string, topic: string) {
  // Extract title from content (first H1 or create one)
  const titleMatch = content.match(/<h1[^>]*>(.*?)<\/h1>/i)
  const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : `Complete Guide to ${topic}`
  
  // Clean up content
  let processedContent = content
    .replace(/<h1[^>]*>/gi, '<h2>')  // Convert H1 to H2 for better WordPress structure
    .replace(/<\/h1>/gi, '</h2>')
    .trim()
  
  // Create excerpt (first 150 characters of text content)
  const textContent = processedContent.replace(/<[^>]*>/g, '')
  const excerpt = textContent.substring(0, 150).trim() + (textContent.length > 150 ? '...' : '')
  
  return {
    title,
    content: processedContent,
    excerpt
  }
}

async function publishToWordPress(postData: any) {
  if (!WORDPRESS_URL || !WORDPRESS_USERNAME || !WORDPRESS_PASSWORD) {
    throw new Error('WordPress configuration not available')
  }

  const apiUrl = `${WORDPRESS_URL.replace(/\/$/, '')}/wp-json/wp/v2`
  const auth = btoa(`${WORDPRESS_USERNAME}:${WORDPRESS_PASSWORD}`)
  
  console.log('WordPress publishing details:', {
    wordpressUrl: WORDPRESS_URL,
    apiUrl: apiUrl,
    username: WORDPRESS_USERNAME,
    passwordLength: WORDPRESS_PASSWORD?.length
  })

  const wordpressPost = {
    title: postData.title,
    content: postData.content,
    excerpt: postData.excerpt,
    status: 'publish',
    categories: [1] // Default category
  }

  console.log('Making WordPress API request to:', `${apiUrl}/posts`)
  
  try {
    const response = await fetch(`${apiUrl}/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(wordpressPost)
    })

    console.log('WordPress API response status:', response.status)
    
    if (!response.ok) {
      const error = await response.text()
      console.error('WordPress API error response:', error)
      throw new Error(`WordPress API error: ${response.status} - ${error}`)
    }

    const result = await response.json()
    console.log('WordPress API success:', { postId: result.id, postUrl: result.link })
    return result
  } catch (error) {
    console.error('WordPress API request failed:', error)
    throw error
  }
}

// Performance tracking
const startTime = Date.now()

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Direct content generation function started')
    
    // Parse request body
    const requestBody: DirectContentRequest = await req.json()
    
    console.log('Request received:', {
      topic: requestBody.topic,
      contentType: requestBody.contentType,
      publishToWordPress: requestBody.publishToWordPress,
      testMode: requestBody.testMode
    })
    
    console.log('WordPress publishing check:', {
      publishToWordPress: requestBody.publishToWordPress,
      publishToWordPressType: typeof requestBody.publishToWordPress,
      testMode: requestBody.testMode,
      testModeType: typeof requestBody.testMode,
      shouldPublish: requestBody.publishToWordPress && !requestBody.testMode
    })

    const timings = {
      generationTime: 0,
      processingTime: 0,
      wordpressTime: 0,
      totalTime: 0
    }

    // Step 1: Generate content with OpenAI
    console.log('Step 1: Generating content with OpenAI...')
    const generationStart = Date.now()
    
    const generatedContent = await generateContentWithOpenAI(
      requestBody.topic,
      requestBody.contentType || 'blog post',
      requestBody.targetAudience || 'general audience',
      requestBody.tone || 'professional',
      requestBody.wordCount || 500
    )
    
    timings.generationTime = Date.now() - generationStart
    console.log(`Content generation completed in ${timings.generationTime}ms`)

    // Step 2: Process content for WordPress
    console.log('Step 2: Processing content for WordPress...')
    const processingStart = Date.now()
    
    const processedContent = processContentForWordPress(generatedContent, requestBody.topic)
    
    timings.processingTime = Date.now() - processingStart
    console.log(`Content processing completed in ${timings.processingTime}ms`)

    const response: DirectContentResponse = {
      success: true,
      content: processedContent,
      timings: {
        ...timings,
        totalTime: Date.now() - startTime
      }
    }

    // Step 3: Publish to WordPress (if requested and not in test mode)
    console.log('WordPress publishing decision:', {
      publishToWordPress: requestBody.publishToWordPress,
      testMode: requestBody.testMode,
      condition: requestBody.publishToWordPress && !requestBody.testMode
    })
    
    // Force WordPress publishing for testing
    const shouldPublish = true; // Force publishing for now
    
    console.log('Forcing WordPress publishing for testing')
    
    if (shouldPublish) {
      console.log('Step 3: Publishing to WordPress...')
      const wordpressStart = Date.now()
      
      try {
        const wordpressResult = await publishToWordPress(processedContent)
        
        timings.wordpressTime = Date.now() - wordpressStart
        response.wordpress = {
          published: true,
          postId: wordpressResult.id,
          postUrl: wordpressResult.link
        }
        
        console.log(`WordPress publishing completed in ${timings.wordpressTime}ms`)
      } catch (error) {
        console.error('WordPress publishing failed:', error)
        response.wordpress = {
          published: false
        }
        response.error = `WordPress publishing failed: ${error.message}`
      }
    } else if (requestBody.testMode) {
      console.log('Step 3: Skipping WordPress publishing (test mode)')
      response.wordpress = {
        published: false
      }
    }

    response.timings.totalTime = Date.now() - startTime
    console.log(`Direct content generation completed in ${response.timings.totalTime}ms`)

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Direct content generation function error:', error)
    
    const endTime = Date.now()
    const totalDuration = endTime - startTime
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timings: {
          totalTime: totalDuration
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})