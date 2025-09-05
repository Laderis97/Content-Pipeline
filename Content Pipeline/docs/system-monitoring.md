# System Monitoring & Maintenance Procedures

This document outlines comprehensive monitoring procedures, maintenance tasks, and operational procedures for the Content Pipeline system.

## 📊 Monitoring Overview

The Content Pipeline system includes comprehensive monitoring capabilities to ensure optimal performance, reliability, and early detection of issues. This document provides detailed procedures for monitoring system health, performance metrics, and maintenance tasks.

## 🔍 Monitoring Components

### 1. Health Monitoring

#### System Health Checks

**Automated Health Monitoring:**
- Runs every hour via pg_cron scheduler
- Checks all system components
- Reports overall system status
- Triggers alerts for critical issues

**Manual Health Check:**
```bash
# Check overall system health
curl -X GET https://your-project.supabase.co/functions/v1/health

# Response includes:
# - Database connectivity
# - External API status (OpenAI, WordPress)
# - Function availability
# - Performance metrics
```

**Health Check Components:**
- Database connection status
- OpenAI API connectivity
- WordPress site accessibility
- Edge Function availability
- Performance metrics
- Error rates

#### Health Status Levels

**Green (Healthy):**
- All components operational
- Response times within limits
- Error rates below thresholds
- No critical issues detected

**Yellow (Warning):**
- Minor performance degradation
- Some non-critical errors
- Response times approaching limits
- Requires monitoring

**Red (Critical):**
- Component failures
- High error rates
- Performance issues
- Immediate attention required

### 2. Performance Monitoring

#### Key Performance Metrics

**Response Time Monitoring:**
```sql
-- Check average response times
SELECT 
  DATE(execution_time) as date,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_response_time,
  MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) as max_response_time,
  COUNT(*) as total_jobs
FROM job_runs
WHERE execution_time >= NOW() - INTERVAL '7 days'
GROUP BY DATE(execution_time)
ORDER BY date DESC;
```

**Performance Thresholds:**
- **Target Response Time**: <2 seconds
- **Warning Threshold**: >3 seconds
- **Critical Threshold**: >5 seconds

#### Concurrent Processing Monitoring

**Monitor Concurrent Job Processing:**
```sql
-- Check concurrent job processing
SELECT 
  COUNT(*) FILTER (WHERE status = 'processing') as active_jobs,
  COUNT(*) FILTER (WHERE status = 'pending') as pending_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_today,
  COUNT(*) FILTER (WHERE status = 'error') as failed_today
FROM content_jobs
WHERE created_at >= NOW() - INTERVAL '24 hours';
```

**Concurrent Processing Limits:**
- **Maximum Concurrent Jobs**: 5
- **Warning Threshold**: 4 concurrent jobs
- **Critical Threshold**: 5+ concurrent jobs

### 3. Error Rate Monitoring

#### Daily Failure Rate Calculation

**Automated Failure Rate Monitoring:**
- Calculated daily at midnight
- Compares failed vs. total jobs
- Triggers alerts if >20% failure rate
- Logs failure rate trends

**Manual Failure Rate Check:**
```sql
-- Calculate daily failure rate
SELECT 
  DATE(execution_time) as date,
  COUNT(*) FILTER (WHERE status = 'error') as failed_jobs,
  COUNT(*) as total_jobs,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*), 2
  ) as failure_rate_percent
FROM job_runs
WHERE execution_time >= NOW() - INTERVAL '7 days'
GROUP BY DATE(execution_time)
ORDER BY date DESC;
```

**Failure Rate Thresholds:**
- **Target**: <5% daily failure rate
- **Warning**: 5-10% daily failure rate
- **Critical**: >20% daily failure rate

#### Error Pattern Analysis

