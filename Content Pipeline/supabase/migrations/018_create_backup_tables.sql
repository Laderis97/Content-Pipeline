-- Backup and disaster recovery tables
-- PRD Reference: Configuration & Deployment (6.7), Data & Security (E1-E3)

-- Create backup configuration table
CREATE TABLE IF NOT EXISTS backup_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create backup jobs table
CREATE TABLE IF NOT EXISTS backup_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('database', 'function', 'config', 'secrets')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    size_bytes BIGINT,
    checksum VARCHAR(255),
    location TEXT,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create restore jobs table
CREATE TABLE IF NOT EXISTS restore_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(255) UNIQUE NOT NULL,
    backup_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('database', 'function', 'config', 'secrets')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create disaster recovery plans table
CREATE TABLE IF NOT EXISTS disaster_recovery_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    triggers JSONB DEFAULT '[]'::jsonb,
    steps JSONB NOT NULL,
    estimated_recovery_time INTEGER, -- minutes
    last_tested TIMESTAMP WITH TIME ZONE,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create disaster recovery executions table
CREATE TABLE IF NOT EXISTS disaster_recovery_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(255) UNIQUE NOT NULL,
    plan_id VARCHAR(255) NOT NULL REFERENCES disaster_recovery_plans(plan_id),
    trigger VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'success', 'failed', 'partial')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    steps_executed JSONB DEFAULT '[]'::jsonb,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create backup verification table
CREATE TABLE IF NOT EXISTS backup_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id VARCHAR(255) NOT NULL REFERENCES backup_jobs(job_id),
    verification_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    checksum_verified BOOLEAN,
    integrity_verified BOOLEAN,
    accessibility_verified BOOLEAN,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create backup retention table
