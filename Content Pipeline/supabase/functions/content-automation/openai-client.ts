// OpenAI API integration for content generation
// PRD Reference: Content Generation (B1-B3), External API Integrations (3.1-3.2)

import { ContentJob, ContentGenerationResponse, ContentValidationResult } from './types.ts'
import { 
  canMakeOpenAIRequest, 
  recordOpenAIRequest, 
  waitForOpenAIRateLimit 
} from './rate-limiter.ts'
import { validateOpenAIResponse } from './api-validator.ts'
import { executeWithRetry } from './retry-logic.ts'
import { 
  createOpenAIFailureHandler,
  analyzeOpenAIFailure,
  requeueJobForOpenAIFailure
} from './openai-failure-handler.ts'

// OpenAI API configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')

// Default model configuration
const DEFAULT_MODEL = 'gpt-4o-mini'
const DEFAULT_MAX_TOKENS = 2000
const DEFAULT_TEMPERATURE = 0.7

// Content generation templates
const CONTENT_TEMPLATES = {
  blog_post: {
    system_prompt: `You are an expert content writer specializing in SEO-optimized blog posts. 
Your task is to create engaging, informative, and well-structured blog content that provides real value to readers.

Content Requirements:
- Write in a professional yet accessible tone
- Include relevant examples and actionable insights
- Structure content with clear headings and subheadings
- Optimize for search engines while maintaining readability
- Ensure content is original and plagiarism-free
- Target word count: 600-800 words (strictly within this range)
- Include a compelling introduction and strong conclusion

SEO Guidelines:
- Use target keywords naturally throughout the content (1-2% density)
- Include relevant long-tail keywords and semantic variations
- Create descriptive headings (H1, H2, H3) that include primary keywords
- Write meta-friendly content that answers user questions
- Include internal linking opportunities (mention but don't create actual links)
- Use bullet points and numbered lists for better readability
- Include a clear call-to-action in the conclusion

Content Structure:
- Start with a compelling H1 title (30-60 characters)
- Include a meta description (120-160 characters)
- Use 3-6 subheadings (H2, H3) for proper content hierarchy
- Write 4-8 paragraphs with 50-200 words each
- Include at least one list (bulleted or numbered)
- End with a strong conclusion and call-to-action

Format Requirements:
- Return content as clean HTML with proper structure
- Include <title> and <meta> tags
- Use semantic HTML elements (h1, h2, h3, p, ul, ol, li)
- Ensure proper heading hierarchy (H1 → H2 → H3)
- Include alt text suggestions for images (as comments)`,

    user_prompt_template: `Write a comprehensive blog post about: {topic}

Additional Context:
- Target audience: {audience}
- Content type: {content_type}
- Key points to cover: {key_points}
- Tone: {tone}

Please create:
1. A compelling H1 title (30-60 characters) that includes the main keyword
2. A meta description (120-160 characters) that summarizes the content
3. The main blog post content (600-800 words exactly) with:
   - Compelling introduction that hooks the reader
   - 3-6 subheadings (H2, H3) that include related keywords
   - 4-8 well-structured paragraphs (50-200 words each)
   - At least one bulleted or numbered list
   - Strong conclusion with clear call-to-action
4. Use natural keyword integration (1-2% density)
5. Include internal linking opportunities (mention but don't create links)
6. Ensure proper HTML structure with semantic elements

Return the content as clean HTML with proper structure, including <title> and <meta> tags.`
  },

  product_description: {
    system_prompt: `You are a professional product copywriter specializing in creating compelling product descriptions that drive conversions.

Your task is to create persuasive, informative product descriptions that:
- Highlight key features and benefits
- Address customer pain points
- Use persuasive language that encourages action
- Include relevant technical specifications
- Optimize for search engines
- Target word count: 300-500 words

Writing Guidelines:
- Use active voice and compelling language
- Focus on benefits over features
- Include social proof elements when relevant
- Create urgency and scarcity when appropriate
- Use bullet points for easy scanning
- Include clear calls-to-action

SEO Optimization:
- Use product keywords naturally (1-2% density)
- Include relevant long-tail keywords
- Create descriptive headings that include keywords
- Write meta-friendly content
- Include internal linking opportunities

Content Structure:
- Start with compelling H1 title (30-60 characters)
- Include meta description (120-160 characters)
- Use 2-4 subheadings (H2, H3) for proper hierarchy
- Write 3-6 paragraphs with clear benefits
- Include at least one bulleted list of features
- End with strong call-to-action

Format Requirements:
- Return content as clean HTML with proper structure
- Include <title> and <meta> tags
- Use semantic HTML elements (h1, h2, h3, p, ul, ol, li)
- Ensure proper heading hierarchy
- Structure content for easy reading and conversion`,

    user_prompt_template: `Create a compelling product description for: {product_name}

Product Details:
- Category: {category}
- Key features: {features}
- Target audience: {audience}
- Price point: {price_range}
- Unique selling points: {usp}

Please create:
1. A compelling H1 title (30-60 characters) that includes the product name
2. A meta description (120-160 characters) that highlights key benefits
3. The main product description (300-500 words) with:
   - Compelling introduction that addresses customer pain points
   - 2-4 subheadings (H2, H3) that highlight key benefits
   - 3-6 well-structured paragraphs focusing on benefits
   - At least one bulleted list of key features
   - Strong call-to-action that encourages purchase
4. Use natural keyword integration (1-2% density)
5. Include internal linking opportunities (mention but don't create links)
6. Ensure proper HTML structure with semantic elements

Return the content as clean HTML with proper structure, including <title> and <meta> tags.`
  }
}