**Analyze Error Types:**
```sql
-- Categorize errors by type
SELECT 
  CASE 
    WHEN last_error LIKE '%OpenAI%' THEN 'OpenAI API Error'
    WHEN last_error LIKE '%WordPress%' THEN 'WordPress Error'
    WHEN last_error LIKE '%timeout%' THEN 'Timeout Error'
    WHEN last_error LIKE '%auth%' THEN 'Authentication Error'
    ELSE 'Other Error'
  END as error_category,
  COUNT(*) as error_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as percentage
FROM content_jobs
WHERE status = 'error'
AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY error_category
ORDER BY error_count DESC;
```

### 4. Resource Monitoring

#### Database Performance

**Monitor Database Connections:**
```sql
-- Check active connections
SELECT 
  state,
  COUNT(*) as connection_count
FROM pg_stat_activity
WHERE datname = current_database()
GROUP BY state;
```

**Monitor Database Performance:**
```sql
-- Check slow queries
SELECT 
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements
WHERE mean_time > 1000  -- Queries taking more than 1 second
ORDER BY mean_time DESC
LIMIT 10;
```

#### Function Performance

**Monitor Edge Function Performance:**
```bash
# Check function metrics
curl -X GET https://your-project.supabase.co/functions/v1/metrics

# Check performance monitor
curl -X GET https://your-project.supabase.co/functions/v1/performance-monitor
```

## 🚨 Alerting System

### 1. Alert Types

#### Critical Alerts

**High Failure Rate Alert:**
- Triggered when daily failure rate >20%
- Sent immediately to admin team
- Requires immediate investigation
- Escalates if not resolved within 1 hour

**System Down Alert:**
- Triggered when health check fails
- Sent to on-call engineer
- Requires immediate response
- Escalates if not resolved within 30 minutes

**Performance Degradation Alert:**
- Triggered when response time >5 seconds
- Sent to admin team
- Requires investigation within 2 hours
- Escalates if not resolved within 4 hours

#### Warning Alerts

**Elevated Failure Rate:**
- Triggered when daily failure rate 10-20%
- Sent to admin team
- Requires investigation within 4 hours

**Performance Warning:**
- Triggered when response time 3-5 seconds
- Sent to admin team
- Requires investigation within 8 hours

**Resource Usage Warning:**
- Triggered when database connections >80% of limit
- Sent to admin team
- Requires investigation within 8 hours

### 2. Alert Configuration

#### Alert Thresholds

**Configurable Alert Settings:**
```bash
# Update alert thresholds
curl -X POST https://your-project.supabase.co/functions/v1/monitoring \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update_alert_thresholds",
    "thresholds": {
      "failure_rate_warning": 10,
      "failure_rate_critical": 20,
      "response_time_warning": 3000,
      "response_time_critical": 5000,
      "concurrent_jobs_warning": 4,
      "concurrent_jobs_critical": 5
    }
  }'
```

#### Alert Channels

**Notification Methods:**
- Email notifications to admin team
- Slack notifications to operations channel
- SMS alerts for critical issues
- Dashboard notifications

**Alert Recipients:**
- **Critical Alerts**: On-call engineer + admin team
- **Warning Alerts**: Admin team
- **Info Alerts**: Admin team (daily digest)

### 3. Alert Testing

#### Test Alert System

**Test Alert Functionality:**
```bash
# Test failure rate alert
curl -X POST https://your-project.supabase.co/functions/v1/alerting-test \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "test_alert",
    "alert_type": "failure_rate",
    "test_level": "critical"
  }'
```

**Verify Alert Delivery:**
- Check email delivery
- Verify Slack notifications
- Test SMS alerts
- Confirm dashboard updates

## 🔧 Maintenance Procedures

### 1. Daily Maintenance Tasks

#### Automated Daily Tasks

**Scheduled Maintenance (via pg_cron):**
- Health checks every hour
- Failure rate calculation at midnight
- Performance metrics collection
- Error log analysis
- Database statistics update

**Manual Daily Verification:**
```bash
# Check system status
curl -X GET https://your-project.supabase.co/functions/v1/health

# Review error logs
curl -X GET https://your-project.supabase.co/functions/v1/monitoring

# Check performance metrics
curl -X GET https://your-project.supabase.co/functions/v1/metrics
```

