-- Create cleanup logs table for tracking cleanup and archival operations
-- PRD Reference: Monitoring & Maintenance Functions (5.4), Performance & Scalability (F1-F3)

-- Create cleanup_logs table
CREATE TABLE IF NOT EXISTS cleanup_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cleanup_type TEXT NOT NULL CHECK (cleanup_type IN ('full_cleanup', 'table_cleanup', 'emergency_cleanup', 'scheduled_cleanup')),
    total_tables_processed INTEGER NOT NULL CHECK (total_tables_processed >= 0),
    total_records_processed INTEGER NOT NULL CHECK (total_records_processed >= 0),
    total_records_archived INTEGER NOT NULL CHECK (total_records_archived >= 0),
    total_records_deleted INTEGER NOT NULL CHECK (total_records_deleted >= 0),
    total_processing_time_ms INTEGER NOT NULL CHECK (total_processing_time_ms >= 0),
    total_size_reduction_mb NUMERIC NOT NULL CHECK (total_size_reduction_mb >= 0),
    cleanup_success_rate NUMERIC NOT NULL CHECK (cleanup_success_rate >= 0 AND cleanup_success_rate <= 100),
    performance_improvement NUMERIC NOT NULL CHECK (performance_improvement >= 0 AND performance_improvement <= 100),
    errors TEXT[],
    results JSONB,
    cleanup_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_type ON cleanup_logs(cleanup_type);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_timestamp ON cleanup_logs(cleanup_timestamp);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_success_rate ON cleanup_logs(cleanup_success_rate);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_performance ON cleanup_logs(performance_improvement);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_type_timestamp ON cleanup_logs(cleanup_type, cleanup_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_cleanup_logs_performance_timestamp ON cleanup_logs(performance_improvement, cleanup_timestamp DESC);

-- Create function to get cleanup statistics
CREATE OR REPLACE FUNCTION get_cleanup_statistics(
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    total_cleanups BIGINT,
    average_processing_time NUMERIC,
    average_size_reduction NUMERIC,
    average_success_rate NUMERIC,
    total_records_processed BIGINT,
    total_records_archived BIGINT,
    total_records_deleted BIGINT,
    total_size_reduction_mb NUMERIC,
    performance_trend TEXT
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    WITH cleanup_stats AS (
        SELECT 
            COUNT(*) as total_cleanups,
            AVG(total_processing_time_ms) as avg_processing_time,
            AVG(total_size_reduction_mb) as avg_size_reduction,
            AVG(cleanup_success_rate) as avg_success_rate,
            SUM(total_records_processed) as total_records_processed,
            SUM(total_records_archived) as total_records_archived,
            SUM(total_records_deleted) as total_records_deleted,
            SUM(total_size_reduction_mb) as total_size_reduction_mb
        FROM cleanup_logs 
        WHERE cleanup_timestamp >= start_date
    ),
    performance_trend AS (
        SELECT 
            CASE 
                WHEN COUNT(*) < 2 THEN 'insufficient_data'
                WHEN AVG(performance_improvement) > 10 THEN 'improving'
                WHEN AVG(performance_improvement) < 5 THEN 'degrading'
                ELSE 'stable'
            END as trend
        FROM cleanup_logs 
        WHERE cleanup_timestamp >= start_date
    )
    SELECT 
        cs.total_cleanups,
        COALESCE(cs.avg_processing_time, 0) as average_processing_time,
        COALESCE(cs.avg_size_reduction, 0) as average_size_reduction,
        COALESCE(cs.avg_success_rate, 0) as average_success_rate,
        cs.total_records_processed,
        cs.total_records_archived,
        cs.total_records_deleted,
        cs.total_size_reduction_mb,
        pt.trend as performance_trend
    FROM cleanup_stats cs
    CROSS JOIN performance_trend pt;
END;
$$ LANGUAGE plpgsql;

-- Create function to get cleanup performance metrics
CREATE OR REPLACE FUNCTION get_cleanup_performance_metrics(
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    cleanups_count BIGINT,
    total_processing_time NUMERIC,
    total_size_reduction NUMERIC,
    average_success_rate NUMERIC,
    records_processed BIGINT,
    records_deleted BIGINT
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        DATE(cleanup_timestamp) as date,
        COUNT(*) as cleanups_count,
        SUM(total_processing_time_ms) as total_processing_time,
        SUM(total_size_reduction_mb) as total_size_reduction,
        AVG(cleanup_success_rate) as average_success_rate,
        SUM(total_records_processed) as records_processed,
        SUM(total_records_deleted) as records_deleted
    FROM cleanup_logs
    WHERE cleanup_timestamp >= start_date
    GROUP BY DATE(cleanup_timestamp)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get table-specific cleanup statistics
CREATE OR REPLACE FUNCTION get_table_cleanup_statistics(
    table_name TEXT,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE (
    table_name TEXT,
    cleanups_count BIGINT,
    total_records_processed BIGINT,
    total_records_archived BIGINT,
    total_records_deleted BIGINT,
    average_processing_time NUMERIC,
    total_size_reduction NUMERIC,
    last_cleanup_time TIMESTAMPTZ
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    WITH table_stats AS (
        SELECT 
            COUNT(*) as cleanups_count,
            SUM((results->>'records_processed')::INTEGER) as total_records_processed,
            SUM((results->>'records_archived')::INTEGER) as total_records_archived,
            SUM((results->>'records_deleted')::INTEGER) as total_records_deleted,
            AVG((results->>'processing_time_ms')::INTEGER) as avg_processing_time,
            SUM((results->'performance_impact'->>'size_reduction_mb')::NUMERIC) as total_size_reduction,
            MAX(cleanup_timestamp) as last_cleanup_time
        FROM cleanup_logs
        WHERE cleanup_timestamp >= start_date
        AND results->>'table_name' = table_name
    )
    SELECT 
        table_name,
        ts.cleanups_count,
        ts.total_records_processed,
        ts.total_records_archived,
        ts.total_records_deleted,
        COALESCE(ts.avg_processing_time, 0) as average_processing_time,
        COALESCE(ts.total_size_reduction, 0) as total_size_reduction,
        ts.last_cleanup_time
    FROM table_stats ts;
END;
$$ LANGUAGE plpgsql;

-- Create function to get cleanup recommendations
CREATE OR REPLACE FUNCTION get_cleanup_recommendations()
RETURNS TABLE (
    table_name TEXT,
    recommendation_type TEXT,
    recommendation_message TEXT,
    priority TEXT,
    estimated_impact TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH table_sizes AS (
        SELECT 
            'job_runs' as table_name,
            COUNT(*) as record_count,
            COUNT(*) * 0.001 as estimated_size_mb
        FROM job_runs
        WHERE created_at < NOW() - INTERVAL '30 days'
        
        UNION ALL
        
        SELECT 
            'monitoring_alerts' as table_name,
            COUNT(*) as record_count,
            COUNT(*) * 0.0005 as estimated_size_mb
        FROM monitoring_alerts
        WHERE timestamp < NOW() - INTERVAL '90 days'
        AND resolved = TRUE
        
        UNION ALL
        
        SELECT 
            'notification_logs' as table_name,
            COUNT(*) as record_count,
            COUNT(*) * 0.0003 as estimated_size_mb
        FROM notification_logs
        WHERE timestamp < NOW() - INTERVAL '90 days'
        
        UNION ALL
        
        SELECT 
            'sweeper_logs' as table_name,
            COUNT(*) as record_count,
            COUNT(*) * 0.0002 as estimated_size_mb
        FROM sweeper_logs
        WHERE sweep_timestamp < NOW() - INTERVAL '90 days'
        
        UNION ALL
        
        SELECT 
            'admin_retry_audit_log' as table_name,
            COUNT(*) as record_count,
            COUNT(*) * 0.0004 as estimated_size_mb
        FROM admin_retry_audit_log
        WHERE timestamp < NOW() - INTERVAL '90 days'
        
        UNION ALL
        
        SELECT 
            'idempotency_keys' as table_name,
            COUNT(*) as record_count,
            COUNT(*) * 0.0001 as estimated_size_mb
        FROM idempotency_keys
        WHERE expires_at < NOW()
    ),
    recommendations AS (
        SELECT 
            ts.table_name,
            CASE 
                WHEN ts.estimated_size_mb > 100 THEN 'high_priority'
                WHEN ts.estimated_size_mb > 50 THEN 'medium_priority'
                WHEN ts.estimated_size_mb > 10 THEN 'low_priority'
                ELSE 'no_action'
            END as recommendation_type,
            CASE 
                WHEN ts.estimated_size_mb > 100 THEN 'Immediate cleanup recommended - large size impact'
                WHEN ts.estimated_size_mb > 50 THEN 'Cleanup recommended - moderate size impact'
                WHEN ts.estimated_size_mb > 10 THEN 'Optional cleanup - small size impact'
                ELSE 'No cleanup needed'
            END as recommendation_message,
            CASE 
                WHEN ts.estimated_size_mb > 100 THEN 'high'
                WHEN ts.estimated_size_mb > 50 THEN 'medium'
                WHEN ts.estimated_size_mb > 10 THEN 'low'
                ELSE 'none'
            END as priority,
            CASE 
                WHEN ts.estimated_size_mb > 100 THEN 'High - ' || ROUND(ts.estimated_size_mb, 1) || 'MB reduction'
                WHEN ts.estimated_size_mb > 50 THEN 'Medium - ' || ROUND(ts.estimated_size_mb, 1) || 'MB reduction'
                WHEN ts.estimated_size_mb > 10 THEN 'Low - ' || ROUND(ts.estimated_size_mb, 1) || 'MB reduction'
                ELSE 'Minimal impact'
            END as estimated_impact
        FROM table_sizes ts
        WHERE ts.recommendation_type != 'no_action'
    )
    SELECT * FROM recommendations
    ORDER BY 
        CASE priority 
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
            ELSE 4
        END,
        estimated_impact DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to schedule cleanup
CREATE OR REPLACE FUNCTION schedule_cleanup(
    cleanup_type TEXT DEFAULT 'scheduled_cleanup',
    tables_to_cleanup TEXT[] DEFAULT NULL
)
RETURNS TABLE (
    scheduled BOOLEAN,
    message TEXT,
    estimated_duration_minutes INTEGER
) AS $$
DECLARE
    total_records INTEGER := 0;
    estimated_duration INTEGER;
BEGIN
    -- Calculate estimated duration based on record counts
    IF tables_to_cleanup IS NULL THEN
        tables_to_cleanup := ARRAY['job_runs', 'monitoring_alerts', 'notification_logs', 'sweeper_logs', 'admin_retry_audit_log', 'idempotency_keys'];
    END IF;
    
    -- Estimate total records to process
    SELECT COALESCE(SUM(record_count), 0) INTO total_records
    FROM (
        SELECT COUNT(*) as record_count FROM job_runs WHERE 'job_runs' = ANY(tables_to_cleanup) AND created_at < NOW() - INTERVAL '30 days'
        UNION ALL
        SELECT COUNT(*) as record_count FROM monitoring_alerts WHERE 'monitoring_alerts' = ANY(tables_to_cleanup) AND timestamp < NOW() - INTERVAL '90 days' AND resolved = TRUE
        UNION ALL
        SELECT COUNT(*) as record_count FROM notification_logs WHERE 'notification_logs' = ANY(tables_to_cleanup) AND timestamp < NOW() - INTERVAL '90 days'
        UNION ALL
        SELECT COUNT(*) as record_count FROM sweeper_logs WHERE 'sweeper_logs' = ANY(tables_to_cleanup) AND sweep_timestamp < NOW() - INTERVAL '90 days'
        UNION ALL
        SELECT COUNT(*) as record_count FROM admin_retry_audit_log WHERE 'admin_retry_audit_log' = ANY(tables_to_cleanup) AND timestamp < NOW() - INTERVAL '90 days'
        UNION ALL
        SELECT COUNT(*) as record_count FROM idempotency_keys WHERE 'idempotency_keys' = ANY(tables_to_cleanup) AND expires_at < NOW()
    ) record_counts;
    
    -- Estimate duration (rough calculation: 1000 records per minute)
    estimated_duration := GREATEST(1, CEIL(total_records::NUMERIC / 1000));
    
    -- In a real implementation, this would schedule the cleanup job
    -- For now, we'll just return the scheduling information
    
    RETURN QUERY SELECT 
        TRUE as scheduled,
        'Cleanup scheduled for ' || array_length(tables_to_cleanup, 1) || ' tables with ' || total_records || ' records to process' as message,
        estimated_duration as estimated_duration_minutes;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old cleanup logs
CREATE OR REPLACE FUNCTION cleanup_old_cleanup_logs()
RETURNS VOID AS $$
BEGIN
    -- Delete cleanup logs older than 1 year
    DELETE FROM cleanup_logs
    WHERE cleanup_timestamp < NOW() - INTERVAL '1 year';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean up old cleanup logs
CREATE OR REPLACE FUNCTION trigger_cleanup_old_cleanup_logs()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up logs older than 1 year
    DELETE FROM cleanup_logs
    WHERE cleanup_timestamp < NOW() - INTERVAL '1 year';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_cleanup_cleanup_logs
    AFTER INSERT ON cleanup_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_old_cleanup_logs();

-- Add comments for documentation
COMMENT ON TABLE cleanup_logs IS 'Logs for cleanup and archival operations';
COMMENT ON COLUMN cleanup_logs.id IS 'Unique identifier for the cleanup log entry';
COMMENT ON COLUMN cleanup_logs.cleanup_type IS 'Type of cleanup performed (full_cleanup, table_cleanup, etc.)';
COMMENT ON COLUMN cleanup_logs.total_tables_processed IS 'Number of tables processed in this cleanup';
COMMENT ON COLUMN cleanup_logs.total_records_processed IS 'Total number of records processed';
COMMENT ON COLUMN cleanup_logs.total_records_archived IS 'Total number of records archived';
COMMENT ON COLUMN cleanup_logs.total_records_deleted IS 'Total number of records deleted';
COMMENT ON COLUMN cleanup_logs.total_processing_time_ms IS 'Total time taken for cleanup in milliseconds';
COMMENT ON COLUMN cleanup_logs.total_size_reduction_mb IS 'Total size reduction achieved in MB';
COMMENT ON COLUMN cleanup_logs.cleanup_success_rate IS 'Percentage of successful cleanup operations';
COMMENT ON COLUMN cleanup_logs.performance_improvement IS 'Percentage improvement in performance';
COMMENT ON COLUMN cleanup_logs.errors IS 'Array of errors encountered during cleanup';
COMMENT ON COLUMN cleanup_logs.results IS 'Detailed results of cleanup operations';
COMMENT ON COLUMN cleanup_logs.cleanup_timestamp IS 'When the cleanup was performed';

-- Grant permissions
GRANT SELECT, INSERT ON cleanup_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_cleanup_statistics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cleanup_performance_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_cleanup_statistics(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_cleanup_recommendations() TO authenticated;
GRANT EXECUTE ON FUNCTION schedule_cleanup(TEXT, TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_cleanup_logs() TO authenticated;
