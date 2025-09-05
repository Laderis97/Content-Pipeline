# Admin Operations Guide - Manual Retry & System Management

This guide provides comprehensive procedures for administrative operations, manual retry capabilities, and system management for the Content Pipeline.

## 🎯 Overview

The Content Pipeline includes robust admin capabilities for manual intervention, retry operations, and system management. This guide covers all administrative functions available to system administrators and authorized users.

## 🔐 Admin Authentication

### Service Role Access

Admin operations require service role authentication:

```bash
# Set your service role key
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# Or use in curl commands
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "admin_operation"}'
```

### Admin User Verification

All admin operations are logged with user identification:

```sql
-- View admin actions
SELECT admin_user, action, job_id, created_at, ip_address
FROM admin_retry_audit_log
ORDER BY created_at DESC
LIMIT 20;
```

## 🔄 Manual Retry Operations

### 1. Retry Failed Jobs

#### Single Job Retry

**Identify Failed Job:**
```sql
-- Find failed jobs
SELECT id, topic, status, last_error, retry_count, created_at
FROM content_jobs
WHERE status = 'error'
ORDER BY created_at DESC;
```

**Retry Specific Job:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "admin_retry",
    "job_id": "job-uuid-here",
    "admin_user": "admin@example.com",
    "reason": "Manual retry after error resolution"
  }'
```

**Verify Retry Success:**
```sql
-- Check job status after retry
SELECT id, status, retry_count, last_error, updated_at
FROM content_jobs
WHERE id = 'job-uuid-here';
```

#### Bulk Job Retry

**Retry Multiple Failed Jobs:**
```bash
# Get list of failed job IDs
curl -X GET https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "list_failed_jobs"}'

# Retry multiple jobs
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "bulk_retry",
    "job_ids": ["job-uuid-1", "job-uuid-2", "job-uuid-3"],
    "admin_user": "admin@example.com",
    "reason": "Bulk retry after system maintenance"
  }'
```

### 2. Reset Stuck Jobs

#### Jobs Stuck in Processing

**Identify Stuck Jobs:**
```sql
-- Find jobs stuck in processing for more than 10 minutes
SELECT id, topic, status, claimed_at, created_at
FROM content_jobs
WHERE status = 'processing'
AND claimed_at < NOW() - INTERVAL '10 minutes';
```

**Reset Stuck Jobs:**
```bash
# Run sweeper to reset all stuck jobs
curl -X POST https://your-project.supabase.co/functions/v1/sweeper \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Or reset specific stuck job
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "reset_stuck_job",
    "job_id": "job-uuid-here",
    "admin_user": "admin@example.com"
  }'
```

### 3. Override Retry Limits

#### Force Retry Beyond Limits

**Check Current Retry Count:**
```sql
SELECT id, topic, retry_count, last_error
FROM content_jobs
WHERE id = 'job-uuid-here';
```

**Force Retry:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "force_retry",
    "job_id": "job-uuid-here",
    "admin_user": "admin@example.com",
    "reason": "Force retry after external issue resolution",
    "override_retry_limit": true
  }'
```

## 📊 Job Management Operations

### 1. Job Status Management

#### Update Job Status

**Change Job Status:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_job_status",
    "job_id": "job-uuid-here",
    "new_status": "pending",
    "admin_user": "admin@example.com",
    "reason": "Reset job for reprocessing"
  }'
```

**Available Status Values:**
- `pending`: Job is waiting to be processed
- `processing`: Job is currently being processed
- `completed`: Job completed successfully
- `error`: Job failed with an error
- `cancelled`: Job was cancelled by admin

#### Cancel Jobs

**Cancel Specific Job:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cancel_job",
    "job_id": "job-uuid-here",
    "admin_user": "admin@example.com",
    "reason": "Job cancelled due to topic change"
  }'
```

**Cancel Multiple Jobs:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "bulk_cancel",
    "job_ids": ["job-uuid-1", "job-uuid-2"],
    "admin_user": "admin@example.com",
    "reason": "Bulk cancellation for topic update"
  }'
```

### 2. Job Content Management

#### Update Job Content

**Modify Job Parameters:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_job_content",
    "job_id": "job-uuid-here",
    "updates": {
      "topic": "Updated topic name",
      "prompt_template": "Updated prompt template",
      "tags": ["new", "tags"],
      "categories": ["Updated Category"]
    },
    "admin_user": "admin@example.com",
    "reason": "Content update after review"
  }'
```

#### Regenerate Content

**Force Content Regeneration:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "regenerate_content",
    "job_id": "job-uuid-here",
    "admin_user": "admin@example.com",
    "reason": "Regenerate content with different approach"
  }'
```

## 🔧 System Management Operations

### 1. Scheduler Management

#### Pause/Resume Scheduler

**Pause Job Processing:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/scheduler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "pause_scheduler",
    "admin_user": "admin@example.com",
    "reason": "System maintenance"
  }'
```

**Resume Job Processing:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/scheduler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "resume_scheduler",
    "admin_user": "admin@example.com",
    "reason": "System maintenance completed"
  }'
```

**Check Scheduler Status:**
```bash
curl -X GET https://your-project.supabase.co/functions/v1/scheduler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

#### Update Scheduler Configuration

**Modify Processing Schedule:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/scheduler \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_schedule",
    "schedule_config": {
      "interval_minutes": 30,
      "max_concurrent_jobs": 5,
      "processing_window": {
        "start_hour": 9,
        "end_hour": 17
      }
    },
    "admin_user": "admin@example.com",
    "reason": "Adjust processing schedule for peak hours"
  }'
