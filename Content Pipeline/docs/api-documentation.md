# API Documentation - Content Pipeline

This document provides comprehensive API documentation for the Content Pipeline system, including job management, status queries, and administrative operations.

## 🌐 API Overview

The Content Pipeline provides a RESTful API built on Supabase Edge Functions. All endpoints require proper authentication and return JSON responses.

### Base URL
```
https://your-project.supabase.co/functions/v1/
```

### Authentication
- **Service Role**: Required for admin operations
- **Anon Key**: Required for public operations
- **Bearer Token**: Include in Authorization header

## 📋 Job Management API

### 1. Create Content Job

Creates a new content generation job.

**Endpoint:** `POST /content-automation`

**Authentication:** Anon Key

**Request Body:**
```json
{
  "topic": "The Future of AI in Content Marketing",
  "prompt_template": "Write a comprehensive article about {topic}",
  "model": "gpt-4",
  "tags": ["ai", "marketing", "future"],
  "categories": ["Technology", "Marketing"],
  "target_words": 700,
  "priority": "normal"
}
```

**Request Parameters:**
- `topic` (string, required): The topic for content generation
- `prompt_template` (string, optional): Custom prompt template
- `model` (string, optional): OpenAI model to use (default: "gpt-4")
- `tags` (array, optional): WordPress tags for the content
- `categories` (array, optional): WordPress categories for the content
- `target_words` (number, optional): Target word count (default: 700)
- `priority` (string, optional): Job priority ("low", "normal", "high")

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "topic": "The Future of AI in Content Marketing",
    "created_at": "2024-01-15T10:30:00Z",
    "estimated_completion": "2024-01-15T10:32:00Z"
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid topic provided",
  "code": "VALIDATION_ERROR"
}
```

### 2. Get Job Status

Retrieves the current status and details of a specific job.

**Endpoint:** `GET /content-automation`

**Authentication:** Anon Key

**Query Parameters:**
- `job_id` (string, required): The job ID to query

**Example Request:**
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/content-automation?job_id=550e8400-e29b-41d4-a716-446655440000" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "completed",
    "topic": "The Future of AI in Content Marketing",
    "created_at": "2024-01-15T10:30:00Z",
    "started_at": "2024-01-15T10:30:15Z",
    "completed_at": "2024-01-15T10:31:45Z",
    "retry_count": 0,
    "generated_title": "The Future of AI in Content Marketing: A Comprehensive Guide",
    "generated_content": "Artificial Intelligence is revolutionizing...",
    "wordpress_post_id": 12345,
    "tags": ["ai", "marketing", "future"],
    "categories": ["Technology", "Marketing"],
    "processing_time": 90
  }
}
```

### 3. List Jobs

Retrieves a list of jobs with optional filtering.

**Endpoint:** `GET /content-automation`

**Authentication:** Anon Key

**Query Parameters:**
- `status` (string, optional): Filter by status ("pending", "processing", "completed", "error")
- `limit` (number, optional): Number of jobs to return (default: 10, max: 100)
- `offset` (number, optional): Number of jobs to skip (default: 0)
- `sort_by` (string, optional): Sort field ("created_at", "updated_at", "status")
- `sort_order` (string, optional): Sort order ("asc", "desc", default: "desc")

