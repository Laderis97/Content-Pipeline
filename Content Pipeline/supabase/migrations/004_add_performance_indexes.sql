-- Migration: Add performance indexes for optimization
-- Purpose: Additional database indexes for performance optimization beyond basic indexes
-- PRD Reference: Functional Requirements 1, 6, 19, 40, 77, Performance Requirements

-- Additional indexes for content_jobs table
-- Composite index for job claiming queries (most common operation)
CREATE INDEX IF NOT EXISTS idx_content_jobs_claiming 
ON content_jobs(status, retry_count, created_at) 
WHERE status = 'pending' AND retry_count < 3;

-- Index for sweeper function to find stale processing jobs
CREATE INDEX IF NOT EXISTS idx_content_jobs_stale_processing 
ON content_jobs(claimed_at) 
WHERE status = 'processing';

-- Index for monitoring queries by status and date
CREATE INDEX IF NOT EXISTS idx_content_jobs_status_date 
ON content_jobs(status, created_at);

-- Index for error analysis and retry logic
CREATE INDEX IF NOT EXISTS idx_content_jobs_error_analysis 
ON content_jobs(status, retry_count, last_error) 
WHERE status IN ('error', 'pending');

-- Index for WordPress post ID lookups (for duplicate prevention)
CREATE INDEX IF NOT EXISTS idx_content_jobs_wordpress_post_id 
ON content_jobs(wordpress_post_id) 
WHERE wordpress_post_id IS NOT NULL;

-- Index for topic-based queries and analytics
CREATE INDEX IF NOT EXISTS idx_content_jobs_topic 
ON content_jobs(topic);

-- Additional indexes for job_runs table
-- Composite index for performance monitoring queries
CREATE INDEX IF NOT EXISTS idx_job_runs_performance_monitoring 
ON job_runs(execution_time, status, function_duration_ms);

-- Index for error analysis and debugging
CREATE INDEX IF NOT EXISTS idx_job_runs_error_analysis 
ON job_runs(status, execution_time, error_details) 
WHERE status = 'failed';

-- Index for retry pattern analysis
CREATE INDEX IF NOT EXISTS idx_job_runs_retry_analysis 
ON job_runs(job_id, retry_attempt, status);

-- Index for daily statistics and reporting
CREATE INDEX IF NOT EXISTS idx_job_runs_daily_stats 
ON job_runs(DATE(execution_time), status);

-- Index for function performance analysis
CREATE INDEX IF NOT EXISTS idx_job_runs_function_performance 
ON job_runs(function_duration_ms, execution_time) 
WHERE function_duration_ms IS NOT NULL;

-- Index for API performance analysis
CREATE INDEX IF NOT EXISTS idx_job_runs_api_performance 
ON job_runs(openai_duration_ms, wordpress_duration_ms, execution_time) 
WHERE openai_duration_ms IS NOT NULL OR wordpress_duration_ms IS NOT NULL;

-- Create partial indexes for common query patterns
-- Index for active jobs (pending or processing)
CREATE INDEX IF NOT EXISTS idx_content_jobs_active 
ON content_jobs(created_at, id) 
WHERE status IN ('pending', 'processing');

-- Index for completed jobs (for analytics)
CREATE INDEX IF NOT EXISTS idx_content_jobs_completed 
ON content_jobs(completed_at, wordpress_post_id) 
WHERE status = 'completed';

-- Add completed_at column to content_jobs for better analytics
ALTER TABLE content_jobs 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Update completed_at when job is marked as completed
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for completed_at
DROP TRIGGER IF EXISTS trigger_update_completed_at ON content_jobs;
CREATE TRIGGER trigger_update_completed_at
    BEFORE UPDATE ON content_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_completed_at();

-- Create index for completed_at after adding the column
CREATE INDEX IF NOT EXISTS idx_content_jobs_completed_at 
ON content_jobs(completed_at) 
WHERE completed_at IS NOT NULL;

-- Create function to analyze index usage (for monitoring)
CREATE OR REPLACE FUNCTION analyze_index_usage()
RETURNS TABLE (
    table_name TEXT,
    index_name TEXT,
    index_size TEXT,
    index_usage_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname||'.'||tablename as table_name,
        indexname as index_name,
        pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
        idx_scan as index_usage_count
    FROM pg_stat_user_indexes 
    WHERE schemaname = 'public'
    ORDER BY idx_scan DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get slow query candidates
CREATE OR REPLACE FUNCTION get_slow_query_candidates()
RETURNS TABLE (
    query TEXT,
    calls BIGINT,
    total_time NUMERIC,
    mean_time NUMERIC,
    rows BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        query,
        calls,
        total_time,
        mean_time,
        rows
    FROM pg_stat_statements 
    WHERE mean_time > 100 -- queries taking more than 100ms on average
    ORDER BY mean_time DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON INDEX idx_content_jobs_claiming IS 'Optimized index for job claiming queries (most frequent operation)';
COMMENT ON INDEX idx_content_jobs_stale_processing IS 'Index for sweeper function to find stale processing jobs';
COMMENT ON INDEX idx_content_jobs_status_date IS 'Index for monitoring queries by status and date';
COMMENT ON INDEX idx_content_jobs_error_analysis IS 'Index for error analysis and retry logic';
COMMENT ON INDEX idx_content_jobs_wordpress_post_id IS 'Index for WordPress post ID lookups (duplicate prevention)';
COMMENT ON INDEX idx_job_runs_performance_monitoring IS 'Composite index for performance monitoring queries';
COMMENT ON INDEX idx_job_runs_error_analysis IS 'Index for error analysis and debugging';
COMMENT ON INDEX idx_job_runs_retry_analysis IS 'Index for retry pattern analysis';
COMMENT ON INDEX idx_job_runs_daily_stats IS 'Index for daily statistics and reporting';
COMMENT ON INDEX idx_job_runs_function_performance IS 'Index for function performance analysis';
COMMENT ON INDEX idx_job_runs_api_performance IS 'Index for API performance analysis';
COMMENT ON FUNCTION analyze_index_usage() IS 'Analyzes index usage for performance monitoring';
COMMENT ON FUNCTION get_slow_query_candidates() IS 'Identifies slow queries for optimization';
