-- Create sweeper logs table for monitoring sweeper function performance
-- PRD Reference: Monitoring & Maintenance Functions (5.1), Error Handling & Monitoring (D1-D3)

-- Create sweeper_logs table
CREATE TABLE IF NOT EXISTS sweeper_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_jobs_checked INTEGER NOT NULL CHECK (total_jobs_checked >= 0),
    stale_jobs_found INTEGER NOT NULL CHECK (stale_jobs_found >= 0),
    jobs_reset INTEGER NOT NULL CHECK (jobs_reset >= 0),
    jobs_failed INTEGER NOT NULL CHECK (jobs_failed >= 0),
    dry_run BOOLEAN NOT NULL DEFAULT FALSE,
    sweep_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processing_time_ms INTEGER CHECK (processing_time_ms >= 0),
    errors JSONB,
    warnings JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sweeper_logs_timestamp ON sweeper_logs(sweep_timestamp);
CREATE INDEX IF NOT EXISTS idx_sweeper_logs_dry_run ON sweeper_logs(dry_run);
CREATE INDEX IF NOT EXISTS idx_sweeper_logs_jobs_reset ON sweeper_logs(jobs_reset);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sweeper_logs_timestamp_dry_run ON sweeper_logs(sweep_timestamp DESC, dry_run);
CREATE INDEX IF NOT EXISTS idx_sweeper_logs_performance ON sweeper_logs(processing_time_ms, sweep_timestamp DESC);