#### Daily Checklist

- [ ] Review system health status
- [ ] Check for any critical alerts
- [ ] Review error logs and patterns
- [ ] Verify performance metrics
- [ ] Check database performance
- [ ] Review external API status
- [ ] Monitor concurrent job processing
- [ ] Verify alert system functionality

### 2. Weekly Maintenance Tasks

#### Performance Review

**Weekly Performance Analysis:**
```sql
-- Weekly performance summary
SELECT 
  DATE_TRUNC('week', execution_time) as week,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'error') as failed_jobs,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*), 2
  ) as failure_rate,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_response_time,
  MAX(EXTRACT(EPOCH FROM (completed_at - started_at))) as max_response_time
FROM job_runs
WHERE execution_time >= NOW() - INTERVAL '4 weeks'
GROUP BY DATE_TRUNC('week', execution_time)
ORDER BY week DESC;
```

**Database Maintenance:**
```sql
-- Update table statistics
ANALYZE content_jobs;
ANALYZE job_runs;
ANALYZE admin_retry_audit_log;

-- Check index usage
SELECT 
  schemaname, 
  tablename, 
  indexname, 
  idx_scan, 
  idx_tup_read, 
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

#### Weekly Checklist

- [ ] Review weekly performance metrics
- [ ] Analyze error patterns and trends
- [ ] Check database performance and indexes
- [ ] Review alert system effectiveness
- [ ] Update monitoring documentation
- [ ] Plan upcoming maintenance tasks
- [ ] Review system capacity and scaling needs

### 3. Monthly Maintenance Tasks

#### Comprehensive System Review

**Monthly Performance Report:**
```sql
-- Monthly system performance report
SELECT 
  DATE_TRUNC('month', execution_time) as month,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'error') as failed_jobs,
  ROUND(
    COUNT(*) FILTER (WHERE status = 'error') * 100.0 / COUNT(*), 2
  ) as failure_rate,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_response_time,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at))) as p95_response_time
FROM job_runs
WHERE execution_time >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', execution_time)
ORDER BY month DESC;
```

**Security Review:**
```sql
-- Review admin actions
SELECT 
  admin_user,
  action,
  COUNT(*) as action_count,
  MAX(created_at) as last_action
FROM admin_retry_audit_log
WHERE created_at >= NOW() - INTERVAL '1 month'
GROUP BY admin_user, action
ORDER BY action_count DESC;
```

#### Monthly Checklist

- [ ] Generate comprehensive performance report
- [ ] Review security logs and admin actions
- [ ] Plan secret rotation schedule
- [ ] Review and update monitoring thresholds
- [ ] Conduct capacity planning review
- [ ] Update system documentation
- [ ] Review and test disaster recovery procedures
- [ ] Plan system upgrades and improvements

### 4. Quarterly Maintenance Tasks

#### System Optimization

**Quarterly Performance Optimization:**
```sql
-- Rebuild indexes for optimal performance
REINDEX TABLE content_jobs;
REINDEX TABLE job_runs;
REINDEX TABLE admin_retry_audit_log;

-- Update table statistics
ANALYZE content_jobs;
ANALYZE job_runs;
ANALYZE admin_retry_audit_log;
```

**Capacity Planning:**
```sql
-- Analyze growth trends
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as jobs_created,
  COUNT(*) FILTER (WHERE status = 'completed') as jobs_completed,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_processing_time
FROM content_jobs
WHERE created_at >= NOW() - INTERVAL '12 months'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

#### Quarterly Checklist

- [ ] Rotate all API keys and secrets
- [ ] Conduct comprehensive security review
- [ ] Review and update system architecture
- [ ] Plan system scaling and improvements
- [ ] Review vendor relationships and contracts
- [ ] Update disaster recovery procedures
- [ ] Conduct team training and knowledge transfer
- [ ] Review and update operational procedures

