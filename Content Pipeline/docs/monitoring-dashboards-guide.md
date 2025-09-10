# Monitoring Dashboards Guide

**Content Pipeline System**  
**Version**: 1.0  
**Date**: September 5, 2025

## Overview

The Content Pipeline system includes comprehensive monitoring dashboards that provide real-time visibility into system health, performance metrics, and operational status. These dashboards are essential for maintaining system reliability and ensuring optimal performance.

## Dashboard Components

### 1. Real-Time Monitoring Dashboard

**Purpose**: Provides live system status and current operational metrics.

**Features**:
- System health status with visual indicators
- Real-time job statistics (pending, processing, completed, failed)
- Performance metrics (response times, throughput)
- Function status monitoring
- Recent job activity
- Active alerts and notifications

**Access**: 
- **API Endpoint**: `https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/monitoring-dashboard`
- **Web Interface**: `docs/monitoring-dashboard.html`

**Key Metrics**:
- System uptime percentage
- Average response time
- Job success rate
- Function availability
- Active alert count

### 2. Historical Performance Dashboard

**Purpose**: Provides historical analysis and trend visualization.

**Features**:
- Performance trends over time (1h, 24h, 7d, 30d)
- Job processing trends
- Function performance analysis
- Error pattern analysis
- System capacity planning data

**Access**:
- **API Endpoint**: `https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/historical-dashboard?period=24h`

**Time Periods**:
- `1h` - Last Hour
- `24h` - Last 24 Hours
- `7d` - Last 7 Days
- `30d` - Last 30 Days

**Key Metrics**:
- Peak response times
- Throughput trends
- Success rate trends
- Error rate patterns
- System capacity utilization

### 3. Alerting Dashboard

**Purpose**: Centralized alert management and notification monitoring.

**Features**:
- Alert summary and statistics
- Recent alert history
- Alert trend analysis
- Top alert sources
- Alert rule configuration
- System health overview

**Access**:
- **API Endpoint**: `https://zjqsfdqhhvhbwqmgdfzn.supabase.co/functions/v1/alerting-dashboard`

**Key Metrics**:
- Total alerts (active, resolved)
- Alert levels (critical, warning, info)
- Alert resolution times
- Alert source analysis
- System health status

## Dashboard Architecture

### Edge Functions

The monitoring system uses three main Edge Functions:

1. **`monitoring-dashboard`**: Real-time system monitoring
2. **`historical-dashboard`**: Historical data analysis
3. **`alerting-dashboard`**: Alert management and analysis

### Data Sources

**Database Tables**:
- `content_jobs` - Job status and processing data
- `job_runs` - Job execution history
- `health_checks` - System health monitoring data
- `metrics_data` - Performance metrics
- `monitoring_alerts` - Alert and notification data

**External APIs**:
- Supabase Edge Functions health checks
- OpenAI API status monitoring
- WordPress API connectivity checks

### Data Flow

```
System Components → Database Tables → Edge Functions → Dashboard APIs → Web Interface
```

## Dashboard Features

### Real-Time Monitoring

**System Health Indicators**:
- 🟢 **Healthy**: All systems operational
- 🟡 **Degraded**: Some systems experiencing issues
- 🔴 **Unhealthy**: Critical systems down

**Job Statistics**:
- Total jobs processed
- Pending jobs queue
- Currently processing jobs
- Completed jobs count
- Failed jobs count
- Success rate percentage

**Performance Metrics**:
- Average response time
- Maximum response time
- Minimum response time
- Throughput (jobs per hour)

**Function Status**:
- Health Check Function
- Performance Monitor
- Metrics Collector
- Content Automation

### Historical Analysis

**Performance Trends**:
- Response time trends over time
- Throughput patterns
- Success rate trends
- Error rate analysis

**Job Trends**:
- Daily job processing volumes
- Job completion rates
- Job failure patterns
- Processing time analysis

**Function Performance**:
- Individual function response times
- Function call volumes
- Function success rates
- Function error rates

### Alert Management

**Alert Types**:
- **Critical**: System failures, data loss
- **Warning**: Performance degradation, capacity issues
- **Info**: Status updates, maintenance notifications

**Alert Sources**:
- Function failures
- Database connectivity issues
- External API failures
- Performance threshold breaches

## Usage Instructions

