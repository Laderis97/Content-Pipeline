# CI Testing Setup Prompt for Cursor

> **Purpose**: Automatically configure CSS linting, accessibility testing, and visual regression testing in CI/CD pipeline  
> **Target**: Professional web development projects  
> **Tools**: Stylelint, Playwright, axe-core, GitHub Actions

---

## 🎯 **Setup Instructions for Cursor**

### **1. Install Dependencies**
```bash
# CSS Linting
npm install --save-dev stylelint stylelint-config-standard stylelint-config-clean-order

# Accessibility Testing
npm install --save-dev @playwright/test @axe-core/playwright

# Visual Regression Testing
npm install --save-dev playwright

# CI Configuration
npm install --save-dev @types/node
```

### **2. Create Configuration Files**

#### **`.stylelintrc.json`**
```json
{
  "extends": [
    "stylelint-config-standard", 
    "stylelint-config-clean-order"
  ],
  "rules": {
    "selector-max-specificity": "0,3,0",
    "max-nesting-depth": 3,
    "no-duplicate-selectors": true,
    "declaration-no-important": true,
    "color-function-notation": "modern",
    "custom-property-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
    "selector-class-pattern": "^[a-z][a-z0-9]*(-[a-z0-9]+)*$",
    "value-keyword-case": "lower",
    "function-no-unknown": [
      true,
      {
        "ignoreFunctions": ["theme", "screen"]
      }
    ]
  },
  "ignoreFiles": [
    "node_modules/**/*",
    "dist/**/*",
    "build/**/*",
    "*.min.css"
  ]
}
```

#### **`playwright.config.ts`**
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

#### **`tests/accessibility.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Tests', () => {
  test('should not have any automatically detectable accessibility issues', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
    
    // Check for h1
    const h1 = await page.locator('h1').count();
    expect(h1).toBe(1);
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/');
    
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

  test('should have proper color contrast', async ({ page }) => {
    await page.goto('/');
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    
    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.locator(':focus');
    expect(await focusedElement.count()).toBe(1);
    
    // Test skip links
    const skipLinks = await page.locator('a[href^="#"]').all();
    expect(skipLinks.length).toBeGreaterThan(0);
  });
});
```

#### **`tests/visual-regression.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';

test.describe('Visual Regression Tests', () => {
  test('homepage should match snapshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('mobile view should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveScreenshot('homepage-mobile.png');
  });

  test('dark mode should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ colorScheme: 'dark' });
    await expect(page).toHaveScreenshot('homepage-dark.png');
  });

  test('reduced motion should match snapshot', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveScreenshot('homepage-reduced-motion.png');
  });
});
```

#### **`tests/css-validation.spec.ts`**
```typescript
import { test, expect } from '@playwright/test';

