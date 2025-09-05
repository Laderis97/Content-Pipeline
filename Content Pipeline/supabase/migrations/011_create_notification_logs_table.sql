-- Create notification logs table for tracking alert notifications
-- PRD Reference: Monitoring & Maintenance Functions (5.3), Error Handling & Monitoring (D1-D3)

-- Create notification_logs table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID NOT NULL REFERENCES monitoring_alerts(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'slack', 'webhook', 'sms', 'push')),
    status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'failed', 'pending')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivery_time_ms INTEGER CHECK (delivery_time_ms >= 0),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0 CHECK (retry_count >= 0),
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_alert_id ON notification_logs(alert_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_channel ON notification_logs(channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_timestamp ON notification_logs(timestamp);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_alert_channel ON notification_logs(alert_id, channel);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status_timestamp ON notification_logs(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_failed ON notification_logs(status, retry_count) WHERE status = 'failed';

-- Create function to get notification statistics
CREATE OR REPLACE FUNCTION get_notification_statistics(
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    total_notifications BIGINT,
    notifications_by_channel JSONB,
    notifications_by_status JSONB,
    delivery_success_rate NUMERIC,
    average_delivery_time NUMERIC,
    failed_notifications BIGINT,
    retry_rate NUMERIC
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    WITH notification_stats AS (
        SELECT 
            COUNT(*) as total_notifications,
            jsonb_object_agg(channel, channel_count) as notifications_by_channel,
            jsonb_object_agg(status, status_count) as notifications_by_status,
            COUNT(*) FILTER (WHERE status = 'delivered') as delivered_count,
            AVG(delivery_time_ms) as avg_delivery_time,
            COUNT(*) FILTER (WHERE status = 'failed') as failed_count,
            COUNT(*) FILTER (WHERE retry_count > 0) as retry_count
        FROM (
            SELECT 
                channel,
                COUNT(*) as channel_count
            FROM notification_logs 
            WHERE timestamp >= start_date
            GROUP BY channel
        ) channel_stats
        CROSS JOIN (
            SELECT 
                status,
                COUNT(*) as status_count
            FROM notification_logs 
            WHERE timestamp >= start_date
            GROUP BY status
        ) status_stats
        CROSS JOIN (
            SELECT 
                status,
                delivery_time_ms,
                retry_count
            FROM notification_logs 
            WHERE timestamp >= start_date
        ) delivery_stats
    )
    SELECT 
        ns.total_notifications,
        ns.notifications_by_channel,
        ns.notifications_by_status,
        CASE 
            WHEN ns.total_notifications > 0 THEN (ns.delivered_count::NUMERIC / ns.total_notifications::NUMERIC) * 100
            ELSE 0
        END as delivery_success_rate,
        COALESCE(ns.avg_delivery_time, 0) as average_delivery_time,
        ns.failed_count as failed_notifications,
        CASE 
            WHEN ns.total_notifications > 0 THEN (ns.retry_count::NUMERIC / ns.total_notifications::NUMERIC) * 100
            ELSE 0
        END as retry_rate
    FROM notification_stats ns;
END;
$$ LANGUAGE plpgsql;

-- Create function to get notification delivery status
CREATE OR REPLACE FUNCTION get_notification_delivery_status(
    alert_uuid UUID
)
RETURNS TABLE (
    channel TEXT,
    status TEXT,
    timestamp TIMESTAMPTZ,
    delivery_time_ms INTEGER,
    retry_count INTEGER,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        nl.channel,
        nl.status,
        nl.timestamp,
        nl.delivery_time_ms,
        nl.retry_count,
        nl.error_message
    FROM notification_logs nl
    WHERE nl.alert_id = alert_uuid
    ORDER BY nl.timestamp DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to retry failed notifications
CREATE OR REPLACE FUNCTION retry_failed_notifications(
    hours_back INTEGER DEFAULT 24
)
RETURNS TABLE (
    retried_count BIGINT,
    success_count BIGINT,
    still_failed_count BIGINT
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
    retry_count BIGINT := 0;
    success_count BIGINT := 0;
    still_failed_count BIGINT := 0;
    notification_record RECORD;
BEGIN
    start_time := NOW() - (hours_back || ' hours')::INTERVAL;
    
    -- Get failed notifications that can be retried
    FOR notification_record IN
        SELECT nl.*
        FROM notification_logs nl
        WHERE nl.status = 'failed'
        AND nl.timestamp >= start_time
        AND nl.retry_count < 3
        ORDER BY nl.timestamp ASC
    LOOP
        retry_count := retry_count + 1;
        
        -- Update retry count
        UPDATE notification_logs 
        SET 
            retry_count = retry_count + 1,
            status = 'pending',
            timestamp = NOW()
        WHERE id = notification_record.id;
        
        -- In a real implementation, this would trigger the actual retry
        -- For now, we'll simulate success/failure
        IF RANDOM() > 0.3 THEN -- 70% success rate
            UPDATE notification_logs 
            SET 
                status = 'delivered',
                delivery_time_ms = 1000 + (RANDOM() * 2000)::INTEGER
            WHERE id = notification_record.id;
            success_count := success_count + 1;
        ELSE
            UPDATE notification_logs 
            SET 
                status = 'failed',
                error_message = 'Retry failed: ' || COALESCE(notification_record.error_message, 'Unknown error')
            WHERE id = notification_record.id;
            still_failed_count := still_failed_count + 1;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT retry_count, success_count, still_failed_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to get notification trends
CREATE OR REPLACE FUNCTION get_notification_trends(
    days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
    date DATE,
    total_notifications BIGINT,
    delivered_notifications BIGINT,
    failed_notifications BIGINT,
    delivery_rate NUMERIC,
    average_delivery_time NUMERIC
) AS $$
DECLARE
    start_date TIMESTAMPTZ;
BEGIN
    start_date := NOW() - (days_back || ' days')::INTERVAL;
    
    RETURN QUERY
    SELECT 
        DATE(timestamp) as date,
        COUNT(*) as total_notifications,
        COUNT(*) FILTER (WHERE status = 'delivered') as delivered_notifications,
        COUNT(*) FILTER (WHERE status = 'failed') as failed_notifications,
        CASE 
            WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE status = 'delivered')::NUMERIC / COUNT(*)::NUMERIC) * 100
            ELSE 0
        END as delivery_rate,
        AVG(delivery_time_ms) as average_delivery_time
    FROM notification_logs
    WHERE timestamp >= start_date
    GROUP BY DATE(timestamp)
    ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up old notification logs
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS VOID AS $$
BEGIN
    -- Delete notification logs older than 90 days
    DELETE FROM notification_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically clean up old notification logs
CREATE OR REPLACE FUNCTION trigger_cleanup_old_notification_logs()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up logs older than 90 days
    DELETE FROM notification_logs
    WHERE timestamp < NOW() - INTERVAL '90 days';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER trigger_cleanup_notification_logs
    AFTER INSERT ON notification_logs
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_cleanup_old_notification_logs();

-- Create function to get alert notification summary
CREATE OR REPLACE FUNCTION get_alert_notification_summary(
    alert_uuid UUID
)
RETURNS TABLE (
    alert_id UUID,
    total_notifications BIGINT,
    successful_deliveries BIGINT,
    failed_deliveries BIGINT,
    channels_used TEXT[],
    delivery_success_rate NUMERIC,
    average_delivery_time NUMERIC,
    last_notification_time TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH notification_summary AS (
        SELECT 
            nl.alert_id,
            COUNT(*) as total_notifications,
            COUNT(*) FILTER (WHERE nl.status = 'delivered') as successful_deliveries,
            COUNT(*) FILTER (WHERE nl.status = 'failed') as failed_deliveries,
            ARRAY_AGG(DISTINCT nl.channel) as channels_used,
            AVG(nl.delivery_time_ms) as avg_delivery_time,
            MAX(nl.timestamp) as last_notification_time
        FROM notification_logs nl
        WHERE nl.alert_id = alert_uuid
        GROUP BY nl.alert_id
    )
    SELECT 
        ns.alert_id,
        ns.total_notifications,
        ns.successful_deliveries,
        ns.failed_deliveries,
        ns.channels_used,
        CASE 
            WHEN ns.total_notifications > 0 THEN (ns.successful_deliveries::NUMERIC / ns.total_notifications::NUMERIC) * 100
            ELSE 0
        END as delivery_success_rate,
        COALESCE(ns.avg_delivery_time, 0) as average_delivery_time,
        ns.last_notification_time
    FROM notification_summary ns;
END;
$$ LANGUAGE plpgsql;

-- Add comments for documentation
COMMENT ON TABLE notification_logs IS 'Logs for alert notification delivery tracking';
COMMENT ON COLUMN notification_logs.id IS 'Unique identifier for the notification log entry';
COMMENT ON COLUMN notification_logs.alert_id IS 'Reference to the alert that triggered the notification';
COMMENT ON COLUMN notification_logs.channel IS 'Notification channel used (email, slack, webhook, etc.)';
COMMENT ON COLUMN notification_logs.status IS 'Delivery status of the notification';
COMMENT ON COLUMN notification_logs.timestamp IS 'When the notification was sent';
COMMENT ON COLUMN notification_logs.delivery_time_ms IS 'Time taken to deliver the notification in milliseconds';
COMMENT ON COLUMN notification_logs.error_message IS 'Error message if delivery failed';
COMMENT ON COLUMN notification_logs.retry_count IS 'Number of retry attempts for this notification';
COMMENT ON COLUMN notification_logs.metadata IS 'Additional metadata for the notification';

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON notification_logs TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_statistics(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_delivery_status(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION retry_failed_notifications(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_notification_trends(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notification_logs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_alert_notification_summary(UUID) TO authenticated;
