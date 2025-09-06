# Scheduler & Automation Configuration

This document outlines the automated scheduling configuration for the Content Pipeline system.

## Overview

The Content Pipeline system uses pg_cron for automated job processing and scheduling. All scheduled jobs are configured to run at specific intervals to ensure continuous content generation and system maintenance.

## Scheduled Jobs Configuration

### 1. Content Processing Jobs

#### Main Content Processing
- **Job Name**: `content_processing_main`
- **Schedule**: Every 30 minutes (`*/30 * * * *`)
- **Function**: `content-automation`
- **Purpose**: Process single content generation jobs
- **Parameters**: `{"mode": "single"}`

#### Concurrent Content Processing
- **Job Name**: `content_processing_concurrent`
- **Schedule**: Every 15 minutes (`*/15 * * * *`)
- **Function**: `concurrent-content-processor`
- **Purpose**: Process multiple jobs concurrently
- **Parameters**: `{"max_jobs": 5}`

### 2. Monitoring Jobs

#### Health Monitoring
- **Job Name**: `health_monitoring`
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Function**: `health`
- **Purpose**: System health checks and monitoring
- **Parameters**: `{}`

#### Performance Monitoring
- **Job Name**: `performance_monitoring`
- **Schedule**: Every 10 minutes (`*/10 * * * *`)
- **Function**: `performance-monitor`
- **Purpose**: Collect performance metrics
- **Parameters**: `{}`

#### System Monitoring
- **Job Name**: `system_monitoring`
- **Schedule**: Every 15 minutes (`*/15 * * * *`)
- **Function**: `monitoring`
- **Purpose**: System monitoring and alerting
- **Parameters**: `{}`

### 3. Maintenance Jobs

#### Cleanup & Maintenance
- **Job Name**: `cleanup_maintenance`
- **Schedule**: Every hour (`0 * * * *`)
- **Function**: `cleanup`
- **Purpose**: Data cleanup and system maintenance
- **Parameters**: `{}`

#### Sweeper for Stale Jobs
- **Job Name**: `sweeper_stale_jobs`
- **Schedule**: Every 30 minutes (`*/30 * * * *`)
- **Function**: `sweeper`
- **Purpose**: Clean up stale and stuck jobs
- **Parameters**: `{}`

#### Metrics Collection
- **Job Name**: `metrics_collection`
- **Schedule**: Every 5 minutes (`*/5 * * * *`)
- **Function**: `metrics`
- **Purpose**: Collect and store system metrics
- **Parameters**: `{}`

#### Scheduler Health Check
- **Job Name**: `scheduler_health_check`
- **Schedule**: Every hour (`0 * * * *`)
- **Function**: `scheduler`
- **Purpose**: Scheduler system health check
- **Parameters**: `{}`

## Manual Setup Instructions

Since pg_cron jobs need to be set up manually in the Supabase Dashboard, follow these steps:

### 1. Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `zjqsfdqhhvhbwqmgdfzn`
3. Navigate to **Database** → **Extensions**
4. Ensure `pg_cron` extension is enabled

### 2. Set up pg_cron Jobs
1. Go to **Database** → **SQL Editor**
2. Run the following SQL commands to create scheduled jobs:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Main content processing (every 30 minutes)
SELECT cron.schedule(
    'content_processing_main',
    '*/30 * * * *',
    'SELECT net.http_post(
        url := ''https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/content-automation'',
        headers := ''{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA", "Content-Type": "application/json"}''::jsonb,
        body := ''{"mode": "single"}''::jsonb
    );'
);

-- Concurrent content processing (every 15 minutes)
SELECT cron.schedule(
    'content_processing_concurrent',
    '*/15 * * * *',
    'SELECT net.http_post(
        url := ''https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/concurrent-content-processor'',
        headers := ''{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA", "Content-Type": "application/json"}''::jsonb,
        body := ''{"max_jobs": 5}''::jsonb
    );'
);

