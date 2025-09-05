-- Migration: Create job_runs table
-- Purpose: Detailed execution logging with timings and results for monitoring
-- PRD Reference: Functional Requirements 10, 44, 50, 77, 90

-- Create job_runs table for execution logging
CREATE TABLE IF NOT EXISTS job_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL REFERENCES content_jobs(id) ON DELETE CASCADE,
    execution_time TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'retrying')),
    error_details JSONB,
    timings JSONB,
    function_duration_ms INTEGER,
    openai_duration_ms INTEGER,
    wordpress_duration_ms INTEGER,
    total_duration_ms INTEGER,
    retry_attempt INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add comments for documentation
COMMENT ON TABLE job_runs IS 'Detailed execution logging for content automation jobs';
COMMENT ON COLUMN job_runs.id IS 'Unique identifier for each job run';
COMMENT ON COLUMN job_runs.job_id IS 'Reference to the content_jobs table';
COMMENT ON COLUMN job_runs.execution_time IS 'When the job execution started';
COMMENT ON COLUMN job_runs.status IS 'Execution status: started, completed, failed, retrying';
COMMENT ON COLUMN job_runs.error_details IS 'JSON object containing error information if failed';
COMMENT ON COLUMN job_runs.timings IS 'JSON object with detailed timing breakdown';
COMMENT ON COLUMN job_runs.function_duration_ms IS 'Total Edge Function execution time in milliseconds';
COMMENT ON COLUMN job_runs.openai_duration_ms IS 'OpenAI API call duration in milliseconds';
COMMENT ON COLUMN job_runs.wordpress_duration_ms IS 'WordPress API call duration in milliseconds';
COMMENT ON COLUMN job_runs.total_duration_ms IS 'Total job processing time in milliseconds';
COMMENT ON COLUMN job_runs.retry_attempt IS 'Which retry attempt this run represents (0 = first attempt)';

-- Create indexes for performance optimization and monitoring queries
CREATE INDEX IF NOT EXISTS idx_job_runs_job_id ON job_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_runs_execution_time ON job_runs(execution_time);
CREATE INDEX IF NOT EXISTS idx_job_runs_status ON job_runs(status);
CREATE INDEX IF NOT EXISTS idx_job_runs_created_at ON job_runs(created_at);
CREATE INDEX IF NOT EXISTS idx_job_runs_function_duration ON job_runs(function_duration_ms);

-- Create composite index for monitoring queries
CREATE INDEX IF NOT EXISTS idx_job_runs_status_execution_time ON job_runs(status, execution_time);

-- Create function to calculate job run statistics
CREATE OR REPLACE FUNCTION get_job_run_stats(
    start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
    end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_runs BIGINT,
    successful_runs BIGINT,
    failed_runs BIGINT,
    retry_runs BIGINT,
    avg_duration_ms NUMERIC,
    success_rate NUMERIC,
    failure_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_runs,
        COUNT(*) FILTER (WHERE status = 'completed') as successful_runs,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
        COUNT(*) FILTER (WHERE status = 'retrying') as retry_runs,
        ROUND(AVG(total_duration_ms), 2) as avg_duration_ms,
        ROUND(
            (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / COUNT(*)) * 100, 
            2
        ) as success_rate,
        ROUND(
            (COUNT(*) FILTER (WHERE status = 'failed')::NUMERIC / COUNT(*)) * 100, 
            2
        ) as failure_rate
    FROM job_runs 
    WHERE execution_time BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Create function to get recent job runs for monitoring
CREATE OR REPLACE FUNCTION get_recent_job_runs(limit_count INTEGER DEFAULT 100)
RETURNS TABLE (
    run_id UUID,
    job_id UUID,
    topic TEXT,
    status TEXT,
    execution_time TIMESTAMPTZ,
    total_duration_ms INTEGER,
    error_details JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        jr.id as run_id,
        jr.job_id,
        cj.topic,
        jr.status,
        jr.execution_time,
        jr.total_duration_ms,
        jr.error_details
    FROM job_runs jr
    JOIN content_jobs cj ON jr.job_id = cj.id
    ORDER BY jr.execution_time DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
