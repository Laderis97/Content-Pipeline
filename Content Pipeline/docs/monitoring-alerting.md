# Monitoring and Alerting Infrastructure Guide

## Overview

This guide provides comprehensive documentation for the monitoring and alerting infrastructure of the Content Pipeline system. The monitoring system provides real-time health checks, performance metrics, alert management, and notification capabilities.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Monitoring Components](#monitoring-components)
3. [Alert System](#alert-system)
4. [Health Checks](#health-checks)
5. [System Metrics](#system-metrics)
6. [Configuration](#configuration)
7. [API Endpoints](#api-endpoints)
8. [Database Schema](#database-schema)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

## Architecture Overview

The monitoring and alerting infrastructure consists of several key components:

### Core Components

1. **Monitoring Configuration** - Centralized configuration management
2. **Alert Rules Engine** - Rule-based alert triggering system
3. **Health Check System** - Component health monitoring
4. **Metrics Collection** - System performance metrics
5. **Notification System** - Multi-channel alert delivery
6. **Dashboard** - Real-time monitoring dashboard

### Data Flow

```
System Components → Health Checks → Alert Rules → Notifications
                ↓
            Metrics Collection → Performance Monitoring → Dashboard
```

## Monitoring Components

### 1. Monitoring Configuration

The monitoring system uses a centralized configuration approach:

```typescript
interface MonitoringConfig {
  // Alert thresholds
  failureRateThreshold: number
  latencyThreshold: number
  errorCountThreshold: number
  
  // Monitoring intervals
  healthCheckInterval: number
  metricsCollectionInterval: number
  alertCheckInterval: number
  
  // Alert channels
  enableEmailAlerts: boolean
  enableSlackAlerts: boolean
  enableWebhookAlerts: boolean
  
  // Alert recipients
  emailRecipients: string[]
  slackWebhookUrl?: string
  webhookUrl?: string
  
  // Monitoring features
  enablePerformanceMonitoring: boolean
  enableErrorTracking: boolean
  enableHealthChecks: boolean
  enableMetricsCollection: boolean
  
  // Retention settings
  metricsRetentionDays: number
  logsRetentionDays: number
  alertsRetentionDays: number
}
```

### 2. Alert Rules Engine

The alert rules engine evaluates conditions and triggers alerts:

```typescript
interface AlertRule {
  id: string
  name: string
  description: string
  condition: string
  threshold: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
  channels: string[]
  cooldownMinutes: number
  lastTriggered?: Date
}
```

#### Default Alert Rules

1. **High Failure Rate** - Job failure rate > 20%
2. **High Latency** - Function latency > 2 seconds
3. **Error Count Threshold** - Error count > 10
4. **System Unhealthy** - System health check failed
5. **Queue Backlog** - Job queue > 100 pending jobs
6. **High CPU Usage** - CPU usage > 80%
7. **High Memory Usage** - Memory usage > 80%
8. **High Error Rate** - System error rate > 5%

### 3. Health Check System

Health checks monitor component status:

```typescript
interface HealthCheck {
  id: string
  name: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: Date
  responseTime: number
  error?: string
  metadata: Record<string, any>
}
```

#### Health Check Types

- **System Health** - Overall system status
- **Database Health** - Database connectivity and performance
- **External Services** - OpenAI and WordPress API health
- **Edge Functions** - Function execution health
- **Queue Health** - Job queue status

### 4. System Metrics

System metrics track performance indicators:

```typescript
interface SystemMetrics {
  timestamp: Date
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  networkLatency: number
  activeConnections: number
  errorRate: number
  throughput: number
}
```

## Alert System

### Alert Lifecycle

1. **Rule Evaluation** - Alert rules are evaluated periodically
2. **Condition Check** - System metrics are checked against thresholds
3. **Alert Triggering** - Alerts are created when conditions are met
4. **Notification Delivery** - Alerts are sent to configured channels
5. **Alert Resolution** - Alerts are resolved when conditions improve
6. **Cleanup** - Old alerts are cleaned up based on retention policy

### Alert Severities

- **Critical** - System is down or severely degraded
- **High** - Significant issues affecting performance
- **Medium** - Issues that need attention
- **Low** - Informational alerts

### Alert Channels

#### Email Alerts
```typescript
// Email alert configuration
{
  enableEmailAlerts: true,
  emailRecipients: ['admin@example.com', 'ops@example.com']
}
```

#### Slack Alerts
```typescript
// Slack alert configuration
{
  enableSlackAlerts: true,
  slackWebhookUrl: 'https://hooks.slack.com/services/...'
}
```

#### Webhook Alerts
```typescript
// Webhook alert configuration
{
  enableWebhookAlerts: true,
  webhookUrl: 'https://your-webhook-endpoint.com/alerts'
}
```

### Alert Cooldown

Alerts have configurable cooldown periods to prevent spam:

- **Critical alerts** - 5 minutes
- **High alerts** - 10 minutes
- **Medium alerts** - 15 minutes
- **Low alerts** - 30 minutes

## Health Checks

### Health Check Implementation

```typescript
// Record a health check
recordHealthCheck({
  id: 'database_health',
  name: 'Database Health Check',
  status: 'healthy',
  timestamp: new Date(),
  responseTime: 50,
  metadata: { connection_pool_size: 10 }
})
```

### Health Check Status

- **Healthy** - Component is functioning normally
- **Degraded** - Component has minor issues but is functional
- **Unhealthy** - Component has serious issues or is down

### Health Check Examples

#### Database Health Check
```typescript
async function checkDatabaseHealth(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase
      .from('content_jobs')
      .select('id')
      .limit(1)
    
    const responseTime = Date.now() - startTime
    
    return {
      id: 'database_health',
      name: 'Database Health Check',
      status: error ? 'unhealthy' : 'healthy',
      timestamp: new Date(),
      responseTime,
      error: error?.message,
      metadata: { query_time: responseTime }
    }
  } catch (error) {
    return {
      id: 'database_health',
      name: 'Database Health Check',
      status: 'unhealthy',
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
      error: error.message,
      metadata: {}
    }
  }
}
```

#### External Service Health Check
```typescript
async function checkOpenAIHealth(): Promise<HealthCheck> {
  const startTime = Date.now()
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${config.openaiApiKey}`
      }
    })
    
    const responseTime = Date.now() - startTime
    
    return {
      id: 'openai_health',
      name: 'OpenAI API Health Check',
      status: response.ok ? 'healthy' : 'unhealthy',
      timestamp: new Date(),
      responseTime,
      error: response.ok ? undefined : `HTTP ${response.status}`,
      metadata: { status_code: response.status }
    }
  } catch (error) {
    return {
      id: 'openai_health',
      name: 'OpenAI API Health Check',
      status: 'unhealthy',
      timestamp: new Date(),
      responseTime: Date.now() - startTime,
      error: error.message,
      metadata: {}
    }
  }
}
```

## System Metrics

### Metrics Collection

```typescript
// Record system metrics
recordSystemMetrics({
  timestamp: new Date(),
  cpuUsage: 45.5,
  memoryUsage: 67.2,
  diskUsage: 23.1,
  networkLatency: 150,
  activeConnections: 25,
  errorRate: 0.02,
  throughput: 1000
})
```

### Metrics Types

#### Performance Metrics
- **CPU Usage** - CPU utilization percentage
- **Memory Usage** - Memory utilization percentage
- **Disk Usage** - Disk utilization percentage
- **Network Latency** - Network response time

#### Application Metrics
- **Active Connections** - Number of active connections
- **Error Rate** - Error rate percentage
- **Throughput** - Requests per second
- **Response Time** - Average response time

#### Business Metrics
- **Job Success Rate** - Percentage of successful jobs
- **Queue Size** - Number of pending jobs
- **Processing Time** - Average job processing time

## Configuration

### Environment Variables

```bash
# Monitoring Configuration
MONITORING_FAILURE_RATE_THRESHOLD=0.2
MONITORING_LATENCY_THRESHOLD=2000
MONITORING_ERROR_COUNT_THRESHOLD=10

# Alert Configuration
MONITORING_ENABLE_EMAIL_ALERTS=true
MONITORING_ENABLE_SLACK_ALERTS=true
MONITORING_ENABLE_WEBHOOK_ALERTS=false

# Email Configuration
MONITORING_EMAIL_RECIPIENTS=admin@example.com,ops@example.com

# Slack Configuration
MONITORING_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...

# Webhook Configuration
MONITORING_WEBHOOK_URL=https://your-webhook-endpoint.com/alerts

# Retention Configuration
MONITORING_METRICS_RETENTION_DAYS=30
MONITORING_LOGS_RETENTION_DAYS=7
MONITORING_ALERTS_RETENTION_DAYS=90
```

### Configuration Management

```typescript
// Initialize monitoring with custom configuration
const config = initializeMonitoring({
  failureRateThreshold: 0.15,
  latencyThreshold: 1500,
  enableEmailAlerts: true,
  emailRecipients: ['admin@example.com']
})

// Update configuration at runtime
updateMonitoringConfig({
  failureRateThreshold: 0.1,
  enableSlackAlerts: true
})
```

## API Endpoints

### Monitoring Management

#### Get Monitoring Status
```bash
GET /functions/v1/monitoring?action=status
```

#### Initialize Monitoring
```bash
POST /functions/v1/monitoring?action=init
Content-Type: application/json

{
  "config": {
    "failureRateThreshold": 0.2,
    "latencyThreshold": 2000,
    "enableEmailAlerts": true
  }
}
```

#### Update Configuration
```bash
POST /functions/v1/monitoring?action=update-config
Content-Type: application/json

{
  "updates": {
    "failureRateThreshold": 0.15,
    "enableSlackAlerts": true
  }
}
```

### Alert Management

#### Get Alerts
```bash
GET /functions/v1/monitoring?action=alerts
```

#### Check Alert Conditions
```bash
POST /functions/v1/monitoring?action=check-alerts
```

#### Resolve Alert
```bash
POST /functions/v1/monitoring?action=resolve-alert
Content-Type: application/json

{
  "alertId": "alert_1234567890_high_failure_rate"
}
```

### Health Checks

#### Get Health Status
```bash
GET /functions/v1/monitoring?action=health
```

#### Record Health Check
```bash
POST /functions/v1/monitoring?action=record-health
Content-Type: application/json

{
  "id": "database_health",
  "name": "Database Health Check",
  "status": "healthy",
  "responseTime": 50,
  "metadata": { "connection_pool_size": 10 }
}
```

### Metrics

#### Record System Metrics
```bash
POST /functions/v1/monitoring?action=record-metrics
Content-Type: application/json

{
  "cpuUsage": 45.5,
  "memoryUsage": 67.2,
  "diskUsage": 23.1,
  "networkLatency": 150,
  "activeConnections": 25,
  "errorRate": 0.02,
  "throughput": 1000
}
```

### Alert Rules

#### Get Alert Rules
```bash
GET /functions/v1/monitoring?action=rules
```

#### Add Alert Rule
```bash
POST /functions/v1/monitoring?action=add-rule
Content-Type: application/json

{
  "rule": {
    "id": "custom_rule",
    "name": "Custom Alert Rule",
    "description": "Custom alert rule for monitoring",
    "condition": "custom_metric > threshold",
    "threshold": 50,
    "severity": "medium",
    "enabled": true,
    "channels": ["email"],
    "cooldownMinutes": 15
  }
}
```

#### Remove Alert Rule
```bash
POST /functions/v1/monitoring?action=remove-rule
Content-Type: application/json

{
  "ruleId": "custom_rule"
}
```

### Maintenance

#### Cleanup Old Data
```bash
POST /functions/v1/monitoring?action=cleanup
```

#### Test Monitoring System
```bash
GET /functions/v1/monitoring?action=test
```

## Database Schema

### Core Tables

#### monitoring_config
```sql
CREATE TABLE monitoring_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### alert_rules
```sql
CREATE TABLE alert_rules (
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
```

#### alerts
```sql
CREATE TABLE alerts (
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
```

#### health_checks
```sql
CREATE TABLE health_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    check_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'unhealthy', 'degraded')),
    response_time_ms INTEGER,
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### system_metrics
```sql
CREATE TABLE system_metrics (
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
```

### Database Functions

#### get_monitoring_dashboard()
```sql
SELECT * FROM get_monitoring_dashboard();
```

#### get_system_health_summary(hours_back)
```sql
SELECT * FROM get_system_health_summary(1);
```

#### get_system_metrics_summary(hours_back)
```sql
SELECT * FROM get_system_metrics_summary(24);
```

#### get_alert_statistics(days_back)
```sql
SELECT * FROM get_alert_statistics(7);
```

#### cleanup_monitoring_data()
```sql
SELECT * FROM cleanup_monitoring_data(7, 30, 90, 7);
```

## Best Practices

### 1. Alert Rule Design

- **Use appropriate severity levels** - Don't make everything critical
- **Set reasonable thresholds** - Avoid false positives
- **Configure cooldown periods** - Prevent alert spam
- **Use multiple channels** - Ensure alerts are received

### 2. Health Check Implementation

- **Check external dependencies** - Monitor external services
- **Include response time** - Track performance metrics
- **Provide meaningful errors** - Include error details
- **Use consistent naming** - Follow naming conventions

### 3. Metrics Collection

- **Collect relevant metrics** - Focus on business-critical metrics
- **Use appropriate intervals** - Balance detail vs. performance
- **Retain data appropriately** - Set retention policies
- **Monitor collection performance** - Ensure metrics don't impact system

### 4. Configuration Management

- **Use environment-specific settings** - Different configs per environment
- **Validate configuration** - Ensure config is valid
- **Document configuration** - Provide clear documentation
- **Version configuration** - Track configuration changes

### 5. Alert Response

- **Respond to alerts quickly** - Set up alert response procedures
- **Escalate appropriately** - Use severity levels for escalation
- **Document resolutions** - Track how alerts are resolved
- **Learn from alerts** - Improve system based on alert patterns

## Troubleshooting

### Common Issues

#### 1. Alerts Not Triggering

**Symptoms**: No alerts are being generated despite issues

**Solutions**:
- Check alert rules are enabled
- Verify thresholds are appropriate
- Check cooldown periods
- Verify monitoring is running

```bash
# Check alert rules
curl -X GET "https://your-project.supabase.co/functions/v1/monitoring?action=rules" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Check monitoring status
curl -X GET "https://your-project.supabase.co/functions/v1/monitoring?action=status" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### 2. Health Checks Failing

**Symptoms**: Health checks showing as unhealthy

**Solutions**:
- Check external service connectivity
- Verify credentials and permissions
- Check network connectivity
- Review error messages

```bash
# Check health status
curl -X GET "https://your-project.supabase.co/functions/v1/monitoring?action=health" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Record test health check
curl -X POST "https://your-project.supabase.co/functions/v1/monitoring?action=record-health" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test_health",
    "name": "Test Health Check",
    "status": "healthy",
    "responseTime": 100
  }'
```

#### 3. Metrics Not Being Collected

**Symptoms**: No metrics data in dashboard

**Solutions**:
- Check metrics collection is enabled
- Verify metrics recording calls
- Check database connectivity
- Review retention settings

```bash
# Check metrics collection
curl -X POST "https://your-project.supabase.co/functions/v1/monitoring?action=record-metrics" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "cpuUsage": 50.0,
    "memoryUsage": 60.0,
    "diskUsage": 25.0,
    "networkLatency": 120,
    "activeConnections": 20,
    "errorRate": 0.02,
    "throughput": 900
  }'
```

#### 4. Notifications Not Being Sent

**Symptoms**: Alerts are triggered but notifications not received

**Solutions**:
- Check notification channels are enabled
- Verify recipient configurations
- Test notification endpoints
- Check network connectivity

```bash
# Test alert system
curl -X POST "https://your-project.supabase.co/functions/v1/monitoring?action=check-alerts" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Debugging Commands

#### Check Monitoring Status
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/monitoring?action=status" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### Test Monitoring System
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/monitoring?action=test" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### Check Alert Rules
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/monitoring?action=rules" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### Get Active Alerts
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/monitoring?action=alerts" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### Cleanup Old Data
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/monitoring?action=cleanup" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Performance Optimization

#### 1. Database Indexing
- Ensure proper indexes on frequently queried columns
- Monitor query performance
- Use appropriate data types

#### 2. Metrics Retention
- Set appropriate retention periods
- Clean up old data regularly
- Monitor storage usage

#### 3. Alert Optimization
- Use appropriate cooldown periods
- Avoid duplicate alerts
- Optimize alert rule conditions

#### 4. Health Check Optimization
- Use appropriate check intervals
- Avoid expensive health checks
- Cache health check results when appropriate

## Conclusion

The monitoring and alerting infrastructure provides comprehensive system monitoring, alert management, and notification capabilities. By following this guide, you can effectively monitor your Content Pipeline system, respond to issues quickly, and maintain optimal performance.

For additional support or questions, please refer to the troubleshooting section or contact the development team.
