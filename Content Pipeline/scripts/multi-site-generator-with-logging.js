// Multi-Site Content Generator with Structured Logging
// This script generates content for multiple WordPress sites with comprehensive logging

const { routeAndGenerateContent } = require('./topic-router');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const PipelineLogger = require('../lib/logging/logger');
const RunIdGenerator = require('../lib/logging/run-id-generator');
const SensitiveDataRedactor = require('../lib/logging/redaction');

// Initialize logging components
const runIdGenerator = new RunIdGenerator();
const redactor = new SensitiveDataRedactor();

// Content generation queue
const contentQueue = [];

// WordPress publishing function with logging
async function publishToWordPress(postData, topic, logger) {
    const sites = require('./topic-router').loadSiteConfigs();
    const targetSite = findBestSiteForTopic(topic, sites);
    
    if (!targetSite) {
        logger.error('No suitable site found for topic', { topic });
        throw new Error('No suitable site found for this topic');
    }

    logger.publishing('Starting WordPress publishing', {
        siteId: targetSite.id,
        siteName: targetSite.name,
        topic,
        postTitle: postData.title
    });

    try {
        const result = await publishPostToSite(postData, targetSite, logger);
        
        logger.publishing('Successfully published to WordPress', {
            siteId: targetSite.id,
            postId: result.id,
            postUrl: result.link,
            topic
        });

        return result;
    } catch (error) {
        logger.error('Failed to publish to WordPress', {
            siteId: targetSite.id,
            topic,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
}

// Enhanced publishPostToSite function with logging
async function publishPostToSite(postData, site, logger) {
    const siteLogger = logger.child({ siteId: site.id, siteName: site.name });
    
    siteLogger.publishing('Publishing post to site', {
        url: site.url,
        username: site.username,
        postTitle: postData.title
    });

    const auth = Buffer.from(`${site.username}:${site.appPassword}`).toString('base64');
    const postDataJson = JSON.stringify({
        title: postData.title,
        content: postData.content,
        status: 'draft',
        categories: postData.categories || [],
        tags: postData.tags || []
    });

    const options = {
        hostname: new URL(site.url).hostname,
        port: new URL(site.url).port || (site.url.startsWith('https') ? 443 : 80),
        path: '/wp-json/wp/v2/posts',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postDataJson),
            'Authorization': `Basic ${auth}`,
            'User-Agent': 'Content-Pipeline/1.0'
        }
    };

    return new Promise((resolve, reject) => {
        const req = (site.url.startsWith('https') ? https : http).request(options, (res) => {
            let data = '';
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        const response = JSON.parse(data);
                        siteLogger.publishing('Post published successfully', {
                            postId: response.id,
                            postUrl: response.link,
                            statusCode: res.statusCode
                        });
                        resolve(response);
                    } catch (parseError) {
                        siteLogger.error('Failed to parse WordPress response', {
                            error: parseError.message,
                            response: data
                        });
                        reject(parseError);
                    }
                } else {
                    siteLogger.error('WordPress API returned error', {
                        statusCode: res.statusCode,
                        statusMessage: res.statusMessage,
                        response: data
                    });
                    reject(new Error(`WordPress API error: ${res.statusCode} ${res.statusMessage}`));
                }
            });
        });

        req.on('error', (error) => {
            siteLogger.error('Network error during WordPress publishing', {
                error: error.message,
                code: error.code
            });
            reject(error);
        });

        req.write(postDataJson);
        req.end();
    });
}

// Find best site for topic with logging
function findBestSiteForTopic(topic, sites, logger) {
    logger.pipeline('Finding best site for topic', { topic, availableSites: sites.length });
    
    const activeSites = sites.filter(site => site.status === 'active');
    
    if (activeSites.length === 0) {
        logger.warn('No active sites available', { totalSites: sites.length });
        return null;
    }

    // Find sites that have this topic
    const matchingSites = activeSites.filter(site => 
        site.topics && site.topics.some(siteTopic => 
            siteTopic.toLowerCase().includes(topic.toLowerCase())
        )
    );

    if (matchingSites.length === 0) {
        logger.warn('No sites match topic', { 
            topic, 
            availableTopics: activeSites.flatMap(site => site.topics || [])
        });
        return activeSites[0]; // Fallback to first active site
    }

    const selectedSite = matchingSites[0];
    logger.pipeline('Selected site for topic', {
        siteId: selectedSite.id,
        siteName: selectedSite.name,
        topic,
        matchingSites: matchingSites.length
    });

    return selectedSite;
}

