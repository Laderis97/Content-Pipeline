# Monitoring & Alerting Configuration

This document outlines the comprehensive monitoring and alerting setup for the Content Pipeline system.

## Overview

The Content Pipeline system includes comprehensive monitoring and alerting capabilities to ensure system health, performance tracking, and proactive issue detection.

## Monitoring Endpoints

### 1. Health Check Endpoints

#### Main Health Check
- **Endpoint**: `/functions/v1/health`
- **Purpose**: Overall system health status
- **Status**: ⚠️ Requires environment configuration
- **Response Time**: ~400ms (when configured)

#### Performance Monitor
- **Endpoint**: `/functions/v1/performance-monitor`
- **Purpose**: Performance metrics collection
- **Status**: ✅ Operational
- **Response Time**: ~900ms

#### System Monitor
- **Endpoint**: `/functions/v1/monitoring`
- **Purpose**: System monitoring and alerting
- **Status**: ⚠️ Requires environment configuration
- **Response Time**: ~1200ms (when configured)

#### Metrics Collector
- **Endpoint**: `/functions/v1/metrics`
- **Purpose**: Metrics data collection
- **Status**: ✅ Operational
- **Response Time**: ~1800ms

#### Scheduler Monitor
- **Endpoint**: `/functions/v1/scheduler`
- **Purpose**: Scheduler health monitoring
- **Status**: ⚠️ Requires environment configuration
- **Response Time**: ~1400ms (when configured)

### 2. Database Monitoring

#### Database Tables
- **content_jobs**: Job status and processing
- **job_runs**: Execution history and performance
- **health_checks**: Health check results
- **monitoring_alerts**: Alert configurations
- **metrics_data**: Performance metrics
- **notification_logs**: Alert delivery logs

#### RPC Functions
- **claim_job()**: Job claiming mechanism
- **get_job_run_stats()**: Performance statistics

## Alert Configurations

### 1. Performance Alerts

#### High Failure Rate
- **Threshold**: 20% failure rate
- **Severity**: High
- **Description**: Alert when job failure rate exceeds 20%
- **Action**: Immediate notification to operations team

#### Slow Response Time
- **Threshold**: 5 seconds average response time
- **Severity**: Medium
- **Description**: Alert when average response time exceeds 5 seconds
- **Action**: Performance investigation required

#### Memory Usage High
- **Threshold**: 80% memory usage
- **Severity**: Medium
- **Description**: Alert when memory usage exceeds 80%
- **Action**: Resource optimization needed

#### Disk Space Low
- **Threshold**: 20% free disk space
- **Severity**: Critical
- **Description**: Alert when disk space falls below 20%
- **Action**: Immediate cleanup or scaling required

### 2. Service Alerts

#### Database Connection Issues
- **Threshold**: 1 connection failure
- **Severity**: Critical
- **Description**: Alert when database connection fails
- **Action**: Immediate database investigation

#### OpenAI API Errors
- **Threshold**: 10% error rate
- **Severity**: High
- **Description**: Alert when OpenAI API errors exceed 10%
- **Action**: API key or quota investigation

#### WordPress API Errors
- **Threshold**: 15% error rate
- **Severity**: High
- **Description**: Alert when WordPress API errors exceed 15%
- **Action**: WordPress connectivity investigation

#### Stale Jobs Detected
- **Threshold**: 5 stale jobs
- **Severity**: Medium
- **Description**: Alert when stale jobs exceed 5
- **Action**: Job cleanup or retry mechanism

## Notification Channels

### 1. Email Notifications

#### Configuration
- **SMTP Server**: smtp.gmail.com
- **Port**: 587
- **TLS**: Enabled
- **From**: alerts@contentpipeline.com
- **To**: admin@contentpipeline.com, ops@contentpipeline.com

#### Alert Types
- Critical alerts: Immediate email
- High severity: Email within 5 minutes
- Medium severity: Email within 15 minutes
- Low severity: Daily digest

### 2. Slack Notifications

#### Configuration
- **Webhook URL**: https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK
- **Channel**: #content-pipeline-alerts
- **Username**: Content Pipeline Bot
- **Icon**: :robot_face:

#### Alert Types
- Critical alerts: Immediate Slack message
- High severity: Slack message within 5 minutes
- Medium severity: Slack message within 15 minutes

## Monitoring Schedules

### 1. Health Checks
- **Frequency**: Every 5 minutes
- **Endpoints**: All health check endpoints
- **Timeout**: 30 seconds
- **Retry**: 3 attempts

### 2. Performance Monitoring
- **Frequency**: Every 10 minutes
- **Metrics**: Response time, throughput, error rate
- **Storage**: metrics_data table
- **Retention**: 30 days

### 3. System Monitoring
- **Frequency**: Every 15 minutes
- **Checks**: Database connectivity, API health, resource usage
- **Storage**: health_checks table
- **Retention**: 7 days

### 4. Alert Processing
- **Frequency**: Every 5 minutes
- **Processing**: Check thresholds, generate alerts
- **Delivery**: Immediate for critical, batched for others
- **Storage**: monitoring_alerts table

## Manual Setup Instructions

### 1. Configure Environment Variables

In Supabase Dashboard, set the following environment variables for Edge Functions:

```bash
# Health Function
HEALTH_CHECK_ENABLED=true
HEALTH_CHECK_TIMEOUT=30000

# Monitoring Function
MONITORING_ENABLED=true
ALERT_THRESHOLDS_ENABLED=true

# Scheduler Function
SCHEDULER_HEALTH_ENABLED=true
CRON_JOB_MONITORING=true
```

### 2. Set up Alert Configurations

Run the following SQL in Supabase Dashboard:

