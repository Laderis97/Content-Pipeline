// TypeScript interfaces for content automation system
// PRD Reference: Database Schema, Functional Requirements

export interface ContentJob {
  id: string
  topic: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  prompt_template?: string
  model: string
  retry_count: number
  claimed_at?: string
  last_error?: string
  generated_title?: string
  generated_content?: string
  wordpress_post_id?: number
  tags?: string[]
  categories?: string[]
  created_at: string
  updated_at: string
  completed_at?: string
  // Additional fields for OpenAI client
  content_type?: 'blog_post' | 'product_description'
  audience?: string
  key_points?: string
  tone?: string
  temperature?: number
  product_name?: string
  category?: string
  features?: string
  price_range?: string
  usp?: string
  author_id?: number
}

export interface JobRun {
  id: string
  job_id: string
  execution_time: string
  status: 'started' | 'completed' | 'failed' | 'retrying'
  error_details?: {
    message: string
    code?: string
    stack?: string
    [key: string]: any
  }
  timings?: {
    function_duration_ms?: number
    openai_duration_ms?: number
    wordpress_duration_ms?: number
    total_duration_ms?: number
    [key: string]: any
  }
  function_duration_ms?: number
  openai_duration_ms?: number
  wordpress_duration_ms?: number
  total_duration_ms?: number
  retry_attempt: number
  created_at: string
}

export interface ProcessingResult {
  success: boolean
  job_id?: string
  error?: string
  wordpress_post_id?: number
  generated_title?: string
  generated_content?: string
  timings: {
    function_start: number
    function_end: number
    total_duration: number
    openai_duration?: number
    wordpress_duration?: number
  }
}

export interface ContentGenerationRequest {
  topic: string
  prompt_template?: string
  model?: string
  target_word_count?: number
  tags?: string[]
  categories?: string[]
}

export interface ContentGenerationResponse {
  success: boolean
  generated_title?: string | null
  generated_content?: string | null
  word_count?: number
  error?: string | null
  model_used?: string
  tokens_used?: number
  generation_time_ms?: number
}

export interface ContentValidationResult {
  valid: boolean
  error?: string
  warnings?: string[]
  word_count?: number
  has_title?: boolean
  has_content?: boolean
  meets_minimum_length?: boolean
}

export interface WordPressPostRequest {
  title: string
  content: string
  status: 'draft' | 'publish' | 'private'
  tags?: string[]
  categories?: string[]
  author_id?: number
}

export interface WordPressPostResponse {
  success: boolean
  post_id?: number
  post_url?: string
  error?: string
  status_code?: number
}

export interface JobClaimResult {
  success: boolean
  job?: ContentJob
  error?: string
}

export interface JobStatusUpdateResult {
  success: boolean
  old_status?: string
  new_status?: string
  message?: string
}

export interface RetryConfig {
  max_attempts: number
  base_delay_ms: number
  max_delay_ms: number
  backoff_multiplier: number
}

export interface SystemConfig {
  openai: {
    api_key: string
    default_model: string
    max_tokens: number
    temperature: number
  }
  wordpress: {
    base_url: string
    username: string
    app_password: string
    default_author_id: number
  }
  processing: {
    max_concurrent_jobs: number
    function_timeout_ms: number
    retry_config: RetryConfig
  }
  monitoring: {
    failure_rate_threshold: number
    alert_webhook_url?: string
  }
}

export interface ErrorDetails {
  message: string
  code?: string
  stack?: string
  timestamp: string
  job_id?: string
  function_name?: string
  retry_attempt?: number
  [key: string]: any
}

export interface PerformanceMetrics {
  function_duration_ms: number
  openai_duration_ms?: number
  wordpress_duration_ms?: number
  total_duration_ms: number
  memory_usage_mb?: number
  cpu_usage_percent?: number
  tokens_used?: number
}

export interface JobStatistics {
  total_jobs: number
  pending_jobs: number
  processing_jobs: number
  completed_jobs: number
  error_jobs: number
  avg_retry_count: number
  oldest_pending_job?: string
}

export interface JobRunStatistics {
  total_runs: number
  successful_runs: number
  failed_runs: number
  retry_runs: number
  avg_duration_ms: number
  success_rate: number
  failure_rate: number
}

// Utility types
export type JobStatus = ContentJob['status']
export type JobRunStatus = JobRun['status']
export type OpenAIModel = 'gpt-4' | 'gpt-4-turbo' | 'gpt-3.5-turbo' | 'gpt-3.5-turbo-16k'
export type WordPressPostStatus = WordPressPostRequest['status']

// Constants
export const JOB_STATUSES = {
  PENDING: 'pending' as const,
  PROCESSING: 'processing' as const,
  COMPLETED: 'completed' as const,
  ERROR: 'error' as const
}

export const JOB_RUN_STATUSES = {
  STARTED: 'started' as const,
  COMPLETED: 'completed' as const,
  FAILED: 'failed' as const,
  RETRYING: 'retrying' as const
}

export const OPENAI_MODELS = {
  GPT_4: 'gpt-4' as const,
  GPT_4_TURBO: 'gpt-4-turbo' as const,
  GPT_3_5_TURBO: 'gpt-3.5-turbo' as const,
  GPT_3_5_TURBO_16K: 'gpt-3.5-turbo-16k' as const
}

export const WORDPRESS_POST_STATUSES = {
  DRAFT: 'draft' as const,
  PUBLISH: 'publish' as const,
  PRIVATE: 'private' as const
}

export const DEFAULT_CONFIG: SystemConfig = {
  openai: {
    api_key: '',
    default_model: OPENAI_MODELS.GPT_4,
    max_tokens: 2000,
    temperature: 0.7
  },
  wordpress: {
    base_url: '',
    username: 'content-bot',
    app_password: '',
    default_author_id: 1
  },
  processing: {
    max_concurrent_jobs: 5,
    function_timeout_ms: 30000,
    retry_config: {
      max_attempts: 3,
      base_delay_ms: 1000,
      max_delay_ms: 10000,
      backoff_multiplier: 2
    }
  },
  monitoring: {
    failure_rate_threshold: 20
  }
}