CREATE TABLE IF NOT EXISTS backup_retention (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    backup_job_id VARCHAR(255) NOT NULL REFERENCES backup_jobs(job_id),
    retention_policy VARCHAR(100) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    archived BOOLEAN DEFAULT false,
    archived_at TIMESTAMP WITH TIME ZONE,
    deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_backup_jobs_type ON backup_jobs(type);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_status ON backup_jobs(status);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_started_at ON backup_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_backup_jobs_completed_at ON backup_jobs(completed_at);

CREATE INDEX IF NOT EXISTS idx_restore_jobs_type ON restore_jobs(type);
CREATE INDEX IF NOT EXISTS idx_restore_jobs_status ON restore_jobs(status);
CREATE INDEX IF NOT EXISTS idx_restore_jobs_backup_id ON restore_jobs(backup_id);
CREATE INDEX IF NOT EXISTS idx_restore_jobs_started_at ON restore_jobs(started_at);

CREATE INDEX IF NOT EXISTS idx_disaster_recovery_plans_priority ON disaster_recovery_plans(priority);
CREATE INDEX IF NOT EXISTS idx_disaster_recovery_plans_enabled ON disaster_recovery_plans(enabled);

CREATE INDEX IF NOT EXISTS idx_disaster_recovery_executions_plan_id ON disaster_recovery_executions(plan_id);
CREATE INDEX IF NOT EXISTS idx_disaster_recovery_executions_status ON disaster_recovery_executions(status);
CREATE INDEX IF NOT EXISTS idx_disaster_recovery_executions_started_at ON disaster_recovery_executions(started_at);

CREATE INDEX IF NOT EXISTS idx_backup_verifications_backup_job_id ON backup_verifications(backup_job_id);
CREATE INDEX IF NOT EXISTS idx_backup_verifications_status ON backup_verifications(status);

CREATE INDEX IF NOT EXISTS idx_backup_retention_expires_at ON backup_retention(expires_at);
CREATE INDEX IF NOT EXISTS idx_backup_retention_archived ON backup_retention(archived);
CREATE INDEX IF NOT EXISTS idx_backup_retention_deleted ON backup_retention(deleted);

-- Create functions for backup operations

-- Function to get backup configuration
CREATE OR REPLACE FUNCTION get_backup_config(config_key_param VARCHAR DEFAULT NULL)
RETURNS TABLE (
    config_key VARCHAR(255),
    config_value JSONB,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    IF config_key_param IS NULL THEN
        RETURN QUERY
        SELECT bc.config_key, bc.config_value, bc.description, bc.updated_at
        FROM backup_config bc
        ORDER BY bc.config_key;
    ELSE
        RETURN QUERY
        SELECT bc.config_key, bc.config_value, bc.description, bc.updated_at
        FROM backup_config bc
        WHERE bc.config_key = config_key_param;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to set backup configuration
CREATE OR REPLACE FUNCTION set_backup_config(
    config_key_param VARCHAR(255),
    config_value_param JSONB,
    description_param TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    config_id UUID;
BEGIN
    INSERT INTO backup_config (config_key, config_value, description)
    VALUES (config_key_param, config_value_param, description_param)
    ON CONFLICT (config_key) 
    DO UPDATE SET 
        config_value = EXCLUDED.config_value,
        description = COALESCE(EXCLUDED.description, backup_config.description),
        updated_at = NOW()
    RETURNING id INTO config_id;
    
    RETURN config_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get backup jobs
CREATE OR REPLACE FUNCTION get_backup_jobs(
    type_param VARCHAR DEFAULT NULL,
    status_param VARCHAR DEFAULT NULL,
    limit_param INTEGER DEFAULT 100
)
RETURNS TABLE (
    job_id VARCHAR(255),
    type VARCHAR(50),
    status VARCHAR(20),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    size_bytes BIGINT,
    checksum VARCHAR(255),
    location TEXT,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bj.job_id, bj.type, bj.status, bj.started_at, bj.completed_at,
        bj.size_bytes, bj.checksum, bj.location, bj.error_message
    FROM backup_jobs bj
    WHERE 
        (type_param IS NULL OR bj.type = type_param) AND
        (status_param IS NULL OR bj.status = status_param)
    ORDER BY bj.started_at DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get restore jobs
CREATE OR REPLACE FUNCTION get_restore_jobs(
    type_param VARCHAR DEFAULT NULL,
    status_param VARCHAR DEFAULT NULL,
    limit_param INTEGER DEFAULT 100
)
RETURNS TABLE (
    job_id VARCHAR(255),
    backup_id VARCHAR(255),
    type VARCHAR(50),
    status VARCHAR(20),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rj.job_id, rj.backup_id, rj.type, rj.status, rj.started_at, rj.completed_at, rj.error_message
    FROM restore_jobs rj
    WHERE 
        (type_param IS NULL OR rj.type = type_param) AND
        (status_param IS NULL OR rj.status = status_param)
    ORDER BY rj.started_at DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get disaster recovery plans
CREATE OR REPLACE FUNCTION get_disaster_recovery_plans(
    priority_param VARCHAR DEFAULT NULL,
    enabled_param BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    plan_id VARCHAR(255),
    name VARCHAR(255),
    description TEXT,
    priority VARCHAR(20),
    triggers JSONB,
    steps JSONB,
    estimated_recovery_time INTEGER,
    last_tested TIMESTAMP WITH TIME ZONE,
    enabled BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        drp.plan_id, drp.name, drp.description, drp.priority, drp.triggers,
        drp.steps, drp.estimated_recovery_time, drp.last_tested, drp.enabled
    FROM disaster_recovery_plans drp
    WHERE 
        (priority_param IS NULL OR drp.priority = priority_param) AND
        (enabled_param IS NULL OR drp.enabled = enabled_param)
    ORDER BY 
        CASE drp.priority 
            WHEN 'critical' THEN 1 
            WHEN 'high' THEN 2 
            WHEN 'medium' THEN 3 
            WHEN 'low' THEN 4 
        END,
        drp.name;
END;
$$ LANGUAGE plpgsql;

-- Function to get disaster recovery executions
CREATE OR REPLACE FUNCTION get_disaster_recovery_executions(
    plan_id_param VARCHAR DEFAULT NULL,
    status_param VARCHAR DEFAULT NULL,
    limit_param INTEGER DEFAULT 100
)
RETURNS TABLE (
    execution_id VARCHAR(255),
    plan_id VARCHAR(255),
    trigger VARCHAR(255),
    status VARCHAR(20),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    steps_executed JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dre.execution_id, dre.plan_id, dre.trigger, dre.status, dre.started_at,
        dre.completed_at, dre.duration_ms, dre.steps_executed
    FROM disaster_recovery_executions dre
    WHERE 
        (plan_id_param IS NULL OR dre.plan_id = plan_id_param) AND
        (status_param IS NULL OR dre.status = status_param)
    ORDER BY dre.started_at DESC
    LIMIT limit_param;
END;
$$ LANGUAGE plpgsql;

-- Function to get backup statistics
CREATE OR REPLACE FUNCTION get_backup_statistics(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    total_backups INTEGER,
    successful_backups INTEGER,
    failed_backups INTEGER,
    database_backups INTEGER,
    function_backups INTEGER,
    config_backups INTEGER,
    secrets_backups INTEGER,
    total_size_bytes BIGINT,
    avg_backup_size_bytes BIGINT,
    avg_backup_duration_ms INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_backups,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as successful_backups,
        COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_backups,
        COUNT(*) FILTER (WHERE type = 'database')::INTEGER as database_backups,
        COUNT(*) FILTER (WHERE type = 'function')::INTEGER as function_backups,
        COUNT(*) FILTER (WHERE type = 'config')::INTEGER as config_backups,
        COUNT(*) FILTER (WHERE type = 'secrets')::INTEGER as secrets_backups,
        COALESCE(SUM(size_bytes), 0) as total_size_bytes,
        COALESCE(AVG(size_bytes), 0) as avg_backup_size_bytes,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000), 0)::INTEGER as avg_backup_duration_ms
    FROM backup_jobs
    WHERE started_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- Function to get restore statistics
CREATE OR REPLACE FUNCTION get_restore_statistics(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
    total_restores INTEGER,
    successful_restores INTEGER,
    failed_restores INTEGER,
    database_restores INTEGER,
    function_restores INTEGER,
    config_restores INTEGER,
    secrets_restores INTEGER,
    avg_restore_duration_ms INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_restores,
        COUNT(*) FILTER (WHERE status = 'completed')::INTEGER as successful_restores,
        COUNT(*) FILTER (WHERE status = 'failed')::INTEGER as failed_restores,
        COUNT(*) FILTER (WHERE type = 'database')::INTEGER as database_restores,
        COUNT(*) FILTER (WHERE type = 'function')::INTEGER as function_restores,
        COUNT(*) FILTER (WHERE type = 'config')::INTEGER as config_restores,
        COUNT(*) FILTER (WHERE type = 'secrets')::INTEGER as secrets_restores,
        COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000), 0)::INTEGER as avg_restore_duration_ms
    FROM restore_jobs
    WHERE started_at >= NOW() - INTERVAL '1 day' * days_back;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old backup data
CREATE OR REPLACE FUNCTION cleanup_backup_data(
    backup_jobs_days INTEGER DEFAULT 90,
    restore_jobs_days INTEGER DEFAULT 90,
    executions_days INTEGER DEFAULT 180,
    verifications_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    table_name TEXT,
    deleted_count INTEGER
) AS $$
DECLARE
    backup_jobs_count INTEGER;
    restore_jobs_count INTEGER;
    executions_count INTEGER;
    verifications_count INTEGER;
BEGIN
    -- Cleanup old backup jobs
    DELETE FROM backup_jobs 
    WHERE started_at < NOW() - INTERVAL '1 day' * backup_jobs_days;
    GET DIAGNOSTICS backup_jobs_count = ROW_COUNT;
    
    -- Cleanup old restore jobs
    DELETE FROM restore_jobs 
    WHERE started_at < NOW() - INTERVAL '1 day' * restore_jobs_days;
    GET DIAGNOSTICS restore_jobs_count = ROW_COUNT;
    
    -- Cleanup old disaster recovery executions
    DELETE FROM disaster_recovery_executions 
    WHERE started_at < NOW() - INTERVAL '1 day' * executions_days;
    GET DIAGNOSTICS executions_count = ROW_COUNT;
    
    -- Cleanup old backup verifications
    DELETE FROM backup_verifications 
    WHERE started_at < NOW() - INTERVAL '1 day' * verifications_days;
    GET DIAGNOSTICS verifications_count = ROW_COUNT;
    
    -- Return cleanup results
    RETURN QUERY
    SELECT 'backup_jobs'::TEXT, backup_jobs_count
    UNION ALL
    SELECT 'restore_jobs'::TEXT, restore_jobs_count
    UNION ALL
    SELECT 'disaster_recovery_executions'::TEXT, executions_count
    UNION ALL
    SELECT 'backup_verifications'::TEXT, verifications_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get backup dashboard data
CREATE OR REPLACE FUNCTION get_backup_dashboard()
RETURNS TABLE (
    component TEXT,
    status TEXT,
    value DECIMAL(10,2),
    details JSONB
) AS $$
BEGIN
    -- Backup status
    RETURN QUERY
    SELECT 
        'backup_status'::TEXT as component,
        CASE 
            WHEN bs.failed_backups > 0 THEN 'warning'::TEXT
            WHEN bs.successful_backups = 0 THEN 'error'::TEXT
            ELSE 'healthy'::TEXT
        END as status,
        ROUND((bs.successful_backups::DECIMAL / NULLIF(bs.total_backups, 0)) * 100, 2) as value,
        jsonb_build_object(
            'total_backups', bs.total_backups,
            'successful_backups', bs.successful_backups,
            'failed_backups', bs.failed_backups,
            'total_size_bytes', bs.total_size_bytes,
            'avg_duration_ms', bs.avg_backup_duration_ms
        ) as details
    FROM get_backup_statistics(7) bs;
    
    -- Restore status
    RETURN QUERY
    SELECT 
        'restore_status'::TEXT as component,
        CASE 
            WHEN rs.failed_restores > 0 THEN 'warning'::TEXT
            WHEN rs.successful_restores = 0 THEN 'error'::TEXT
            ELSE 'healthy'::TEXT
        END as status,
        ROUND((rs.successful_restores::DECIMAL / NULLIF(rs.total_restores, 0)) * 100, 2) as value,
        jsonb_build_object(
            'total_restores', rs.total_restores,
            'successful_restores', rs.successful_restores,
            'failed_restores', rs.failed_restores,
            'avg_duration_ms', rs.avg_restore_duration_ms
        ) as details
    FROM get_restore_statistics(7) rs;
    
    -- Disaster recovery status
    RETURN QUERY
    SELECT 
        'disaster_recovery_status'::TEXT as component,
        CASE 
            WHEN dre.failed_executions > 0 THEN 'warning'::TEXT
            WHEN dre.total_executions = 0 THEN 'healthy'::TEXT
            ELSE 'healthy'::TEXT
        END as status,
        ROUND((dre.successful_executions::DECIMAL / NULLIF(dre.total_executions, 0)) * 100, 2) as value,
        jsonb_build_object(
            'total_executions', dre.total_executions,
            'successful_executions', dre.successful_executions,
            'failed_executions', dre.failed_executions,
            'avg_duration_ms', dre.avg_duration_ms
        ) as details
    FROM (
        SELECT 
            COUNT(*) as total_executions,
            COUNT(*) FILTER (WHERE status = 'success') as successful_executions,
            COUNT(*) FILTER (WHERE status = 'failed') as failed_executions,
            AVG(duration_ms) as avg_duration_ms
        FROM disaster_recovery_executions
        WHERE started_at >= NOW() - INTERVAL '7 days'
    ) dre;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_backup_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_backup_config_updated_at
    BEFORE UPDATE ON backup_config
    FOR EACH ROW
    EXECUTE FUNCTION update_backup_updated_at_column();

CREATE TRIGGER update_backup_jobs_updated_at
    BEFORE UPDATE ON backup_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_backup_updated_at_column();

CREATE TRIGGER update_restore_jobs_updated_at
    BEFORE UPDATE ON restore_jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_backup_updated_at_column();

CREATE TRIGGER update_disaster_recovery_plans_updated_at
    BEFORE UPDATE ON disaster_recovery_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_backup_updated_at_column();

-- Insert default backup configuration
INSERT INTO backup_config (config_key, config_value, description) VALUES
('enable_database_backup', 'true', 'Enable database backup functionality'),
('enable_function_backup', 'true', 'Enable function backup functionality'),
('enable_config_backup', 'true', 'Enable configuration backup functionality'),
('enable_secrets_backup', 'true', 'Enable secrets backup functionality'),
('database_backup_interval', '24', 'Database backup interval in hours'),
('function_backup_interval', '168', 'Function backup interval in hours'),
('config_backup_interval', '24', 'Configuration backup interval in hours'),
('secrets_backup_interval', '168', 'Secrets backup interval in hours'),
('database_backup_retention', '30', 'Database backup retention in days'),
('function_backup_retention', '90', 'Function backup retention in days'),
('config_backup_retention', '365', 'Configuration backup retention in days'),
('secrets_backup_retention', '365', 'Secrets backup retention in days'),
('backup_storage_type', '"local"', 'Backup storage type (local, s3, gcs, azure)'),
('enable_encryption', 'true', 'Enable backup encryption'),
('enable_compression', 'true', 'Enable backup compression'),
('compression_level', '6', 'Backup compression level'),
('enable_backup_verification', 'true', 'Enable backup verification'),
('verification_interval', '24', 'Backup verification interval in hours'),
('enable_backup_notifications', 'true', 'Enable backup notifications'),
('notification_channels', '["email"]', 'Backup notification channels'),
('failure_notification_threshold', '3', 'Backup failure notification threshold')
ON CONFLICT (config_key) DO NOTHING;

-- Insert default disaster recovery plans
INSERT INTO disaster_recovery_plans (plan_id, name, description, priority, triggers, steps, estimated_recovery_time, enabled) VALUES
('database_failure', 'Database Failure Recovery', 'Recovery plan for database failures', 'critical', 
 '["database_unavailable", "database_corruption", "database_performance_degraded"]',
 '[
   {
     "id": "assess_database_status",
     "name": "Assess Database Status",
     "description": "Check database connectivity and status",
     "type": "notification",
     "order": 1,
     "timeout": 5,
     "retryCount": 3,
     "dependencies": [],
     "parameters": {"message": "Database failure detected, assessing status..."}
   },
   {
     "id": "restore_database_backup",
     "name": "Restore Database Backup",
     "description": "Restore from latest database backup",
     "type": "backup_restore",
     "order": 2,
     "timeout": 60,
     "retryCount": 2,
     "dependencies": ["assess_database_status"],
     "parameters": {"backupType": "database", "useLatest": true}
   },
   {
     "id": "verify_database_restore",
     "name": "Verify Database Restore",
     "description": "Verify database restore was successful",
     "type": "notification",
     "order": 3,
     "timeout": 10,
     "retryCount": 3,
     "dependencies": ["restore_database_backup"],
     "parameters": {"message": "Database restore completed, verifying..."}
   }
 ]', 90, true),

('function_failure', 'Function Failure Recovery', 'Recovery plan for Edge Function failures', 'high',
 '["function_deployment_failed", "function_runtime_error", "function_timeout"]',
 '[
   {
     "id": "assess_function_status",
     "name": "Assess Function Status",
     "description": "Check function deployment and runtime status",
     "type": "notification",
     "order": 1,
     "timeout": 5,
     "retryCount": 3,
     "dependencies": [],
     "parameters": {"message": "Function failure detected, assessing status..."}
   },
   {
     "id": "redeploy_functions",
     "name": "Redeploy Functions",
     "description": "Redeploy Edge Functions from backup",
     "type": "backup_restore",
     "order": 2,
     "timeout": 30,
     "retryCount": 2,
     "dependencies": ["assess_function_status"],
     "parameters": {"backupType": "function", "useLatest": true}
   },
   {
     "id": "verify_function_deployment",
     "name": "Verify Function Deployment",
     "description": "Verify function deployment was successful",
     "type": "notification",
     "order": 3,
     "timeout": 10,
     "retryCount": 3,
     "dependencies": ["redeploy_functions"],
     "parameters": {"message": "Function deployment completed, verifying..."}
   }
 ]', 45, true),

('config_corruption', 'Configuration Corruption Recovery', 'Recovery plan for configuration corruption', 'medium',
 '["config_validation_failed", "config_corruption_detected"]',
 '[
   {
     "id": "assess_config_status",
     "name": "Assess Configuration Status",
     "description": "Check configuration validity and corruption",
     "type": "notification",
     "order": 1,
     "timeout": 5,
     "retryCount": 3,
     "dependencies": [],
     "parameters": {"message": "Configuration corruption detected, assessing..."}
   },
   {
     "id": "restore_config_backup",
     "name": "Restore Configuration Backup",
     "description": "Restore configuration from backup",
     "type": "backup_restore",
     "order": 2,
     "timeout": 15,
     "retryCount": 2,
     "dependencies": ["assess_config_status"],
     "parameters": {"backupType": "config", "useLatest": true}
   },
   {
     "id": "restart_services",
     "name": "Restart Services",
     "description": "Restart services with restored configuration",
     "type": "service_restart",
     "order": 3,
     "timeout": 10,
     "retryCount": 2,
     "dependencies": ["restore_config_backup"],
     "parameters": {"services": ["monitoring", "scheduler", "content-automation"]}
   }
 ]', 30, true),

('secrets_compromise', 'Secrets Compromise Recovery', 'Recovery plan for secrets compromise', 'critical',
 '["secrets_compromise_detected", "unauthorized_access"]',
 '[
   {
     "id": "assess_security_breach",
     "name": "Assess Security Breach",
     "description": "Assess the scope of the security breach",
     "type": "notification",
     "order": 1,
     "timeout": 5,
     "retryCount": 3,
     "dependencies": [],
     "parameters": {"message": "Security breach detected, assessing scope..."}
   },
   {
     "id": "rotate_compromised_secrets",
     "name": "Rotate Compromised Secrets",
     "description": "Rotate all compromised secrets immediately",
     "type": "config_update",
     "order": 2,
     "timeout": 20,
     "retryCount": 2,
     "dependencies": ["assess_security_breach"],
     "parameters": {"rotateAll": true, "notifyUsers": true}
   },
   {
     "id": "restore_secrets_backup",
     "name": "Restore Secrets Backup",
     "description": "Restore secrets from secure backup",
     "type": "backup_restore",
     "order": 3,
     "timeout": 15,
     "retryCount": 2,
     "dependencies": ["rotate_compromised_secrets"],
     "parameters": {"backupType": "secrets", "useLatest": true}
   },
   {
     "id": "verify_security_restoration",
     "name": "Verify Security Restoration",
     "description": "Verify all secrets have been restored and secured",
     "type": "notification",
     "order": 4,
     "timeout": 10,
     "retryCount": 3,
     "dependencies": ["restore_secrets_backup"],
     "parameters": {"message": "Security restoration completed, verifying..."}
   }
 ]', 60, true)
ON CONFLICT (plan_id) DO NOTHING;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON backup_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON backup_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON restore_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON disaster_recovery_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON disaster_recovery_executions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON backup_verifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON backup_retention TO authenticated;

GRANT EXECUTE ON FUNCTION get_backup_config TO authenticated;
GRANT EXECUTE ON FUNCTION set_backup_config TO authenticated;
GRANT EXECUTE ON FUNCTION get_backup_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION get_restore_jobs TO authenticated;
GRANT EXECUTE ON FUNCTION get_disaster_recovery_plans TO authenticated;
GRANT EXECUTE ON FUNCTION get_disaster_recovery_executions TO authenticated;
GRANT EXECUTE ON FUNCTION get_backup_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION get_restore_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_backup_data TO authenticated;
GRANT EXECUTE ON FUNCTION get_backup_dashboard TO authenticated;

-- Grant service role permissions
GRANT ALL ON backup_config TO service_role;
GRANT ALL ON backup_jobs TO service_role;
GRANT ALL ON restore_jobs TO service_role;
GRANT ALL ON disaster_recovery_plans TO service_role;
GRANT ALL ON disaster_recovery_executions TO service_role;
GRANT ALL ON backup_verifications TO service_role;
GRANT ALL ON backup_retention TO service_role;

GRANT EXECUTE ON FUNCTION get_backup_config TO service_role;
GRANT EXECUTE ON FUNCTION set_backup_config TO service_role;
GRANT EXECUTE ON FUNCTION get_backup_jobs TO service_role;
GRANT EXECUTE ON FUNCTION get_restore_jobs TO service_role;
GRANT EXECUTE ON FUNCTION get_disaster_recovery_plans TO service_role;
GRANT EXECUTE ON FUNCTION get_disaster_recovery_executions TO service_role;
GRANT EXECUTE ON FUNCTION get_backup_statistics TO service_role;
GRANT EXECUTE ON FUNCTION get_restore_statistics TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_backup_data TO service_role;
GRANT EXECUTE ON FUNCTION get_backup_dashboard TO service_role;