### Accessing Dashboards

1. **Web Interface**:
   - Open `docs/monitoring-dashboard.html` in a web browser
   - Dashboard auto-refreshes every 30 seconds
   - Manual refresh available via "Refresh" button

2. **API Access**:
   - Use provided API endpoints with authentication
   - Include proper headers for authentication
   - Handle rate limiting appropriately

### Dashboard Navigation

**Real-Time Dashboard**:
- System status at the top
- Key metrics in cards below
- Recent activity in bottom sections
- Alerts prominently displayed

**Historical Dashboard**:
- Select time period using URL parameters
- View trends and patterns
- Analyze performance data
- Export data for further analysis

**Alerting Dashboard**:
- Review active alerts
- Analyze alert trends
- Configure alert rules
- Monitor system health

### Key Metrics to Monitor

**Critical Metrics**:
- System health status
- Job success rate (>95% target)
- Average response time (<2s target)
- Function availability (>99% target)

**Performance Metrics**:
- Throughput trends
- Response time patterns
- Error rates
- Capacity utilization

**Operational Metrics**:
- Active job count
- Queue depth
- Processing times
- Alert frequency

## Configuration

### Dashboard Settings

**Auto-Refresh Intervals**:
- Real-time dashboard: 30 seconds
- Historical dashboard: Manual refresh
- Alerting dashboard: 60 seconds

**Data Retention**:
- Real-time data: 24 hours
- Historical data: 30 days
- Alert data: 90 days

**Alert Thresholds**:
- Response time: >5 seconds
- Error rate: >10%
- Function failure: Any
- Database connection: Any failure

### User Access

**Authentication**:
- API key required for all endpoints
- Service role key for admin access
- Anonymous key for public dashboard

**Permissions**:
- Read-only access for monitoring
- Admin access for configuration
- Alert management for operators

## Troubleshooting

### Common Issues

**Dashboard Not Loading**:
1. Check API endpoint availability
2. Verify authentication credentials
3. Check network connectivity
4. Review browser console for errors

**Missing Data**:
1. Verify database connectivity
2. Check data collection functions
3. Review error logs
4. Validate data sources

**Performance Issues**:
1. Check response times
2. Review database queries
3. Monitor resource usage
4. Optimize data collection

### Error Codes

**HTTP Status Codes**:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error
- `503` - Service Unavailable

**Common Error Messages**:
- "Database connection failed"
- "Function timeout"
- "Authentication required"
- "Rate limit exceeded"

## Best Practices

### Monitoring Guidelines

1. **Regular Monitoring**:
   - Check dashboards daily
   - Review alerts immediately
   - Monitor trends weekly
   - Analyze performance monthly

2. **Alert Management**:
   - Respond to critical alerts immediately
   - Investigate warning alerts promptly
   - Review alert patterns regularly
   - Update alert rules as needed

3. **Performance Optimization**:
   - Monitor response times
   - Track throughput trends
   - Identify bottlenecks
   - Plan capacity upgrades

### Dashboard Maintenance

1. **Regular Updates**:
   - Update dashboard components
   - Refresh data sources
   - Review configuration
   - Test functionality

2. **Data Management**:
   - Archive old data
   - Clean up logs
   - Optimize queries
   - Monitor storage usage

## Support and Maintenance

### Technical Support

**Contact Information**:
- **Primary**: Content Pipeline Development Team
- **Escalation**: System Administrator
- **Emergency**: On-call Engineer

**Support Channels**:
- Email: support@contentpipeline.com
- Slack: #content-pipeline-support
- Phone: Emergency only

### Maintenance Schedule

**Regular Maintenance**:
- Daily: Dashboard health checks
- Weekly: Performance review
- Monthly: Data cleanup
- Quarterly: System optimization

**Emergency Procedures**:
- Critical alerts: Immediate response
- System failures: Escalation process
- Data issues: Recovery procedures
- Performance problems: Optimization

## Conclusion

The Content Pipeline monitoring dashboards provide comprehensive visibility into system health, performance, and operational status. Regular monitoring and proper maintenance ensure optimal system performance and reliability.

For additional support or questions, contact the Content Pipeline Development Team.

---

**Document Version**: 1.0  
**Last Updated**: September 5, 2025  
**Next Review**: October 5, 2025
