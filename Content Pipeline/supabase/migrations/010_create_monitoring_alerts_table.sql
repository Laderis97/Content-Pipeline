-- Create monitoring alerts table for failure rate monitoring and alerting
-- PRD Reference: Monitoring & Maintenance Functions (5.2), Error Handling & Monitoring (D1-D3)

-- Create monitoring_alerts table
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('failure_rate', 'performance', 'system_health', 'stale_jobs', 'database_health', 'api_health')),
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical', 'emergency')),
    message TEXT NOT NULL CHECK (length(message) >= 10 AND length(message) <= 1000),
    value NUMERIC NOT NULL,
    threshold NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT,
    resolution_notes TEXT,
    metadata JSONB,
    escalation_level INTEGER DEFAULT 0 CHECK (escalation_level >= 0 AND escalation_level <= 3),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_type ON monitoring_alerts(type);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_timestamp ON monitoring_alerts(timestamp);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_resolved ON monitoring_alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_escalation ON monitoring_alerts(escalation_level);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_active ON monitoring_alerts(resolved, severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_type_severity ON monitoring_alerts(type, severity, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_alerts_critical ON monitoring_alerts(severity, resolved) WHERE severity IN ('critical', 'emergency');

-- Create function to get active alerts
CREATE OR REPLACE FUNCTION get_active_alerts(
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    id UUID,
    type TEXT,
    severity TEXT,
    message TEXT,
    value NUMERIC,
    threshold NUMERIC,
    timestamp TIMESTAMPTZ,
    escalation_level INTEGER,
    metadata JSONB
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
BEGIN
    start_time := NOW() - (hours_back || ' hours')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        ma.id,
        ma.type,
        ma.severity,
        ma.message,
        ma.value,
        ma.threshold,
        ma.timestamp,
        ma.escalation_level,
        ma.metadata
    FROM monitoring_alerts ma
    WHERE ma.resolved = FALSE
    AND ma.timestamp >= start_time
    ORDER BY 
        CASE ma.severity 
            WHEN 'emergency' THEN 1
            WHEN 'critical' THEN 2
            WHEN 'warning' THEN 3
            ELSE 4
        END,
        ma.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to get alert statistics
CREATE OR REPLACE FUNCTION get_alert_statistics(
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_alerts BIGINT,
    alerts_by_type JSONB,
    alerts_by_severity JSONB,
    resolved_alerts BIGINT,
    unresolved_alerts BIGINT,
    average_resolution_time NUMERIC,
    escalation_rate NUMERIC
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    WITH alert_stats AS (
        SELECT 
            COUNT(*) as total_alerts,
            jsonb_object_agg(alert_type, type_count) as alerts_by_type,
            jsonb_object_agg(severity, severity_count) as alerts_by_severity,
            COUNT(*) FILTER (WHERE resolved = TRUE) as resolved_count,
            COUNT(*) FILTER (WHERE resolved = FALSE) as unresolved_count,
            AVG(EXTRACT(EPOCH FROM (resolved_at - timestamp))) as avg_resolution_time,
            COUNT(*) FILTER (WHERE escalation_level > 0) as escalated_count
        FROM (
            SELECT 
                type as alert_type,
                COUNT(*) as type_count
            FROM monitoring_alerts 
            WHERE timestamp >= start_date
            GROUP BY type
        ) type_stats
        CROSS JOIN (
            SELECT 
                severity,
                COUNT(*) as severity_count
            FROM monitoring_alerts 
            WHERE timestamp >= start_date
            GROUP BY severity
        ) severity_stats
        CROSS JOIN (
            SELECT 
                resolved,
                resolved_at,
                timestamp,
                escalation_level
            FROM monitoring_alerts 
            WHERE timestamp >= start_date
        ) resolution_stats
    )
    SELECT 
        ast.total_alerts,
        ast.alerts_by_type,
        ast.alerts_by_severity,
        ast.resolved_count as resolved_alerts,
        ast.unresolved_alerts,
        COALESCE(ast.avg_resolution_time, 0) as average_resolution_time,
        CASE 
            WHEN ast.total_alerts > 0 THEN (ast.escalated_count::NUMERIC / ast.total_alerts::NUMERIC) * 100
            ELSE 0
        END as escalation_rate
    FROM alert_stats ast;
END;
$$ LANGUAGE plpgsql;

-- Create function to create failure rate alert
CREATE OR REPLACE FUNCTION create_failure_rate_alert(
    failure_rate NUMERIC,
    total_jobs INTEGER,
    time_window TEXT DEFAULT 'daily'
)
RETURNS UUID AS $$
DECLARE
    alert_id UUID;
    severity TEXT;
    message TEXT;
    threshold NUMERIC;
BEGIN
    -- Determine severity and threshold
    IF failure_rate >= 0.30 THEN
        severity := 'emergency';
        threshold := 0.30;
        message := 'Emergency: Failure rate is ' || ROUND(failure_rate * 100, 1) || '% (' || total_jobs || ' jobs)';
    ELSIF failure_rate >= 0.20 THEN
        severity := 'critical';
        threshold := 0.20;
        message := 'Critical: Failure rate is ' || ROUND(failure_rate * 100, 1) || '% (' || total_jobs || ' jobs)';
    ELSIF failure_rate >= 0.15 THEN
        severity := 'warning';
        threshold := 0.15;
        message := 'Warning: Failure rate is ' || ROUND(failure_rate * 100, 1) || '% (' || total_jobs || ' jobs)';
    ELSE
        -- No alert needed
        RETURN NULL;
    END IF;
    
    -- Check if similar alert already exists in the last hour
    IF EXISTS (
        SELECT 1 FROM monitoring_alerts 
        WHERE type = 'failure_rate' 
        AND severity = severity
        AND resolved = FALSE
        AND timestamp >= NOW() - INTERVAL '1 hour'
    ) THEN
        RETURN NULL; -- Don't create duplicate alerts
    END IF;
    
    -- Create the alert
    INSERT INTO monitoring_alerts (
        type,
        severity,
        message,
        value,
        threshold,
        metadata
    ) VALUES (
        'failure_rate',
        severity,
        message,
        failure_rate,
        threshold,
        jsonb_build_object(
            'total_jobs', total_jobs,
            'time_window', time_window,
            'failure_rate_percentage', ROUND(failure_rate * 100, 1)
        )
    ) RETURNING id INTO alert_id;
    
    RETURN alert_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to resolve alert
CREATE OR REPLACE FUNCTION resolve_alert(
    alert_uuid UUID,
    resolved_by_user TEXT DEFAULT 'system',
    resolution_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE monitoring_alerts 
    SET 
        resolved = TRUE,
        resolved_at = NOW(),
        resolved_by = resolved_by_user,
        resolution_notes = resolution_notes
    WHERE id = alert_uuid
    AND resolved = FALSE;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Create function to escalate alert
CREATE OR REPLACE FUNCTION escalate_alert(
    alert_uuid UUID,
    escalation_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_level INTEGER;
    new_level INTEGER;
BEGIN
    -- Get current escalation level
    SELECT escalation_level INTO current_level
    FROM monitoring_alerts
    WHERE id = alert_uuid
    AND resolved = FALSE;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Increment escalation level (max 3)
    new_level := LEAST(current_level + 1, 3);
    
    -- Update escalation level
    UPDATE monitoring_alerts 
    SET 
        escalation_level = new_level,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
            'escalation_' || new_level || '_timestamp', NOW(),
            'escalation_' || new_level || '_notes', escalation_notes
        )
    WHERE id = alert_uuid;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create function to get alert trends
CREATE OR REPLACE FUNCTION get_alert_trends(
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    total_alerts BIGINT,
    critical_alerts BIGINT,
    emergency_alerts BIGINT,
    resolved_alerts BIGINT,
    escalation_count BIGINT
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        DATE(timestamp) as date,
        COUNT(*) as total_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'emergency') as emergency_alerts,
        COUNT(*) FILTER (WHERE resolved = TRUE) as resolved_alerts,
        COUNT(*) FILTER (WHERE escalation_level > 0) as escalation_count
    FROM monitoring_alerts
    WHERE timestamp >= start_date
    GROUP BY DATE(timestamp)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old resolved alerts
CREATE OR REPLACE FUNCTION cleanup_old_alerts()
RETURNS VOID AS $$
BEGIN
    -- Delete resolved alerts older than 30 days
    DELETE FROM monitoring_alerts
    WHERE resolved = TRUE
    AND resolved_at < NOW() - INTERVAL '30 days';
    
    -- Delete unresolved alerts older than 7 days (should be escalated or resolved)
    DELETE FROM monitoring_alerts
    WHERE resolved = FALSE
    AND timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean up old alerts
CREATE OR REPLACE FUNCTION trigger_cleanup_old_alerts()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up old alerts periodically
    IF RANDOM() < 0.01 THEN -- 1% chance on each insert
        PERFORM cleanup_old_alerts();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_cleanup_monitoring_alerts
    AFTER INSERT ON monitoring_alerts
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_old_alerts();

-- Create function to get monitoring dashboard data
CREATE OR REPLACE FUNCTION get_monitoring_dashboard()
RETURNS TABLE (
    current_alerts JSONB,
    alert_statistics JSONB,
    recent_trends JSONB,
    system_health TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH current_alerts AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', id,
                'type', type,
                'severity', severity,
                'message', message,
                'timestamp', timestamp,
                'escalation_level', escalation_level
            )
        ) as alerts_data
        FROM monitoring_alerts
        WHERE resolved = FALSE
        AND timestamp >= NOW() - INTERVAL '24 hours'
    ),
    alert_stats AS (
        SELECT jsonb_build_object(
            'total_alerts', COUNT(*),
            'critical_alerts', COUNT(*) FILTER (WHERE severity IN ('critical', 'emergency')),
            'resolved_today', COUNT(*) FILTER (WHERE resolved = TRUE AND DATE(resolved_at) = CURRENT_DATE),
            'escalated_alerts', COUNT(*) FILTER (WHERE escalation_level > 0)
        ) as stats_data
        FROM monitoring_alerts
        WHERE timestamp >= NOW() - INTERVAL '7 days'
    ),
    recent_trends AS (
        SELECT jsonb_agg(
            jsonb_build_object(
                'date', date,
                'total_alerts', total_alerts,
                'critical_alerts', critical_alerts
            )
        ) as trends_data
        FROM get_alert_trends(7)
    ),
    health_calc AS (
        SELECT 
            CASE 
                WHEN COUNT(*) FILTER (WHERE severity IN ('critical', 'emergency') AND resolved = FALSE) > 0 THEN 'critical'
                WHEN COUNT(*) FILTER (WHERE severity = 'warning' AND resolved = FALSE) > 5 THEN 'degraded'
                ELSE 'healthy'
            END as health_status
        FROM monitoring_alerts
        WHERE timestamp >= NOW() - INTERVAL '24 hours'
    )
    SELECT 
        ca.alerts_data as current_alerts,
        ast.stats_data as alert_statistics,
        rt.trends_data as recent_trends,
        hc.health_status as system_health
    FROM current_alerts ca
    CROSS JOIN alert_stats ast
    CROSS JOIN recent_trends rt
    CROSS JOIN health_calc hc;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE monitoring_alerts IS 'Alerts for monitoring system health and failure rates';
COMMENT ON COLUMN monitoring_alerts.id IS 'Unique identifier for the alert';
COMMENT ON COLUMN monitoring_alerts.type IS 'Type of alert (failure_rate, performance, system_health, etc.)';
COMMENT ON COLUMN monitoring_alerts.severity IS 'Severity level (info, warning, critical, emergency)';
COMMENT ON COLUMN monitoring_alerts.message IS 'Human-readable alert message';
COMMENT ON COLUMN monitoring_alerts.value IS 'Current value that triggered the alert';
COMMENT ON COLUMN monitoring_alerts.threshold IS 'Threshold value that was exceeded';
COMMENT ON COLUMN monitoring_alerts.timestamp IS 'When the alert was created';
COMMENT ON COLUMN monitoring_alerts.resolved IS 'Whether the alert has been resolved';
COMMENT ON COLUMN monitoring_alerts.resolved_at IS 'When the alert was resolved';
COMMENT ON COLUMN monitoring_alerts.resolved_by IS 'Who resolved the alert';
COMMENT ON COLUMN monitoring_alerts.resolution_notes IS 'Notes about how the alert was resolved';
COMMENT ON COLUMN monitoring_alerts.metadata IS 'Additional metadata for the alert';
COMMENT ON COLUMN monitoring_alerts.escalation_level IS 'Current escalation level (0-3)';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON monitoring_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION get_active_alerts(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_alert_statistics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION create_failure_rate_alert(NUMERIC, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_alert(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION escalate_alert(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_alert_trends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_alerts() TO authenticated;
GRANT EXECUTE ON FUNCTION get_monitoring_dashboard() TO authenticated;