```sql
-- Insert alert configurations
INSERT INTO monitoring_alerts (alert_name, description, threshold_value, severity, is_active) VALUES
('High Failure Rate', 'Alert when job failure rate exceeds 20%', 20, 'high', true),
('Slow Response Time', 'Alert when average response time exceeds 5 seconds', 5000, 'medium', true),
('Database Connection Issues', 'Alert when database connection fails', 1, 'critical', true),
('OpenAI API Errors', 'Alert when OpenAI API errors exceed 10%', 10, 'high', true),
('WordPress API Errors', 'Alert when WordPress API errors exceed 15%', 15, 'high', true),
('Stale Jobs Detected', 'Alert when stale jobs exceed 5', 5, 'medium', true),
('Memory Usage High', 'Alert when memory usage exceeds 80%', 80, 'medium', true),
('Disk Space Low', 'Alert when disk space falls below 20%', 20, 'critical', true);
```

### 3. Configure Notification Channels

```sql
-- Insert notification channel configurations
INSERT INTO notification_logs (channel_name, channel_type, configuration, is_active) VALUES
('email', 'email', '{"smtp_server": "smtp.gmail.com", "smtp_port": 587, "from_email": "alerts@contentpipeline.com", "to_emails": ["admin@contentpipeline.com", "ops@contentpipeline.com"], "use_tls": true}', true),
('slack', 'slack', '{"webhook_url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK", "channel": "#content-pipeline-alerts", "username": "Content Pipeline Bot", "icon_emoji": ":robot_face:"}', true);
```

### 4. Set up Monitoring Dashboards

#### Supabase Dashboard
1. Go to **Database** → **Tables**
2. Create views for monitoring data
3. Set up real-time subscriptions
4. Configure alert notifications

#### Custom Dashboard
1. Create monitoring dashboard using Supabase client
2. Display real-time health status
3. Show performance metrics
4. Display alert history

## Monitoring Metrics

### 1. System Health Metrics
- **Uptime**: System availability percentage
- **Response Time**: Average API response time
- **Error Rate**: Percentage of failed requests
- **Throughput**: Requests per minute

### 2. Business Metrics
- **Job Success Rate**: Percentage of successful content generation
- **Content Quality Score**: AI-generated content quality metrics
- **Processing Time**: Average time to generate content
- **Queue Length**: Number of pending jobs

### 3. Infrastructure Metrics
- **Database Performance**: Query response times
- **Memory Usage**: System memory utilization
- **CPU Usage**: System CPU utilization
- **Disk Usage**: Storage utilization

## Alert Escalation Procedures

### 1. Critical Alerts (Immediate)
- **Database Connection Issues**
- **Disk Space Low**
- **System Down**

**Escalation Path:**
1. Immediate notification to on-call engineer
2. If no response in 5 minutes, escalate to team lead
3. If no response in 15 minutes, escalate to manager

### 2. High Severity Alerts (5 minutes)
- **High Failure Rate**
- **OpenAI API Errors**
- **WordPress API Errors**

**Escalation Path:**
1. Notification to operations team
2. If no response in 15 minutes, escalate to on-call engineer
3. If no response in 30 minutes, escalate to team lead

### 3. Medium Severity Alerts (15 minutes)
- **Slow Response Time**
- **Stale Jobs Detected**
- **Memory Usage High**

**Escalation Path:**
1. Notification to operations team
2. If no response in 30 minutes, escalate to on-call engineer
3. If no response in 1 hour, escalate to team lead

## Troubleshooting

### 1. Common Issues

#### Health Check Failures
- **Cause**: Missing environment variables
- **Solution**: Configure environment variables in Supabase Dashboard
- **Prevention**: Document all required environment variables

#### Alert Configuration Failures
- **Cause**: Invalid table schema or permissions
- **Solution**: Verify table structure and RLS policies
- **Prevention**: Test configurations in development first

#### Notification Delivery Failures
- **Cause**: Invalid webhook URLs or email configuration
- **Solution**: Verify notification channel configurations
- **Prevention**: Test notification channels during setup

### 2. Performance Optimization

#### Monitoring Overhead
- **Issue**: Monitoring adds latency to system
- **Solution**: Optimize monitoring frequency and queries
- **Prevention**: Monitor monitoring system performance

#### Alert Fatigue
- **Issue**: Too many alerts causing notification fatigue
- **Solution**: Tune alert thresholds and implement alert suppression
- **Prevention**: Regular review of alert effectiveness

## Security Considerations

### 1. Access Control
- **Monitoring Data**: Restricted to operations team
- **Alert Configurations**: Admin-only access
- **Notification Channels**: Encrypted credentials

### 2. Data Privacy
- **Health Data**: No sensitive information in health checks
- **Metrics Data**: Aggregated data only
- **Alert Data**: Minimal information in alerts

### 3. Audit Trail
- **Configuration Changes**: Log all monitoring configuration changes
- **Alert History**: Maintain alert history for analysis
- **Access Logs**: Track access to monitoring data

## Backup and Recovery

### 1. Configuration Backup
- **Alert Configurations**: Regular backup of monitoring_alerts table
- **Notification Channels**: Backup notification channel configurations
- **Environment Variables**: Document all environment variables

### 2. Disaster Recovery
- **Monitoring System**: Can be rebuilt from configuration backups
- **Alert History**: Preserved in database for analysis
- **Notification Channels**: Can be reconfigured quickly

## Maintenance

### 1. Regular Tasks
- **Weekly**: Review alert effectiveness and thresholds
- **Monthly**: Analyze monitoring data and optimize
- **Quarterly**: Review and update monitoring strategy

### 2. Updates
- **Alert Thresholds**: Adjust based on system performance
- **Notification Channels**: Update contact information
- **Monitoring Endpoints**: Add new endpoints as system grows