**Example Request:**
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/content-automation?status=completed&limit=20&sort_by=created_at&sort_order=desc" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "jobs": [
      {
        "job_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "completed",
        "topic": "The Future of AI in Content Marketing",
        "created_at": "2024-01-15T10:30:00Z",
        "completed_at": "2024-01-15T10:31:45Z",
        "generated_title": "The Future of AI in Content Marketing: A Comprehensive Guide"
      }
    ],
    "pagination": {
      "total": 150,
      "limit": 20,
      "offset": 0,
      "has_more": true
    }
  }
}
```

## 🔧 Administrative API

### 1. Process Jobs

Manually triggers job processing (admin only).

**Endpoint:** `POST /content-automation`

**Authentication:** Service Role Key

**Request Body:**
```json
{
  "action": "process_jobs",
  "max_jobs": 5,
  "priority": "high"
}
```

**Request Parameters:**
- `action` (string, required): Must be "process_jobs"
- `max_jobs` (number, optional): Maximum jobs to process (default: 5)
- `priority` (string, optional): Process jobs with specific priority

**Response:**
```json
{
  "success": true,
  "data": {
    "processed_jobs": 3,
    "jobs": [
      {
        "job_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "processing",
        "started_at": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### 2. Admin Retry

Manually retry a failed job (admin only).

**Endpoint:** `POST /content-automation`

**Authentication:** Service Role Key

**Request Body:**
```json
{
  "action": "admin_retry",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "admin_user": "admin@example.com",
  "reason": "Manual retry after error resolution",
  "override_retry_limit": false
}
```

**Request Parameters:**
- `action` (string, required): Must be "admin_retry"
- `job_id` (string, required): The job ID to retry
- `admin_user` (string, required): Admin user performing the action
- `reason` (string, required): Reason for the retry
- `override_retry_limit` (boolean, optional): Override retry count limit

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "pending",
    "retry_count": 1,
    "admin_user": "admin@example.com",
    "retry_reason": "Manual retry after error resolution"
  }
}
```

### 3. Bulk Retry

Retry multiple failed jobs (admin only).

**Endpoint:** `POST /content-automation`

**Authentication:** Service Role Key

**Request Body:**
```json
{
  "action": "bulk_retry",
  "job_ids": [
    "550e8400-e29b-41d4-a716-446655440000",
    "550e8400-e29b-41d4-a716-446655440001"
  ],
  "admin_user": "admin@example.com",
  "reason": "Bulk retry after system maintenance"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "retried_jobs": 2,
    "failed_retries": 0,
    "jobs": [
      {
        "job_id": "550e8400-e29b-41d4-a716-446655440000",
        "status": "pending",
        "retry_count": 1
      },
      {
        "job_id": "550e8400-e29b-41d4-a716-446655440001",
        "status": "pending",
        "retry_count": 1
      }
    ]
  }
}
```

### 4. Cancel Job

Cancel a pending or processing job (admin only).

**Endpoint:** `POST /content-automation`

**Authentication:** Service Role Key

**Request Body:**
```json
{
  "action": "cancel_job",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "admin_user": "admin@example.com",
  "reason": "Job cancelled due to topic change"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "cancelled",
    "cancelled_at": "2024-01-15T10:30:00Z",
    "admin_user": "admin@example.com",
    "cancellation_reason": "Job cancelled due to topic change"
  }
}
```

### 5. Update Job Status

Update the status of a job (admin only).

**Endpoint:** `POST /content-automation`

**Authentication:** Service Role Key

**Request Body:**
```json
{
  "action": "update_job_status",
  "job_id": "550e8400-e29b-41d4-a716-446655440000",
  "new_status": "pending",
  "admin_user": "admin@example.com",
  "reason": "Reset job for reprocessing"
}
```

**Request Parameters:**
- `action` (string, required): Must be "update_job_status"
- `job_id` (string, required): The job ID to update
- `new_status` (string, required): New status ("pending", "processing", "completed", "error", "cancelled")
- `admin_user` (string, required): Admin user performing the action
- `reason` (string, required): Reason for the status change

**Response:**
```json
{
  "success": true,
  "data": {
    "job_id": "550e8400-e29b-41d4-a716-446655440000",
    "old_status": "error",
    "new_status": "pending",
    "updated_at": "2024-01-15T10:30:00Z",
    "admin_user": "admin@example.com",
    "update_reason": "Reset job for reprocessing"
  }
}
```

## 📊 Monitoring API

### 1. System Health

Get overall system health status.

**Endpoint:** `GET /health`

**Authentication:** None required

**Response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00Z",
    "components": {
      "database": {
        "status": "healthy",
        "response_time": 45
      },
      "openai_api": {
        "status": "healthy",
        "response_time": 1200
      },
      "wordpress_api": {
        "status": "healthy",
        "response_time": 800
      }
    },
    "metrics": {
      "active_jobs": 3,
      "pending_jobs": 12,
      "completed_today": 45,
      "failed_today": 2
    }
  }
}
```

### 2. System Metrics

Get detailed system performance metrics.

**Endpoint:** `GET /metrics`

**Authentication:** Service Role Key

**Query Parameters:**
- `period` (string, optional): Time period ("hour", "day", "week", "month")
- `start_date` (string, optional): Start date (ISO 8601 format)
- `end_date` (string, optional): End date (ISO 8601 format)