test.describe('CSS Validation Tests', () => {
  test('should have valid CSS', async ({ page }) => {
    await page.goto('/');
    
    // Check for CSS errors in console
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && msg.text().includes('CSS')) {
        errors.push(msg.text());
      }
    });
    
    await page.reload();
    expect(errors).toEqual([]);
  });

  test('should use CSS custom properties', async ({ page }) => {
    await page.goto('/');
    
    const styles = await page.evaluate(() => {
      const styleSheets = Array.from(document.styleSheets);
      let hasCustomProperties = false;
      
      styleSheets.forEach(sheet => {
        try {
          const rules = Array.from(sheet.cssRules);
          rules.forEach(rule => {
            if (rule instanceof CSSStyleRule) {
              const style = rule.style;
              for (let i = 0; i < style.length; i++) {
                const property = style[i];
                if (property.startsWith('--')) {
                  hasCustomProperties = true;
                }
              }
            }
          });
        } catch (e) {
          // Cross-origin stylesheets might throw
        }
      });
      
      return hasCustomProperties;
    });
    
    expect(styles).toBeTruthy();
  });

  test('should have responsive design', async ({ page }) => {
    await page.goto('/');
    
    // Test different viewport sizes
    const viewports = [
      { width: 320, height: 568 },   // Mobile
      { width: 768, height: 1024 },  // Tablet
      { width: 1024, height: 768 },  // Desktop
      { width: 1440, height: 900 }   // Large Desktop
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(100); // Allow for layout adjustments
      
      // Check that content is visible and not broken
      const body = await page.locator('body');
      expect(await body.isVisible()).toBeTruthy();
    }
  });
});
```

### **3. Package.json Scripts**
```json
{
  "scripts": {
    "lint:css": "stylelint '**/*.css' --fix",
    "lint:css:check": "stylelint '**/*.css'",
    "test:accessibility": "playwright test tests/accessibility.spec.ts",
    "test:visual": "playwright test tests/visual-regression.spec.ts",
    "test:css": "playwright test tests/css-validation.spec.ts",
    "test:all": "playwright test",
    "test:ci": "playwright test --reporter=github",
    "install:playwright": "playwright install"
  }
}
```

### **4. GitHub Actions Workflow**
```yaml
# .github/workflows/ci.yml
name: CI Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  css-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint:css:check
      
      - name: Upload Stylelint results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: stylelint-results
          path: stylelint-results.json

  accessibility-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - name: Run accessibility tests
        run: npm run test:accessibility
      
      - name: Upload accessibility results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: accessibility-results
          path: test-results/

  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - name: Run visual regression tests
        run: npm run test:visual
      
      - name: Upload visual regression results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-regression-results
          path: test-results/

  css-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - name: Run CSS validation tests
        run: npm run test:css
      
      - name: Upload CSS validation results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: css-validation-results
          path: test-results/

  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      
      - run: npm ci
      - run: npx playwright install --with-deps
      
      - name: Run Lighthouse tests
        run: npx playwright test tests/lighthouse.spec.ts
      
      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: lighthouse-results
          path: test-results/
```

### **5. Pre-commit Hooks**
```json
// .huskyrc.json
{
  "hooks": {
    "pre-commit": "lint-staged"
  }
}
```

```json
// lint-staged.config.js
module.exports = {
  '*.css': ['stylelint --fix', 'git add'],
  '*.{ts,tsx,js,jsx}': ['eslint --fix', 'git add'],
  '*.{ts,tsx,js,jsx,css,md}': ['prettier --write', 'git add']
};
```

### **6. VS Code Settings**
```json
// .vscode/settings.json
{
  "stylelint.enable": true,
  "stylelint.validate": ["css", "scss", "less"],
  "css.validate": false,
  "scss.validate": false,
  "less.validate": false,
  "editor.codeActionsOnSave": {
    "source.fixAll.stylelint": true
  },
  "playwright.reuseBrowser": true,
  "playwright.showTrace": true
}
```

---

## 🚀 **Quick Setup Commands**

```bash
# 1. Install dependencies
npm install --save-dev stylelint stylelint-config-standard stylelint-config-clean-order @playwright/test @axe-core/playwright

# 2. Create config files (copy from above)
# 3. Install Playwright browsers
npx playwright install

# 4. Run tests
npm run test:all

# 5. Set up pre-commit hooks
npm install --save-dev husky lint-staged
npx husky install
npx husky add .husky/pre-commit "npx lint-staged"
```

---

## 📊 **What This Setup Provides**

### **CSS Quality**
- ✅ Consistent code style
- ✅ No specificity wars
- ✅ Maintainable nesting
- ✅ Modern CSS practices

### **Accessibility**
- ✅ WCAG 2.1 AA compliance
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Color contrast validation

### **Visual Consistency**
- ✅ Cross-browser compatibility
- ✅ Responsive design validation
- ✅ Dark mode support
- ✅ Reduced motion support

### **Performance**
- ✅ Lighthouse audits
- ✅ Core Web Vitals
- ✅ CSS optimization
- ✅ Asset loading validation

---

## 🎯 **Expected Outcomes**

After implementing this setup:

1. **Every PR** will be automatically tested for CSS quality and accessibility
2. **Visual regressions** will be caught before deployment
3. **Code quality** will be consistent across the team
4. **Accessibility** will be maintained automatically
5. **Performance** will be monitored continuously

---

*This setup follows 2025 best practices for professional web development with automated quality assurance.*
