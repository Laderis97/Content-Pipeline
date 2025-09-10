import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.5';

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            {
                auth: {
                    persistSession: false,
                },
            }
        );

        const startTime = Date.now();

        // Fetch comprehensive system health data
        const { data: healthData, error: healthError } = await supabase
            .from('health_checks')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(1);

        // Fetch job statistics
        const { data: jobStats, error: jobStatsError } = await supabase
            .from('content_jobs')
            .select('status, count')
            .rollup('count')
            .group('status');

        // Fetch job run statistics
        const { data: jobRunStats, error: jobRunStatsError } = await supabase
            .from('job_runs')
            .select('status, count')
            .rollup('count')
            .group('status');

        // Fetch performance metrics
        const { data: metricsData, error: metricsError } = await supabase
            .from('metrics_data')
            .select('metric_name, metric_value, timestamp')
            .order('timestamp', { ascending: false })
            .limit(20);

        // Fetch active alerts
        const { data: alertsData, error: alertsError } = await supabase
            .from('monitoring_alerts')
            .select('*')
            .eq('status', 'active')
            .order('timestamp', { ascending: false });

        // Fetch recent job runs for processing analysis
        const { data: recentJobRuns, error: recentJobRunsError } = await supabase
            .from('job_runs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(10);

        // Calculate system performance metrics
        const currentTime = new Date();
        const oneHourAgo = new Date(currentTime.getTime() - 60 * 60 * 1000);
        const oneDayAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);

        // Get job processing rate (last hour)
        const { data: hourlyJobs, error: hourlyJobsError } = await supabase
            .from('job_runs')
            .select('id, created_at')
            .gte('created_at', oneHourAgo.toISOString())
            .lte('created_at', currentTime.toISOString());

        // Get job processing rate (last 24 hours)
        const { data: dailyJobs, error: dailyJobsError } = await supabase
            .from('job_runs')
            .select('id, created_at')
            .gte('created_at', oneDayAgo.toISOString())
            .lte('created_at', currentTime.toISOString());

        // Calculate error rates
        const { data: errorJobs, error: errorJobsError } = await supabase
            .from('job_runs')
            .select('id, status')
            .eq('status', 'failed')
            .gte('created_at', oneHourAgo.toISOString());

        const totalJobs = hourlyJobs?.length || 0;
        const errorJobsCount = errorJobs?.length || 0;
        const errorRate = totalJobs > 0 ? (errorJobsCount / totalJobs) * 100 : 0;

        // Calculate average response time from metrics
        const responseTimeMetrics = metricsData?.filter(m => m.metric_name === 'response_time') || [];
        const avgResponseTime = responseTimeMetrics.length > 0 
            ? responseTimeMetrics.reduce((sum, m) => sum + parseFloat(m.metric_value), 0) / responseTimeMetrics.length
            : 0;

        // Calculate system uptime (simplified)
        const uptimePercentage = errorRate < 5 ? 99.5 : 95.0;

        // Generate monitoring summary
        const monitoringSummary = {
            timestamp: currentTime.toISOString(),
            systemHealth: {
                status: healthData?.[0]?.status || 'unknown',
                lastCheck: healthData?.[0]?.timestamp || null,
                uptime: uptimePercentage,
                responseTime: avgResponseTime,
                errorRate: errorRate
            },
            jobStatistics: {
                total: jobStats?.reduce((sum, stat) => sum + stat.count, 0) || 0,
                pending: jobStats?.find(s => s.status === 'pending')?.count || 0,
                processing: jobStats?.find(s => s.status === 'processing')?.count || 0,
                completed: jobStats?.find(s => s.status === 'completed')?.count || 0,
                failed: jobStats?.find(s => s.status === 'failed')?.count || 0
            },
            jobRunStatistics: {
                total: jobRunStats?.reduce((sum, stat) => sum + stat.count, 0) || 0,
                success: jobRunStats?.find(s => s.status === 'success')?.count || 0,
                failed: jobRunStats?.find(s => s.status === 'failed')?.count || 0,
                processing: jobRunStats?.find(s => s.status === 'processing')?.count || 0
            },
            performanceMetrics: {
                hourlyProcessingRate: hourlyJobs?.length || 0,
                dailyProcessingRate: dailyJobs?.length || 0,
                averageResponseTime: avgResponseTime,
                errorRate: errorRate,
                uptime: uptimePercentage
            },
            activeAlerts: {
                total: alertsData?.length || 0,
                critical: alertsData?.filter(a => a.severity === 'critical').length || 0,
                warning: alertsData?.filter(a => a.severity === 'warning').length || 0,
                info: alertsData?.filter(a => a.severity === 'info').length || 0
            },
            recentActivity: {
                jobRuns: recentJobRuns?.slice(0, 5) || [],
                metrics: metricsData?.slice(0, 10) || []
            },
            monitoringStatus: {
                database: !healthError && !jobStatsError && !jobRunStatsError,
                metrics: !metricsError,
                alerts: !alertsError,
                overall: !healthError && !jobStatsError && !metricsError && !alertsError
            }
        };

        // Generate health status
        const healthStatus = monitoringSummary.monitoringStatus.overall ? 'healthy' : 'degraded';
        const statusCode = healthStatus === 'healthy' ? 200 : 503;

        const responseData = {
            status: healthStatus,
            timestamp: monitoringSummary.timestamp,
            monitoring: monitoringSummary,
            responseTime: Date.now() - startTime,
            version: '1.0'
        };

        return new Response(JSON.stringify(responseData), {
            headers: { 'Content-Type': 'application/json' },
            status: statusCode,
        });

    } catch (error) {
        console.error('24/7 Monitor Function Error:', error.message);
        return new Response(JSON.stringify({ 
            status: 'error',
            error: error.message,
            timestamp: new Date().toISOString()
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        });
    }
});