-- Create function to get sweeper statistics
CREATE OR REPLACE FUNCTION get_sweeper_statistics(
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_sweeps BIGINT,
    total_jobs_checked BIGINT,
    total_stale_jobs_found BIGINT,
    total_jobs_reset BIGINT,
    total_jobs_failed BIGINT,
    average_processing_time NUMERIC,
    success_rate NUMERIC,
    last_sweep_time TIMESTAMPTZ,
    health_status TEXT
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    WITH sweep_stats AS (
        SELECT 
            COUNT(*) as total_sweeps,
            SUM(total_jobs_checked) as total_jobs_checked,
            SUM(stale_jobs_found) as total_stale_jobs_found,
            SUM(jobs_reset) as total_jobs_reset,
            SUM(jobs_failed) as total_jobs_failed,
            AVG(processing_time_ms) as avg_processing_time,
            MAX(sweep_timestamp) as last_sweep
        FROM sweeper_logs 
        WHERE sweep_timestamp >= start_date
        AND dry_run = FALSE
    ),
    success_calculation AS (
        SELECT 
            CASE 
                WHEN total_jobs_checked > 0 THEN (total_jobs_reset::NUMERIC / total_jobs_checked::NUMERIC) * 100
                ELSE 0
            END as success_rate
        FROM sweep_stats
    ),
    health_calculation AS (
        SELECT 
            CASE 
                WHEN success_rate >= 80 THEN 'healthy'
                WHEN success_rate >= 50 THEN 'degraded'
                ELSE 'critical'
            END as health_status
        FROM success_calculation
    )
    SELECT 
        ss.total_sweeps,
        ss.total_jobs_checked,
        ss.total_stale_jobs_found,
        ss.total_jobs_reset,
        ss.total_jobs_failed,
        COALESCE(ss.avg_processing_time, 0) as average_processing_time,
        sc.success_rate,
        ss.last_sweep,
        hc.health_status
    FROM sweep_stats ss
    CROSS JOIN success_calculation sc
    CROSS JOIN health_calculation hc;
END;
$$ LANGUAGE plpgsql;

-- Create function to get sweeper performance metrics
CREATE OR REPLACE FUNCTION get_sweeper_performance_metrics(
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    sweeps_count BIGINT,
    jobs_checked BIGINT,
    stale_jobs_found BIGINT,
    jobs_reset BIGINT,
    avg_processing_time NUMERIC,
    success_rate NUMERIC
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        DATE(sweep_timestamp) as date,
        COUNT(*) as sweeps_count,
        SUM(total_jobs_checked) as jobs_checked,
        SUM(stale_jobs_found) as stale_jobs_found,
        SUM(jobs_reset) as jobs_reset,
        AVG(processing_time_ms) as avg_processing_time,
        CASE 
            WHEN SUM(total_jobs_checked) > 0 THEN (SUM(jobs_reset)::NUMERIC / SUM(total_jobs_checked)::NUMERIC) * 100
            ELSE 0
        END as success_rate
    FROM sweeper_logs 
    WHERE sweep_timestamp >= start_date
    AND dry_run = FALSE
    GROUP BY DATE(sweep_timestamp)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get current sweeper health status
CREATE OR REPLACE FUNCTION get_sweeper_health_status()
RETURNS TABLE (
    healthy BOOLEAN,
    database_healthy BOOLEAN,
    processing_jobs_count BIGINT,
    stale_jobs_count BIGINT,
    last_sweep_time TIMESTAMPTZ,
    health_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH current_processing AS (
        SELECT COUNT(*) as processing_count
        FROM content_jobs 
        WHERE status = 'processing'
    ),
    stale_jobs AS (
        SELECT COUNT(*) as stale_count
        FROM content_jobs 
        WHERE status = 'processing'
        AND claimed_at < NOW() - INTERVAL '10 minutes'
    ),
    last_sweep AS (
        SELECT MAX(sweep_timestamp) as last_sweep
        FROM sweeper_logs
        WHERE dry_run = FALSE
    ),
    health_calc AS (
        SELECT 
            CASE 
                WHEN ls.last_sweep IS NULL THEN 'unknown'
                WHEN ls.last_sweep < NOW() - INTERVAL '1 hour' THEN 'stale'
                WHEN sj.stale_count > 10 THEN 'degraded'
                ELSE 'healthy'
            END as health_status
        FROM last_sweep ls
        CROSS JOIN stale_jobs sj
    )
    SELECT 
        (hc.health_status = 'healthy') as healthy,
        TRUE as database_healthy, -- If we can run this query, DB is healthy
        cp.processing_count as processing_jobs_count,
        sj.stale_count as stale_jobs_count,
        ls.last_sweep as last_sweep_time,
        hc.health_status
    FROM current_processing cp
    CROSS JOIN stale_jobs sj
    CROSS JOIN last_sweep ls
    CROSS JOIN health_calc hc;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old sweeper logs
CREATE OR REPLACE FUNCTION cleanup_old_sweeper_logs()
RETURNS VOID AS $$
BEGIN
    DELETE FROM sweeper_logs
    WHERE sweep_timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create function to get sweeper alerts
CREATE OR REPLACE FUNCTION get_sweeper_alerts()
RETURNS TABLE (
    alert_type TEXT,
    alert_message TEXT,
    severity TEXT,
    timestamp TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH recent_sweeps AS (
        SELECT *
        FROM sweeper_logs
        WHERE sweep_timestamp >= NOW() - INTERVAL '1 hour'
        AND dry_run = FALSE
        ORDER BY sweep_timestamp DESC
        LIMIT 10
    ),
    stale_jobs AS (
        SELECT COUNT(*) as stale_count
        FROM content_jobs 
        WHERE status = 'processing'
        AND claimed_at < NOW() - INTERVAL '10 minutes'
    ),
    alerts AS (
        SELECT 
            'high_stale_jobs' as alert_type,
            'High number of stale jobs detected: ' || sj.stale_count as alert_message,
            CASE 
                WHEN sj.stale_count > 20 THEN 'critical'
                WHEN sj.stale_count > 10 THEN 'warning'
                ELSE 'info'
            END as severity,
            NOW() as timestamp
        FROM stale_jobs sj
        WHERE sj.stale_count > 5
        
        UNION ALL
        
        SELECT 
            'sweeper_failure' as alert_type,
            'Sweeper failed to reset jobs: ' || rs.jobs_failed as alert_message,
            'error' as severity,
            rs.sweep_timestamp as timestamp
        FROM recent_sweeps rs
        WHERE rs.jobs_failed > 0
        
        UNION ALL
        
        SELECT 
            'low_success_rate' as alert_type,
            'Low sweeper success rate: ' || ROUND((rs.jobs_reset::NUMERIC / NULLIF(rs.total_jobs_checked, 0)) * 100, 2) || '%' as alert_message,
            'warning' as severity,
            rs.sweep_timestamp as timestamp
        FROM recent_sweeps rs
        WHERE rs.total_jobs_checked > 0
        AND (rs.jobs_reset::NUMERIC / rs.total_jobs_checked) < 0.8
    )
    SELECT * FROM alerts
    ORDER BY 
        CASE severity 
            WHEN 'critical' THEN 1
            WHEN 'error' THEN 2
            WHEN 'warning' THEN 3
            ELSE 4
        END,
        timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean up old sweeper logs
CREATE OR REPLACE FUNCTION trigger_cleanup_old_sweeper_logs()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up logs older than 90 days
    DELETE FROM sweeper_logs
    WHERE sweep_timestamp < NOW() - INTERVAL '90 days';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger (runs after each insert)
CREATE TRIGGER trigger_cleanup_sweeper_logs
    AFTER INSERT ON sweeper_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_old_sweeper_logs();

-- Add comments for documentation
COMMENT ON TABLE sweeper_logs IS 'Logs for sweeper function performance and statistics';
COMMENT ON COLUMN sweeper_logs.id IS 'Unique identifier for the sweeper log entry';
COMMENT ON COLUMN sweeper_logs.total_jobs_checked IS 'Total number of jobs checked in this sweep';
COMMENT ON COLUMN sweeper_logs.stale_jobs_found IS 'Number of stale jobs found in this sweep';
COMMENT ON COLUMN sweeper_logs.jobs_reset IS 'Number of jobs successfully reset in this sweep';
COMMENT ON COLUMN sweeper_logs.jobs_failed IS 'Number of jobs that failed to reset in this sweep';
COMMENT ON COLUMN sweeper_logs.dry_run IS 'Whether this was a dry run (no actual changes made)';
COMMENT ON COLUMN sweeper_logs.sweep_timestamp IS 'When the sweep was performed';
COMMENT ON COLUMN sweeper_logs.processing_time_ms IS 'Time taken to perform the sweep in milliseconds';
COMMENT ON COLUMN sweeper_logs.errors IS 'Any errors encountered during the sweep';
COMMENT ON COLUMN sweeper_logs.warnings IS 'Any warnings generated during the sweep';

-- Grant permissions
GRANT SELECT, INSERT ON sweeper_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_sweeper_statistics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sweeper_performance_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_sweeper_health_status() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_sweeper_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_sweeper_alerts() TO authenticated;
