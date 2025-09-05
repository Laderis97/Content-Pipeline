# Product Requirements Document: Daily Content Automation

## Introduction/Overview

The Daily Content Automation system is a serverless pipeline that automatically generates and publishes blog content by pulling pending jobs from Supabase, generating SEO-optimized content via OpenAI, and posting drafts to WordPress. This system aims to reduce manual content creation effort by ~80% while scaling production to 1-3 posts per day (10-20 per week) with improved SEO consistency and topical coverage.

## Goals

1. **Reduce Manual Effort**: Decrease manual content creation workload by approximately 80%
2. **Scale Content Production**: Automate generation of 1-3 blog posts daily (10-20 weekly)
3. **Improve SEO Consistency**: Ensure consistent SEO optimization and topical coverage through automated generation
4. **Maintain Quality**: Generate 600-800 word blog posts with proper validation and human review workflow
5. **Ensure Reliability**: Achieve <1% duplicate posts with <2s median function latency and idempotent retry behavior

## User Stories

### Primary Users
- **Content Manager**: As a content manager, I want automated blog post generation so that I can focus on strategy and review rather than writing
- **SEO Specialist**: As an SEO specialist, I want consistent, SEO-optimized content so that our search rankings improve
- **Site Administrator**: As a site administrator, I want reliable automation with proper error handling so that the system runs without manual intervention

### User Stories
1. **As a content manager**, I want to queue content topics in the system so that blog posts are automatically generated and ready for review
2. **As a content manager**, I want all generated posts to be saved as drafts so that I can review and edit before publishing
3. **As a site administrator**, I want the system to retry failed jobs automatically so that temporary issues don't require manual intervention
4. **As a content manager**, I want to see detailed logs of content generation so that I can monitor quality and troubleshoot issues
5. **As a site administrator**, I want alerts when job failure rates exceed 20% so that I can address systemic issues quickly

## Functional Requirements

### Core Functionality
1. The system must pull one pending job from `content_jobs` table using atomic claim mechanism
2. The system must generate SEO-safe HTML content via OpenAI API using the job's `prompt_template`
3. The system must post generated content as a draft to WordPress using the `content-bot` user
4. The system must record the WordPress `post_id` back to the job record
5. The system must handle retries with exponential backoff (max 3 attempts)
6. The system must support concurrent processing of up to 3-5 jobs simultaneously

### Data Management
7. The system must update job status to `processing` when claimed and `completed` when successful
8. The system must increment `retry_count` and store `last_error` for failed attempts
9. The system must mark jobs as `error` status after 3 failed retry attempts
10. The system must store detailed execution logs in `job_runs` table with job_id, timings, and results
11. The system must use WordPress categories and tags from `content_jobs` table with fallback defaults

### Content Generation
12. The system must generate content with 600-800 word target length
13. The system must validate generated content (non-empty, meets minimum word count) before posting
14. The system must support different content templates via `prompt_template` field
15. The system must generate SEO-optimized HTML content suitable for WordPress

### Error Handling & Resilience
16. The system must handle WordPress unavailability by requeuing jobs and incrementing retry count
17. The system must handle OpenAI API failures with exponential backoff retry logic
18. The system must provide manual override capability for admins to retry failed jobs
19. The system must implement sweeper functionality to reset stale "processing" jobs
20. The system must send alerts when daily job failure rate exceeds 20%

### Security & Configuration
21. The system must use `SUPABASE_SERVICE_ROLE_KEY` (not anon key) for Edge Functions
22. The system must store secrets (OpenAI key, WordPress app password, service tokens) in Supabase Vault or function environment variables
23. The system must never store secrets inline in SQL queries or repository code
24. The system must implement atomic job claiming via RPC with `FOR UPDATE SKIP LOCKED`

## Non-Goals (Out of Scope)

1. **Auto-publishing**: Content will never be automatically published; all posts remain as drafts
2. **Multi-site WordPress**: System supports only single WordPress site (not multi-site)
3. **Real-time Processing**: Jobs are processed on scheduled intervals, not real-time
4. **Content Moderation**: No built-in content moderation or approval workflows
5. **Advanced SEO Analysis**: No real-time SEO scoring or optimization beyond basic requirements
6. **User Interface**: No admin UI for job management (database/API only)
7. **Content Templates**: No visual template editor (templates managed via database)
8. **Analytics Integration**: No built-in analytics or performance tracking beyond basic logging