// Queue content for generation with logging
function queueContent(topic, logger) {
    logger.pipeline('Queueing content for generation', { topic });
    
    const contentJob = {
        id: require('uuid').v4(),
        topic,
        status: 'queued',
        createdAt: new Date().toISOString(),
        runId: logger.getRunId()
    };

    contentQueue.push(contentJob);
    
    logger.pipeline('Content queued successfully', {
        jobId: contentJob.id,
        topic,
        queueLength: contentQueue.length
    });

    return contentJob;
}

// Process content queue with logging
async function processContentQueue(logger) {
    logger.pipeline('Starting content queue processing', {
        queueLength: contentQueue.length
    });

    const results = [];
    const errors = [];

    for (const job of contentQueue) {
        const jobLogger = logger.child({ jobId: job.id, topic: job.topic });
        
        try {
            jobLogger.pipeline('Processing content job', {
                status: job.status,
                createdAt: job.createdAt
            });

            job.status = 'processing';
            job.startedAt = new Date().toISOString();

            // Generate content
            const content = await routeAndGenerateContent(job.topic, jobLogger);
            
            jobLogger.generation('Content generated successfully', {
                title: content.title,
                wordCount: content.content.length
            });

            // Publish to WordPress
            const publishResult = await publishToWordPress(content, job.topic, jobLogger);
            
            job.status = 'completed';
            job.completedAt = new Date().toISOString();
            job.result = {
                postId: publishResult.id,
                postUrl: publishResult.link
            };

            jobLogger.pipeline('Content job completed successfully', {
                postId: publishResult.id,
                postUrl: publishResult.link,
                duration: new Date(job.completedAt) - new Date(job.startedAt)
            });

            results.push(job);

        } catch (error) {
            job.status = 'failed';
            job.failedAt = new Date().toISOString();
            job.error = error.message;

            jobLogger.error('Content job failed', {
                error: error.message,
                stack: error.stack,
                duration: new Date(job.failedAt) - new Date(job.startedAt)
            });

            errors.push(job);
        }
    }

    logger.pipeline('Content queue processing completed', {
        totalJobs: contentQueue.length,
        successful: results.length,
        failed: errors.length,
        successRate: (results.length / contentQueue.length * 100).toFixed(2) + '%'
    });

    return { results, errors };
}

// Main execution function with logging
async function main() {
    // Generate run ID for this execution
    const runId = runIdGenerator.generateRunId({
        type: 'multi-site-generator',
        metadata: {
            version: '1.0.0',
            nodeVersion: process.version,
            platform: process.platform
        }
    });

    // Initialize logger
    const logger = new PipelineLogger({
        runId,
        service: 'multi-site-generator',
        environment: process.env.NODE_ENV || 'development'
    });

    logger.pipeline('Starting multi-site content generation', {
        runId,
        timestamp: new Date().toISOString(),
        topics: process.argv.slice(2)
    });

    try {
        // Get topics from command line arguments
        const topics = process.argv.slice(2);
        
        if (topics.length === 0) {
            logger.warn('No topics provided, using default topics');
            topics.push('artificial intelligence', 'health and wellness', 'technology');
        }

        // Queue content for each topic
        for (const topic of topics) {
            queueContent(topic, logger);
        }

        // Process the queue
        const { results, errors } = await processContentQueue(logger);

        // Log final results
        logger.pipeline('Multi-site generation completed', {
            totalTopics: topics.length,
            successful: results.length,
            failed: errors.length,
            runId
        });

        // Update run status
        runIdGenerator.updateRunStatus(runId, 'completed', {
            resultsCount: results.length,
            errorsCount: errors.length
        });

        // Clean up
        await logger.close();

    } catch (error) {
        logger.error('Fatal error in multi-site generation', {
            error: error.message,
            stack: error.stack,
            runId
        });

        runIdGenerator.updateRunStatus(runId, 'failed', {
            error: error.message
        });

        await logger.close();
        process.exit(1);
    }
}

// Export functions for testing
module.exports = {
    publishToWordPress,
    publishPostToSite,
    findBestSiteForTopic,
    queueContent,
    processContentQueue,
    main
};

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}