-- Health monitoring (every 5 minutes)
SELECT cron.schedule(
    'health_monitoring',
    '*/5 * * * *',
    'SELECT net.http_post(
        url := ''https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/health'',
        headers := ''{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA", "Content-Type": "application/json"}''::jsonb,
        body := ''{}''::jsonb
    );'
);

-- Performance monitoring (every 10 minutes)
SELECT cron.schedule(
    'performance_monitoring',
    '*/10 * * * *',
    'SELECT net.http_post(
        url := ''https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/performance-monitor'',
        headers := ''{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA", "Content-Type": "application/json"}''::jsonb,
        body := ''{}''::jsonb
    );'
);

-- System monitoring (every 15 minutes)
SELECT cron.schedule(
    'system_monitoring',
    '*/15 * * * *',
    'SELECT net.http_post(
        url := ''https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/monitoring'',
        headers := ''{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA", "Content-Type": "application/json"}''::jsonb,
        body := ''{}''::jsonb
    );'
);

-- Cleanup and maintenance (every hour)
SELECT cron.schedule(
    'cleanup_maintenance',
    '0 * * * *',
    'SELECT net.http_post(
        url := ''https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/cleanup'',
        headers := ''{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA", "Content-Type": "application/json"}''::jsonb,
        body := ''{}''::jsonb
    );'
);

-- Sweeper for stale jobs (every 30 minutes)
SELECT cron.schedule(
    'sweeper_stale_jobs',
    '*/30 * * * *',
    'SELECT net.http_post(
        url := ''https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/sweeper'',
        headers := ''{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA", "Content-Type": "application/json"}''::jsonb,
        body := ''{}''::jsonb
    );'
);

-- Metrics collection (every 5 minutes)
SELECT cron.schedule(
    'metrics_collection',
    '*/5 * * * *',
    'SELECT net.http_post(
        url := ''https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/metrics'',
        headers := ''{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA", "Content-Type": "application/json"}''::jsonb,
        body := ''{}''::jsonb
    );'
);

-- Scheduler health check (every hour)
SELECT cron.schedule(
    'scheduler_health_check',
    '0 * * * *',
    'SELECT net.http_post(
        url := ''https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/scheduler'',
        headers := ''{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzA0NjU4MywiZXhwIjoyMDcyNjIyNTgzfQ.FRhP9rFr5QNiHMqdbSFsdNkO1EZI1ciWRBVFtqLLSKA", "Content-Type": "application/json"}''::jsonb,
        body := ''{}''::jsonb
    );'
);
```

### 3. Verify Job Setup
1. Check that all jobs are created by running:
```sql
SELECT * FROM cron.job;
```

2. Monitor job execution by running:
```sql
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Schedule Summary

| Job Type | Frequency | Purpose |
|----------|-----------|---------|
| Content Processing | Every 30 minutes | Main content generation |
| Concurrent Processing | Every 15 minutes | Multiple job processing |
| Health Monitoring | Every 5 minutes | System health checks |
| Performance Monitoring | Every 10 minutes | Performance metrics |
| System Monitoring | Every 15 minutes | System monitoring |
| Cleanup & Maintenance | Every hour | Data cleanup |
| Sweeper | Every 30 minutes | Stale job cleanup |
| Metrics Collection | Every 5 minutes | Metrics collection |
| Scheduler Health | Every hour | Scheduler health check |

## Monitoring and Maintenance

### Job Status Monitoring
- Monitor job execution in Supabase Dashboard
- Check for failed jobs and errors
- Review performance metrics regularly

### Troubleshooting
- If jobs fail, check function logs in Supabase Dashboard
- Verify API keys and permissions
- Check database connectivity
- Review function error logs

### Performance Optimization
- Adjust schedules based on system load
- Monitor resource usage
- Optimize job parameters as needed
- Scale concurrent processing based on demand

## Security Considerations

- All scheduled jobs use service role authentication
- API keys are securely stored in Supabase Vault
- Jobs run with appropriate permissions
- Regular security audits recommended

## Backup and Recovery

- Job configurations are stored in database
- Regular backups of cron job configurations
- Disaster recovery procedures documented
- Manual job execution capabilities available
