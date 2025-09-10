# Content Pipeline - Daily Content Automation System

A comprehensive Supabase-based content automation system that generates and publishes daily blog content using OpenAI and WordPress integration.

## 🎨 Modern CSS System (2025)

This project now includes a complete modern CSS system with:
- OKLCH color space for better color accuracy
- Container Queries and Subgrid support
- Fluid typography with clamp()
- Dark mode support
- WCAG 2.1 AA accessibility compliance
- Comprehensive component library

## 🚀 Features

- **Automated Content Generation**: AI-powered blog post creation using OpenAI GPT models
- **WordPress Integration**: Seamless draft posting to WordPress sites
- **Concurrent Processing**: Handle multiple content jobs simultaneously (3-5 concurrent jobs)
- **Robust Error Handling**: Exponential backoff retry logic with graceful degradation
- **Comprehensive Monitoring**: Real-time health checks, metrics collection, and alerting
- **Admin Controls**: Manual retry capabilities and job management
- **Performance Optimized**: Sub-2-second response times with efficient database operations
- **Secure**: Secrets management through Supabase Vault

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase CLI
- Supabase project with Edge Functions enabled
- OpenAI API key
- WordPress site with REST API access
- PostgreSQL database (via Supabase)

## 🛠️ Installation & Setup

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd content-pipeline
npm install
```

### 2. Supabase Setup

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Start local development (optional)
supabase start
```

## 🚀 Deployment Status

**✅ COMPLETED:**
- ✅ Environment Setup & Prerequisites
- ✅ Database Setup & Migrations (18 migrations applied)
- ✅ Edge Functions Deployment (12/13 functions deployed)
- ✅ Build Process & Dependencies

**🔄 IN PROGRESS:**
- 🔄 Database connectivity testing
- 🔄 Secrets & Configuration Management

**📋 NEXT STEPS:**
- 📋 Complete Edge Functions deployment (1 remaining)
- 📋 Production testing and validation
- 📋 Go-live preparation

**Status**: Supabase CLI installed and project linked ✅

### 3. Database Migrations

```bash
# Apply all database migrations
supabase db push

# Or apply individually
supabase db push --file supabase/migrations/001_create_content_jobs_table.sql
supabase db push --file supabase/migrations/002_create_job_runs_table.sql
# ... continue for all migration files
```

**Status**: Migrations 001-005 applied successfully ✅
- ✅ 001: Content jobs table created
- ✅ 002: Job runs table created  
- ✅ 003: Job claiming RPC functions created
- ✅ 004: Performance indexes added
- ✅ 005: Status update functions created

### 4. Environment Configuration

Set up your environment variables in Supabase:

```bash
# Set OpenAI API key
supabase secrets set OPENAI_API_KEY=your_openai_api_key_here

# Set WordPress credentials
supabase secrets set WORDPRESS_URL=https://your-wordpress-site.com
supabase secrets set WORDPRESS_USERNAME=content-bot
supabase secrets set WORDPRESS_APP_PASSWORD=your_app_password_here

# Set content configuration
supabase secrets set DEFAULT_CATEGORY=AI Content
supabase secrets set DEFAULT_TAGS=automation,ai,content
supabase secrets set CONTENT_TARGET_WORDS=700
```

### 5. Deploy Edge Functions

```bash
# Deploy all functions
supabase functions deploy

# Or deploy individually
supabase functions deploy content-automation
supabase functions deploy concurrent-content-processor
supabase functions deploy scheduler
# ... continue for all functions
```

### 6. Set Up Scheduler

```bash
# Configure pg_cron for automated job processing
supabase functions invoke scheduler --method POST --data '{"action": "setup_schedule"}'
```

## 🎯 Usage

### Creating Content Jobs

```bash
# Create a new content job
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "topic": "The Future of AI in Content Marketing",
    "prompt_template": "Write a comprehensive article about {topic}",
    "model": "gpt-4",
    "tags": ["ai", "marketing", "future"],
    "categories": ["Technology", "Marketing"]
  }'
```

### Processing Jobs

Jobs are automatically processed by the scheduler, but you can trigger manual processing:

