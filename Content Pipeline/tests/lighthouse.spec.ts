import { test, expect } from '@playwright/test';

test.describe('Content Pipeline Lighthouse Performance Tests', () => {
  test('homepage should meet performance standards', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to load completely
    await page.waitForLoadState('networkidle');
    
    // Check for basic performance indicators
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });
    
    // Basic performance checks
    expect(performanceMetrics.totalLoadTime).toBeLessThan(3000); // 3 seconds max
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1000); // 1 second max
  });

  test('content generator should meet performance standards', async ({ page }) => {
    await page.goto('/content-generator.html');
    await page.waitForLoadState('networkidle');
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });
    
    expect(performanceMetrics.totalLoadTime).toBeLessThan(3000);
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1000);
  });

  test('monitoring dashboard should meet performance standards', async ({ page }) => {
    await page.goto('/monitoring.html');
    await page.waitForLoadState('networkidle');
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });
    
    expect(performanceMetrics.totalLoadTime).toBeLessThan(3000);
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1000);
  });

  test('dashboard hub should meet performance standards', async ({ page }) => {
    await page.goto('/dashboard-hub.html');
    await page.waitForLoadState('networkidle');
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });
    
    expect(performanceMetrics.totalLoadTime).toBeLessThan(3000);
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1000);
  });

  test('multi-site dashboard should meet performance standards', async ({ page }) => {
    await page.goto('/multi-site-dashboard.html');
    await page.waitForLoadState('networkidle');
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });
    
    expect(performanceMetrics.totalLoadTime).toBeLessThan(3000);
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1000);
  });

  test('status page should meet performance standards', async ({ page }) => {
    await page.goto('/status.html');
    await page.waitForLoadState('networkidle');
    
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        totalLoadTime: navigation.loadEventEnd - navigation.fetchStart
      };
    });
    
    expect(performanceMetrics.totalLoadTime).toBeLessThan(3000);
    expect(performanceMetrics.domContentLoaded).toBeLessThan(1000);
  });

  test('all pages should have optimized images', async ({ page }) => {
    const pages = [
      '/',
      '/content-generator.html',
      '/dashboard-hub.html',
      '/monitoring.html',
      '/multi-site-dashboard.html',
      '/status.html'
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Check for images and their loading attributes
      const images = await page.locator('img').all();
      
      for (const img of images) {
        const loading = await img.getAttribute('loading');
        const decoding = await img.getAttribute('decoding');
        
        // Images should have lazy loading and async decoding
        expect(loading).toBe('lazy');
        expect(decoding).toBe('async');
      }
    }
  });

  test('all pages should have proper meta tags', async ({ page }) => {
    const pages = [
      '/',
      '/content-generator.html',
      '/dashboard-hub.html',
      '/monitoring.html',
      '/multi-site-dashboard.html',
      '/status.html'
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      
      // Check for essential meta tags
      const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
      const charset = await page.locator('meta[charset]').getAttribute('charset');
      
      expect(viewport).toContain('width=device-width');
      expect(viewport).toContain('initial-scale=1.0');
      expect(charset).toBe('UTF-8');
    }
  });

  test('all pages should have minimal JavaScript errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    const pages = [
      '/',
      '/content-generator.html',
      '/dashboard-hub.html',
      '/monitoring.html',
      '/multi-site-dashboard.html',
      '/status.html'
    ];

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
    }
    
    // Should have minimal JavaScript errors
    expect(errors.length).toBeLessThan(5);
  });
});
