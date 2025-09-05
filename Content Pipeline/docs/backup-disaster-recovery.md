# Backup and Disaster Recovery Guide

## Overview

This guide provides comprehensive documentation for the backup and disaster recovery infrastructure of the Content Pipeline system. The system provides automated backups, restore capabilities, and disaster recovery plans to ensure business continuity and data protection.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backup System](#backup-system)
3. [Disaster Recovery Plans](#disaster-recovery-plans)
4. [Configuration](#configuration)
5. [API Endpoints](#api-endpoints)
6. [Database Schema](#database-schema)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

The backup and disaster recovery infrastructure consists of several key components:

### Core Components

1. **Backup System** - Automated backup creation and management
2. **Restore System** - Backup restoration capabilities
3. **Disaster Recovery Plans** - Automated recovery procedures
4. **Configuration Management** - Centralized backup configuration
5. **Verification System** - Backup integrity verification
6. **Retention Management** - Automated backup lifecycle management

### Data Flow

```
System Components → Backup Creation → Storage → Verification → Retention
                ↓
            Disaster Recovery Plans → Automated Recovery → System Restoration
```

## Backup System

### Backup Types

The system supports four types of backups:

#### 1. Database Backup
- **Purpose**: Backup all database tables and data
- **Frequency**: Every 24 hours (configurable)
- **Retention**: 30 days (configurable)
- **Content**: Schema, data, indexes, functions, triggers

#### 2. Function Backup
- **Purpose**: Backup Edge Function code and configuration
- **Frequency**: Every 168 hours (1 week) (configurable)
- **Retention**: 90 days (configurable)
- **Content**: Function code, dependencies, configuration

#### 3. Configuration Backup
- **Purpose**: Backup system configuration and environment variables
- **Frequency**: Every 24 hours (configurable)
- **Retention**: 365 days (1 year) (configurable)
- **Content**: Environment variables, configuration files, settings

#### 4. Secrets Backup
- **Purpose**: Backup secrets metadata (not actual secrets for security)
- **Frequency**: Every 168 hours (1 week) (configurable)
- **Retention**: 365 days (1 year) (configurable)
- **Content**: Secrets metadata, configuration, access patterns

### Backup Features

#### Encryption
- **AES-256 encryption** for all backups
- **Configurable encryption keys**
- **Secure key management**

#### Compression
- **Gzip compression** to reduce storage requirements
- **Configurable compression levels**
- **Automatic decompression on restore**

#### Verification
- **Checksum verification** for data integrity
- **Accessibility testing** for backup availability
- **Automated verification scheduling**

#### Storage Options
- **Local storage** - File system storage
- **S3-compatible** - AWS S3, MinIO, etc.
- **Google Cloud Storage** - GCS integration
- **Azure Blob Storage** - Azure integration

### Backup Configuration

```typescript
interface BackupConfig {
  // Backup types
  enableDatabaseBackup: boolean
  enableFunctionBackup: boolean
  enableConfigBackup: boolean
  enableSecretsBackup: boolean
  
  // Backup schedules
  databaseBackupInterval: number // hours
  functionBackupInterval: number // hours
  configBackupInterval: number // hours
  secretsBackupInterval: number // hours
  
  // Retention policies
  databaseBackupRetention: number // days
  functionBackupRetention: number // days
  configBackupRetention: number // days
  secretsBackupRetention: number // days
  
  // Storage configuration
  backupStorageType: 'local' | 's3' | 'gcs' | 'azure'
  backupStorageConfig: {
    bucket?: string
    region?: string
    accessKey?: string
    secretKey?: string
    endpoint?: string
  }
  
  // Encryption
  enableEncryption: boolean
  encryptionKey?: string
  
  // Compression
  enableCompression: boolean
  compressionLevel: number
  
  // Verification
  enableBackupVerification: boolean
  verificationInterval: number // hours
  
  // Notifications
  enableBackupNotifications: boolean
  notificationChannels: string[]
  failureNotificationThreshold: number
}
```

## Disaster Recovery Plans

### Default Recovery Plans

#### 1. Database Failure Recovery (Critical Priority)
**Triggers**: `database_unavailable`, `database_corruption`, `database_performance_degraded`

**Steps**:
1. **Assess Database Status** - Check database connectivity and status
2. **Restore Database Backup** - Restore from latest database backup
3. **Verify Database Restore** - Verify database restore was successful

**Estimated Recovery Time**: 90 minutes

#### 2. Function Failure Recovery (High Priority)
**Triggers**: `function_deployment_failed`, `function_runtime_error`, `function_timeout`

**Steps**:
1. **Assess Function Status** - Check function deployment and runtime status
2. **Redeploy Functions** - Redeploy Edge Functions from backup
3. **Verify Function Deployment** - Verify function deployment was successful

**Estimated Recovery Time**: 45 minutes

#### 3. Configuration Corruption Recovery (Medium Priority)
**Triggers**: `config_validation_failed`, `config_corruption_detected`

**Steps**:
1. **Assess Configuration Status** - Check configuration validity and corruption
2. **Restore Configuration Backup** - Restore configuration from backup
3. **Restart Services** - Restart services with restored configuration

**Estimated Recovery Time**: 30 minutes

#### 4. Secrets Compromise Recovery (Critical Priority)
**Triggers**: `secrets_compromise_detected`, `unauthorized_access`

**Steps**:
1. **Assess Security Breach** - Assess the scope of the security breach
2. **Rotate Compromised Secrets** - Rotate all compromised secrets immediately
3. **Restore Secrets Backup** - Restore secrets from secure backup
4. **Verify Security Restoration** - Verify all secrets have been restored and secured

**Estimated Recovery Time**: 60 minutes

### Disaster Recovery Plan Structure

```typescript
interface DisasterRecoveryPlan {
  id: string
  name: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  triggers: string[]
  steps: DisasterRecoveryStep[]
  estimatedRecoveryTime: number // minutes
  lastTested?: Date
  enabled: boolean
}

interface DisasterRecoveryStep {
  id: string
  name: string
  description: string
  type: 'backup_restore' | 'service_restart' | 'config_update' | 'data_migration' | 'notification'
  order: number
  timeout: number // minutes
  retryCount: number
  dependencies: string[]
  parameters: Record<string, any>
}
```

### Step Types

#### Backup Restore
- **Purpose**: Restore from backup
- **Parameters**: `backupType`, `useLatest`, `backupId`
- **Timeout**: 15-60 minutes

#### Service Restart
- **Purpose**: Restart system services
- **Parameters**: `services`, `force`, `waitForHealth`
- **Timeout**: 5-15 minutes

#### Config Update
- **Purpose**: Update system configuration
- **Parameters**: `configKey`, `configValue`, `restartRequired`
- **Timeout**: 5-20 minutes

#### Data Migration
- **Purpose**: Migrate data between systems
- **Parameters**: `source`, `destination`, `migrationType`
- **Timeout**: 30-120 minutes

#### Notification
- **Purpose**: Send notifications
- **Parameters**: `message`, `channels`, `priority`
- **Timeout**: 1-5 minutes

## Configuration

### Environment Variables

```bash
# Backup Configuration
BACKUP_ENABLE_DATABASE_BACKUP=true
BACKUP_ENABLE_FUNCTION_BACKUP=true
BACKUP_ENABLE_CONFIG_BACKUP=true
BACKUP_ENABLE_SECRETS_BACKUP=true

# Backup Schedules
BACKUP_DATABASE_INTERVAL=24
BACKUP_FUNCTION_INTERVAL=168
BACKUP_CONFIG_INTERVAL=24
BACKUP_SECRETS_INTERVAL=168

# Retention Policies
BACKUP_DATABASE_RETENTION=30
BACKUP_FUNCTION_RETENTION=90
BACKUP_CONFIG_RETENTION=365
BACKUP_SECRETS_RETENTION=365

# Storage Configuration
BACKUP_STORAGE_TYPE=local
BACKUP_STORAGE_BUCKET=backups
BACKUP_STORAGE_REGION=us-east-1
BACKUP_STORAGE_ACCESS_KEY=your-access-key
BACKUP_STORAGE_SECRET_KEY=your-secret-key

# Encryption
BACKUP_ENABLE_ENCRYPTION=true
BACKUP_ENCRYPTION_KEY=your-encryption-key

# Compression
BACKUP_ENABLE_COMPRESSION=true
BACKUP_COMPRESSION_LEVEL=6

# Verification
BACKUP_ENABLE_VERIFICATION=true
BACKUP_VERIFICATION_INTERVAL=24

# Notifications
BACKUP_ENABLE_NOTIFICATIONS=true
BACKUP_NOTIFICATION_CHANNELS=email,slack
BACKUP_FAILURE_THRESHOLD=3
```

### Configuration Management

```typescript
// Initialize backup system
const config = initializeBackup({
  enableDatabaseBackup: true,
  databaseBackupInterval: 24,
  enableEncryption: true,
  enableCompression: true
})

// Update configuration
updateBackupConfig({
  databaseBackupInterval: 12,
  enableCompression: false
})
```

## API Endpoints

### Backup Management

#### Get Backup Status
```bash
GET /functions/v1/backup?action=status
```

#### Initialize Backup System
```bash
POST /functions/v1/backup?action=init
Content-Type: application/json

{
  "config": {
    "enableDatabaseBackup": true,
    "databaseBackupInterval": 24,
    "enableEncryption": true
  }
}
```

#### Create Database Backup
```bash
POST /functions/v1/backup?action=backup-database
```

#### Create Function Backup
```bash
POST /functions/v1/backup?action=backup-function
```

#### Create Configuration Backup
```bash
POST /functions/v1/backup?action=backup-config
```

#### Create Secrets Backup
```bash
POST /functions/v1/backup?action=backup-secrets
```

#### Create All Backups
```bash
POST /functions/v1/backup?action=backup-all
```

### Restore Operations

#### Restore from Backup
```bash
POST /functions/v1/backup?action=restore
Content-Type: application/json

{
  "backupId": "backup_1234567890",
  "type": "database"
}
```

### Job Management

#### Get Backup Jobs
```bash
GET /functions/v1/backup?action=jobs
```

#### Get Specific Job
```bash
GET /functions/v1/backup?action=job&jobId=backup_1234567890&type=backup
```

### Disaster Recovery

#### Execute Disaster Recovery Plan
```bash
POST /functions/v1/backup?action=disaster-recovery
Content-Type: application/json

{
  "planId": "database_failure",
  "trigger": "database_unavailable"
}
```

#### Get Disaster Recovery Plans
```bash
GET /functions/v1/backup?action=plans
```

#### Add Disaster Recovery Plan
```bash
POST /functions/v1/backup?action=add-plan
Content-Type: application/json

{
  "plan": {
    "id": "custom_plan",
    "name": "Custom Recovery Plan",
    "description": "Custom disaster recovery plan",
    "priority": "medium",
    "triggers": ["custom_trigger"],
    "steps": [...],
    "estimatedRecoveryTime": 30,
    "enabled": true
  }
}
```

#### Remove Disaster Recovery Plan
```bash
POST /functions/v1/backup?action=remove-plan
Content-Type: application/json

{
  "planId": "custom_plan"
}
```

### Configuration Management

#### Update Backup Configuration
```bash
POST /functions/v1/backup?action=update-config
Content-Type: application/json

{
  "updates": {
    "databaseBackupInterval": 12,
    "enableCompression": false
  }
}
```

### Maintenance

#### Cleanup Old Data
```bash
POST /functions/v1/backup?action=cleanup
```

#### Test Backup System
```bash
GET /functions/v1/backup?action=test
```

## Database Schema

### Core Tables

#### backup_config
```sql
CREATE TABLE backup_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### backup_jobs
```sql
CREATE TABLE backup_jobs (
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
```

#### restore_jobs
```sql
CREATE TABLE restore_jobs (
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
```

#### disaster_recovery_plans
```sql
CREATE TABLE disaster_recovery_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(20) NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    triggers JSONB DEFAULT '[]'::jsonb,
    steps JSONB NOT NULL,
    estimated_recovery_time INTEGER,
    last_tested TIMESTAMP WITH TIME ZONE,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### disaster_recovery_executions
```sql
CREATE TABLE disaster_recovery_executions (
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
```

### Database Functions

#### get_backup_statistics(days_back)
```sql
SELECT * FROM get_backup_statistics(30);
```

#### get_restore_statistics(days_back)
```sql
SELECT * FROM get_restore_statistics(30);
```

#### get_disaster_recovery_plans(priority, enabled)
```sql
SELECT * FROM get_disaster_recovery_plans('critical', true);
```

#### cleanup_backup_data()
```sql
SELECT * FROM cleanup_backup_data(90, 90, 180, 30);
```

#### get_backup_dashboard()
```sql
SELECT * FROM get_backup_dashboard();
```

## Best Practices

### 1. Backup Strategy

- **3-2-1 Rule**: 3 copies, 2 different media, 1 offsite
- **Regular Testing**: Test restore procedures monthly
- **Incremental Backups**: Use incremental backups for large datasets
- **Encryption**: Always encrypt backups containing sensitive data
- **Verification**: Verify backup integrity regularly

### 2. Disaster Recovery Planning

- **RTO/RPO Definition**: Define Recovery Time and Recovery Point Objectives
- **Regular Testing**: Test disaster recovery plans quarterly
- **Documentation**: Maintain up-to-date recovery procedures
- **Communication**: Establish communication protocols during disasters
- **Training**: Train staff on recovery procedures

### 3. Configuration Management

- **Version Control**: Version control all configuration changes
- **Change Management**: Implement change management procedures
- **Documentation**: Document all configuration changes
- **Testing**: Test configuration changes in non-production environments
- **Rollback Plans**: Always have rollback plans for configuration changes

### 4. Security

- **Access Control**: Implement proper access controls for backup systems
- **Encryption**: Encrypt all backups and data in transit
- **Audit Logging**: Log all backup and restore operations
- **Key Management**: Secure encryption key management
- **Network Security**: Secure backup storage and network access

### 5. Monitoring and Alerting

- **Backup Monitoring**: Monitor backup job success/failure
- **Storage Monitoring**: Monitor backup storage usage and availability
- **Performance Monitoring**: Monitor backup and restore performance
- **Alerting**: Set up alerts for backup failures and storage issues
- **Reporting**: Generate regular backup and recovery reports

## Troubleshooting

### Common Issues

#### 1. Backup Failures

**Symptoms**: Backup jobs failing with errors

**Solutions**:
- Check storage connectivity and permissions
- Verify encryption keys are available
- Check available disk space
- Review error logs for specific issues

```bash
# Check backup status
curl -X GET "https://your-project.supabase.co/functions/v1/backup?action=status" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

# Check backup jobs
curl -X GET "https://your-project.supabase.co/functions/v1/backup?action=jobs" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### 2. Restore Failures

**Symptoms**: Restore jobs failing or incomplete

**Solutions**:
- Verify backup integrity and accessibility
- Check restore permissions and connectivity
- Ensure sufficient resources for restore
- Review restore logs for specific errors

```bash
# Test restore functionality
curl -X POST "https://your-project.supabase.co/functions/v1/backup?action=restore" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "backupId": "test_backup",
    "type": "database"
  }'
```

#### 3. Disaster Recovery Plan Failures

**Symptoms**: Disaster recovery plans not executing or failing

**Solutions**:
- Verify plan configuration and triggers
- Check step dependencies and timeouts
- Ensure all required resources are available
- Review execution logs for specific errors

```bash
# Test disaster recovery plan
curl -X POST "https://your-project.supabase.co/functions/v1/backup?action=disaster-recovery" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "database_failure",
    "trigger": "test_trigger"
  }'
```

#### 4. Configuration Issues

**Symptoms**: Backup system not working with configuration

**Solutions**:
- Validate configuration parameters
- Check environment variables
- Verify storage configuration
- Test configuration changes

```bash
# Test backup system
curl -X GET "https://your-project.supabase.co/functions/v1/backup?action=test" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Debugging Commands

#### Check Backup System Status
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/backup?action=status" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### Test Backup Creation
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/backup?action=backup-database" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### Test Restore Functionality
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/backup?action=restore" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "backupId": "test_backup",
    "type": "database"
  }'
```

#### Test Disaster Recovery
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/backup?action=disaster-recovery" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "planId": "database_failure",
    "trigger": "test_trigger"
  }'
```

#### Cleanup Old Data
```bash
curl -X POST "https://your-project.supabase.co/functions/v1/backup?action=cleanup" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

### Performance Optimization

#### 1. Backup Performance
- Use incremental backups for large datasets
- Compress backups to reduce storage and transfer time
- Use parallel processing for multiple backup jobs
- Optimize storage I/O performance

#### 2. Restore Performance
- Use parallel restore operations when possible
- Optimize network bandwidth for restore operations
- Use local storage for faster restore operations
- Implement restore prioritization

#### 3. Storage Optimization
- Use deduplication to reduce storage requirements
- Implement tiered storage for cost optimization
- Use compression to reduce storage costs
- Monitor storage usage and clean up old backups

#### 4. Network Optimization
- Use compression for network transfers
- Implement bandwidth throttling for backup operations
- Use local storage for frequently accessed backups
- Optimize network routing for backup operations

## Conclusion

The backup and disaster recovery infrastructure provides comprehensive data protection and business continuity capabilities. By following this guide, you can effectively implement and manage backup and disaster recovery procedures for your Content Pipeline system.

For additional support or questions, please refer to the troubleshooting section or contact the development team.
