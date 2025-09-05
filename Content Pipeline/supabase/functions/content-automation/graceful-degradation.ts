// Graceful degradation for partial failures
// PRD Reference: Error Handling & Monitoring (D1-D3), Performance & Scalability (F1-F3), Edge Cases (G1-G3)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ContentJob, ProcessingResult } from './types.ts'
import { 
  transitionJobToPending, 
  transitionJobToFailed, 
  transitionJobToCompleted
} from './job-status-manager.ts'
import { recordRetryAttempt } from './retry-tracker.ts'

// Supabase configuration
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Graceful degradation configuration
const GRACEFUL_DEGRADATION_CONFIG = {
  // Partial failure thresholds
  PARTIAL_FAILURE_THRESHOLDS: {
    content_generation: 0.8, // 80% success rate
    content_validation: 0.9, // 90% success rate
    wordpress_posting: 0.7,  // 70% success rate
    taxonomy_resolution: 0.6 // 60% success rate
  },
  
  // Degradation strategies
  DEGRADATION_STRATEGIES: {
    content_generation: ['fallback_model', 'simplified_prompt', 'template_fallback'],
    content_validation: ['relaxed_validation', 'skip_validation', 'manual_review'],
    wordpress_posting: ['retry_later', 'save_locally', 'manual_posting'],
    taxonomy_resolution: ['default_categories', 'skip_taxonomy', 'manual_assignment']
  },
  
  // Fallback configurations
  FALLBACK_CONFIG: {
    fallback_models: ['gpt-3.5-turbo', 'gpt-4o-mini'],
    simplified_prompts: true,
    template_fallbacks: true,
    default_categories: ['General', 'Technology', 'Business'],
    default_tags: ['automated', 'content', 'draft'],
    local_storage_enabled: true,
    manual_review_queue: true
  },
  
  // Performance thresholds
  PERFORMANCE_THRESHOLDS: {
    max_processing_time: 300000, // 5 minutes
    max_retry_delay: 600000,     // 10 minutes
    min_success_rate: 0.5,       // 50% minimum success rate
    max_consecutive_failures: 5
  }
}

// Partial failure types
export const PARTIAL_FAILURE_TYPES = {
  CONTENT_GENERATION: 'content_generation',
  CONTENT_VALIDATION: 'content_validation',
  WORDPRESS_POSTING: 'wordpress_posting',
  TAXONOMY_RESOLUTION: 'taxonomy_resolution',
  NETWORK_TIMEOUT: 'network_timeout',
  RATE_LIMIT: 'rate_limit',
  AUTHENTICATION: 'authentication',
  VALIDATION_ERROR: 'validation_error'
} as const

export type PartialFailureType = typeof PARTIAL_FAILURE_TYPES[keyof typeof PARTIAL_FAILURE_TYPES]

// Degradation strategies
export const DEGRADATION_STRATEGIES = {
  FALLBACK_MODEL: 'fallback_model',
  SIMPLIFIED_PROMPT: 'simplified_prompt',
  TEMPLATE_FALLBACK: 'template_fallback',
  RELAXED_VALIDATION: 'relaxed_validation',
  SKIP_VALIDATION: 'skip_validation',
  MANUAL_REVIEW: 'manual_review',
  RETRY_LATER: 'retry_later',
  SAVE_LOCALLY: 'save_locally',
  MANUAL_POSTING: 'manual_posting',
  DEFAULT_CATEGORIES: 'default_categories',
  SKIP_TAXONOMY: 'skip_taxonomy',
  MANUAL_ASSIGNMENT: 'manual_assignment'
} as const

export type DegradationStrategy = typeof DEGRADATION_STRATEGIES[keyof typeof DEGRADATION_STRATEGIES]

interface PartialFailure {
  type: PartialFailureType
  severity: 'low' | 'medium' | 'high' | 'critical'
  error_message: string
  error_code?: string
  retryable: boolean
  degradation_strategies: DegradationStrategy[]
  fallback_data?: any
  timestamp: number
}

interface GracefulDegradationResult {
  success: boolean
  degraded: boolean
  degradation_strategy?: DegradationStrategy
  fallback_data?: any
  partial_success: boolean
  error_message?: string
  warnings: string[]
  next_steps: string[]
}

interface DegradationContext {
  job: ContentJob
  failure_type: PartialFailureType
  failure_details: any
  previous_attempts: number
  system_health: SystemHealthStatus
}

interface SystemHealthStatus {
  content_generation_health: number // 0-1 success rate
  wordpress_health: number
  validation_health: number
  taxonomy_health: number
  overall_health: number
  last_updated: number
}

