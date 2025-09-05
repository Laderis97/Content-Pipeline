import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'
import { 
  createOpenAIValidator,
  createWordPressValidator,
  validateOpenAIResponse,
  validateWordPressResponse,
  isRetryableError,
  getRetryDelay,
  formatErrorForLogging,
  getUserFriendlyMessage
} from '../content-automation/api-validator.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'test'
    const service = url.searchParams.get('service') as 'openai' | 'wordpress' || 'openai'
    
    console.log(`API validator test - Action: ${action}, Service: ${service}`)
    
    switch (action) {
      case 'test':
        return await handleValidationTest(service, req)
      
      case 'error':
        return await handleErrorTest(service, req)
      
      case 'schema':
        return await handleSchemaTest(service)
      
      default:
        return new Response(
          JSON.stringify({ 
            error: 'Invalid action. Supported actions: test, error, schema' 
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        )
    }
    
  } catch (error) {
    console.error('API validator test error:', error)
    
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

async function handleValidationTest(service: 'openai' | 'wordpress', req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { mock_response, status_code = 200 } = body
    
    // Create mock response
    const mockResponse = new Response(
      JSON.stringify(mock_response || getMockResponse(service)),
      {
        status: status_code,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
    // Test validation
    let validationResult
    if (service === 'openai') {
      validationResult = await validateOpenAIResponse(mockResponse, 1000)
    } else {
      validationResult = await validateWordPressResponse(mockResponse, 1000)
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        service,
        validation_result: validationResult,
        mock_response: mock_response || getMockResponse(service),
        status_code
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing API validation:', error)
    
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

async function handleErrorTest(service: 'openai' | 'wordpress', req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { error_type = 'rate_limit', status_code = 429 } = body
    
    // Create mock error response
    const mockErrorResponse = getMockErrorResponse(service, error_type, status_code)
    const mockResponse = new Response(
      JSON.stringify(mockErrorResponse),
      {
        status: status_code,
        headers: { 'Content-Type': 'application/json' }
      }
    )
    
    // Test error validation
    let validationResult
    if (service === 'openai') {
      validationResult = await validateOpenAIResponse(mockResponse, 1000)
    } else {
      validationResult = await validateWordPressResponse(mockResponse, 1000)
    }
    
    // Test error utilities
    const errorAnalysis = {
      retryable: validationResult.error ? isRetryableError(validationResult.error) : false,
      retry_delay: validationResult.error ? getRetryDelay(validationResult.error) : 0,
      log_message: validationResult.error ? formatErrorForLogging(validationResult.error) : '',
      user_message: validationResult.error ? getUserFriendlyMessage(validationResult.error) : ''
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        service,
        error_type,
        status_code,
        validation_result: validationResult,
        error_analysis: errorAnalysis,
        mock_error_response: mockErrorResponse
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing API error handling:', error)
    
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

async function handleSchemaTest(service: 'openai' | 'wordpress') {
  try {
    const validator = service === 'openai' ? createOpenAIValidator() : createWordPressValidator()
    
    // Test with valid response
    const validResponse = new Response(
      JSON.stringify(getMockResponse(service)),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
    const validResult = await validator.validateResponse(validResponse, 1000)
    
    // Test with invalid response
    const invalidResponse = new Response(
      JSON.stringify(getInvalidMockResponse(service)),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    
    const invalidResult = await validator.validateResponse(invalidResponse, 1000)
    
    return new Response(
      JSON.stringify({
        success: true,
        service,
        valid_response_test: {
          result: validResult,
          mock_data: getMockResponse(service)
        },
        invalid_response_test: {
          result: invalidResult,
          mock_data: getInvalidMockResponse(service)
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
    
  } catch (error) {
    console.error('Error testing API schema validation:', error)
    
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

function getMockResponse(service: 'openai' | 'wordpress'): any {
  if (service === 'openai') {
    return {
      id: 'chatcmpl-123',
      object: 'chat.completion',
      created: 1677652288,
      model: 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: '<h1>Test Content</h1><p>This is a test response from OpenAI.</p>'
          },
          finish_reason: 'stop'
        }
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150
      }
    }
  } else {
    return {
      id: 123,
      date: '2023-12-01T12:00:00',
      date_gmt: '2023-12-01T12:00:00',
      guid: { rendered: 'https://example.com/?p=123' },
      modified: '2023-12-01T12:00:00',
      modified_gmt: '2023-12-01T12:00:00',
      slug: 'test-post',
      status: 'draft',
      type: 'post',
      link: 'https://example.com/test-post/',
      title: { rendered: 'Test Post' },
      content: { rendered: '<p>Test content</p>', protected: false },
      excerpt: { rendered: 'Test excerpt', protected: false },
      author: 1,
      featured_media: 0,
      comment_status: 'open',
      ping_status: 'open',
      sticky: false,
      template: '',
      format: 'standard',
      meta: [],
      categories: [1],
      tags: [1, 2],
      permalink_template: 'https://example.com/test-post/',
      generated_slug: 'test-post'
    }
  }
}

function getInvalidMockResponse(service: 'openai' | 'wordpress'): any {
  if (service === 'openai') {
    return {
      // Missing required fields
      id: 'chatcmpl-123',
      // object: 'chat.completion', // Missing
      created: 1677652288,
      model: 'gpt-4o-mini',
      choices: [
        {
          index: 0,
          // message: { role: 'assistant', content: 'Test' }, // Missing
          finish_reason: 'stop'
        }
      ]
      // usage: { ... } // Missing
    }
  } else {
    return {
      // Missing required fields
      id: 123,
      // date: '2023-12-01T12:00:00', // Missing
      date_gmt: '2023-12-01T12:00:00',
      guid: { rendered: 'https://example.com/?p=123' },
      modified: '2023-12-01T12:00:00',
      modified_gmt: '2023-12-01T12:00:00',
      slug: 'test-post',
      status: 'draft',
      type: 'post',
      link: 'https://example.com/test-post/',
      // title: { rendered: 'Test Post' }, // Missing
      content: { rendered: '<p>Test content</p>', protected: false },
      excerpt: { rendered: 'Test excerpt', protected: false },
      author: 1,
      featured_media: 0,
      comment_status: 'open',
      ping_status: 'open',
      sticky: false,
      template: '',
      format: 'standard',
      meta: [],
      categories: [1],
      tags: [1, 2],
      permalink_template: 'https://example.com/test-post/',
      generated_slug: 'test-post'
    }
  }
}

function getMockErrorResponse(service: 'openai' | 'wordpress', errorType: string, statusCode: number): any {
  const baseError = {
    error: {
      message: `Mock ${errorType} error`,
      type: errorType,
      code: errorType.toUpperCase()
    }
  }
  
  if (errorType === 'rate_limit') {
    return {
      ...baseError,
      error: {
        ...baseError.error,
        retry_after: 60
      }
    }
  }
  
  if (errorType === 'authentication') {
    return {
      ...baseError,
      error: {
        ...baseError.error,
        message: 'Invalid API key'
      }
    }
  }
  
  if (errorType === 'server') {
    return {
      ...baseError,
      error: {
        ...baseError.error,
        message: 'Internal server error'
      }
    }
  }
  
  return baseError
}