```bash
# Process pending jobs
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "process_jobs"}'
```

### Monitoring System Health

```bash
# Check system health
curl -X GET https://your-project.supabase.co/functions/v1/health

# Get metrics
curl -X GET https://your-project.supabase.co/functions/v1/metrics

# Check monitoring status
curl -X GET https://your-project.supabase.co/functions/v1/monitoring
```

### Admin Operations

```bash
# Manual retry for failed jobs
curl -X POST https://your-project.supabase.co/functions/v1/content-automation \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "admin_retry",
    "job_id": "job-uuid-here",
    "admin_user": "admin@example.com"
  }'

# Reset stale processing jobs
curl -X POST https://your-project.supabase.co/functions/v1/sweeper \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY"
```

## 📊 Monitoring & Alerting

The system includes comprehensive monitoring:

- **Health Checks**: Automated system health monitoring
- **Metrics Collection**: Success rates, performance metrics, and error tracking
- **Alerting**: Automatic alerts when daily failure rate exceeds 20%
- **Logging**: Detailed execution logs in the `job_runs` table

### Viewing Logs

```sql
-- Check recent job runs
SELECT * FROM job_runs 
ORDER BY execution_time DESC 
LIMIT 10;

-- Check job status distribution
SELECT status, COUNT(*) 
FROM content_jobs 
GROUP BY status;

-- View error details
SELECT job_id, last_error, retry_count 
FROM content_jobs 
WHERE status = 'error';
```

## 🔧 Configuration

### Content Generation Settings

- **Target Word Count**: 600-800 words (configurable)
- **Models**: GPT-4, GPT-3.5-turbo (configurable per job)
- **Retry Logic**: Maximum 3 attempts with exponential backoff
- **Concurrent Jobs**: 3-5 simultaneous processing jobs

### WordPress Integration

- **Authentication**: App password for `content-bot` user
- **Post Status**: Draft posts (requires manual review)
- **Categories**: Configurable with fallback defaults
- **Tags**: Configurable with fallback defaults

## 🚨 Troubleshooting

### Common Issues

1. **Jobs Stuck in Processing**
   ```bash
   # Run sweeper to reset stale jobs
   supabase functions invoke sweeper
   ```

2. **High Failure Rate**
   ```bash
   # Check recent errors
   curl -X GET https://your-project.supabase.co/functions/v1/monitoring
   ```

3. **WordPress Connection Issues**
   ```bash
   # Test WordPress connectivity
   supabase functions invoke wordpress-test
   ```

4. **OpenAI API Issues**
   ```bash
   # Test OpenAI connectivity
   supabase functions invoke openai-failure-test
   ```

### Debug Mode

Enable debug logging by setting the environment variable:
```bash
supabase secrets set DEBUG_MODE=true
```

## 📁 Project Structure

```
content-pipeline/
├── supabase/
│   ├── functions/           # Edge Functions
│   │   ├── content-automation/    # Main processing pipeline
│   │   ├── _shared/              # Shared utilities
│   │   └── [function-name]/      # Individual functions
│   └── migrations/          # Database migrations
├── docs/                   # Documentation
├── scripts/               # Deployment scripts
└── tasks/                 # Task management
```

## 🔐 Security

- All API keys stored in Supabase Vault
- Service role authentication for admin operations
- Input validation and sanitization
- Rate limiting for external API calls
- Audit logging for admin actions

## 📈 Performance

- **Response Time**: <2 seconds for job processing
- **Concurrency**: 3-5 simultaneous jobs
- **Database**: Optimized with proper indexes
- **Caching**: Idempotency keys prevent duplicate processing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section above
- Review the documentation in the `docs/` folder
- Create an issue in the repository

## 🔄 Maintenance

### Regular Tasks

- Monitor daily failure rates
- Review and rotate API keys quarterly
- Clean up old job runs (automated)
- Update dependencies monthly

### Backup & Recovery

The system includes automated backup procedures. See `docs/backup-disaster-recovery.md` for detailed information.

---

**Built with ❤️ using Supabase, OpenAI, and WordPress**