## Design Considerations

### Database Schema
- **content_jobs table**: Core job management with status tracking, retry logic, and WordPress integration fields
- **job_runs table**: Detailed execution logging with timings and results for monitoring
- **Required columns**: id, topic, status, prompt_template, model, retry_count, claimed_at, last_error, generated_title, generated_content, wordpress_post_id, tags, categories

### API Integration
- **OpenAI API**: Content generation with configurable models and prompt templates
- **WordPress REST API**: Draft post creation with proper metadata and categorization
- **Rate Limiting**: Respect OpenAI (<100 calls/min) and WordPress API limits

### Monitoring & Logging
- **Supabase Logs**: Primary logging mechanism for function execution
- **job_runs table**: Structured logging with job_id, execution time, status, and error details
- **Alerting**: Automated alerts for failure rate thresholds

## Technical Considerations

### Architecture
- **Supabase Edge Functions**: Serverless execution environment with service role authentication
- **PostgreSQL**: Database with atomic job claiming and transaction safety
- **Cron Scheduling**: pg_cron or external scheduler for regular job processing
- **Concurrent Processing**: Support for 3-5 simultaneous job executions

### Dependencies
- Supabase Edge Functions runtime
- OpenAI API access with appropriate rate limits
- WordPress site with REST API enabled and app password authentication
- PostgreSQL with pg_cron extension (if using database scheduling)

### Performance Requirements
- **Latency**: <2s median function execution time
- **Throughput**: Support 5-10 jobs per hour peak load
- **Reliability**: <1% duplicate post rate
- **Idempotency**: Safe retry behavior without side effects

## Success Metrics

### Primary Metrics
1. **Automation Rate**: 80% reduction in manual content creation effort
2. **Production Volume**: Consistent 1-3 posts per day (10-20 weekly)
3. **Quality**: <1% duplicate posts generated
4. **Performance**: <2s median function latency
5. **Reliability**: <20% daily job failure rate

### Secondary Metrics
1. **Content Quality**: Generated posts meet 600-800 word target
2. **SEO Performance**: Improved search ranking consistency
3. **System Uptime**: 99%+ availability for job processing
4. **Error Recovery**: Successful retry rate >90% for transient failures

## Open Questions

1. **Content Templates**: What specific prompt templates should be included by default?
2. **WordPress User Setup**: What permissions and capabilities should the `content-bot` user have?
3. **Default Categories/Tags**: What fallback categories and tags should be used when none specified?
4. **Alerting Integration**: Which alerting system should be used for failure notifications?
5. **Content Validation**: What specific validation rules should be applied to generated content?
6. **Sweeper Frequency**: How often should the sweeper run to reset stale processing jobs?
7. **Retry Intervals**: What specific exponential backoff intervals should be used?
8. **Monitoring Dashboard**: Should there be a simple monitoring interface for job status and metrics?

## Definition of Done

### Development Deliverables
- [ ] Database schema migrations applied (content_jobs + job_runs tables)
- [ ] Edge Function deployed with complete job processing pipeline
- [ ] Atomic job claim RPC function implemented
- [ ] OpenAI integration with content generation and validation
- [ ] WordPress API integration for draft post creation
- [ ] Comprehensive error handling and retry logic
- [ ] Detailed logging to job_runs table

### Infrastructure & Operations
- [ ] Cron scheduler configured (pg_cron or external service)
- [ ] Monitoring and sweeper cron jobs deployed
- [ ] Secrets properly configured in Supabase Vault or function environment
- [ ] Alerting system configured for failure rate thresholds

### Documentation & Support
- [ ] Technical runbook for error handling and troubleshooting
- [ ] Secret rotation procedures documented
- [ ] Manual retry procedures documented
- [ ] System monitoring and maintenance procedures
- [ ] API documentation for job management

### Testing & Validation
- [ ] Unit tests for core functionality
- [ ] Integration tests for OpenAI and WordPress APIs
- [ ] Load testing for concurrent job processing
- [ ] Error scenario testing and recovery validation
- [ ] End-to-end workflow testing with real content generation
