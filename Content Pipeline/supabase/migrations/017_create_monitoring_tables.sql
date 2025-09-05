-- Monitoring and alerting infrastructure tables
-- PRD Reference: Configuration & Deployment (6.6), Error Handling & Monitoring (D2-D3)

-- Create monitoring configuration table
CREATE TABLE IF NOT EXISTS monitoring_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alert rules table
CREATE TABLE IF NOT EXISTS alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    condition_expression TEXT NOT NULL,
    threshold_value DECIMAL(10,4) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    enabled BOOLEAN DEFAULT true,
    channels JSONB DEFAULT '[]'::jsonb,
    cooldown_minutes INTEGER DEFAULT 30,
    last_triggered TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id VARCHAR(255) UNIQUE NOT NULL,
    rule_id VARCHAR(255) NOT NULL REFERENCES alert_rules(rule_id),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create system metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cpu_usage DECIMAL(5,2),
    memory_usage DECIMAL(5,2),
    disk_usage DECIMAL(5,2),
    network_latency_ms INTEGER,
    active_connections INTEGER,
    error_rate DECIMAL(5,4),
    throughput DECIMAL(10,2),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create alert notifications table
CREATE TABLE IF NOT EXISTS alert_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES alerts(id),
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255),
    message_content TEXT NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create monitoring logs table
CREATE TABLE IF NOT EXISTS monitoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_level VARCHAR(20) NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
    component VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_severity ON alert_rules(severity);
CREATE INDEX IF NOT EXISTS idx_alert_rules_last_triggered ON alert_rules(last_triggered);