// Model configurations for different use cases
const MODEL_CONFIGS = {
  'gpt-4o': {
    max_tokens: 4000,
    temperature: 0.7,
    cost_per_1k_tokens: 0.03,
    capabilities: ['high_quality', 'long_form', 'complex_reasoning']
  },
  'gpt-4o-mini': {
    max_tokens: 2000,
    temperature: 0.7,
    cost_per_1k_tokens: 0.0015,
    capabilities: ['fast', 'cost_effective', 'good_quality']
  },
  'gpt-3.5-turbo': {
    max_tokens: 2000,
    temperature: 0.7,
    cost_per_1k_tokens: 0.001,
    capabilities: ['fast', 'very_cost_effective', 'basic_quality']
  }
}

interface OpenAIConfig {
  model: string
  max_tokens: number
  temperature: number
  timeout_ms: number
  retry_attempts: number
  retry_delay_ms: number
}

interface ContentTemplate {
  system_prompt: string
  user_prompt_template: string
}

interface GenerationContext {
  topic: string
  audience?: string
  content_type?: string
  key_points?: string
  tone?: string
  product_name?: string
  category?: string
  features?: string
  price_range?: string
  usp?: string
}

/**
 * OpenAI client for content generation with configurable models and templates
 */
export class OpenAIClient {
  private config: OpenAIConfig
  private apiKey: string
  private failureHandler: any

  constructor(config?: Partial<OpenAIConfig>) {
    this.apiKey = OPENAI_API_KEY || ''
    this.config = {
      model: config?.model || DEFAULT_MODEL,
      max_tokens: config?.max_tokens || DEFAULT_MAX_TOKENS,
      temperature: config?.temperature || DEFAULT_TEMPERATURE,
      timeout_ms: config?.timeout_ms || 30000,
      retry_attempts: config?.retry_attempts || 3,
      retry_delay_ms: config?.retry_delay_ms || 1000
    }

    if (!this.apiKey) {
      throw new Error('OpenAI API key not found in environment variables')
    }
    
    // Initialize failure handler
    this.failureHandler = createOpenAIFailureHandler()
  }

  /**
   * Generates content using OpenAI API with job-specific configuration
   */
  async generateContent(job: ContentJob): Promise<ContentGenerationResponse> {
    const startTime = Date.now()
    
    try {
      console.log(`[OpenAI] Starting content generation for job ${job.id}`)
      console.log(`[OpenAI] Model: ${this.config.model}, Topic: ${job.topic}`)

      // Check rate limits before making request
      const estimatedTokens = this.estimateTokenUsage(job)
      const rateLimitCheck = await canMakeOpenAIRequest(estimatedTokens)
      
      if (!rateLimitCheck.allowed) {
        console.log(`[OpenAI] Rate limit check failed: ${rateLimitCheck.reason}`)
        
        // Wait for rate limit reset
        if (rateLimitCheck.waitTime) {
          console.log(`[OpenAI] Waiting ${rateLimitCheck.waitTime}ms for rate limit reset`)
          await waitForOpenAIRateLimit(estimatedTokens)
        } else {
          return {
            success: false,
            error: `Rate limit exceeded: ${rateLimitCheck.reason}`,
            generated_title: null,
            generated_content: null,
            tokens_used: 0,
            model_used: this.config.model,
            generation_time_ms: Date.now() - startTime
          }
        }
      }

      // Validate job configuration
      const validation = this.validateJobConfiguration(job)
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          generated_title: null,
          generated_content: null,
          tokens_used: 0,
          model_used: this.config.model,
          generation_time_ms: Date.now() - startTime
        }
      }

