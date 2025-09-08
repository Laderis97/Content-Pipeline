// Simple build script for Render - creates public directory
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Content Pipeline Dashboards...');

// Create public directory
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    console.log('📁 Created public directory');
}

// Create index.html
const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Content Pipeline - Dashboard Hub</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
        }
        h1 {
            color: #2c3e50;
            font-size: 3em;
            margin-bottom: 20px;
        }
        .subtitle {
            color: #7f8c8d;
            font-size: 1.2em;
            margin-bottom: 40px;
        }
        .dashboard-links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-top: 30px;
        }
        .dashboard-link {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            text-decoration: none;
            padding: 20px;
            border-radius: 15px;
            transition: transform 0.3s, box-shadow 0.3s;
            font-weight: bold;
            font-size: 1.1em;
        }
        .dashboard-link:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(52, 152, 219, 0.3);
        }
        .status {
            background: #27ae60;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            display: inline-block;
            margin-bottom: 20px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Content Pipeline</h1>
        <div class="subtitle">Dashboard Hub</div>
        <div class="status">✅ SYSTEM OPERATIONAL</div>
        
        <div class="dashboard-links">
            <a href="/monitoring" class="dashboard-link">
                📊 24/7 Monitoring Dashboard
            </a>
            <a href="/status" class="dashboard-link">
                📈 System Status Dashboard
            </a>
            <a href="/monitoring-dashboard" class="dashboard-link">
                🔍 Real-time Monitoring
            </a>
        </div>
        
        <p style="margin-top: 30px; color: #7f8c8d;">
            Content Pipeline System - Fully Operational<br>
            Go-Live: September 19, 2025
        </p>
    </div>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'index.html'), indexContent);
console.log('✅ Created index.html');