```

### 2. Configuration Management

#### Update System Configuration

**Modify Global Settings:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/config-manager \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_config",
    "config_updates": {
      "max_retry_count": 5,
      "content_target_words": 800,
      "default_model": "gpt-4",
      "rate_limit_per_minute": 60
    },
    "admin_user": "admin@example.com",
    "reason": "Update system configuration"
  }'
```

**View Current Configuration:**
```bash
curl -X GET https://your-project.supabase.co/functions/v1/config-manager \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### 3. Monitoring & Alerting Management

#### Update Alert Thresholds

**Modify Alert Settings:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/monitoring \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_alert_thresholds",
    "thresholds": {
      "failure_rate_warning": 10,
      "failure_rate_critical": 20,
      "response_time_warning": 3000,
      "response_time_critical": 5000
    },
    "admin_user": "admin@example.com",
    "reason": "Adjust alert sensitivity"
  }'
```

#### Test Alerting System

**Trigger Test Alert:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/alerting-test \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test_alert",
    "alert_type": "failure_rate",
    "admin_user": "admin@example.com"
  }'
```

## 🧹 Maintenance Operations

### 1. Data Cleanup

#### Clean Old Job Runs

**Archive Old Execution Logs:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/cleanup \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cleanup_job_runs",
    "retention_days": 90,
    "admin_user": "admin@example.com",
    "reason": "Regular maintenance cleanup"
  }'
```

#### Clean Failed Jobs

**Remove Old Failed Jobs:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/cleanup \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "cleanup_failed_jobs",
    "retention_days": 30,
    "admin_user": "admin@example.com",
    "reason": "Cleanup old failed jobs"
  }'
```

### 2. Performance Optimization

#### Rebuild Database Indexes

**Optimize Database Performance:**
```sql
-- Rebuild indexes for better performance
REINDEX TABLE content_jobs;
REINDEX TABLE job_runs;
REINDEX TABLE admin_retry_audit_log;

-- Update table statistics
ANALYZE content_jobs;
ANALYZE job_runs;
ANALYZE admin_retry_audit_log;
```

#### Clear Function Cache

**Reset Function Cache:**
```bash
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "clear_cache",
    "admin_user": "admin@example.com",
    "reason": "Clear function cache for performance"
  }'
```

## 📋 Admin Operation Checklists

### Pre-Operation Checklist

- [ ] Verify admin user authentication
- [ ] Check system health status
- [ ] Review current job queue status
- [ ] Confirm operation is necessary
- [ ] Document reason for operation
- [ ] Notify relevant team members if needed

### Post-Operation Checklist

- [ ] Verify operation completed successfully
- [ ] Check system health after operation
- [ ] Review operation logs
- [ ] Update documentation if needed
- [ ] Monitor system for any issues
- [ ] Document lessons learned

### Emergency Operation Checklist

- [ ] Assess urgency and impact
- [ ] Notify stakeholders immediately
- [ ] Document emergency situation
- [ ] Execute operation with extra caution
- [ ] Monitor system closely after operation
- [ ] Conduct post-incident review

## 🔍 Troubleshooting Admin Operations

### Common Admin Operation Issues

#### Operation Not Authorized

**Error: "Insufficient permissions"**
```bash
# Check service role key
echo $SUPABASE_SERVICE_ROLE_KEY

# Verify key is correct
curl -X GET https://your-project.supabase.co/functions/v1/health \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

#### Job Not Found

**Error: "Job not found"**
```sql
-- Verify job exists
SELECT id, topic, status, created_at
FROM content_jobs
WHERE id = 'job-uuid-here';
```

#### Operation Failed

**Error: "Operation failed"**
```bash
# Check system logs
curl -X GET https://your-project.supabase.co/functions/v1/monitoring \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"

# Review recent errors
curl -X GET https://your-project.supabase.co/functions/v1/health \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### Debugging Admin Operations

#### Enable Debug Mode

```bash
# Set debug mode
supabase secrets set DEBUG_MODE=true

# Run operation with debug info
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "admin_retry",
    "job_id": "job-uuid-here",
    "admin_user": "admin@example.com",
    "debug": true
  }'
```

#### Review Operation Logs

```sql
-- Check admin operation logs
SELECT admin_user, action, job_id, reason, created_at, ip_address
FROM admin_retry_audit_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Check job status changes
SELECT job_id, old_status, new_status, changed_at, changed_by
FROM job_status_history
WHERE changed_at >= NOW() - INTERVAL '24 hours'
ORDER BY changed_at DESC;
```

## 📊 Admin Operation Reports

### Daily Admin Report

```sql
-- Generate daily admin activity report
SELECT 
  DATE(created_at) as date,
  admin_user,
  action,
  COUNT(*) as operation_count
FROM admin_retry_audit_log
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), admin_user, action
ORDER BY date DESC, operation_count DESC;
```

### Weekly System Report

```sql
-- Generate weekly system performance report
SELECT 
  DATE_TRUNC('week', execution_time) as week,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'error') as failed_jobs,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time
FROM job_runs
WHERE execution_time >= NOW() - INTERVAL '4 weeks'
GROUP BY DATE_TRUNC('week', execution_time)
ORDER BY week DESC;
```

## 🚨 Emergency Procedures

### System Emergency Response

1. **Immediate Assessment**
   - Check system health status
   - Identify affected components
   - Assess impact on operations

2. **Emergency Actions**
   - Pause scheduler if needed
   - Reset stuck jobs
   - Notify stakeholders

3. **Recovery Procedures**
   - Restore system functionality
   - Verify operations
   - Monitor for stability

4. **Post-Emergency Review**
   - Document incident
   - Identify root cause
   - Update procedures

---

**Last Updated:** [Current Date]
**Version:** 1.0
**Next Review:** [Next Review Date]
**Approved By:** [System Administrator]
