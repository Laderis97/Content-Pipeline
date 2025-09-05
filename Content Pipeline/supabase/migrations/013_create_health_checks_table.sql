-- Create health checks table for system health monitoring
-- PRD Reference: Monitoring & Maintenance Functions (5.5), Performance & Scalability (F1-F3)

-- Create health_checks table
CREATE TABLE IF NOT EXISTS health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    overall_status TEXT NOT NULL CHECK (overall_status IN ('healthy', 'warning', 'critical', 'down')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    summary JSONB NOT NULL,
    recommendations TEXT[],
    uptime_percentage NUMERIC NOT NULL CHECK (uptime_percentage >= 0 AND uptime_percentage <= 100),
    last_incident TEXT,
    checks JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_checks_status ON health_checks(overall_status);
CREATE INDEX IF NOT EXISTS idx_health_checks_timestamp ON health_checks(timestamp);
CREATE INDEX IF NOT EXISTS idx_health_checks_uptime ON health_checks(uptime_percentage);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_health_checks_status_timestamp ON health_checks(overall_status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_health_checks_critical ON health_checks(overall_status, timestamp DESC) WHERE overall_status IN ('critical', 'down');

-- Create function to get health check statistics
CREATE OR REPLACE FUNCTION get_health_check_statistics(
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_checks BIGINT,
    healthy_checks BIGINT,
    warning_checks BIGINT,
    critical_checks BIGINT,
    down_checks BIGINT,
    average_uptime_percentage NUMERIC,
    average_response_time NUMERIC,
    last_incident_time TIMESTAMPTZ,
    health_trend TEXT
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    WITH health_stats AS (
        SELECT 
            COUNT(*) as total_checks,
            COUNT(*) FILTER (WHERE overall_status = 'healthy') as healthy_checks,
            COUNT(*) FILTER (WHERE overall_status = 'warning') as warning_checks,
            COUNT(*) FILTER (WHERE overall_status = 'critical') as critical_checks,
            COUNT(*) FILTER (WHERE overall_status = 'down') as down_checks,
            AVG(uptime_percentage) as avg_uptime_percentage,
            AVG((summary->>'average_response_time')::NUMERIC) as avg_response_time,
            MAX(timestamp) FILTER (WHERE overall_status IN ('critical', 'down')) as last_incident_time
        FROM health_checks 
        WHERE timestamp >= start_date
    ),
    health_trend AS (
        SELECT 
            CASE 
                WHEN COUNT(*) < 2 THEN 'insufficient_data'
                WHEN AVG(uptime_percentage) > 95 THEN 'improving'
                WHEN AVG(uptime_percentage) < 90 THEN 'degrading'
                ELSE 'stable'
            END as trend
        FROM health_checks 
        WHERE timestamp >= start_date
    )
    SELECT 
        hs.total_checks,
        hs.healthy_checks,
        hs.warning_checks,
        hs.critical_checks,
        hs.down_checks,
        COALESCE(hs.avg_uptime_percentage, 0) as average_uptime_percentage,
        COALESCE(hs.avg_response_time, 0) as average_response_time,
        hs.last_incident_time,
        ht.trend as health_trend
    FROM health_stats hs
    CROSS JOIN health_trend ht;
END;
$$ LANGUAGE plpgsql;

-- Create function to get health check trends
CREATE OR REPLACE FUNCTION get_health_check_trends(
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    total_checks BIGINT,
    healthy_checks BIGINT,
    warning_checks BIGINT,
    critical_checks BIGINT,
    down_checks BIGINT,
    average_uptime_percentage NUMERIC,
    average_response_time NUMERIC
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        DATE(timestamp) as date,
        COUNT(*) as total_checks,
        COUNT(*) FILTER (WHERE overall_status = 'healthy') as healthy_checks,
        COUNT(*) FILTER (WHERE overall_status = 'warning') as warning_checks,
        COUNT(*) FILTER (WHERE overall_status = 'critical') as critical_checks,
        COUNT(*) FILTER (WHERE overall_status = 'down') as down_checks,
        AVG(uptime_percentage) as average_uptime_percentage,
        AVG((summary->>'average_response_time')::NUMERIC) as average_response_time
    FROM health_checks
    WHERE timestamp >= start_date
    GROUP BY DATE(timestamp)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get current system status
CREATE OR REPLACE FUNCTION get_current_system_status()
RETURNS TABLE (
    overall_status TEXT,
    timestamp TIMESTAMPTZ,
    uptime_percentage NUMERIC,
    last_incident TEXT,
    recommendations TEXT[],
    check_summary JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        hc.overall_status,
        hc.timestamp,
        hc.uptime_percentage,
        hc.last_incident,
        hc.recommendations,
        hc.summary as check_summary
    FROM health_checks hc
    ORDER BY hc.timestamp DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Create function to get health check alerts
CREATE OR REPLACE FUNCTION get_health_check_alerts(
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    alert_id UUID,
    alert_type TEXT,
    severity TEXT,
    message TEXT,
    timestamp TIMESTAMPTZ,
    resolved BOOLEAN,
    resolution_time TIMESTAMPTZ
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := NOW() - (hours_back || ' hours')::INTERVAL;
    
    RETURN QUERY
    WITH health_alerts AS (
        SELECT 
            hc.id as alert_id,
            'health_check' as alert_type,
            hc.overall_status as severity,
            CASE 
                WHEN hc.overall_status = 'down' THEN 'System is down - immediate attention required'
                WHEN hc.overall_status = 'critical' THEN 'System is in critical state - urgent attention required'
                WHEN hc.overall_status = 'warning' THEN 'System is in warning state - monitor closely'
                ELSE 'System is healthy'
            END as message,
            hc.timestamp,
            CASE 
                WHEN hc.overall_status = 'healthy' THEN TRUE
                ELSE FALSE
            END as resolved,
            CASE 
                WHEN hc.overall_status = 'healthy' THEN hc.timestamp
                ELSE NULL
            END as resolution_time
        FROM health_checks hc
        WHERE hc.timestamp >= start_time
        AND hc.overall_status != 'healthy'
    )
    SELECT * FROM health_alerts
    ORDER BY timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get system health metrics
CREATE OR REPLACE FUNCTION get_system_health_metrics(
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    metric_name TEXT,
    metric_value NUMERIC,
    metric_unit TEXT,
    timestamp TIMESTAMPTZ,
    status TEXT
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := NOW() - (hours_back || ' hours')::INTERVAL;
    
    RETURN QUERY
    WITH health_metrics AS (
        SELECT 
            'uptime_percentage' as metric_name,
            hc.uptime_percentage as metric_value,
            'percent' as metric_unit,
            hc.timestamp,
            CASE 
                WHEN hc.uptime_percentage >= 99 THEN 'excellent'
                WHEN hc.uptime_percentage >= 95 THEN 'good'
                WHEN hc.uptime_percentage >= 90 THEN 'fair'
                ELSE 'poor'
            END as status
        FROM health_checks hc
        WHERE hc.timestamp >= start_time
        
        UNION ALL
        
        SELECT 
            'average_response_time' as metric_name,
            (hc.summary->>'average_response_time')::NUMERIC as metric_value,
            'milliseconds' as metric_unit,
            hc.timestamp,
            CASE 
                WHEN (hc.summary->>'average_response_time')::NUMERIC <= 1000 THEN 'excellent'
                WHEN (hc.summary->>'average_response_time')::NUMERIC <= 2000 THEN 'good'
                WHEN (hc.summary->>'average_response_time')::NUMERIC <= 5000 THEN 'fair'
                ELSE 'poor'
            END as status
        FROM health_checks hc
        WHERE hc.timestamp >= start_time
        AND hc.summary->>'average_response_time' IS NOT NULL
        
        UNION ALL
        
        SELECT 
            'healthy_checks_percentage' as metric_name,
            ((hc.summary->>'healthy_checks')::NUMERIC / (hc.summary->>'total_checks')::NUMERIC) * 100 as metric_value,
            'percent' as metric_unit,
            hc.timestamp,
            CASE 
                WHEN ((hc.summary->>'healthy_checks')::NUMERIC / (hc.summary->>'total_checks')::NUMERIC) * 100 >= 90 THEN 'excellent'
                WHEN ((hc.summary->>'healthy_checks')::NUMERIC / (hc.summary->>'total_checks')::NUMERIC) * 100 >= 80 THEN 'good'
                WHEN ((hc.summary->>'healthy_checks')::NUMERIC / (hc.summary->>'total_checks')::NUMERIC) * 100 >= 70 THEN 'fair'
                ELSE 'poor'
            END as status
        FROM health_checks hc
        WHERE hc.timestamp >= start_time
        AND hc.summary->>'total_checks' IS NOT NULL
        AND (hc.summary->>'total_checks')::NUMERIC > 0
    )
    SELECT * FROM health_metrics
    ORDER BY timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get health check recommendations
CREATE OR REPLACE FUNCTION get_health_check_recommendations()
RETURNS TABLE (
    recommendation_type TEXT,
    recommendation_message TEXT,
    priority TEXT,
    affected_components TEXT[],
    estimated_impact TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH current_status AS (
        SELECT 
            hc.overall_status,
            hc.uptime_percentage,
            hc.recommendations,
            hc.checks
        FROM health_checks hc
        ORDER BY hc.timestamp DESC
        LIMIT 1
    ),
    recommendations AS (
        SELECT 
            'system_status' as recommendation_type,
            CASE 
                WHEN cs.overall_status = 'down' THEN 'System is down - immediate intervention required'
                WHEN cs.overall_status = 'critical' THEN 'System is in critical state - urgent attention required'
                WHEN cs.overall_status = 'warning' THEN 'System is in warning state - monitor closely'
                ELSE 'System is healthy - continue monitoring'
            END as recommendation_message,
            CASE 
                WHEN cs.overall_status = 'down' THEN 'critical'
                WHEN cs.overall_status = 'critical' THEN 'high'
                WHEN cs.overall_status = 'warning' THEN 'medium'
                ELSE 'low'
            END as priority,
            ARRAY['system'] as affected_components,
            CASE 
                WHEN cs.overall_status = 'down' THEN 'High - System unavailable'
                WHEN cs.overall_status = 'critical' THEN 'High - System unstable'
                WHEN cs.overall_status = 'warning' THEN 'Medium - System degraded'
                ELSE 'Low - System stable'
            END as estimated_impact
        FROM current_status cs
        
        UNION ALL
        
        SELECT 
            'uptime_improvement' as recommendation_type,
            CASE 
                WHEN cs.uptime_percentage < 90 THEN 'Uptime is below 90% - investigate and resolve issues'
                WHEN cs.uptime_percentage < 95 THEN 'Uptime is below 95% - monitor for improvements'
                WHEN cs.uptime_percentage < 99 THEN 'Uptime is below 99% - consider optimizations'
                ELSE 'Uptime is excellent - maintain current practices'
            END as recommendation_message,
            CASE 
                WHEN cs.uptime_percentage < 90 THEN 'high'
                WHEN cs.uptime_percentage < 95 THEN 'medium'
                WHEN cs.uptime_percentage < 99 THEN 'low'
                ELSE 'none'
            END as priority,
            ARRAY['reliability'] as affected_components,
            CASE 
                WHEN cs.uptime_percentage < 90 THEN 'High - Significant downtime'
                WHEN cs.uptime_percentage < 95 THEN 'Medium - Moderate downtime'
                WHEN cs.uptime_percentage < 99 THEN 'Low - Minimal downtime'
                ELSE 'Minimal - Excellent uptime'
            END as estimated_impact
        FROM current_status cs
    )
    SELECT * FROM recommendations
    WHERE priority != 'none'
    ORDER BY 
        CASE priority 
            WHEN 'critical' THEN 1
            WHEN 'high' THEN 2
            WHEN 'medium' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
        END;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old health checks
CREATE OR REPLACE FUNCTION cleanup_old_health_checks()
RETURNS VOID AS $$
BEGIN
    -- Delete health checks older than 30 days
    DELETE FROM health_checks
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean up old health checks
CREATE OR REPLACE FUNCTION trigger_cleanup_old_health_checks()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up health checks older than 30 days
    DELETE FROM health_checks
    WHERE timestamp < NOW() - INTERVAL '30 days';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_cleanup_health_checks
    AFTER INSERT ON health_checks
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_old_health_checks();

-- Add comments for documentation
COMMENT ON TABLE health_checks IS 'System health check results and monitoring data';
COMMENT ON COLUMN health_checks.id IS 'Unique identifier for the health check entry';
COMMENT ON COLUMN health_checks.overall_status IS 'Overall system health status (healthy, warning, critical, down)';
COMMENT ON COLUMN health_checks.timestamp IS 'When the health check was performed';
COMMENT ON COLUMN health_checks.summary IS 'Summary of health check results including metrics';
COMMENT ON COLUMN health_checks.recommendations IS 'Array of recommendations based on health check results';
COMMENT ON COLUMN health_checks.uptime_percentage IS 'System uptime percentage';
COMMENT ON COLUMN health_checks.last_incident IS 'Description of the last incident';
COMMENT ON COLUMN health_checks.checks IS 'Detailed results of individual health checks';

-- Grant permissions
GRANT SELECT, INSERT ON health_checks TO authenticated;
GRANT EXECUTE ON FUNCTION get_health_check_statistics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_health_check_trends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_system_status() TO authenticated;
GRANT EXECUTE ON FUNCTION get_health_check_alerts(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_health_metrics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_health_check_recommendations() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_health_checks() TO authenticated;