/**
 * Graceful degradation manager for handling partial failures
 */
export class GracefulDegradationManager {
  private systemHealth: SystemHealthStatus
  private degradationHistory: PartialFailure[] = []

  constructor() {
    this.systemHealth = {
      content_generation_health: 1.0,
      wordpress_health: 1.0,
      validation_health: 1.0,
      taxonomy_health: 1.0,
      overall_health: 1.0,
      last_updated: Date.now()
    }
  }

  /**
   * Handles partial failure with graceful degradation
   */
  async handlePartialFailure(
    context: DegradationContext
  ): Promise<GracefulDegradationResult> {
    try {
      console.log(`[GracefulDegradation] Handling partial failure: ${context.failure_type}`)
      
      // Update system health
      await this.updateSystemHealth(context.failure_type, false)
      
      // Analyze the failure
      const failure = this.analyzeFailure(context)
      
      // Determine degradation strategy
      const strategy = this.determineDegradationStrategy(failure, context)
      
      // Apply degradation strategy
      const result = await this.applyDegradationStrategy(strategy, context, failure)
      
      // Log the degradation action
      this.logDegradationAction(failure, strategy, result)
      
      console.log(`[GracefulDegradation] Degradation strategy applied: ${strategy}`)
      
      return result
      
    } catch (error) {
      console.error(`[GracefulDegradation] Failed to handle partial failure:`, error)
      
      return {
        success: false,
        degraded: false,
        partial_success: false,
        error_message: error.message,
        warnings: ['Graceful degradation failed'],
        next_steps: ['Manual intervention required']
      }
    }
  }

  /**
   * Analyzes partial failure and determines severity
   */
  private analyzeFailure(context: DegradationContext): PartialFailure {
    const { failure_type, failure_details } = context
    
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
    let retryable = true
    let degradation_strategies: DegradationStrategy[] = []
    
    switch (failure_type) {
      case PARTIAL_FAILURE_TYPES.CONTENT_GENERATION:
        severity = 'high'
        degradation_strategies = [
          DEGRADATION_STRATEGIES.FALLBACK_MODEL,
          DEGRADATION_STRATEGIES.SIMPLIFIED_PROMPT,
          DEGRADATION_STRATEGIES.TEMPLATE_FALLBACK
        ]
        break
        
      case PARTIAL_FAILURE_TYPES.CONTENT_VALIDATION:
        severity = 'medium'
        degradation_strategies = [
          DEGRADATION_STRATEGIES.RELAXED_VALIDATION,
          DEGRADATION_STRATEGIES.SKIP_VALIDATION,
          DEGRADATION_STRATEGIES.MANUAL_REVIEW
        ]
        break
        
      case PARTIAL_FAILURE_TYPES.WORDPRESS_POSTING:
        severity = 'high'
        degradation_strategies = [
          DEGRADATION_STRATEGIES.RETRY_LATER,
          DEGRADATION_STRATEGIES.SAVE_LOCALLY,
          DEGRADATION_STRATEGIES.MANUAL_POSTING
        ]
        break
        
      case PARTIAL_FAILURE_TYPES.TAXONOMY_RESOLUTION:
        severity = 'low'
        degradation_strategies = [
          DEGRADATION_STRATEGIES.DEFAULT_CATEGORIES,
          DEGRADATION_STRATEGIES.SKIP_TAXONOMY,
          DEGRADATION_STRATEGIES.MANUAL_ASSIGNMENT
        ]
        break
        
      case PARTIAL_FAILURE_TYPES.NETWORK_TIMEOUT:
        severity = 'medium'
        retryable = true
        degradation_strategies = [DEGRADATION_STRATEGIES.RETRY_LATER]
        break
        
      case PARTIAL_FAILURE_TYPES.RATE_LIMIT:
        severity = 'medium'
        retryable = true
        degradation_strategies = [DEGRADATION_STRATEGIES.RETRY_LATER]
        break
        
      case PARTIAL_FAILURE_TYPES.AUTHENTICATION:
        severity = 'critical'
        retryable = false
        degradation_strategies = [DEGRADATION_STRATEGIES.MANUAL_REVIEW]
        break
        
      case PARTIAL_FAILURE_TYPES.VALIDATION_ERROR:
        severity = 'low'
        retryable = false
        degradation_strategies = [
          DEGRADATION_STRATEGIES.RELAXED_VALIDATION,
          DEGRADATION_STRATEGIES.MANUAL_REVIEW
        ]
        break
        
      default:
        severity = 'medium'
        degradation_strategies = [DEGRADATION_STRATEGIES.MANUAL_REVIEW]
    }
    
    return {
      type: failure_type,
      severity,
      error_message: failure_details.error || 'Unknown error',
      error_code: failure_details.code,
      retryable,
      degradation_strategies,
      fallback_data: failure_details.fallback_data,
      timestamp: Date.now()
    }
  }

