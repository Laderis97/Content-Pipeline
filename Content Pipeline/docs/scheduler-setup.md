# Scheduler Setup Guide

## Overview

This document provides comprehensive guidance on setting up and managing the pg_cron scheduler for the Content Pipeline system.

## Table of Contents

1. [Scheduler Overview](#scheduler-overview)
2. [Prerequisites](#prerequisites)
3. [Installation and Setup](#installation-and-setup)
4. [Cron Jobs Configuration](#cron-jobs-configuration)
5. [Scheduler Management](#scheduler-management)
6. [Monitoring and Troubleshooting](#monitoring-and-troubleshooting)
7. [Production Deployment](#production-deployment)
8. [API Reference](#api-reference)

## Scheduler Overview

The Content Pipeline system uses pg_cron to schedule and automate various maintenance and processing tasks. The scheduler ensures that content generation, cleanup, monitoring, and health checks run automatically at regular intervals.

### Key Features

- **Automated Content Processing**: Regular content generation and processing
- **System Maintenance**: Automated cleanup and archival of old data
- **Health Monitoring**: Regular health checks and system monitoring
- **Metrics Collection**: Automated collection of performance metrics
- **Error Recovery**: Automatic detection and recovery from failed jobs

### Scheduled Jobs

| Job Name | Schedule | Description | Function |
|----------|----------|-------------|----------|
| `content_pipeline_main` | `*/5 * * * *` | Main content automation | `trigger_content_automation()` |
| `content_pipeline_sweeper` | `*/15 * * * *` | Clean up stale jobs | `trigger_sweeper()` |
| `content_pipeline_monitor` | `0 * * * *` | System monitoring | `trigger_monitoring()` |
| `content_pipeline_metrics` | `*/30 * * * *` | Metrics collection | `trigger_metrics_collection()` |
| `content_pipeline_health` | `*/10 * * * *` | Health checks | `trigger_health_checks()` |
| `content_pipeline_cleanup` | `0 2 * * *` | Data cleanup | `trigger_cleanup()` |

## Prerequisites

### 1. Supabase Project

- Supabase project with Edge Functions enabled
- Service role key with appropriate permissions
- All required database tables and functions

### 2. Required Extensions

- `pg_cron` extension enabled
- `http` extension for making HTTP requests to Edge Functions

### 3. Environment Configuration

- All Edge Function URLs configured
- Service role key configured
- Required secrets stored in Supabase Vault

## Installation and Setup

### 1. Enable pg_cron Extension

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 2. Configure Application Settings

```sql
-- Set up application URLs and keys
ALTER SYSTEM SET app.content_automation_url = 'https://your-project.supabase.co/functions/v1/content-automation';
ALTER SYSTEM SET app.sweeper_url = 'https://your-project.supabase.co/functions/v1/sweeper';
ALTER SYSTEM SET app.monitor_url = 'https://your-project.supabase.co/functions/v1/monitor';
ALTER SYSTEM SET app.metrics_url = 'https://your-project.supabase.co/functions/v1/metrics';
ALTER SYSTEM SET app.health_url = 'https://your-project.supabase.co/functions/v1/health';
ALTER SYSTEM SET app.cleanup_url = 'https://your-project.supabase.co/functions/v1/cleanup';
ALTER SYSTEM SET app.service_role_key = 'your-service-role-key-here';

-- Reload configuration
SELECT pg_reload_conf();
```

### 3. Run Database Migration

```bash
# Apply the scheduler migration
supabase db push
```

### 4. Initialize Scheduler

```sql
-- Initialize and validate scheduler
SELECT * FROM initialize_scheduler();
```

## Cron Jobs Configuration

### 1. Main Content Automation Job

```sql
-- Schedule main content processing (every 5 minutes)
SELECT cron.schedule(
    'content_pipeline_main',
    '*/5 * * * *',
    'SELECT trigger_content_automation();'
);
```

**Purpose**: Processes pending content jobs and generates new content.

**Schedule**: Every 5 minutes
**Function**: `trigger_content_automation()`
**Edge Function**: `content-automation`

### 2. Sweeper Job

```sql
-- Schedule sweeper (every 15 minutes)
SELECT cron.schedule(
    'content_pipeline_sweeper',
    '*/15 * * * *',
    'SELECT trigger_sweeper();'
);
```

**Purpose**: Cleans up stale "processing" jobs that may have been abandoned.

**Schedule**: Every 15 minutes
**Function**: `trigger_sweeper()`
**Edge Function**: `sweeper`

### 3. Monitoring Job

```sql
-- Schedule monitoring (every hour)
SELECT cron.schedule(
    'content_pipeline_monitor',
    '0 * * * *',
    'SELECT trigger_monitoring();'
);
```

**Purpose**: Monitors system health and generates alerts for failures.

**Schedule**: Every hour at minute 0
**Function**: `trigger_monitoring()`
**Edge Function**: `monitor`

### 4. Metrics Collection Job

```sql
-- Schedule metrics collection (every 30 minutes)
SELECT cron.schedule(
    'content_pipeline_metrics',
    '*/30 * * * *',
    'SELECT trigger_metrics_collection();'
);
```

**Purpose**: Collects performance metrics and system statistics.

**Schedule**: Every 30 minutes
**Function**: `trigger_metrics_collection()`
**Edge Function**: `metrics`

### 5. Health Checks Job

```sql
-- Schedule health checks (every 10 minutes)
SELECT cron.schedule(
    'content_pipeline_health',
    '*/10 * * * *',
    'SELECT trigger_health_checks();'
);
```

**Purpose**: Performs health checks on all system components.

**Schedule**: Every 10 minutes
**Function**: `trigger_health_checks()`
**Edge Function**: `health`

### 6. Cleanup Job

```sql
-- Schedule cleanup (daily at 2 AM)
SELECT cron.schedule(
    'content_pipeline_cleanup',
    '0 2 * * *',
    'SELECT trigger_cleanup();'
);
```

**Purpose**: Cleans up old data and archives records.

**Schedule**: Daily at 2:00 AM
**Function**: `trigger_cleanup()`
**Edge Function**: `cleanup`

## Scheduler Management

### 1. View All Jobs

```sql
-- List all content pipeline cron jobs
SELECT * FROM manage_cron_jobs();
```

### 2. Get Job Status

```sql
-- Get overall scheduler status
SELECT * FROM get_cron_job_status();
```

### 3. Get Scheduler Health

```sql
-- Get detailed health information
SELECT * FROM get_scheduler_health();
```

### 4. Enable/Disable Jobs

```sql
-- Disable a job
SELECT * FROM toggle_cron_job('content_pipeline_main', false);

-- Enable a job
SELECT * FROM toggle_cron_job('content_pipeline_main', true);
```

### 5. Manual Job Triggers

```sql
-- Manually trigger content automation
SELECT trigger_content_automation();

-- Manually trigger sweeper
SELECT trigger_sweeper();

-- Manually trigger monitoring
SELECT trigger_monitoring();

-- Manually trigger metrics collection
SELECT trigger_metrics_collection();

-- Manually trigger health checks
SELECT trigger_health_checks();

-- Manually trigger cleanup
SELECT trigger_cleanup();
```

## Monitoring and Troubleshooting

### 1. Check Job Execution

```sql
-- Check recent job runs
SELECT 
    jr.job_id,
    jr.status,
    jr.started_at,
    jr.completed_at,
    jr.processing_time_ms,
    jr.error_message,
    jr.metadata->>'function' as function_name
FROM job_runs jr
WHERE jr.metadata->>'trigger_type' = 'scheduled'
ORDER BY jr.started_at DESC
LIMIT 10;
```

### 2. Check Sweeper Logs

```sql
-- Check sweeper activity
SELECT 
    timestamp,
    action,
    status,
    records_processed,
    duration_ms,
    error_details
FROM sweeper_logs
WHERE metadata->>'trigger_type' = 'scheduled'
ORDER BY timestamp DESC
LIMIT 10;
```

### 3. Check Monitoring Alerts

```sql
-- Check monitoring alerts
SELECT 
    timestamp,
    alert_type,
    severity,
    message,
    status
FROM monitoring_alerts
WHERE metadata->>'trigger_type' = 'scheduled'
ORDER BY timestamp DESC
LIMIT 10;
```

### 4. Check Health Checks

```sql
-- Check health check results
SELECT 
    timestamp,
    component,
    status,
    response_time_ms,
    details
FROM health_checks
WHERE metadata->>'trigger_type' = 'scheduled'
ORDER BY timestamp DESC
LIMIT 10;
```

### 5. Check Metrics Collection

```sql
-- Check metrics collection
SELECT 
    timestamp,
    metric_type,
    metric_name,
    metric_value,
    metric_unit
FROM metrics_data
WHERE metadata->>'trigger_type' = 'scheduled'
ORDER BY timestamp DESC
LIMIT 10;
```

### 6. Check Cleanup Logs

```sql
-- Check cleanup activity
SELECT 
    timestamp,
    operation_type,
    table_name,
    records_processed,
    records_deleted,
    duration_ms,
    status
FROM cleanup_logs
WHERE metadata->>'trigger_type' = 'scheduled'
ORDER BY timestamp DESC
LIMIT 10;
```

### Common Issues and Solutions

#### 1. Jobs Not Running

**Symptoms**: No recent entries in job_runs table
**Solutions**:
- Check if pg_cron extension is enabled
- Verify cron jobs are active: `SELECT * FROM cron.job WHERE jobname LIKE 'content_pipeline_%';`
- Check application settings: `SELECT name, setting FROM pg_settings WHERE name LIKE 'app.%';`

#### 2. Edge Function Errors

**Symptoms**: Error messages in job_runs table
**Solutions**:
- Verify Edge Function URLs are correct
- Check service role key is valid
- Ensure Edge Functions are deployed and accessible

#### 3. High Failure Rates

**Symptoms**: Many failed job runs
**Solutions**:
- Check system resources and performance
- Review error messages in job_runs table
- Verify external service availability (OpenAI, WordPress)

#### 4. Jobs Running Too Frequently

**Symptoms**: Jobs running more often than expected
**Solutions**:
- Check cron job schedules: `SELECT jobname, schedule FROM cron.job WHERE jobname LIKE 'content_pipeline_%';`
- Verify schedule format is correct
- Disable and re-enable jobs if needed

## Production Deployment

### 1. Environment Configuration

```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
export OPENAI_API_KEY="your-openai-api-key"
export WORDPRESS_URL="https://your-wordpress-site.com"
export WORDPRESS_USERNAME="content-bot"
export WORDPRESS_PASSWORD="your-wordpress-password"
```

### 2. Deploy Edge Functions

```bash
# Deploy all Edge Functions
supabase functions deploy content-automation
supabase functions deploy sweeper
supabase functions deploy monitor
supabase functions deploy metrics
supabase functions deploy health
supabase functions deploy cleanup
supabase functions deploy scheduler
```

### 3. Configure Production Settings

```sql
-- Update application settings for production
ALTER SYSTEM SET app.content_automation_url = 'https://your-project.supabase.co/functions/v1/content-automation';
ALTER SYSTEM SET app.sweeper_url = 'https://your-project.supabase.co/functions/v1/sweeper';
ALTER SYSTEM SET app.monitor_url = 'https://your-project.supabase.co/functions/v1/monitor';
ALTER SYSTEM SET app.metrics_url = 'https://your-project.supabase.co/functions/v1/metrics';
ALTER SYSTEM SET app.health_url = 'https://your-project.supabase.co/functions/v1/health';
ALTER SYSTEM SET app.cleanup_url = 'https://your-project.supabase.co/functions/v1/cleanup';
ALTER SYSTEM SET app.service_role_key = 'your-production-service-role-key';

-- Reload configuration
SELECT pg_reload_conf();
```

### 4. Initialize Production Scheduler

```sql
-- Initialize scheduler and verify all jobs
SELECT * FROM initialize_scheduler();

-- Check scheduler health
SELECT * FROM get_scheduler_health();
```

### 5. Set Up Monitoring

- Configure alerting for job failures
- Set up dashboards for scheduler metrics
- Monitor Edge Function performance
- Track system resource usage

## API Reference

### Scheduler Management API

#### Get Scheduler Status

```http
GET /functions/v1/scheduler?action=status
```

**Response**:
```json
{
  "success": true,
  "data": {
    "total_jobs": 6,
    "active_jobs": 6,
    "failed_jobs": 0,
    "last_run": "2024-01-01T12:00:00Z",
    "next_run": "2024-01-01T12:05:00Z"
  }
}
```

#### Get All Jobs

```http
GET /functions/v1/scheduler?action=jobs
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "job_name": "content_pipeline_main",
        "schedule": "*/5 * * * *",
        "command": "SELECT trigger_content_automation();",
        "active": true,
        "last_run": "2024-01-01T12:00:00Z",
        "next_run": "2024-01-01T12:05:00Z"
      }
    ],
    "count": 6
  }
}
```

#### Get Scheduler Health

```http
GET /functions/v1/scheduler?action=health
```

**Response**:
```json
{
  "success": true,
  "data": {
    "health": [
      {
        "component": "content_pipeline_main",
        "status": "healthy",
        "last_run": "2024-01-01T12:00:00Z",
        "next_run": "2024-01-01T12:05:00Z",
        "error_count": 0,
        "success_rate": 100.0
      }
    ],
    "summary": {
      "total_jobs": 6,
      "healthy_jobs": 6,
      "inactive_jobs": 0,
      "overall_health": 100.0
    }
  }
}
```

#### Toggle Job

```http
POST /functions/v1/scheduler?action=toggle&job=content_pipeline_main&enable=false
```

**Response**:
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Job disabled: content_pipeline_main"
  }
}
```

#### Trigger Job

```http
POST /functions/v1/scheduler?action=trigger&job=content_pipeline_main
```

**Response**:
```json
{
  "success": true,
  "data": {
    "job_name": "content_pipeline_main",
    "function": "trigger_content_automation"
  }
}
```

### Database Functions

#### `trigger_content_automation()`
Triggers the main content automation Edge Function.

#### `trigger_sweeper()`
Triggers the sweeper Edge Function to clean up stale jobs.

#### `trigger_monitoring()`
Triggers the monitoring Edge Function for system health checks.

#### `trigger_metrics_collection()`
Triggers the metrics collection Edge Function.

#### `trigger_health_checks()`
Triggers the health checks Edge Function.

#### `trigger_cleanup()`
Triggers the cleanup Edge Function for data archival.

#### `manage_cron_jobs()`
Lists all content pipeline cron jobs.

#### `get_cron_job_status()`
Gets the status of all cron jobs.

#### `toggle_cron_job(job_name, enable)`
Enables or disables a specific cron job.

#### `initialize_scheduler()`
Initializes and validates the scheduler configuration.

#### `get_scheduler_health()`
Gets the health status of the scheduler system.

## Conclusion

The pg_cron scheduler provides reliable, automated execution of all Content Pipeline maintenance and processing tasks. By following this guide, you can ensure that your system runs smoothly with minimal manual intervention.

For additional support or questions, please refer to the pg_cron documentation or contact the development team.