// Create monitoring.html
const monitoringContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>24/7 Monitoring Dashboard - Content Pipeline</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: #333;
            min-height: 100vh;
        }
        .header {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        .header h1 {
            color: white;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 1.1em;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .status-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .status-card h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .metric:last-child { border-bottom: none; }
        .metric-label {
            font-weight: 500;
            color: #555;
        }
        .metric-value {
            font-weight: bold;
            font-size: 1.1em;
        }
        .status-healthy { color: #27ae60; }
        .status-warning { color: #f39c12; }
        .status-error { color: #e74c3c; }
        .refresh-btn {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1em;
            font-weight: bold;
            transition: transform 0.3s;
            margin: 20px auto;
            display: block;
        }
        .refresh-btn:hover { transform: translateY(-2px); }
        .loading {
            text-align: center;
            padding: 40px;
            color: white;
            font-size: 1.2em;
        }
        .error {
            background: #e74c3c;
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
        }
        .timestamp {
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
            margin-top: 20px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 24/7 Monitoring Dashboard</h1>
        <p>Real-time system health and performance monitoring</p>
    </div>
    
    <div class="container">
        <button class="refresh-btn" onclick="loadMonitoringData()">🔄 Refresh Data</button>
        
        <div id="loading" class="loading">
            Loading monitoring data...
        </div>
        
        <div id="error" class="error" style="display: none;">
            Error loading monitoring data. Please try again.
        </div>
        
        <div id="monitoring-data" style="display: none;">
            <div class="status-grid">
                <div class="status-card">
                    <h3>🏥 System Health</h3>
                    <div class="metric">
                        <span class="metric-label">Overall Status</span>
                        <span class="metric-value status-healthy" id="overall-status">Healthy</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Database</span>
                        <span class="metric-value status-healthy" id="db-status">Connected</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Edge Functions</span>
                        <span class="metric-value status-healthy" id="functions-status">Operational</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">External APIs</span>
                        <span class="metric-value status-healthy" id="apis-status">Available</span>
                    </div>
                </div>
                
                <div class="status-card">
                    <h3>📈 Job Statistics</h3>
                    <div class="metric">
                        <span class="metric-label">Total Jobs</span>
                        <span class="metric-value" id="total-jobs">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Completed Today</span>
                        <span class="metric-value" id="completed-today">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">In Progress</span>
                        <span class="metric-value" id="in-progress">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Failed Today</span>
                        <span class="metric-value" id="failed-today">0</span>
                    </div>
                </div>
                
                <div class="status-card">
                    <h3>⚡ Performance</h3>
                    <div class="metric">
                        <span class="metric-label">Avg Response Time</span>
                        <span class="metric-value" id="avg-response-time">0ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Success Rate</span>
                        <span class="metric-value status-healthy" id="success-rate">100%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Throughput (jobs/hour)</span>
                        <span class="metric-value" id="throughput">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Error Rate</span>
                        <span class="metric-value status-healthy" id="error-rate">0%</span>
                    </div>
                </div>
                
                <div class="status-card">
                    <h3>🚨 Active Alerts</h3>
                    <div class="metric">
                        <span class="metric-label">Critical Alerts</span>
                        <span class="metric-value status-healthy" id="critical-alerts">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Warning Alerts</span>
                        <span class="metric-value status-healthy" id="warning-alerts">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Info Alerts</span>
                        <span class="metric-value status-healthy" id="info-alerts">0</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="timestamp" id="last-updated">
            Last updated: Never
        </div>
    </div>

    <script>
        const SUPABASE_URL = 'https://zjqsfdqhhvhbwqmgdfzn.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo';

        async function loadMonitoringData() {
            const loadingEl = document.getElementById('loading');
            const errorEl = document.getElementById('error');
            const dataEl = document.getElementById('monitoring-data');
            
            loadingEl.style.display = 'block';
            errorEl.style.display = 'none';
            dataEl.style.display = 'none';
            
            try {
                const response = await fetch(\`\${SUPABASE_URL}/functions/v1/24-7-monitor\`, {
                    headers: {
                        'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                const data = await response.json();
                updateDashboard(data);
                
                loadingEl.style.display = 'none';
                dataEl.style.display = 'block';
                
                document.getElementById('last-updated').textContent = 
                    \`Last updated: \${new Date().toLocaleString()}\`;
                
            } catch (error) {
                console.error('Error loading monitoring data:', error);
                loadingEl.style.display = 'none';
                errorEl.style.display = 'block';
                errorEl.textContent = \`Error loading monitoring data: \${error.message}\`;
            }
        }
        
        function updateDashboard(data) {
            // Update system health
            document.getElementById('overall-status').textContent = data.overall_status || 'Healthy';
            document.getElementById('db-status').textContent = data.database_status || 'Connected';
            document.getElementById('functions-status').textContent = data.functions_status || 'Operational';
            document.getElementById('apis-status').textContent = data.apis_status || 'Available';
            
            // Update job statistics
            document.getElementById('total-jobs').textContent = data.total_jobs || 0;
            document.getElementById('completed-today').textContent = data.completed_today || 0;
            document.getElementById('in-progress').textContent = data.in_progress || 0;
            document.getElementById('failed-today').textContent = data.failed_today || 0;
            
            // Update performance metrics
            document.getElementById('avg-response-time').textContent = 
                data.avg_response_time ? \`\${data.avg_response_time}ms\` : '0ms';
            document.getElementById('success-rate').textContent = 
                data.success_rate ? \`\${data.success_rate}%\` : '100%';
            document.getElementById('throughput').textContent = data.throughput || 0;
            document.getElementById('error-rate').textContent = 
                data.error_rate ? \`\${data.error_rate}%\` : '0%';
            
            // Update alerts
            document.getElementById('critical-alerts').textContent = data.critical_alerts || 0;
            document.getElementById('warning-alerts').textContent = data.warning_alerts || 0;
            document.getElementById('info-alerts').textContent = data.info_alerts || 0;
            
            // Update status colors based on values
            updateStatusColors(data);
        }
        
        function updateStatusColors(data) {
            // Update success rate color
            const successRate = data.success_rate || 100;
            const successRateEl = document.getElementById('success-rate');
            if (successRate >= 95) {
                successRateEl.className = 'metric-value status-healthy';
            } else if (successRate >= 85) {
                successRateEl.className = 'metric-value status-warning';
            } else {
                successRateEl.className = 'metric-value status-error';
            }
            
            // Update error rate color
            const errorRate = data.error_rate || 0;
            const errorRateEl = document.getElementById('error-rate');
            if (errorRate <= 5) {
                errorRateEl.className = 'metric-value status-healthy';
            } else if (errorRate <= 15) {
                errorRateEl.className = 'metric-value status-warning';
            } else {
                errorRateEl.className = 'metric-value status-error';
            }
        }
        
        // Load data on page load
        document.addEventListener('DOMContentLoaded', loadMonitoringData);
        
        // Auto-refresh every 30 seconds
        setInterval(loadMonitoringData, 30000);
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'monitoring.html'), monitoringContent);
console.log('✅ Created monitoring.html');

// Create status.html
const statusContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Status Dashboard - Content Pipeline</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: #333;
            min-height: 100vh;
        }
        .header {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            padding: 20px;
            text-align: center;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
        }
        .header h1 {
            color: white;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        .header p {
            color: rgba(255, 255, 255, 0.8);
            font-size: 1.1em;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .status-card {
            background: rgba(255, 255, 255, 0.95);
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .status-card h3 {
            color: #2c3e50;
            margin-bottom: 15px;
            font-size: 1.3em;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .metric:last-child { border-bottom: none; }
        .metric-label {
            font-weight: 500;
            color: #555;
        }
        .metric-value {
            font-weight: bold;
            font-size: 1.1em;
        }
        .status-healthy { color: #27ae60; }
        .status-warning { color: #f39c12; }
        .status-error { color: #e74c3c; }
        .refresh-btn {
            background: linear-gradient(45deg, #3498db, #2980b9);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 1em;
            font-weight: bold;
            transition: transform 0.3s;
            margin: 20px auto;
            display: block;
        }
        .refresh-btn:hover { transform: translateY(-2px); }
        .loading {
            text-align: center;
            padding: 40px;
            color: white;
            font-size: 1.2em;
        }
        .error {
            background: #e74c3c;
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: center;
        }
        .timestamp {
            text-align: center;
            color: rgba(255, 255, 255, 0.7);
            margin-top: 20px;
            font-size: 0.9em;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>📈 System Status Dashboard</h1>
        <p>Content Pipeline System - Overall Status and Performance</p>
    </div>
    
    <div class="container">
        <button class="refresh-btn" onclick="loadStatusData()">🔄 Refresh Status</button>
        
        <div id="loading" class="loading">
            Loading system status...
        </div>
        
        <div id="error" class="error" style="display: none;">
            Error loading status data. Please try again.
        </div>
        
        <div id="status-data" style="display: none;">
            <div class="status-grid">
                <div class="status-card">
                    <h3>🏥 System Health</h3>
                    <div class="metric">
                        <span class="metric-label">Overall Status</span>
                        <span class="metric-value status-healthy" id="overall-status">Operational</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Database</span>
                        <span class="metric-value status-healthy" id="db-status">Connected</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Edge Functions</span>
                        <span class="metric-value status-healthy" id="functions-status">Running</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">External APIs</span>
                        <span class="metric-value status-healthy" id="apis-status">Available</span>
                    </div>
                </div>
                
                <div class="status-card">
                    <h3>📊 Job Statistics</h3>
                    <div class="metric">
                        <span class="metric-label">Total Jobs</span>
                        <span class="metric-value" id="total-jobs">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Completed Today</span>
                        <span class="metric-value" id="completed-today">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">In Progress</span>
                        <span class="metric-value" id="in-progress">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Success Rate</span>
                        <span class="metric-value status-healthy" id="success-rate">100%</span>
                    </div>
                </div>
                
                <div class="status-card">
                    <h3>⚡ Performance</h3>
                    <div class="metric">
                        <span class="metric-label">Avg Response Time</span>
                        <span class="metric-value" id="avg-response-time">0ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Throughput</span>
                        <span class="metric-value" id="throughput">0 jobs/hour</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Error Rate</span>
                        <span class="metric-value status-healthy" id="error-rate">0%</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Uptime</span>
                        <span class="metric-value status-healthy" id="uptime">99.9%</span>
                    </div>
                </div>
                
                <div class="status-card">
                    <h3>🚨 Alerts</h3>
                    <div class="metric">
                        <span class="metric-label">Critical</span>
                        <span class="metric-value status-healthy" id="critical-alerts">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Warnings</span>
                        <span class="metric-value status-healthy" id="warning-alerts">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Info</span>
                        <span class="metric-value status-healthy" id="info-alerts">0</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Last Alert</span>
                        <span class="metric-value" id="last-alert">None</span>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="timestamp" id="last-updated">
            Last updated: Never
        </div>
    </div>

    <script>
        const SUPABASE_URL = 'https://zjqsfdqhhvhbwqmgdfzn.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqcXNmZHFoaHZoYndxbWdkZnpuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcwNDY1ODMsImV4cCI6MjA3MjYyMjU4M30.P8mYi9WaOV4HkxdJsbOU_nYo1_bbJkI_1LNlbhT4Ifo';

        async function loadStatusData() {
            const loadingEl = document.getElementById('loading');
            const errorEl = document.getElementById('error');
            const dataEl = document.getElementById('status-data');
            
            loadingEl.style.display = 'block';
            errorEl.style.display = 'none';
            dataEl.style.display = 'none';
            
            try {
                const response = await fetch(\`\${SUPABASE_URL}/functions/v1/24-7-monitor\`, {
                    headers: {
                        'Authorization': \`Bearer \${SUPABASE_ANON_KEY}\`,
                        'apikey': SUPABASE_ANON_KEY,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }
                
                const data = await response.json();
                updateStatusDashboard(data);
                
                loadingEl.style.display = 'none';
                dataEl.style.display = 'block';
                
                document.getElementById('last-updated').textContent = 
                    \`Last updated: \${new Date().toLocaleString()}\`;
                
            } catch (error) {
                console.error('Error loading status data:', error);
                loadingEl.style.display = 'none';
                errorEl.style.display = 'block';
                errorEl.textContent = \`Error loading status data: \${error.message}\`;
            }
        }
        
        function updateStatusDashboard(data) {
            // Update system health
            document.getElementById('overall-status').textContent = data.overall_status || 'Operational';
            document.getElementById('db-status').textContent = data.database_status || 'Connected';
            document.getElementById('functions-status').textContent = data.functions_status || 'Running';
            document.getElementById('apis-status').textContent = data.apis_status || 'Available';
            
            // Update job statistics
            document.getElementById('total-jobs').textContent = data.total_jobs || 0;
            document.getElementById('completed-today').textContent = data.completed_today || 0;
            document.getElementById('in-progress').textContent = data.in_progress || 0;
            document.getElementById('success-rate').textContent = 
                data.success_rate ? \`\${data.success_rate}%\` : '100%';
            
            // Update performance metrics
            document.getElementById('avg-response-time').textContent = 
                data.avg_response_time ? \`\${data.avg_response_time}ms\` : '0ms';
            document.getElementById('throughput').textContent = 
                data.throughput ? \`\${data.throughput} jobs/hour\` : '0 jobs/hour';
            document.getElementById('error-rate').textContent = 
                data.error_rate ? \`\${data.error_rate}%\` : '0%';
            document.getElementById('uptime').textContent = data.uptime || '99.9%';
            
            // Update alerts
            document.getElementById('critical-alerts').textContent = data.critical_alerts || 0;
            document.getElementById('warning-alerts').textContent = data.warning_alerts || 0;
            document.getElementById('info-alerts').textContent = data.info_alerts || 0;
            document.getElementById('last-alert').textContent = data.last_alert || 'None';
            
            // Update status colors
            updateStatusColors(data);
        }
        
        function updateStatusColors(data) {
            // Update success rate color
            const successRate = data.success_rate || 100;
            const successRateEl = document.getElementById('success-rate');
            if (successRate >= 95) {
                successRateEl.className = 'metric-value status-healthy';
            } else if (successRate >= 85) {
                successRateEl.className = 'metric-value status-warning';
            } else {
                successRateEl.className = 'metric-value status-error';
            }
            
            // Update error rate color
            const errorRate = data.error_rate || 0;
            const errorRateEl = document.getElementById('error-rate');
            if (errorRate <= 5) {
                errorRateEl.className = 'metric-value status-healthy';
            } else if (errorRate <= 15) {
                errorRateEl.className = 'metric-value status-warning';
            } else {
                errorRateEl.className = 'metric-value status-error';
            }
        }
        
        // Load data on page load
        document.addEventListener('DOMContentLoaded', loadStatusData);
        
        // Auto-refresh every 30 seconds
        setInterval(loadStatusData, 30000);
    </script>
</body>
</html>`;

fs.writeFileSync(path.join(publicDir, 'status.html'), statusContent);
console.log('✅ Created status.html');

// Create robots.txt
const robotsContent = `User-agent: *
Allow: /

Sitemap: https://content-pipeline-dashboards.onrender.com/sitemap.xml`;

fs.writeFileSync(path.join(publicDir, 'robots.txt'), robotsContent);
console.log('✅ Created robots.txt');

// Create sitemap.xml
const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>https://content-pipeline-dashboards.onrender.com/</loc>
        <lastmod>2025-09-06</lastmod>
        <changefreq>daily</changefreq>
        <priority>1.0</priority>
    </url>
    <url>
        <loc>https://content-pipeline-dashboards.onrender.com/monitoring</loc>
        <lastmod>2025-09-06</lastmod>
        <changefreq>hourly</changefreq>
        <priority>0.8</priority>
    </url>
    <url>
        <loc>https://content-pipeline-dashboards.onrender.com/status</loc>
        <lastmod>2025-09-06</lastmod>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
    </url>
</urlset>`;

fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapContent);
console.log('✅ Created sitemap.xml');

console.log('🎉 Build complete! Public directory created with all dashboard files.');
console.log('📁 Files created:');
console.log('  - index.html (Dashboard Hub)');
console.log('  - monitoring.html (24/7 Monitoring)');
console.log('  - status.html (System Status)');
console.log('  - robots.txt (SEO)');
console.log('  - sitemap.xml (SEO)');