**Example Request:**
```bash
curl -X GET "https://your-project.supabase.co/functions/v1/metrics?period=day&start_date=2024-01-01&end_date=2024-01-15" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "day",
    "start_date": "2024-01-01",
    "end_date": "2024-01-15",
    "metrics": [
      {
        "date": "2024-01-15",
        "total_jobs": 50,
        "completed_jobs": 45,
        "failed_jobs": 5,
        "success_rate": 90.0,
        "avg_response_time": 1.8,
        "max_response_time": 4.2,
        "p95_response_time": 2.5
      }
    ],
    "summary": {
      "total_jobs": 750,
      "total_completed": 675,
      "total_failed": 75,
      "overall_success_rate": 90.0,
      "avg_response_time": 1.9
    }
  }
}
```

### 3. Monitoring Status

Get monitoring system status and configuration.

**Endpoint:** `GET /monitoring`

**Authentication:** Service Role Key

**Response:**
```json
{
  "success": true,
  "data": {
    "monitoring_enabled": true,
    "last_health_check": "2024-01-15T10:30:00Z",
    "alert_thresholds": {
      "failure_rate_warning": 10,
      "failure_rate_critical": 20,
      "response_time_warning": 3000,
      "response_time_critical": 5000
    },
    "active_alerts": 0,
    "recent_alerts": [
      {
        "alert_id": "alert-123",
        "type": "failure_rate",
        "level": "warning",
        "message": "Daily failure rate exceeded 10%",
        "created_at": "2024-01-14T15:30:00Z",
        "resolved_at": "2024-01-14T16:00:00Z"
      }
    ]
  }
}
```

## 🔧 Configuration API

### 1. Get Configuration

Get current system configuration.

**Endpoint:** `GET /config-manager`

**Authentication:** Service Role Key

**Response:**
```json
{
  "success": true,
  "data": {
    "max_retry_count": 3,
    "content_target_words": 700,
    "default_model": "gpt-4",
    "rate_limit_per_minute": 60,
    "max_concurrent_jobs": 5,
    "processing_timeout": 300,
    "default_categories": ["AI Content", "Technology"],
    "default_tags": ["automation", "ai", "content"]
  }
}
```

### 2. Update Configuration

Update system configuration (admin only).

**Endpoint:** `POST /config-manager`

**Authentication:** Service Role Key

**Request Body:**
```json
{
  "action": "update_config",
  "config_updates": {
    "max_retry_count": 5,
    "content_target_words": 800,
    "default_model": "gpt-4",
    "rate_limit_per_minute": 60
  },
  "admin_user": "admin@example.com",
  "reason": "Update system configuration"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "updated_config": {
      "max_retry_count": 5,
      "content_target_words": 800,
      "default_model": "gpt-4",
      "rate_limit_per_minute": 60
    },
    "updated_at": "2024-01-15T10:30:00Z",
    "admin_user": "admin@example.com"
  }
}
```

## 🧹 Maintenance API

### 1. Sweeper

Reset stuck processing jobs.

**Endpoint:** `POST /sweeper`

**Authentication:** Service Role Key

**Request Body:**
```json
{
  "stuck_threshold_minutes": 10,
  "admin_user": "admin@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reset_jobs": 2,
    "jobs": [
      {
        "job_id": "550e8400-e29b-41d4-a716-446655440000",
        "old_status": "processing",
        "new_status": "pending",
        "stuck_duration_minutes": 15
      }
    ]
  }
}
```

### 2. Cleanup

Clean up old job runs and failed jobs.

**Endpoint:** `POST /cleanup`

**Authentication:** Service Role Key

**Request Body:**
```json
{
  "action": "cleanup_job_runs",
  "retention_days": 90,
  "admin_user": "admin@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cleaned_job_runs": 1250,
    "cleaned_failed_jobs": 45,
    "retention_days": 90,
    "cleaned_at": "2024-01-15T10:30:00Z"
  }
}
```

## 📅 Scheduler API

### 1. Scheduler Status

Get current scheduler status and configuration.

**Endpoint:** `GET /scheduler`

**Authentication:** Service Role Key

**Response:**
```json
{
  "success": true,
  "data": {
    "scheduler_enabled": true,
    "last_run": "2024-01-15T10:30:00Z",
    "next_run": "2024-01-15T11:00:00Z",
    "configuration": {
      "interval_minutes": 30,
      "max_concurrent_jobs": 5,
      "processing_window": {
        "start_hour": 9,
        "end_hour": 17
      }
    },
    "status": "active"
  }
}
```