CREATE INDEX IF NOT EXISTS idx_alerts_rule_id ON alerts(rule_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_triggered_at ON alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved_at ON alerts(resolved_at);

CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_metrics_cpu_usage ON system_metrics(cpu_usage);
CREATE INDEX IF NOT EXISTS idx_system_metrics_memory_usage ON system_metrics(memory_usage);
CREATE INDEX IF NOT EXISTS idx_system_metrics_error_rate ON system_metrics(error_rate);

CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert_id ON alert_notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_channel ON alert_notifications(channel);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_sent_at ON alert_notifications(sent_at);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_status ON alert_notifications(status);

CREATE INDEX IF NOT EXISTS idx_monitoring_logs_level ON monitoring_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_component ON monitoring_logs(component);
CREATE INDEX IF NOT EXISTS idx_monitoring_logs_timestamp ON monitoring_logs(timestamp);

-- Create functions for monitoring operations

-- Function to get monitoring configuration
CREATE OR REPLACE FUNCTION get_monitoring_config(config_key_param VARCHAR DEFAULT NULL)
RETURNS TABLE (
    config_key VARCHAR(255),
    config_value JSONB,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF config_key_param IS NULL THEN
        RETURN QUERY
        SELECT mc.config_key, mc.config_value, mc.description, mc.updated_at
        FROM monitoring_config mc
        ORDER BY mc.config_key;
    ELSE
        RETURN QUERY
        SELECT mc.config_key, mc.config_value, mc.description, mc.updated_at
        FROM monitoring_config mc
        WHERE mc.config_key = config_key_param;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to set monitoring configuration
CREATE OR REPLACE FUNCTION set_monitoring_config(
    config_key_param VARCHAR(255),
    config_value_param JSONB,
    description_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    config_id UUID;
BEGIN
    INSERT INTO monitoring_config (config_key, config_value, description)
    VALUES (config_key_param, config_value_param, description_param)
    ON CONFLICT (config_key) 
    DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        description = COALESCE(EXCLUDED.description, monitoring_config.description),
        updated_at = NOW()
    RETURNING id INTO config_id;
    
    RETURN config_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get active alerts (renamed to avoid conflict with migration 010)
CREATE OR REPLACE FUNCTION get_monitoring_active_alerts()
RETURNS TABLE (
    alert_id VARCHAR(255),
    rule_id VARCHAR(255),
    severity VARCHAR(20),
    title VARCHAR(500),
    message TEXT,
    triggered_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT a.alert_id, a.rule_id, a.severity, a.title, a.message, a.triggered_at, a.metadata
    FROM alerts a
    WHERE a.resolved = false
    ORDER BY a.triggered_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to resolve alert (renamed to avoid conflict with migration 010)
CREATE OR REPLACE FUNCTION resolve_monitoring_alert(alert_id_param VARCHAR(255))
RETURNS BOOLEAN AS $$
DECLARE
    alert_exists BOOLEAN;
BEGIN
    UPDATE alerts 
    SET resolved = true, resolved_at = NOW(), updated_at = NOW()
    WHERE alert_id = alert_id_param AND resolved = false
    RETURNING true INTO alert_exists;
    
    RETURN COALESCE(alert_exists, false);
END;
$$ LANGUAGE plpgsql;

-- Function to get system health summary
CREATE OR REPLACE FUNCTION get_system_health_summary(hours_back INTEGER DEFAULT 1)
RETURNS TABLE (
    total_checks INTEGER,
    healthy_checks INTEGER,
    degraded_checks INTEGER,
    unhealthy_checks INTEGER,
    avg_response_time DECIMAL(10,2),
    latest_check TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_checks,
        COUNT(*) FILTER (WHERE status = 'healthy')::INTEGER as healthy_checks,
        COUNT(*) FILTER (WHERE status = 'degraded')::INTEGER as degraded_checks,
        COUNT(*) FILTER (WHERE status = 'unhealthy')::INTEGER as unhealthy_checks,
        ROUND(AVG(response_time_ms), 2) as avg_response_time,
        MAX(checked_at) as latest_check
    FROM health_checks
    WHERE checked_at >= NOW() - INTERVAL '1 hour' * hours_back;
END;
$$ LANGUAGE plpgsql;

-- Function to get system metrics summary (renamed to avoid conflict with migration 014)
CREATE OR REPLACE FUNCTION get_monitoring_system_metrics_summary(hours_back INTEGER DEFAULT 24)
RETURNS TABLE (
    avg_cpu_usage DECIMAL(5,2),
    avg_memory_usage DECIMAL(5,2),
    avg_disk_usage DECIMAL(5,2),
    avg_network_latency DECIMAL(10,2),
    avg_error_rate DECIMAL(5,4),
    avg_throughput DECIMAL(10,2),
    max_cpu_usage DECIMAL(5,2),
    max_memory_usage DECIMAL(5,2),
    max_error_rate DECIMAL(5,4),
    latest_metric TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(cpu_usage), 2) as avg_cpu_usage,
        ROUND(AVG(memory_usage), 2) as avg_memory_usage,
        ROUND(AVG(disk_usage), 2) as avg_disk_usage,
        ROUND(AVG(network_latency_ms), 2) as avg_network_latency,
        ROUND(AVG(error_rate), 4) as avg_error_rate,
        ROUND(AVG(throughput), 2) as avg_throughput,
        ROUND(MAX(cpu_usage), 2) as max_cpu_usage,
        ROUND(MAX(memory_usage), 2) as max_memory_usage,
        ROUND(MAX(error_rate), 4) as max_error_rate,
        MAX(timestamp) as latest_metric
    FROM system_metrics
    WHERE timestamp >= NOW() - INTERVAL '1 hour' * hours_back;
END;
$$ LANGUAGE plpgsql;

-- Function to get alert statistics (renamed to avoid conflict with migration 010)
CREATE OR REPLACE FUNCTION get_monitoring_alert_statistics(days_back INTEGER DEFAULT 7)
RETURNS TABLE (
    total_alerts INTEGER,
    resolved_alerts INTEGER,
    active_alerts INTEGER,
    critical_alerts INTEGER,
    high_alerts INTEGER,
    medium_alerts INTEGER,
    low_alerts INTEGER,
    avg_resolution_time INTERVAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_alerts,
        COUNT(*) FILTER (WHERE resolved = true)::INTEGER as resolved_alerts,
        COUNT(*) FILTER (WHERE resolved = false)::INTEGER as active_alerts,
        COUNT(*) FILTER (WHERE severity = 'critical')::INTEGER as critical_alerts,
        COUNT(*) FILTER (WHERE severity = 'high')::INTEGER as high_alerts,
        COUNT(*) FILTER (WHERE severity = 'medium')::INTEGER as medium_alerts,
        COUNT(*) FILTER (WHERE severity = 'low')::INTEGER as low_alerts,
        AVG(resolved_at - triggered_at) as avg_resolution_time
    FROM alerts
    WHERE triggered_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old monitoring data
CREATE OR REPLACE FUNCTION cleanup_monitoring_data(
    system_metrics_days INTEGER DEFAULT 30,
    alerts_days INTEGER DEFAULT 90,
    logs_days INTEGER DEFAULT 7
)
RETURNS TABLE (
    table_name TEXT,
    deleted_count INTEGER
) AS $$
DECLARE
    system_metrics_count INTEGER;
    alerts_count INTEGER;
    logs_count INTEGER;
BEGIN
    -- Cleanup old system metrics
    DELETE FROM system_metrics 
    WHERE timestamp < NOW() - INTERVAL '1 day' * system_metrics_days;
    GET DIAGNOSTICS system_metrics_count = ROW_COUNT;
    
    -- Cleanup old resolved alerts
    DELETE FROM alerts 
    WHERE resolved = true AND resolved_at < NOW() - INTERVAL '1 day' * alerts_days;
    GET DIAGNOSTICS alerts_count = ROW_COUNT;
    
    -- Cleanup old monitoring logs
    DELETE FROM monitoring_logs 
    WHERE timestamp < NOW() - INTERVAL '1 day' * logs_days;
    GET DIAGNOSTICS logs_count = ROW_COUNT;
    
    -- Return cleanup results
    RETURN QUERY
    SELECT 'system_metrics'::TEXT, system_metrics_count
    UNION ALL
    SELECT 'alerts'::TEXT, alerts_count
    UNION ALL
    SELECT 'monitoring_logs'::TEXT, logs_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get monitoring dashboard (renamed to avoid conflict with migration 010)
CREATE OR REPLACE FUNCTION get_monitoring_dashboard_data()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    value DECIMAL(10,2),
    details JSONB
) AS $$
BEGIN
    -- System health status
    RETURN QUERY
    SELECT 
        'system_health'::TEXT as component,
        CASE 
            WHEN hc.unhealthy_checks > 0 THEN 'unhealthy'::TEXT
            WHEN hc.degraded_checks > 0 THEN 'degraded'::TEXT
            ELSE 'healthy'::TEXT
        END as status,
        ROUND((hc.healthy_checks::DECIMAL / NULLIF(hc.total_checks, 0)) * 100, 2) as value,
        jsonb_build_object(
            'total_checks', hc.total_checks,
            'healthy_checks', hc.healthy_checks,
            'degraded_checks', hc.degraded_checks,
            'unhealthy_checks', hc.unhealthy_checks,
            'avg_response_time', hc.avg_response_time
        ) as details
    FROM get_system_health_summary(1) hc;
    
    -- System metrics status
    RETURN QUERY
    SELECT 
        'system_metrics'::TEXT as component,
        CASE 
            WHEN sm.avg_cpu_usage > 80 OR sm.avg_memory_usage > 80 THEN 'warning'::TEXT
            WHEN sm.avg_cpu_usage > 90 OR sm.avg_memory_usage > 90 THEN 'critical'::TEXT
            ELSE 'healthy'::TEXT
        END as status,
        sm.avg_cpu_usage as value,
        jsonb_build_object(
            'avg_cpu_usage', sm.avg_cpu_usage,
            'avg_memory_usage', sm.avg_memory_usage,
            'avg_disk_usage', sm.avg_disk_usage,
            'avg_network_latency', sm.avg_network_latency,
            'avg_error_rate', sm.avg_error_rate,
            'avg_throughput', sm.avg_throughput
        ) as details
    FROM get_monitoring_system_metrics_summary(1) sm;
    
    -- Alert status
    RETURN QUERY
    SELECT 
        'alerts'::TEXT as component,
        CASE 
            WHEN ast.critical_alerts > 0 THEN 'critical'::TEXT
            WHEN ast.high_alerts > 0 THEN 'warning'::TEXT
            ELSE 'healthy'::TEXT
        END as status,
        ast.active_alerts::DECIMAL as value,
        jsonb_build_object(
            'total_alerts', ast.total_alerts,
            'active_alerts', ast.active_alerts,
            'resolved_alerts', ast.resolved_alerts,
            'critical_alerts', ast.critical_alerts,
            'high_alerts', ast.high_alerts,
            'medium_alerts', ast.medium_alerts,
            'low_alerts', ast.low_alerts
        ) as details
    FROM get_monitoring_alert_statistics(1) ast;
END;
$$ LANGUAGE plpgsql;

-- Insert default monitoring configuration
INSERT INTO monitoring_config (config_key, config_value, description) VALUES
('failure_rate_threshold', '0.2', 'Maximum allowed failure rate (20%)'),
('latency_threshold', '2000', 'Maximum allowed latency in milliseconds'),
('error_count_threshold', '10', 'Maximum allowed error count'),
('health_check_interval', '60000', 'Health check interval in milliseconds'),
('metrics_collection_interval', '30000', 'Metrics collection interval in milliseconds'),
('alert_check_interval', '300000', 'Alert check interval in milliseconds'),
('enable_email_alerts', 'false', 'Enable email alert notifications'),
('enable_slack_alerts', 'false', 'Enable Slack alert notifications'),
('enable_webhook_alerts', 'false', 'Enable webhook alert notifications'),
('email_recipients', '[]', 'List of email recipients for alerts'),
('slack_webhook_url', 'null', 'Slack webhook URL for notifications'),
('webhook_url', 'null', 'Webhook URL for notifications'),
('enable_performance_monitoring', 'true', 'Enable performance monitoring'),
('enable_error_tracking', 'true', 'Enable error tracking'),
('enable_health_checks', 'true', 'Enable health checks'),
('enable_metrics_collection', 'true', 'Enable metrics collection'),
('metrics_retention_days', '30', 'Number of days to retain metrics data'),
('logs_retention_days', '7', 'Number of days to retain log data'),
('alerts_retention_days', '90', 'Number of days to retain alert data')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default alert rules
INSERT INTO alert_rules (rule_id, name, description, condition_expression, threshold_value, severity, enabled, channels, cooldown_minutes) VALUES
('high_failure_rate', 'High Failure Rate', 'Job failure rate exceeds threshold', 'failure_rate > threshold', 0.2, 'high', true, '["email", "slack"]', 30),
('high_latency', 'High Latency', 'Function latency exceeds threshold', 'latency > threshold', 2000, 'medium', true, '["email"]', 15),
('error_count_threshold', 'Error Count Threshold', 'Error count exceeds threshold', 'error_count > threshold', 10, 'medium', true, '["email"]', 10),
('system_unhealthy', 'System Unhealthy', 'System health check failed', 'health_status == "unhealthy"', 0, 'critical', true, '["email", "slack", "webhook"]', 5),
('queue_backlog', 'Queue Backlog', 'Job queue has significant backlog', 'queue_size > threshold', 100, 'medium', true, '["email"]', 20),
('high_cpu_usage', 'High CPU Usage', 'CPU usage exceeds threshold', 'cpu_usage > threshold', 80, 'medium', true, '["email"]', 15),
('high_memory_usage', 'High Memory Usage', 'Memory usage exceeds threshold', 'memory_usage > threshold', 80, 'medium', true, '["email"]', 15),
('high_error_rate', 'High Error Rate', 'System error rate exceeds threshold', 'error_rate > threshold', 0.05, 'high', true, '["email", "slack"]', 10)
ON CONFLICT (rule_id) DO NOTHING;

-- Create triggers for updated_at timestamps (renamed to avoid conflict)
CREATE OR REPLACE FUNCTION update_monitoring_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_monitoring_config_updated_at
    BEFORE UPDATE ON monitoring_config
    FOR EACH ROW
    EXECUTE FUNCTION update_monitoring_updated_at_column();

CREATE TRIGGER update_alert_rules_updated_at
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_monitoring_updated_at_column();

CREATE TRIGGER update_alerts_updated_at
    BEFORE UPDATE ON alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_monitoring_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alerts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON system_metrics TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON alert_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON monitoring_logs TO authenticated;

GRANT EXECUTE ON FUNCTION get_monitoring_config TO authenticated;
GRANT EXECUTE ON FUNCTION set_monitoring_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_monitoring_active_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_monitoring_alert TO authenticated;
GRANT EXECUTE ON FUNCTION get_system_health_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_monitoring_system_metrics_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_monitoring_alert_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_monitoring_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_monitoring_dashboard_data TO authenticated;

-- Grant service role permissions
GRANT ALL ON monitoring_config TO service_role;
GRANT ALL ON alert_rules TO service_role;
GRANT ALL ON alerts TO service_role;
GRANT ALL ON system_metrics TO service_role;
GRANT ALL ON alert_notifications TO service_role;
GRANT ALL ON monitoring_logs TO service_role;

GRANT EXECUTE ON FUNCTION get_monitoring_config TO service_role;
GRANT EXECUTE ON FUNCTION set_monitoring_config TO service_role;
GRANT EXECUTE ON FUNCTION get_monitoring_active_alerts TO service_role;
GRANT EXECUTE ON FUNCTION resolve_monitoring_alert TO service_role;
GRANT EXECUTE ON FUNCTION get_system_health_summary TO service_role;
GRANT EXECUTE ON FUNCTION get_monitoring_system_metrics_summary TO service_role;
GRANT EXECUTE ON FUNCTION get_monitoring_alert_statistics TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_monitoring_data TO service_role;
GRANT EXECUTE ON FUNCTION get_monitoring_dashboard_data TO service_role;