      // Get content template
      const template = this.getContentTemplate(job)
      if (!template) {
        return {
          success: false,
          error: `No template found for content type: ${job.content_type || 'blog_post'}`,
          generated_title: null,
          generated_content: null,
          tokens_used: 0,
          model_used: this.config.model,
          generation_time_ms: Date.now() - startTime
        }
      }

      // Prepare generation context
      const context = this.prepareGenerationContext(job)
      
      // Generate prompts
      const prompts = this.generatePrompts(template, context, job)
      
      // Make API request with retries
      const response = await this.makeAPIRequestWithRetry(prompts)
      
      // Parse and validate response
      const parsedContent = this.parseContentResponse(response)
      
      // Validate generated content
      const contentValidation = this.validateGeneratedContent(parsedContent)
      if (!contentValidation.valid) {
        return {
          success: false,
          error: `Content validation failed: ${contentValidation.error}`,
          generated_title: parsedContent.title,
          generated_content: parsedContent.content,
          tokens_used: response.usage?.total_tokens || 0,
          model_used: this.config.model,
          generation_time_ms: Date.now() - startTime
        }
      }

      const generationTime = Date.now() - startTime
      const tokensUsed = response.usage?.total_tokens || 0
      
      console.log(`[OpenAI] Content generation completed in ${generationTime}ms`)
      console.log(`[OpenAI] Tokens used: ${tokensUsed}`)

      // Record successful request
      recordOpenAIRequest(tokensUsed, generationTime, true)