### 2. Pause/Resume Scheduler

Pause or resume job processing.

**Endpoint:** `POST /scheduler`

**Authentication:** Service Role Key

**Request Body:**
```json
{
  "action": "pause_scheduler",
  "admin_user": "admin@example.com",
  "reason": "System maintenance"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "action": "pause_scheduler",
    "status": "paused",
    "paused_at": "2024-01-15T10:30:00Z",
    "admin_user": "admin@example.com",
    "reason": "System maintenance"
  }
}
```

## 🔐 Secrets API

### 1. List Secrets

List all configured secrets (admin only).

**Endpoint:** `GET /secrets`

**Authentication:** Service Role Key

**Response:**
```json
{
  "success": true,
  "data": {
    "secrets": [
      {
        "name": "OPENAI_API_KEY",
        "configured": true,
        "last_updated": "2024-01-15T10:30:00Z"
      },
      {
        "name": "WORDPRESS_APP_PASSWORD",
        "configured": true,
        "last_updated": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

### 2. Test Secrets

Test secret functionality (admin only).

**Endpoint:** `POST /secrets`

**Authentication:** Service Role Key

**Request Body:**
```json
{
  "action": "test_secrets",
  "admin_user": "admin@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "test_results": {
      "OPENAI_API_KEY": {
        "status": "valid",
        "response_time": 1200
      },
      "WORDPRESS_APP_PASSWORD": {
        "status": "valid",
        "response_time": 800
      }
    },
    "tested_at": "2024-01-15T10:30:00Z"
  }
}
```

## 🚨 Error Handling

### Error Response Format

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Additional error details"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Invalid request parameters
- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `RATE_LIMIT_EXCEEDED`: Rate limit exceeded
- `INTERNAL_ERROR`: Internal server error
- `EXTERNAL_API_ERROR`: External API error
- `DATABASE_ERROR`: Database operation error

### Rate Limiting

- **Public Endpoints**: 100 requests per minute per IP
- **Admin Endpoints**: 1000 requests per minute per service role
- **Rate Limit Headers**: Included in all responses

## 📚 SDK Examples

### JavaScript/Node.js

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);

// Create a content job
async function createJob(topic) {
  const { data, error } = await supabase.functions.invoke('content-automation', {
    body: {
      topic: topic,
      model: 'gpt-4',
      tags: ['ai', 'content'],
      categories: ['Technology']
    }
  });
  
  if (error) throw error;
  return data;
}

// Get job status
async function getJobStatus(jobId) {
  const { data, error } = await supabase.functions.invoke('content-automation', {
    method: 'GET',
    body: { job_id: jobId }
  });
  
  if (error) throw error;
  return data;
}
```

### Python

```python
import requests
import json

class ContentPipelineAPI:
    def __init__(self, base_url, api_key):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {api_key}',
            'Content-Type': 'application/json'
        }
    
    def create_job(self, topic, **kwargs):
        payload = {
            'topic': topic,
            **kwargs
        }
        response = requests.post(
            f'{self.base_url}/content-automation',
            headers=self.headers,
            json=payload
        )
        return response.json()
    
    def get_job_status(self, job_id):
        response = requests.get(
            f'{self.base_url}/content-automation',
            headers=self.headers,
            params={'job_id': job_id}
        )
        return response.json()

# Usage
api = ContentPipelineAPI(
    'https://your-project.supabase.co/functions/v1',
    'your-anon-key'
)

job = api.create_job('AI in Marketing')
status = api.get_job_status(job['data']['job_id'])
```

### cURL Examples

```bash
# Create a job
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "The Future of AI",
    "model": "gpt-4",
    "tags": ["ai", "future"],
    "categories": ["Technology"]
  }'

# Get job status
curl -X GET "https://your-project.supabase.co/functions/v1/content-automation?job_id=JOB_ID" \
  -H "Authorization: Bearer YOUR_ANON_KEY"

# Admin retry
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "admin_retry",
    "job_id": "JOB_ID",
    "admin_user": "admin@example.com",
    "reason": "Manual retry"
  }'
```

---

**Last Updated:** [Current Date]
**Version:** 1.0
**Next Review:** [Next Review Date]
**API Version:** v1