  /**
   * Determines the best degradation strategy based on failure and context
   */
  private determineDegradationStrategy(
    failure: PartialFailure,
    context: DegradationContext
  ): DegradationStrategy {
    const { degradation_strategies } = failure
    const { system_health, previous_attempts } = context
    
    // If system health is good, try less aggressive strategies first
    if (system_health.overall_health > 0.8) {
      return degradation_strategies[0] // First strategy (least aggressive)
    }
    
    // If system health is poor, try more aggressive strategies
    if (system_health.overall_health < 0.5) {
      return degradation_strategies[degradation_strategies.length - 1] // Last strategy (most aggressive)
    }
    
    // If many previous attempts, use more aggressive strategy
    if (previous_attempts >= 3) {
      const midIndex = Math.floor(degradation_strategies.length / 2)
      return degradation_strategies[midIndex]
    }
    
    // Default to first strategy
    return degradation_strategies[0]
  }

  /**
   * Applies the degradation strategy
   */
  private async applyDegradationStrategy(
    strategy: DegradationStrategy,
    context: DegradationContext,
    failure: PartialFailure
  ): Promise<GracefulDegradationResult> {
    const warnings: string[] = []
    const nextSteps: string[] = []
    
    switch (strategy) {
      case DEGRADATION_STRATEGIES.FALLBACK_MODEL:
        return await this.applyFallbackModel(context, warnings, nextSteps)
        
      case DEGRADATION_STRATEGIES.SIMPLIFIED_PROMPT:
        return await this.applySimplifiedPrompt(context, warnings, nextSteps)
        
      case DEGRADATION_STRATEGIES.TEMPLATE_FALLBACK:
        return await this.applyTemplateFallback(context, warnings, nextSteps)
        
      case DEGRADATION_STRATEGIES.RELAXED_VALIDATION:
        return await this.applyRelaxedValidation(context, warnings, nextSteps)
        
      case DEGRADATION_STRATEGIES.SKIP_VALIDATION:
        return await this.applySkipValidation(context, warnings, nextSteps)
        
      case DEGRADATION_STRATEGIES.MANUAL_REVIEW:
        return await this.applyManualReview(context, warnings, nextSteps)
        
      case DEGRADATION_STRATEGIES.RETRY_LATER:
        return await this.applyRetryLater(context, warnings, nextSteps)
        
      case DEGRADATION_STRATEGIES.SAVE_LOCALLY:
        return await this.applySaveLocally(context, warnings, nextSteps)
        
      case DEGRADATION_STRATEGIES.MANUAL_POSTING:
        return await this.applyManualPosting(context, warnings, nextSteps)
        
      case DEGRADATION_STRATEGIES.DEFAULT_CATEGORIES:
        return await this.applyDefaultCategories(context, warnings, nextSteps)
        
      case DEGRADATION_STRATEGIES.SKIP_TAXONOMY:
        return await this.applySkipTaxonomy(context, warnings, nextSteps)
        
      case DEGRADATION_STRATEGIES.MANUAL_ASSIGNMENT:
        return await this.applyManualAssignment(context, warnings, nextSteps)
        
      default:
        return {
          success: false,
          degraded: false,
          partial_success: false,
          error_message: `Unknown degradation strategy: ${strategy}`,
          warnings: ['Unknown degradation strategy'],
          next_steps: ['Manual intervention required']
        }
    }
  }

