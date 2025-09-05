-- Create metrics data table for success rates and performance monitoring
-- PRD Reference: Monitoring & Maintenance Functions (5.6), Performance & Scalability (F1-F3)

-- Create metrics_data table
CREATE TABLE IF NOT EXISTS metrics_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_type TEXT NOT NULL CHECK (metric_type IN ('performance', 'system', 'content_generation', 'wordpress_posting', 'custom')),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    metric_unit TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB,
    tags JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_metrics_data_type ON metrics_data(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_data_name ON metrics_data(metric_name);
CREATE INDEX IF NOT EXISTS idx_metrics_data_timestamp ON metrics_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_metrics_data_value ON metrics_data(metric_value);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_metrics_data_type_timestamp ON metrics_data(metric_type, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_data_name_timestamp ON metrics_data(metric_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_data_type_name ON metrics_data(metric_type, metric_name);

-- Create function to get performance metrics summary
CREATE OR REPLACE FUNCTION get_performance_metrics_summary(
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    success_rate NUMERIC,
    processing_time_avg NUMERIC,
    processing_time_p95 NUMERIC,
    processing_time_p99 NUMERIC,
    throughput_per_hour NUMERIC,
    queue_size NUMERIC,
    error_rate NUMERIC,
    retry_rate NUMERIC,
    completion_rate NUMERIC,
    total_metrics BIGINT
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := NOW() - (hours_back || ' hours')::INTERVAL;
    
    RETURN QUERY
    WITH performance_metrics AS (
        SELECT 
            AVG(metric_value) FILTER (WHERE metric_name = 'success_rate') as success_rate,
            AVG(metric_value) FILTER (WHERE metric_name = 'processing_time_avg') as processing_time_avg,
            PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) FILTER (WHERE metric_name = 'processing_time_p95') as processing_time_p95,
            PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value) FILTER (WHERE metric_name = 'processing_time_p99') as processing_time_p99,
            AVG(metric_value) FILTER (WHERE metric_name = 'throughput_per_hour') as throughput_per_hour,
            AVG(metric_value) FILTER (WHERE metric_name = 'queue_size') as queue_size,
            AVG(metric_value) FILTER (WHERE metric_name = 'error_rate') as error_rate,
            AVG(metric_value) FILTER (WHERE metric_name = 'retry_rate') as retry_rate,
            AVG(metric_value) FILTER (WHERE metric_name = 'completion_rate') as completion_rate,
            COUNT(*) as total_metrics
        FROM metrics_data
        WHERE metric_type = 'performance'
        AND timestamp >= start_time
    )
    SELECT 
        COALESCE(pm.success_rate, 0) as success_rate,
        COALESCE(pm.processing_time_avg, 0) as processing_time_avg,
        COALESCE(pm.processing_time_p95, 0) as processing_time_p95,
        COALESCE(pm.processing_time_p99, 0) as processing_time_p99,
        COALESCE(pm.throughput_per_hour, 0) as throughput_per_hour,
        COALESCE(pm.queue_size, 0) as queue_size,
        COALESCE(pm.error_rate, 0) as error_rate,
        COALESCE(pm.retry_rate, 0) as retry_rate,
        COALESCE(pm.completion_rate, 0) as completion_rate,
        pm.total_metrics
    FROM performance_metrics pm;
END;
$$ LANGUAGE plpgsql;

-- Create function to get system metrics summary
CREATE OR REPLACE FUNCTION get_system_metrics_summary(
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    database_query_time_avg NUMERIC,
    database_connection_count NUMERIC,
    database_active_queries NUMERIC,
    database_slow_queries NUMERIC,
    openai_response_time NUMERIC,
    wordpress_response_time NUMERIC,
    openai_success_rate NUMERIC,
    wordpress_success_rate NUMERIC,
    memory_usage_percent NUMERIC,
    cpu_usage_percent NUMERIC,
    disk_usage_percent NUMERIC,
    total_metrics BIGINT
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := NOW() - (hours_back || ' hours')::INTERVAL;
    
    RETURN QUERY
    WITH system_metrics AS (
        SELECT 
            AVG(metric_value) FILTER (WHERE metric_name = 'database_query_time_avg') as database_query_time_avg,
            AVG(metric_value) FILTER (WHERE metric_name = 'database_connection_count') as database_connection_count,
            AVG(metric_value) FILTER (WHERE metric_name = 'database_active_queries') as database_active_queries,
            AVG(metric_value) FILTER (WHERE metric_name = 'database_slow_queries') as database_slow_queries,
            AVG(metric_value) FILTER (WHERE metric_name = 'external_openai_response_time') as openai_response_time,
            AVG(metric_value) FILTER (WHERE metric_name = 'external_wordpress_response_time') as wordpress_response_time,
            AVG(metric_value) FILTER (WHERE metric_name = 'external_openai_success_rate') as openai_success_rate,
            AVG(metric_value) FILTER (WHERE metric_name = 'external_wordpress_success_rate') as wordpress_success_rate,
            AVG(metric_value) FILTER (WHERE metric_name = 'resource_memory_usage_percent') as memory_usage_percent,
            AVG(metric_value) FILTER (WHERE metric_name = 'resource_cpu_usage_percent') as cpu_usage_percent,
            AVG(metric_value) FILTER (WHERE metric_name = 'resource_disk_usage_percent') as disk_usage_percent,
            COUNT(*) as total_metrics
        FROM metrics_data
        WHERE metric_type = 'system'
        AND timestamp >= start_time
    )
    SELECT 
        COALESCE(sm.database_query_time_avg, 0) as database_query_time_avg,
        COALESCE(sm.database_connection_count, 0) as database_connection_count,
        COALESCE(sm.database_active_queries, 0) as database_active_queries,
        COALESCE(sm.database_slow_queries, 0) as database_slow_queries,
        COALESCE(sm.openai_response_time, 0) as openai_response_time,
        COALESCE(sm.wordpress_response_time, 0) as wordpress_response_time,
        COALESCE(sm.openai_success_rate, 0) as openai_success_rate,
        COALESCE(sm.wordpress_success_rate, 0) as wordpress_success_rate,
        COALESCE(sm.memory_usage_percent, 0) as memory_usage_percent,
        COALESCE(sm.cpu_usage_percent, 0) as cpu_usage_percent,
        COALESCE(sm.disk_usage_percent, 0) as disk_usage_percent,
        sm.total_metrics
    FROM system_metrics sm;
END;
$$ LANGUAGE plpgsql;

-- Create function to get metrics trends
CREATE OR REPLACE FUNCTION get_metrics_trends(
    metric_name TEXT,
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    time_bucket TIMESTAMPTZ,
    metric_value NUMERIC,
    metric_count BIGINT
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
    bucket_interval INTERVAL;
BEGIN
    start_time := NOW() - (hours_back || ' hours')::INTERVAL;
    
    -- Determine bucket interval based on time range
    IF hours_back <= 24 THEN
        bucket_interval := '1 hour'::INTERVAL;
    ELSIF hours_back <= 168 THEN -- 7 days
        bucket_interval := '1 day'::INTERVAL;
    ELSE
        bucket_interval := '1 week'::INTERVAL;
    END IF;
    
    RETURN QUERY
    SELECT 
        date_trunc('hour', timestamp) as time_bucket,
        AVG(metric_value) as metric_value,
        COUNT(*) as metric_count
    FROM metrics_data
    WHERE metric_name = $1
    AND timestamp >= start_time
    GROUP BY date_trunc('hour', timestamp)
    ORDER BY time_bucket DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get metrics by type
CREATE OR REPLACE FUNCTION get_metrics_by_type(
    metric_type_filter TEXT,
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    metric_name TEXT,
    latest_value NUMERIC,
    average_value NUMERIC,
    min_value NUMERIC,
    max_value NUMERIC,
    metric_count BIGINT,
    last_updated TIMESTAMPTZ
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := NOW() - (hours_back || ' hours')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        md.metric_name,
        (SELECT metric_value FROM metrics_data WHERE metric_name = md.metric_name AND metric_type = metric_type_filter ORDER BY timestamp DESC LIMIT 1) as latest_value,
        AVG(md.metric_value) as average_value,
        MIN(md.metric_value) as min_value,
        MAX(md.metric_value) as max_value,
        COUNT(*) as metric_count,
        MAX(md.timestamp) as last_updated
    FROM metrics_data md
    WHERE md.metric_type = metric_type_filter
    AND md.timestamp >= start_time
    GROUP BY md.metric_name
    ORDER BY md.metric_name;
END;
$$ LANGUAGE plpgsql;

-- Create function to get metrics alerts
CREATE OR REPLACE FUNCTION get_metrics_alerts(
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    alert_type TEXT,
    alert_message TEXT,
    severity TEXT,
    metric_name TEXT,
    current_value NUMERIC,
    threshold_value NUMERIC,
    timestamp TIMESTAMPTZ
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := NOW() - (hours_back || ' hours')::INTERVAL;
    
    RETURN QUERY
    WITH latest_metrics AS (
        SELECT DISTINCT ON (metric_name)
            metric_name,
            metric_value,
            timestamp
        FROM metrics_data
        WHERE timestamp >= start_time
        ORDER BY metric_name, timestamp DESC
    ),
    alerts AS (
        SELECT 
            'performance' as alert_type,
            CASE 
                WHEN lm.metric_name = 'success_rate' AND lm.metric_value < 90 THEN 'Critical: Success rate below 90%'
                WHEN lm.metric_name = 'success_rate' AND lm.metric_value < 95 THEN 'Warning: Success rate below 95%'
                WHEN lm.metric_name = 'processing_time_avg' AND lm.metric_value > 30000 THEN 'Critical: Processing time above 30s'
                WHEN lm.metric_name = 'processing_time_avg' AND lm.metric_value > 10000 THEN 'Warning: Processing time above 10s'
                WHEN lm.metric_name = 'queue_size' AND lm.metric_value > 100 THEN 'Critical: Queue size above 100'
                WHEN lm.metric_name = 'queue_size' AND lm.metric_value > 50 THEN 'Warning: Queue size above 50'
                WHEN lm.metric_name = 'throughput_per_hour' AND lm.metric_value < 5 THEN 'Critical: Throughput below 5 jobs/hour'
                WHEN lm.metric_name = 'throughput_per_hour' AND lm.metric_value < 10 THEN 'Warning: Throughput below 10 jobs/hour'
                ELSE NULL
            END as alert_message,
            CASE 
                WHEN lm.metric_name = 'success_rate' AND lm.metric_value < 90 THEN 'critical'
                WHEN lm.metric_name = 'success_rate' AND lm.metric_value < 95 THEN 'warning'
                WHEN lm.metric_name = 'processing_time_avg' AND lm.metric_value > 30000 THEN 'critical'
                WHEN lm.metric_name = 'processing_time_avg' AND lm.metric_value > 10000 THEN 'warning'
                WHEN lm.metric_name = 'queue_size' AND lm.metric_value > 100 THEN 'critical'
                WHEN lm.metric_name = 'queue_size' AND lm.metric_value > 50 THEN 'warning'
                WHEN lm.metric_name = 'throughput_per_hour' AND lm.metric_value < 5 THEN 'critical'
                WHEN lm.metric_name = 'throughput_per_hour' AND lm.metric_value < 10 THEN 'warning'
                ELSE NULL
            END as severity,
            lm.metric_name,
            lm.metric_value as current_value,
            CASE 
                WHEN lm.metric_name = 'success_rate' THEN 95.0
                WHEN lm.metric_name = 'processing_time_avg' THEN 10000.0
                WHEN lm.metric_name = 'queue_size' THEN 50.0
                WHEN lm.metric_name = 'throughput_per_hour' THEN 10.0
                ELSE 0.0
            END as threshold_value,
            lm.timestamp
        FROM latest_metrics lm
    )
    SELECT * FROM alerts
    WHERE alert_message IS NOT NULL
    ORDER BY 
        CASE severity 
            WHEN 'critical' THEN 1
            WHEN 'warning' THEN 2
            ELSE 3
        END,
        timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get metrics dashboard data
CREATE OR REPLACE FUNCTION get_metrics_dashboard(
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    dashboard_section TEXT,
    metrics JSONB
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := NOW() - (hours_back || ' hours')::INTERVAL;
    
    RETURN QUERY
    WITH performance_summary AS (
        SELECT * FROM get_performance_metrics_summary(hours_back)
    ),
    system_summary AS (
        SELECT * FROM get_system_metrics_summary(hours_back)
    ),
    alerts_summary AS (
        SELECT 
            COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
            COUNT(*) FILTER (WHERE severity = 'warning') as warning_alerts,
            COUNT(*) as total_alerts
        FROM get_metrics_alerts(hours_back)
    )
    SELECT 
        'performance' as dashboard_section,
        to_jsonb(ps.*) as metrics
    FROM performance_summary ps
    
    UNION ALL
    
    SELECT 
        'system' as dashboard_section,
        to_jsonb(ss.*) as metrics
    FROM system_summary ss
    
    UNION ALL
    
    SELECT 
        'alerts' as dashboard_section,
        to_jsonb(as.*) as metrics
    FROM alerts_summary as;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old metrics
CREATE OR REPLACE FUNCTION cleanup_old_metrics()
RETURNS VOID AS $$
BEGIN
    -- Delete real-time metrics older than 24 hours
    DELETE FROM metrics_data
    WHERE metric_type = 'performance'
    AND timestamp < NOW() - INTERVAL '24 hours';
    
    -- Delete system metrics older than 7 days
    DELETE FROM metrics_data
    WHERE metric_type = 'system'
    AND timestamp < NOW() - INTERVAL '7 days';
    
    -- Delete custom metrics older than 30 days
    DELETE FROM metrics_data
    WHERE metric_type IN ('content_generation', 'wordpress_posting', 'custom')
    AND timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean up old metrics
CREATE OR REPLACE FUNCTION trigger_cleanup_old_metrics()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up old metrics periodically
    IF RANDOM() < 0.01 THEN -- 1% chance to trigger cleanup
        PERFORM cleanup_old_metrics();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_cleanup_metrics
    AFTER INSERT ON metrics_data
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_old_metrics();

-- Add comments for documentation
COMMENT ON TABLE metrics_data IS 'Metrics data for success rates and performance monitoring';
COMMENT ON COLUMN metrics_data.id IS 'Unique identifier for the metric entry';
COMMENT ON COLUMN metrics_data.metric_type IS 'Type of metric (performance, system, content_generation, etc.)';
COMMENT ON COLUMN metrics_data.metric_name IS 'Name of the specific metric';
COMMENT ON COLUMN metrics_data.metric_value IS 'Numeric value of the metric';
COMMENT ON COLUMN metrics_data.metric_unit IS 'Unit of measurement for the metric';
COMMENT ON COLUMN metrics_data.timestamp IS 'When the metric was recorded';
COMMENT ON COLUMN metrics_data.metadata IS 'Additional metadata for the metric';
COMMENT ON COLUMN metrics_data.tags IS 'Tags for categorizing and filtering metrics';

-- Grant permissions
GRANT SELECT, INSERT ON metrics_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_metrics_summary(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_metrics_summary(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_metrics_trends(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_metrics_by_type(TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_metrics_alerts(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_metrics_dashboard(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_metrics() TO authenticated;
