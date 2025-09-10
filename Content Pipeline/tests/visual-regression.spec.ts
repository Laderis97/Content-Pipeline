import { test, expect } from '@playwright/test';

test.describe('Content Pipeline Visual Regression Tests', () => {
  test('homepage should match snapshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('content generator should match snapshot', async ({ page }) => {
    await page.goto('/content-generator.html');
    await expect(page).toHaveScreenshot('content-generator.png');
  });

  test('dashboard hub should match snapshot', async ({ page }) => {
    await page.goto('/dashboard-hub.html');
    await expect(page).toHaveScreenshot('dashboard-hub.png');
  });

  test('monitoring dashboard should match snapshot', async ({ page }) => {
    await page.goto('/monitoring.html');
    await expect(page).toHaveScreenshot('monitoring-dashboard.png');
  });

  test('multi-site dashboard should match snapshot', async ({ page }) => {
    await page.goto('/multi-site-dashboard.html');
    await expect(page).toHaveScreenshot('multi-site-dashboard.png');
  });

  test('status page should match snapshot', async ({ page }) => {
    await page.goto('/status.html');
    await expect(page).toHaveScreenshot('status-page.png');
  });

  test('mobile view should match snapshots', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    const pages = [
      { path: '/', name: 'homepage-mobile' },
      { path: '/content-generator.html', name: 'content-generator-mobile' },
      { path: '/dashboard-hub.html', name: 'dashboard-hub-mobile' },
      { path: '/monitoring.html', name: 'monitoring-mobile' },
      { path: '/multi-site-dashboard.html', name: 'multi-site-dashboard-mobile' },
      { path: '/status.html', name: 'status-mobile' }
    ];

    for (const { path, name } of pages) {
      await page.goto(path);
      await expect(page).toHaveScreenshot(`${name}.png`);
    }
  });

  test('tablet view should match snapshots', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    
    const pages = [
      { path: '/', name: 'homepage-tablet' },
      { path: '/content-generator.html', name: 'content-generator-tablet' },
      { path: '/dashboard-hub.html', name: 'dashboard-hub-tablet' },
      { path: '/monitoring.html', name: 'monitoring-tablet' },
      { path: '/multi-site-dashboard.html', name: 'multi-site-dashboard-tablet' },
      { path: '/status.html', name: 'status-tablet' }
    ];

    for (const { path, name } of pages) {
      await page.goto(path);
      await expect(page).toHaveScreenshot(`${name}.png`);
    }
  });

  test('dark mode should match snapshots', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    
    const pages = [
      { path: '/', name: 'homepage-dark' },
      { path: '/content-generator.html', name: 'content-generator-dark' },
      { path: '/dashboard-hub.html', name: 'dashboard-hub-dark' },
      { path: '/monitoring.html', name: 'monitoring-dark' },
      { path: '/multi-site-dashboard.html', name: 'multi-site-dashboard-dark' },
      { path: '/status.html', name: 'status-dark' }
    ];

    for (const { path, name } of pages) {
      await page.goto(path);
      await expect(page).toHaveScreenshot(`${name}.png`);
    }
  });

  test('reduced motion should match snapshots', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    
    const pages = [
      { path: '/', name: 'homepage-reduced-motion' },
      { path: '/content-generator.html', name: 'content-generator-reduced-motion' },
      { path: '/dashboard-hub.html', name: 'dashboard-hub-reduced-motion' },
      { path: '/monitoring.html', name: 'monitoring-reduced-motion' },
      { path: '/multi-site-dashboard.html', name: 'multi-site-dashboard-reduced-motion' },
      { path: '/status.html', name: 'status-reduced-motion' }
    ];

    for (const { path, name } of pages) {
      await page.goto(path);
      await expect(page).toHaveScreenshot(`${name}.png`);
    }
  });

  test('high contrast mode should match snapshots', async ({ page }) => {
    await page.emulateMedia({ forcedColors: 'active' });
    
    const pages = [
      { path: '/', name: 'homepage-high-contrast' },
      { path: '/content-generator.html', name: 'content-generator-high-contrast' },
      { path: '/dashboard-hub.html', name: 'dashboard-hub-high-contrast' },
      { path: '/monitoring.html', name: 'monitoring-high-contrast' },
      { path: '/multi-site-dashboard.html', name: 'multi-site-dashboard-high-contrast' },
      { path: '/status.html', name: 'status-high-contrast' }
    ];

    for (const { path, name } of pages) {
      await page.goto(path);
      await expect(page).toHaveScreenshot(`${name}.png`);
    }
  });
});