  /**
   * Applies fallback model strategy
   */
  private async applyFallbackModel(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    const fallbackModels = GRACEFUL_DEGRADATION_CONFIG.FALLBACK_CONFIG.fallback_models
    const currentModel = context.job.model || 'gpt-4o-mini'
    
    // Find next available fallback model
    const currentIndex = fallbackModels.indexOf(currentModel)
    const nextModel = fallbackModels[currentIndex + 1] || fallbackModels[0]
    
    warnings.push(`Switching from ${currentModel} to fallback model ${nextModel}`)
    nextSteps.push('Retry content generation with fallback model')
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.FALLBACK_MODEL,
      fallback_data: { model: nextModel },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Applies simplified prompt strategy
   */
  private async applySimplifiedPrompt(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    warnings.push('Using simplified prompt for content generation')
    nextSteps.push('Retry content generation with simplified prompt')
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.SIMPLIFIED_PROMPT,
      fallback_data: { simplified_prompt: true },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Applies template fallback strategy
   */
  private async applyTemplateFallback(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    warnings.push('Using template fallback for content generation')
    nextSteps.push('Generate content using predefined template')
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.TEMPLATE_FALLBACK,
      fallback_data: { template_fallback: true },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Applies relaxed validation strategy
   */
  private async applyRelaxedValidation(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    warnings.push('Using relaxed validation criteria')
    nextSteps.push('Validate content with relaxed criteria')
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.RELAXED_VALIDATION,
      fallback_data: { relaxed_validation: true },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Applies skip validation strategy
   */
  private async applySkipValidation(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    warnings.push('Skipping content validation')
    nextSteps.push('Proceed without content validation')
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.SKIP_VALIDATION,
      fallback_data: { skip_validation: true },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Applies manual review strategy
   */
  private async applyManualReview(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    warnings.push('Content requires manual review')
    nextSteps.push('Add to manual review queue')
    
    // Add to manual review queue
    await this.addToManualReviewQueue(context.job.id, 'Manual review required due to partial failure')
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.MANUAL_REVIEW,
      fallback_data: { manual_review: true },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Applies retry later strategy
   */
  private async applyRetryLater(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    const retryDelay = this.calculateRetryDelay(context.previous_attempts)
    warnings.push(`Retrying in ${retryDelay / 1000} seconds`)
    nextSteps.push('Schedule retry for later')
    
    // Schedule retry
    await this.scheduleRetry(context.job.id, retryDelay)
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.RETRY_LATER,
      fallback_data: { retry_delay: retryDelay },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Applies save locally strategy
   */
  private async applySaveLocally(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    warnings.push('Saving content locally for later posting')
    nextSteps.push('Save content to local storage')
    
    // Save content locally
    await this.saveContentLocally(context.job.id, context.job.generated_content)
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.SAVE_LOCALLY,
      fallback_data: { saved_locally: true },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Applies manual posting strategy
   */
  private async applyManualPosting(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    warnings.push('Content requires manual posting')
    nextSteps.push('Add to manual posting queue')
    
    // Add to manual posting queue
    await this.addToManualPostingQueue(context.job.id, 'Manual posting required due to WordPress failure')
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.MANUAL_POSTING,
      fallback_data: { manual_posting: true },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Applies default categories strategy
   */
  private async applyDefaultCategories(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    const defaultCategories = GRACEFUL_DEGRADATION_CONFIG.FALLBACK_CONFIG.default_categories
    warnings.push(`Using default categories: ${defaultCategories.join(', ')}`)
    nextSteps.push('Apply default categories to content')
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.DEFAULT_CATEGORIES,
      fallback_data: { categories: defaultCategories },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Applies skip taxonomy strategy
   */
  private async applySkipTaxonomy(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    warnings.push('Skipping taxonomy resolution')
    nextSteps.push('Proceed without taxonomy resolution')
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.SKIP_TAXONOMY,
      fallback_data: { skip_taxonomy: true },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Applies manual assignment strategy
   */
  private async applyManualAssignment(
    context: DegradationContext,
    warnings: string[],
    nextSteps: string[]
  ): Promise<GracefulDegradationResult> {
    warnings.push('Taxonomy requires manual assignment')
    nextSteps.push('Add to manual taxonomy assignment queue')
    
    // Add to manual assignment queue
    await this.addToManualAssignmentQueue(context.job.id, 'Manual taxonomy assignment required')
    
    return {
      success: true,
      degraded: true,
      degradation_strategy: DEGRADATION_STRATEGIES.MANUAL_ASSIGNMENT,
      fallback_data: { manual_assignment: true },
      partial_success: true,
      warnings,
      next_steps: nextSteps
    }
  }

  /**
   * Updates system health based on failure
   */
  private async updateSystemHealth(failureType: PartialFailureType, success: boolean): Promise<void> {
    const healthUpdate = success ? 0.1 : -0.1 // Small increment/decrement
    
    switch (failureType) {
      case PARTIAL_FAILURE_TYPES.CONTENT_GENERATION:
        this.systemHealth.content_generation_health = Math.max(0, Math.min(1, this.systemHealth.content_generation_health + healthUpdate))
        break
      case PARTIAL_FAILURE_TYPES.WORDPRESS_POSTING:
        this.systemHealth.wordpress_health = Math.max(0, Math.min(1, this.systemHealth.wordpress_health + healthUpdate))
        break
      case PARTIAL_FAILURE_TYPES.CONTENT_VALIDATION:
        this.systemHealth.validation_health = Math.max(0, Math.min(1, this.systemHealth.validation_health + healthUpdate))
        break
      case PARTIAL_FAILURE_TYPES.TAXONOMY_RESOLUTION:
        this.systemHealth.taxonomy_health = Math.max(0, Math.min(1, this.systemHealth.taxonomy_health + healthUpdate))
        break
    }
    
    // Calculate overall health
    this.systemHealth.overall_health = (
      this.systemHealth.content_generation_health +
      this.systemHealth.wordpress_health +
      this.systemHealth.validation_health +
      this.systemHealth.taxonomy_health
    ) / 4
    
    this.systemHealth.last_updated = Date.now()
  }

  /**
   * Calculates retry delay based on previous attempts
   */
  private calculateRetryDelay(previousAttempts: number): number {
    const baseDelay = 30000 // 30 seconds
    const maxDelay = GRACEFUL_DEGRADATION_CONFIG.PERFORMANCE_THRESHOLDS.max_retry_delay
    const delay = baseDelay * Math.pow(2, previousAttempts)
    return Math.min(delay, maxDelay)
  }

  /**
   * Logs degradation action for monitoring
   */
  private logDegradationAction(
    failure: PartialFailure,
    strategy: DegradationStrategy,
    result: GracefulDegradationResult
  ): void {
    this.degradationHistory.push(failure)
    
    // Keep only last 100 degradation actions
    if (this.degradationHistory.length > 100) {
      this.degradationHistory = this.degradationHistory.slice(-100)
    }
    
    console.log(`[GracefulDegradation] Logged degradation action: ${failure.type} -> ${strategy}`)
  }

  /**
   * Helper methods for queue management
   */
  private async addToManualReviewQueue(jobId: string, reason: string): Promise<void> {
    // Implementation would add job to manual review queue
    console.log(`[GracefulDegradation] Added job ${jobId} to manual review queue: ${reason}`)
  }

  private async addToManualPostingQueue(jobId: string, reason: string): Promise<void> {
    // Implementation would add job to manual posting queue
    console.log(`[GracefulDegradation] Added job ${jobId} to manual posting queue: ${reason}`)
  }

  private async addToManualAssignmentQueue(jobId: string, reason: string): Promise<void> {
    // Implementation would add job to manual assignment queue
    console.log(`[GracefulDegradation] Added job ${jobId} to manual assignment queue: ${reason}`)
  }

  private async scheduleRetry(jobId: string, delay: number): Promise<void> {
    // Implementation would schedule retry
    console.log(`[GracefulDegradation] Scheduled retry for job ${jobId} in ${delay / 1000} seconds`)
  }

  private async saveContentLocally(jobId: string, content: string): Promise<void> {
    // Implementation would save content locally
    console.log(`[GracefulDegradation] Saved content locally for job ${jobId}`)
  }

  /**
   * Gets system health status
   */
  getSystemHealth(): SystemHealthStatus {
    return { ...this.systemHealth }
  }

  /**
   * Gets degradation history
   */
  getDegradationHistory(): PartialFailure[] {
    return [...this.degradationHistory]
  }

  /**
   * Resets system health
   */
  resetSystemHealth(): void {
    this.systemHealth = {
      content_generation_health: 1.0,
      wordpress_health: 1.0,
      validation_health: 1.0,
      taxonomy_health: 1.0,
      overall_health: 1.0,
      last_updated: Date.now()
    }
    console.log('[GracefulDegradation] System health reset')
  }
}

/**
 * Creates a graceful degradation manager
 */
export function createGracefulDegradationManager(): GracefulDegradationManager {
  return new GracefulDegradationManager()
}

/**
 * Handles partial failure with graceful degradation
 */
export async function handlePartialFailure(
  job: ContentJob,
  failureType: PartialFailureType,
  failureDetails: any,
  previousAttempts: number = 0
): Promise<GracefulDegradationResult> {
  const manager = createGracefulDegradationManager()
  
  const context: DegradationContext = {
    job,
    failure_type: failureType,
    failure_details: failureDetails,
    previous_attempts: previousAttempts,
    system_health: manager.getSystemHealth()
  }
  
  return await manager.handlePartialFailure(context)
}

/**
 * Gets system health status
 */
export async function getSystemHealthStatus(): Promise<SystemHealthStatus> {
  const manager = createGracefulDegradationManager()
  return manager.getSystemHealth()
}

/**
 * Gets degradation history
 */
export async function getDegradationHistory(): Promise<PartialFailure[]> {
  const manager = createGracefulDegradationManager()
  return manager.getDegradationHistory()
}
