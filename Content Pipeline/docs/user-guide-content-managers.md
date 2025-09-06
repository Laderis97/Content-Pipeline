# Content Manager User Guide

This guide is designed for content managers who will be using the Content Pipeline system to create and manage automated content generation.

## Table of Contents

1. [System Overview](#system-overview)
2. [Getting Started](#getting-started)
3. [Creating Content Jobs](#creating-content-jobs)
4. [Monitoring Job Status](#monitoring-job-status)
5. [Managing Content](#managing-content)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

## System Overview

The Content Pipeline is an automated content generation system that:
- Creates high-quality content using AI
- Automatically posts to WordPress as drafts
- Manages content workflow and approval processes
- Provides real-time monitoring and status updates

### Key Features
- **Automated Content Generation**: AI-powered content creation
- **WordPress Integration**: Automatic draft post creation
- **Real-time Monitoring**: Live status updates and progress tracking
- **Quality Control**: Built-in content validation and review processes
- **Scalable Processing**: Handles multiple content jobs simultaneously

## Getting Started

### Accessing the System

1. **Navigate to the Content Pipeline Dashboard**
   - URL: `https://zjqsfdqhhvhbwqmgdfzn.supabase.co/dashboard`
   - Login with your provided credentials

2. **Main Dashboard Overview**
   - View active content jobs
   - Monitor system status
   - Access job creation tools
   - Review performance metrics

### User Permissions

Your account has the following permissions:
- ✅ Create new content jobs
- ✅ View job status and progress
- ✅ Edit job details (before processing)
- ✅ Cancel pending jobs
- ✅ View generated content
- ❌ Cannot modify system settings
- ❌ Cannot access admin functions

## Creating Content Jobs

### Step 1: Access Job Creation

1. Navigate to the **Content Jobs** section
2. Click **"Create New Job"** button
3. Fill in the job creation form

### Step 2: Job Configuration

#### Required Fields

**Topic** (Required)
- Enter a clear, descriptive topic for the content
- Examples:
  - ✅ "Artificial Intelligence in Healthcare"
  - ✅ "Sustainable Living Tips for Urban Dwellers"
  - ✅ "Digital Marketing Trends 2024"
  - ❌ "AI" (too vague)
  - ❌ "Stuff about technology" (unclear)

**Content Type** (Required)
- Select from predefined content types:
  - Blog Post
  - Article
  - News Update
  - Educational Content
  - Product Review

#### Optional Fields

**Target Word Count**
- Default: 800-1200 words
- Range: 300-2000 words
- Leave blank for automatic optimization

**Target Audience**
- General Audience
- Technical Professionals
- Business Leaders
- Students
- Industry Experts

**Content Tone**
- Professional
- Conversational
- Educational
- News/Informational
- Marketing/Persuasive

**Keywords** (Optional)
- Enter relevant keywords separated by commas
- Example: "AI, healthcare, technology, innovation"

### Step 3: Submit Job

1. Review all entered information
2. Click **"Create Job"** to submit
3. Job will be assigned a unique ID
4. Status will be set to "Pending"

## Monitoring Job Status

### Job Status Types

| Status | Description | Action Required |
|--------|-------------|-----------------|
| **Pending** | Job created, waiting for processing | None - wait for processing |
| **Processing** | Content generation in progress | None - monitor progress |
| **Completed** | Content generated successfully | Review and approve content |
| **Failed** | Error occurred during processing | Check error details, retry if needed |
| **Cancelled** | Job was cancelled | Create new job if needed |

### Monitoring Tools

#### 1. Job List View
- View all jobs in a table format
- Sort by status, date, or topic
- Filter by status or date range
- Quick status overview

#### 2. Job Details Page
- Detailed job information
- Processing history
- Generated content preview
- Error messages (if any)

#### 3. Real-time Updates
- Status changes are updated automatically
- No need to refresh the page
- Email notifications for status changes

### Understanding Processing Times

**Typical Processing Times:**
- Simple topics: 2-5 minutes
- Complex topics: 5-15 minutes
- Technical content: 10-20 minutes
- Long-form content: 15-30 minutes

**Factors Affecting Processing Time:**
- Content complexity
- Current system load
- Content length requirements
- External API response times

## Managing Content

### Reviewing Generated Content

#### 1. Access Generated Content
1. Navigate to completed jobs
2. Click on job ID to view details
3. Review generated content

#### 2. Content Review Checklist
- [ ] Content quality and accuracy
- [ ] Proper formatting and structure
- [ ] Keyword integration
- [ ] Tone and style appropriateness
- [ ] Factual accuracy
- [ ] Grammar and spelling

#### 3. Content Actions

**Approve Content**
- Click "Approve" to publish to WordPress
- Content will be published as a draft
- You can edit in WordPress before publishing

**Request Revisions**
- Click "Request Revision" if changes needed
- Provide specific feedback
- Job will be reprocessed with new requirements

**Reject Content**
- Click "Reject" if content doesn't meet standards
- Provide reason for rejection
- Job will be marked as failed

### WordPress Integration

#### Draft Post Creation
- All approved content is automatically posted to WordPress as drafts
- Posts include:
  - Generated title
  - Full content body
  - Assigned categories
  - Relevant tags
  - SEO metadata

#### WordPress Workflow
1. Content posted as draft
2. Review in WordPress admin
3. Make final edits if needed
4. Schedule or publish immediately
5. Monitor post performance

## Troubleshooting

### Common Issues and Solutions

#### Job Stuck in "Processing" Status

**Symptoms:**
- Job has been processing for more than 30 minutes
- No status updates received

**Solutions:**
1. Check system status dashboard
2. Wait additional 10-15 minutes
3. If still stuck, contact system administrator
4. Consider cancelling and recreating job

#### Job Failed with Error

**Symptoms:**
- Job status shows "Failed"
- Error message displayed

**Common Error Types:**
- **API Rate Limit**: Wait 15-30 minutes and retry
- **Content Generation Error**: Try rephrasing the topic
- **WordPress Connection Error**: Contact administrator
- **System Error**: Contact technical support

**Solutions:**
1. Review error message details
2. Try creating job with different topic
3. Check if issue is system-wide
4. Contact support if problem persists

#### Content Quality Issues

**Symptoms:**
- Generated content doesn't match requirements
- Content seems generic or low-quality

**Solutions:**
1. Provide more specific topic description
2. Add relevant keywords
3. Specify target audience
4. Request revision with detailed feedback

### Getting Help

#### Self-Service Resources
- System documentation
- FAQ section
- Video tutorials
- Best practices guide

#### Contact Support
- **Email**: support@contentpipeline.com
- **Slack**: #content-pipeline-support
- **Phone**: (555) 123-4567
- **Hours**: Monday-Friday, 9 AM - 6 PM EST

## Best Practices

### Creating Effective Content Jobs

#### 1. Write Clear Topics
- Be specific and descriptive
- Include key concepts and focus areas
- Avoid vague or overly broad topics

**Good Examples:**
- "10 Ways to Improve Customer Service in Retail"
- "The Future of Renewable Energy in Urban Planning"
- "Best Practices for Remote Team Management"

**Poor Examples:**
- "Customer service"
- "Energy stuff"
- "Work from home"

#### 2. Provide Context
- Specify target audience
- Include relevant background information
- Mention any specific requirements

#### 3. Use Keywords Effectively
- Include 3-5 relevant keywords
- Use natural, conversational keywords
- Avoid keyword stuffing

### Managing Workflow

#### 1. Plan Content Calendar
- Create jobs in advance
- Schedule content for optimal timing
- Balance different content types

#### 2. Monitor System Performance
- Check system status regularly
- Plan around peak usage times
- Monitor processing times

#### 3. Quality Control
- Review all generated content
- Provide feedback for improvements
- Maintain content standards

### Content Strategy Tips

#### 1. Topic Selection
- Choose trending and relevant topics
- Balance evergreen and timely content
- Consider your audience's interests

#### 2. Content Optimization
- Use generated content as a starting point
- Add personal insights and examples
- Optimize for SEO

#### 3. Performance Tracking
- Monitor content performance in WordPress
- Track engagement metrics
- Adjust strategy based on results

## System Limits and Guidelines

### Job Limits
- **Maximum Jobs per Day**: 50
- **Maximum Jobs per Hour**: 10
- **Maximum Concurrent Jobs**: 5

### Content Guidelines
- **Minimum Word Count**: 300 words
- **Maximum Word Count**: 2000 words
- **Content Types**: Blog posts, articles, news updates
- **Prohibited Content**: Spam, inappropriate, or illegal content

### Best Practices for System Health
- Don't create too many jobs simultaneously
- Monitor system status before creating jobs
- Report issues promptly
- Follow content guidelines

## Frequently Asked Questions

### Q: How long does it take to generate content?
A: Typically 2-30 minutes depending on content complexity and system load.

### Q: Can I edit the generated content?
A: Yes, all content is posted as drafts in WordPress where you can edit before publishing.

### Q: What if I'm not satisfied with the generated content?
A: You can request revisions with specific feedback or reject the content and create a new job.

### Q: Can I cancel a job that's already processing?
A: Yes, you can cancel jobs in "Pending" or "Processing" status.

### Q: How do I know if the system is working properly?
A: Check the system status dashboard and monitor job processing times.

### Q: Can I schedule content for future publication?
A: Yes, after content is generated and approved, you can schedule it in WordPress.

## Conclusion

The Content Pipeline system is designed to streamline your content creation workflow while maintaining high quality standards. By following this guide and best practices, you can maximize the system's effectiveness and create engaging, valuable content for your audience.

For additional support or questions not covered in this guide, please contact the support team using the information provided above.