      return {
        success: true,
        error: null,
        generated_title: parsedContent.title,
        generated_content: parsedContent.content,
        tokens_used: tokensUsed,
        model_used: this.config.model,
        generation_time_ms: generationTime
      }

    } catch (error) {
      const generationTime = Date.now() - startTime
      console.error(`[OpenAI] Content generation failed after ${generationTime}ms:`, error)
      
      // Record failed request
      recordOpenAIRequest(0, generationTime, false)
      
      // Analyze OpenAI failure
      const failureResult = await this.failureHandler.analyzeOpenAIFailure(error)
      
      if (failureResult.is_failure) {
        console.log(`[OpenAI] OpenAI failure detected: ${failureResult.category.description}`)
        
        return {
          success: false,
          error: `OpenAI API failure: ${failureResult.error_message}`,
          generated_title: null,
          generated_content: null,
          tokens_used: 0,
          model_used: this.config.model,
          generation_time_ms: generationTime,
          failure_analysis: {
            category: failureResult.category.category,
            severity: failureResult.category.severity,
            retryable: failureResult.category.retryable,
            retry_delay: failureResult.requeue_delay,
            suggested_action: failureResult.category.suggested_action,
            circuit_breaker_triggered: failureResult.circuit_breaker_triggered
          }
        }
      }
      
      return {
        success: false,
        error: error.message,
        generated_title: null,
        generated_content: null,
        tokens_used: 0,
        model_used: this.config.model,
        generation_time_ms: generationTime
      }
    }
  }

  /**
   * Validates job configuration for content generation
   */
  private validateJobConfiguration(job: ContentJob): { valid: boolean; error?: string } {
    if (!job.topic || job.topic.trim().length === 0) {
      return { valid: false, error: 'Job topic is required' }
    }

    if (job.topic.length > 500) {
      return { valid: false, error: 'Job topic is too long (max 500 characters)' }
    }

    // Validate model if specified
    if (job.model && !MODEL_CONFIGS[job.model]) {
      return { valid: false, error: `Unsupported model: ${job.model}` }
    }

    return { valid: true }
  }

  /**
   * Gets the appropriate content template for the job
   */
  private getContentTemplate(job: ContentJob): ContentTemplate | null {
    const contentType = job.content_type || 'blog_post'
    return CONTENT_TEMPLATES[contentType] || CONTENT_TEMPLATES.blog_post
  }

  /**
   * Prepares generation context from job data
   */
  private prepareGenerationContext(job: ContentJob): GenerationContext {
    return {
      topic: job.topic,
      audience: job.audience || 'general audience',
      content_type: job.content_type || 'blog_post',
      key_points: job.key_points || '',
      tone: job.tone || 'professional',
      product_name: job.product_name || '',
      category: job.category || '',
      features: job.features || '',
      price_range: job.price_range || '',
      usp: job.usp || ''
    }
  }

  /**
   * Generates system and user prompts from template and context
   */
  private generatePrompts(template: ContentTemplate, context: GenerationContext, job: ContentJob): {
    system_prompt: string
    user_prompt: string
  } {
    // Replace placeholders in user prompt template
    let userPrompt = template.user_prompt_template
    
    Object.entries(context).forEach(([key, value]) => {
      const placeholder = `{${key}}`
      userPrompt = userPrompt.replace(new RegExp(placeholder, 'g'), value || '')
    })

    // Add custom prompt template if provided
    if (job.prompt_template) {
      userPrompt = job.prompt_template.replace('{topic}', context.topic)
    }

    return {
      system_prompt: template.system_prompt,
      user_prompt: userPrompt
    }
  }

  /**
   * Makes API request to OpenAI with retry logic
   */
  private async makeAPIRequestWithRetry(prompts: { system_prompt: string; user_prompt: string }): Promise<any> {
    const operation = async () => {
      const attemptStart = Date.now()

      const response = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: prompts.system_prompt },
            { role: 'user', content: prompts.user_prompt }
          ],
          max_tokens: this.config.max_tokens,
          temperature: this.config.temperature,
          stream: false
        })
      })

      // Validate response using API validator
      const responseTime = Date.now() - attemptStart
      const validationResult = await validateOpenAIResponse(response, responseTime)
      
      if (!validationResult.success) {
        const error = new Error(validationResult.error?.message || 'OpenAI API validation failed')
        ;(error as any).status = validationResult.status_code
        ;(error as any).retryable = validationResult.error?.retryable
        ;(error as any).retry_after = validationResult.retry_after
        throw error
      }

      return validationResult.data
    }

    // Execute with retry logic
    const retryResult = await executeWithRetry(
      operation,
      `OpenAI API request for model ${this.config.model}`,
      {
        max_attempts: this.config.retry_attempts,
        base_delay_ms: 1000,
        max_delay_ms: 10000,
        timeout_ms: 60000
      }
    )

    if (!retryResult.success) {
      console.error(`[OpenAI] API request failed after ${retryResult.final_attempt} attempts:`, retryResult.error?.message)
      throw retryResult.error || new Error('OpenAI API request failed')
    }

    console.log(`[OpenAI] API request succeeded on attempt ${retryResult.final_attempt}`)
    return retryResult.data
  }

  /**
   * Parses OpenAI API response to extract title and content
   */
  private parseContentResponse(response: any): { title: string; content: string } {
    const content = response.choices?.[0]?.message?.content
    
    if (!content) {
      throw new Error('No content received from OpenAI API')
    }

    // Extract title and content from response
    const titleMatch = content.match(/<title>(.*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : 'Generated Content'

    // Clean up content (remove title tags, extract main content)
    let cleanContent = content
      .replace(/<title>.*?<\/title>/gi, '')
      .replace(/<meta[^>]*>/gi, '')
      .trim()

    return { title, content: cleanContent }
  }

  /**
   * Validates generated content meets requirements
   */
  private validateGeneratedContent(parsedContent: { title: string; content: string }): ContentValidationResult {
    const { title, content } = parsedContent

    // Check if content is empty
    if (!content || content.trim().length === 0) {
      return { valid: false, error: 'Generated content is empty' }
    }

    // Check minimum word count (approximately 300 words)
    const wordCount = content.split(/\s+/).length
    if (wordCount < 300) {
      return { valid: false, error: `Content too short: ${wordCount} words (minimum 300)` }
    }

    // Check if title is present
    if (!title || title.trim().length === 0) {
      return { valid: false, error: 'Generated title is empty' }
    }

    // Check for basic HTML structure
    if (!content.includes('<') || !content.includes('>')) {
      return { valid: false, error: 'Content should be in HTML format' }
    }

    return { valid: true, word_count: wordCount }
  }

  /**
   * Gets available models and their configurations
   */
  static getAvailableModels(): Record<string, any> {
    return MODEL_CONFIGS
  }

  /**
   * Gets available content templates
   */
  static getAvailableTemplates(): Record<string, ContentTemplate> {
    return CONTENT_TEMPLATES
  }

  /**
   * Estimates token usage for a given prompt
   */
  static estimateTokenUsage(prompt: string): number {
    // Rough estimation: 1 token ≈ 4 characters for English text
    return Math.ceil(prompt.length / 4)
  }

  /**
   * Calculates estimated cost for content generation
   */
  static calculateEstimatedCost(model: string, estimatedTokens: number): number {
    const modelConfig = MODEL_CONFIGS[model]
    if (!modelConfig) return 0

    return (estimatedTokens / 1000) * modelConfig.cost_per_1k_tokens
  }

  /**
   * Estimates token usage for a job
   */
  private estimateTokenUsage(job: ContentJob): number {
    // Estimate based on topic length and content type
    const topicTokens = Math.ceil(job.topic.length / 4) // Rough estimation
    const contentType = job.content_type || 'blog_post'
    
    // Base token estimates for different content types
    const baseEstimates = {
      'blog_post': 2000, // 600-800 words ≈ 2000 tokens
      'product_description': 1000 // 300-500 words ≈ 1000 tokens
    }
    
    const baseEstimate = baseEstimates[contentType] || 2000
    return baseEstimate + topicTokens
  }

  /**
   * Requeues a job due to OpenAI API failure
   */
  async requeueJobForFailure(
    jobId: string,
    error: any,
    retryCount: number
  ): Promise<{
    success: boolean
    job_id: string
    new_status: string
    requeue_reason: string
    retry_count: number
    next_retry_at?: string
    error?: string
  }> {
    try {
      console.log(`[OpenAI] Requeuing job ${jobId} due to API failure...`)
      
      return await this.failureHandler.requeueJobForOpenAIFailure(
        jobId,
        error,
        retryCount
      )
      
    } catch (error) {
      console.error(`[OpenAI] Failed to requeue job ${jobId}:`, error)
      
      return {
        success: false,
        job_id: jobId,
        new_status: 'failed',
        requeue_reason: 'Requeue failed',
        retry_count: retryCount,
        error: error.message
      }
    }
  }

  /**
   * Gets OpenAI failure statistics
   */
  getFailureStatistics(): any {
    return this.failureHandler.getFailureStatistics()
  }

  /**
   * Checks if OpenAI circuit breaker is open
   */
  isCircuitBreakerOpen(): boolean {
    return this.failureHandler.isCircuitBreakerOpen()
  }

  /**
   * Resets OpenAI circuit breaker
   */
  resetCircuitBreaker(): void {
    this.failureHandler.resetCircuitBreaker()
  }

  /**
   * Analyzes OpenAI API failure
   */
  async analyzeFailure(error: any): Promise<any> {
    return await this.failureHandler.analyzeOpenAIFailure(error)
  }
}

/**
 * Creates OpenAI client with job-specific configuration
 */
export function createOpenAIClient(job: ContentJob): OpenAIClient {
  const modelConfig = job.model ? MODEL_CONFIGS[job.model] : null
  
  return new OpenAIClient({
    model: job.model || DEFAULT_MODEL,
    max_tokens: modelConfig?.max_tokens || DEFAULT_MAX_TOKENS,
    temperature: job.temperature || DEFAULT_TEMPERATURE,
    timeout_ms: 30000,
    retry_attempts: 3,
    retry_delay_ms: 1000
  })
}

/**
 * Generates content using OpenAI API (main function for orchestration)
 */
export async function generateContent(job: ContentJob): Promise<ContentGenerationResponse> {
  try {
    const client = createOpenAIClient(job)
    return await client.generateContent(job)
  } catch (error) {
    console.error('Error in generateContent:', error)
    return {
      success: false,
      error: error.message,
      generated_title: null,
      generated_content: null,
      tokens_used: 0,
      model_used: job.model || DEFAULT_MODEL,
      generation_time_ms: 0
    }
  }
}