## 📈 Monitoring Dashboards

### 1. Real-Time Dashboard

**Key Metrics Display:**
- Current system health status
- Active job count and status
- Recent error rates
- Response time trends
- External API status
- Alert status

**Dashboard Access:**
```bash
# Get real-time dashboard data
curl -X GET https://your-project.supabase.co/functions/v1/monitoring \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

### 2. Historical Dashboard

**Historical Metrics:**
- Daily/weekly/monthly performance trends
- Error rate patterns over time
- Response time distributions
- Resource usage trends
- Alert frequency and resolution times

**Historical Data Access:**
```sql
-- Get historical performance data
SELECT 
  DATE(execution_time) as date,
  COUNT(*) as total_jobs,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_jobs,
  COUNT(*) FILTER (WHERE status = 'error') as failed_jobs,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_response_time
FROM job_runs
WHERE execution_time >= NOW() - INTERVAL '30 days'
GROUP BY DATE(execution_time)
ORDER BY date DESC;
```

## 🔧 Troubleshooting Monitoring Issues

### 1. Monitoring System Failures

#### Health Check Failures

**Diagnose Health Check Issues:**
```bash
# Check individual components
curl -X GET https://your-project.supabase.co/functions/v1/health

# Check database connectivity
curl -X GET https://your-project.supabase.co/functions/v1/health \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"component": "database"}'

# Check external API status
curl -X GET https://your-project.supabase.co/functions/v1/health \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"component": "external_apis"}'
```

#### Alert System Issues

**Diagnose Alert Problems:**
```bash
# Test alert system
curl -X POST https://your-project.supabase.co/functions/v1/alerting-test \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "test_all_alerts"}'

# Check alert configuration
curl -X GET https://your-project.supabase.co/functions/v1/monitoring \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -d '{"action": "get_alert_config"}'
```

### 2. Performance Issues

#### Slow Response Times

**Investigate Performance Issues:**
```sql
-- Find slow jobs
SELECT 
  job_id,
  EXTRACT(EPOCH FROM (completed_at - started_at)) as processing_time,
  status,
  execution_time
FROM job_runs
WHERE EXTRACT(EPOCH FROM (completed_at - started_at)) > 5
ORDER BY processing_time DESC
LIMIT 10;
```

**Database Performance Issues:**
```sql
-- Check for slow queries
SELECT 
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements
WHERE mean_time > 2000  -- Queries taking more than 2 seconds
ORDER BY mean_time DESC;
```

## 📋 Monitoring Best Practices

### 1. Monitoring Strategy

**Key Principles:**
- Monitor what matters most
- Set appropriate thresholds
- Use multiple monitoring layers
- Implement proactive monitoring
- Regular review and adjustment

**Monitoring Layers:**
1. **Infrastructure Monitoring**: Database, functions, external APIs
2. **Application Monitoring**: Job processing, error rates, performance
3. **Business Monitoring**: Content generation success, user satisfaction
4. **Security Monitoring**: Access patterns, admin actions, security events

### 2. Alert Management

**Alert Best Practices:**
- Set clear, actionable thresholds
- Avoid alert fatigue
- Use escalation procedures
- Regular alert review and tuning
- Document alert procedures

**Alert Lifecycle:**
1. **Creation**: Define alert conditions and thresholds
2. **Testing**: Verify alert functionality
3. **Monitoring**: Track alert effectiveness
4. **Tuning**: Adjust thresholds based on experience
5. **Retirement**: Remove obsolete alerts

### 3. Documentation and Training

**Monitoring Documentation:**
- Document all monitoring procedures
- Maintain runbooks for common issues
- Update procedures based on experience
- Share knowledge with team members

**Team Training:**
- Regular training on monitoring tools
- Incident response procedures
- Escalation procedures
- Best practices and lessons learned

---

**Last Updated:** [Current Date]
**Version:** 1.0
**Next Review:** [Next Review Date]
**Approved By:** [System Administrator]
