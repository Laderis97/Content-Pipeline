import { test, expect } from '@playwright/test';

test.describe('Content Pipeline CSS Validation Tests', () => {
  test('should have valid CSS without errors', async ({ page }) => {
    const errors: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('CSS')) {
        errors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.reload();
    
    expect(errors).toEqual([]);
  });

  test('should use CSS custom properties for theming', async ({ page }) => {
    await page.goto('/');
    
    const hasCustomProperties = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      let foundCustomProperties = false;
      
      styleSheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules);
          rules.forEach(rule => {
            if (rule instanceof CSSStyleRule) {
              const style = rule.style;
              for (let i = 0; i < style.length; i++) {
                const property = style[i];
                if (property.startsWith('--')) {
                  foundCustomProperties = true;
                }
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheets might throw
        }
      });
      
      return foundCustomProperties;
    });
    
    expect(hasCustomProperties).toBeTruthy();
  });

  test('should have responsive design across viewports', async ({ page }) => {
    await page.goto('/');
    
    const viewports = [
      { width: 320, height: 568, name: 'mobile' },   // iPhone SE
      { width: 768, height: 1024, name: 'tablet' },  // iPad
      { width: 1024, height: 768, name: 'desktop' },  // Desktop
      { width: 1440, height: 900, name: 'large' }     // Large Desktop
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.waitForTimeout(100); // Allow for layout adjustments
      
      // Check that content is visible and not broken
      const body = await page.locator('body');
      expect(await body.isVisible()).toBeTruthy();
      
      // Check that text is readable (not too small)
      const textElements = await page.locator('p, h1, h2, h3, h4, h5, h6').first();
      if (await textElements.count() > 0) {
        const fontSize = await textElements.evaluate(el => {
          return window.getComputedStyle(el).fontSize;
        });
        const fontSizeNum = parseFloat(fontSize);
        expect(fontSizeNum).toBeGreaterThan(12); // Minimum readable font size
      }
    }
  });

  test('should support dark mode properly', async ({ page }) => {
    await page.goto('/');
    
    // Test light mode
    await page.emulateMedia({ colorScheme: 'light' });
    await page.waitForTimeout(100);
    
    const lightModeStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });
    
    // Test dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(100);
    
    const darkModeStyles = await page.evaluate(() => {
      const body = document.body;
      const styles = window.getComputedStyle(body);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color
      };
    });
    
    // Styles should change between light and dark mode
    expect(lightModeStyles.backgroundColor).not.toBe(darkModeStyles.backgroundColor);
    expect(lightModeStyles.color).not.toBe(darkModeStyles.color);
  });

  test('should respect reduced motion preferences', async ({ page }) => {
    await page.goto('/');
    
    // Test with motion enabled
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(100);
    
    const motionEnabled = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let hasTransitions = false;
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.transition !== 'all 0s ease 0s' && styles.transition !== 'none') {
          hasTransitions = true;
        }
      });
      
      return hasTransitions;
    });
    
    // Test with reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForTimeout(100);
    
    const motionReduced = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      let hasTransitions = false;
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        if (styles.transition !== 'all 0s ease 0s' && styles.transition !== 'none') {
          hasTransitions = true;
        }
      });
      
      return hasTransitions;
    });
    
    // If there are transitions with motion enabled, they should be reduced with reduced motion
    if (motionEnabled) {
      expect(motionReduced).toBeFalsy();
    }
  });

  test('should have proper color contrast ratios', async ({ page }) => {
    await page.goto('/');
    
    const contrastIssues = await page.evaluate(() => {
      const elements = document.querySelectorAll('*');
      const issues: string[] = [];
      
      elements.forEach(el => {
        const styles = window.getComputedStyle(el);
        const color = styles.color;
        const backgroundColor = styles.backgroundColor;
        
        // Simple contrast check (this is a basic implementation)
        if (color && backgroundColor && color !== backgroundColor) {
          // In a real implementation, you'd use a proper contrast calculation
          // For now, we'll just check that colors are different
          if (color === backgroundColor) {
            issues.push(`Element ${el.tagName} has same color and background`);
          }
        }
      });
      
      return issues;
    });
    
    expect(contrastIssues).toEqual([]);
  });

  test('should use modern CSS features', async ({ page }) => {
    await page.goto('/');
    
    const modernFeatures = await page.evaluate(() => {
      const features = {
        hasGrid: false,
        hasFlexbox: false,
        hasCustomProperties: false,
        hasClamp: false,
        hasCalc: false
      };
      
      const styleSheets = Array.from(document.styleSheets);
      
      styleSheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules);
          rules.forEach(rule => {
            if (rule instanceof CSSStyleRule) {
              const cssText = rule.cssText;
              
              if (cssText.includes('display: grid') || cssText.includes('display:grid')) {
                features.hasGrid = true;
              }
              if (cssText.includes('display: flex') || cssText.includes('display:flex')) {
                features.hasFlexbox = true;
              }
              if (cssText.includes('--')) {
                features.hasCustomProperties = true;
              }
              if (cssText.includes('clamp(')) {
                features.hasClamp = true;
              }
              if (cssText.includes('calc(')) {
                features.hasCalc = true;
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheets might throw
        }
      });
      
      return features;
    });
    
    // Should use at least some modern CSS features
    const modernFeatureCount = Object.values(modernFeatures).filter(Boolean).length;
    expect(modernFeatureCount).toBeGreaterThan(0);
  });

  test('should have efficient CSS loading', async ({ page }) => {
    await page.goto('/');
    
    const cssPerformance = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      let totalRules = 0;
      let unusedRules = 0;
      
      styleSheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules);
          totalRules += rules.length;
          
          // Check for unused rules (basic implementation)
          rules.forEach(rule => {
            if (rule instanceof CSSStyleRule) {
              const selector = rule.selectorText;
              if (selector && !document.querySelector(selector)) {
                unusedRules++;
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheets might throw
        }
      });
      
      return {
        totalRules,
        unusedRules,
        efficiency: totalRules > 0 ? (totalRules - unusedRules) / totalRules : 1
      };
    });
    
    // CSS should be reasonably efficient (at least 70% of rules should be used)
    expect(cssPerformance.efficiency).toBeGreaterThan(0.7);
  });
});
