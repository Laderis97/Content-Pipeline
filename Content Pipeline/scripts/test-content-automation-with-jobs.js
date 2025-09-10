#!/usr/bin/env node

/**
 * Content Automation Test with Job Queue
 * Creates a job in the database and then processes it via the content-automation function
 */

const https = require('https');

// Configuration
const CONFIG = {
  supabase: {
    url: 'https://zjqsfdqhhvhbwqmgdfzn.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo'
  }
};

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Content-Pipeline-Test/1.0',
        ...options.headers
      },
      timeout: 120000 // 2 minutes for content generation
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: jsonData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function createContentJob() {
  log('\n📝 Creating content job in database...', 'yellow');
  
  const jobData = {
    topic: 'The Future of Artificial Intelligence in Business',
    prompt_template: 'Create a comprehensive blog post about {topic} that is informative, engaging, and valuable for business professionals.',
    model: 'gpt-4',
    tags: ['AI', 'Business', 'Technology', 'Future'],
    categories: ['Technology', 'Business']
  };

  try {
    const response = await makeRequest(`${CONFIG.supabase.url}/rest/v1/content_jobs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
        'apikey': CONFIG.supabase.anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: jobData
    });

    if (response.status === 201 && response.data && response.data.length > 0) {
      const job = response.data[0];
      log('   ✅ Content job created successfully', 'green');
      log(`   📝 Job ID: ${job.id}`, 'blue');
      log(`   📋 Topic: ${job.topic}`, 'blue');
      log(`   📊 Status: ${job.status}`, 'blue');
      return job;
    } else {
      log(`   ❌ Failed to create job: ${response.status}`, 'red');
      log(`   📄 Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
      throw new Error(`Failed to create job: ${response.status}`);
    }
  } catch (error) {
    log(`   ❌ Job creation failed: ${error.message}`, 'red');
    throw error;
  }
}

async function processContentJob(jobId) {
  log('\n🤖 Processing content job via Supabase function...', 'cyan');
  
  try {
    const response = await makeRequest(`${CONFIG.supabase.url}/functions/v1/content-automation`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        mode: 'single',
        max_jobs: 1
      }
    });

    log(`\n📊 Response Status: ${response.status}`, 'blue');

    if (response.status === 200) {
      log('   ✅ Content automation completed successfully!', 'green');
      
      if (response.data.success) {
        log('\n📝 Processing Results:', 'bold');
        log(`   Job ID: ${response.data.job_id || 'N/A'}`, 'blue');
        log(`   Mode: ${response.data.mode || 'N/A'}`, 'blue');
        
        if (response.data.timings) {
          log('\n📊 Performance Metrics:', 'bold');
          log(`   Function Duration: ${response.data.timings.function_duration_ms || 'N/A'}ms`, 'blue');
          log(`   Total Duration: ${response.data.timings.total_duration || 'N/A'}ms`, 'blue');
        }
        
        log('\n🎉 Content automation workflow completed successfully!', 'green');
        return response.data;
        
      } else {
        log('   ❌ Content automation failed', 'red');
        log(`   Error: ${response.data.error || 'Unknown error'}`, 'red');
        if (response.data.details) {
          log(`   Details: ${JSON.stringify(response.data.details, null, 2)}`, 'red');
        }
        return null;
      }
      
    } else {
      log('   ❌ Supabase function call failed', 'red');
      log(`   Status: ${response.status}`, 'red');
      log(`   Response: ${JSON.stringify(response.data, null, 2)}`, 'red');
      return null;
    }

  } catch (error) {
    log(`\n❌ Processing failed: ${error.message}`, 'red');
    return null;
  }
}

async function checkJobStatus(jobId) {
  log('\n🔍 Checking job status...', 'yellow');
  
  try {
    const response = await makeRequest(`${CONFIG.supabase.url}/rest/v1/content_jobs?id=eq.${jobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CONFIG.supabase.anonKey}`,
        'apikey': CONFIG.supabase.anonKey,
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 200 && response.data && response.data.length > 0) {
      const job = response.data[0];
      log('   ✅ Job status retrieved', 'green');
      log(`   📊 Status: ${job.status}`, 'blue');
      log(`   📝 Generated Title: ${job.generated_title || 'N/A'}`, 'blue');
      log(`   📄 Content Length: ${job.generated_content ? job.generated_content.length : 0} characters`, 'blue');
      log(`   🔗 WordPress Post ID: ${job.wordpress_post_id || 'N/A'}`, 'blue');
      
      if (job.last_error) {
        log(`   ❌ Last Error: ${job.last_error}`, 'red');
      }
      
      return job;
    } else {
      log(`   ❌ Failed to get job status: ${response.status}`, 'red');
      return null;
    }
  } catch (error) {
    log(`   ❌ Status check failed: ${error.message}`, 'red');
    return null;
  }
}

async function testContentAutomationWithJobs() {
  log('\n🚀 Content Automation Test with Job Queue', 'bold');
  log('=' .repeat(60), 'blue');
  
  let jobId = null;
  
  try {
    // Step 1: Create a content job
    log('\n📋 Step 1: Create Content Job', 'bold');
    const job = await createContentJob();
    jobId = job.id;
    
    // Step 2: Process the job
    log('\n📋 Step 2: Process Content Job', 'bold');
    const result = await processContentJob(jobId);
    
    // Step 3: Check final job status
    log('\n📋 Step 3: Check Final Job Status', 'bold');
    const finalJob = await checkJobStatus(jobId);
    
    // Summary
    log('\n📊 Content Automation Test Summary', 'bold');
    log('=' .repeat(60), 'blue');
    
    if (finalJob && finalJob.status === 'completed') {
      log('🎉 Full content automation workflow completed successfully!', 'green');
      log('✅ Job Creation → Content Generation → WordPress Publishing', 'green');
      log(`📝 Job ID: ${jobId}`, 'blue');
      log(`📰 Generated Title: ${finalJob.generated_title}`, 'blue');
      log(`🔗 WordPress Post ID: ${finalJob.wordpress_post_id}`, 'blue');
    } else if (finalJob && finalJob.status === 'error') {
      log('⚠️  Content automation completed with errors', 'yellow');
      log(`❌ Error: ${finalJob.last_error}`, 'red');
    } else {
      log('❌ Content automation failed', 'red');
    }

  } catch (error) {
    log(`\n❌ Test failed: ${error.message}`, 'red');
  }

  log('\n📋 Next Steps:', 'bold');
  log('   1. If successful: Set up automated job scheduling', 'green');
  log('   2. If failed: Check database and function logs', 'yellow');
  log('   3. Test with different topics and content types', 'blue');
  log('   4. Configure production WordPress site', 'blue');
}

// Run the test
if (require.main === module) {
  testContentAutomationWithJobs()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      log(`\n💥 Content automation test failed: ${error.message}`, 'red');
      process.exit(1);
    });
}

module.exports = { testContentAutomationWithJobs, CONFIG };
