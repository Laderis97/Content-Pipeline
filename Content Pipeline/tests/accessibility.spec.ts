import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Content Pipeline Accessibility Tests', () => {
  test('web interface should not have accessibility violations', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('content generator should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/content-generator.html');
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for h1
    const h1 = await page.locator('h1').count();
    expect(h1).toBe(1);
  });

  test('dashboard should have proper form labels', async ({ page }) => {
    await page.goto('/dashboard-hub.html');
    
    const inputs = await page.locator('input, textarea, select').all();
    
    for (const input of inputs) {
      const id = await input.getAttribute('id');
      if (id) {
        const label = await page.locator(`label[for="${id}"]`).count();
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledBy = await input.getAttribute('aria-labelledby');
        
        expect(label > 0 || ariaLabel || ariaLabelledBy).toBeTruthy();
      }
    }
  });

  test('monitoring dashboard should have proper color contrast', async ({ page }) => {
    await page.goto('/monitoring.html');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('multi-site dashboard should be keyboard navigable', async ({ page }) => {
    await page.goto('/multi-site-dashboard.html');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    expect(await focusedElement.count()).toBe(1);
    
    // Test skip links
    const skipLinks = await page.locator('a[href^="#"]').all();
    expect(skipLinks.length).toBeGreaterThan(0);
  });

  test('status page should have proper ARIA labels', async ({ page }) => {
    await page.goto('/status.html');
    
    // Check for proper ARIA usage
    const elementsWithAria = await page.locator('[aria-label], [aria-labelledby], [aria-describedby]').count();
    expect(elementsWithAria).toBeGreaterThan(0);
    
    // Check for live regions for dynamic content
    const liveRegions = await page.locator('[aria-live]').count();
    expect(liveRegions).toBeGreaterThan(0);
  });

  test('all pages should have proper focus management', async ({ page }) => {
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
      
      // Test that focus is visible
      await page.keyboard.press('Tab');
      const focusedElement = await page.locator(':focus');
      expect(await focusedElement.count()).toBe(1);
      
      // Test that focus indicator is visible
      const focusStyles = await focusedElement.evaluate(el => {
        const styles = window.getComputedStyle(el);
        return {
          outline: styles.outline,
          outlineWidth: styles.outlineWidth,
          boxShadow: styles.boxShadow
        };
      });
      
      expect(
        focusStyles.outline !== 'none' || 
        focusStyles.outlineWidth !== '0px' || 
        focusStyles.boxShadow !== 'none'
      ).toBeTruthy();
    }
  });
});
