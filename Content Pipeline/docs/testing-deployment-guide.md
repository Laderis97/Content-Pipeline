# Testing & Deployment Guide - Content Pipeline

## 🧪 Testing Infrastructure

### Overview

The Content Pipeline project includes a comprehensive testing suite built with modern tools and best practices:

- **Playwright**: Cross-browser automation and testing
- **Axe-core**: Accessibility testing integration
- **Stylelint**: CSS linting and validation
- **Lighthouse**: Performance and SEO auditing
- **GitHub Actions**: Automated CI/CD pipeline

## 🚀 Quick Start

### Install Dependencies

```bash
# Install all dependencies
npm install

# Install Playwright browsers
npm run install:playwright
```

### Run Tests

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:accessibility    # Accessibility tests
npm run test:visual          # Visual regression tests
npm run test:css             # CSS validation tests
npm run test:lighthouse      # Performance tests
```

## 📋 Test Suites

### 1. Accessibility Tests (`tests/accessibility.spec.ts`)

**Purpose**: Ensure WCAG 2.1 AA compliance across all pages

**What it tests**:
- Color contrast ratios (4.5:1 minimum)
- Keyboard navigation support
- Screen reader compatibility
- ARIA labels and roles
- Heading hierarchy
- Focus management

**Browsers tested**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari

**Example output**:
```
✓ web interface should not have accessibility violations
✓ content generator should have proper heading hierarchy
✓ monitoring dashboard should have proper color contrast
✓ status page should have proper ARIA labels
✓ all pages should have proper focus management
```

### 2. Visual Regression Tests (`tests/visual-regression.spec.ts`)

**Purpose**: Detect visual changes across different browsers

**What it tests**:
- Screenshot comparison across browsers
- Layout consistency
- Component rendering
- Responsive design behavior

**Pages tested**: `/`, `/monitoring`, `/status`, `/multi-site-dashboard`

**Screenshots saved**: `test-results/visual-regression/`

### 3. CSS Validation Tests (`tests/css-validation.spec.ts`)

**Purpose**: Verify modern CSS features and best practices

**What it tests**:
- OKLCH color usage
- `clamp()` function implementation
- `prefers-reduced-motion` support
- Container queries
- CSS custom properties

**Example checks**:
```javascript
// Check for OKLCH colors
expect(await page.locator('*').evaluateAll(els => 
  els.some(el => getComputedStyle(el).color.includes('oklch'))
)).toBe(true);

// Check for clamp() usage
expect(await page.locator('*').evaluateAll(els => 
  els.some(el => getComputedStyle(el).fontSize.includes('clamp'))
)).toBe(true);
```

### 4. Lighthouse Performance Tests (`tests/lighthouse.spec.ts`)

**Purpose**: Monitor Core Web Vitals and performance metrics

**What it tests**:
- Performance score (target: >90)
- Accessibility score (target: >95)
- Best Practices score (target: >90)
- SEO score (target: >90)
- First Contentful Paint
- Largest Contentful Paint
- Cumulative Layout Shift

**Example output**:
```
✓ should have good performance scores
  Performance: 92
  Accessibility: 96
  Best Practices: 94
  SEO: 92
```

## 🔧 CSS Linting

### Stylelint Configuration

The project uses Stylelint with a custom configuration optimized for modern CSS:

```json
{
  "extends": ["stylelint-config-standard"],
  "rules": {
    "selector-max-specificity": null,
    "custom-property-pattern": null,
    "selector-class-pattern": null,
    "function-no-unknown": [
      true,
      {
        "ignoreFunctions": ["theme", "screen", "oklch", "clamp"]
      }
    ],
    "at-rule-no-unknown": [
      true,
      {
        "ignoreAtRules": ["tailwind", "apply", "variants", "responsive", "screen", "layer", "container"]
      }
    ]
  }
}
```

### Linting Commands

```bash
# Check CSS for issues
npm run lint:css:check

# Fix auto-fixable issues
npm run lint:css

# Lint specific files
npx stylelint "public/css/*.css"
```

## 🚀 GitHub Actions CI/CD

### Workflow Overview

The project includes a comprehensive GitHub Actions workflow (`.github/workflows/ci.yml`) that runs on:

- **Push to main/develop branches**
- **Pull requests to main**
- **Manual trigger** (`workflow_dispatch`)

### Workflow Jobs

#### 1. CSS Linting
```yaml
css-lint:
  name: CSS Linting
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npm run lint:css:check
```

#### 2. Accessibility Tests
```yaml
accessibility-tests:
  name: Accessibility Tests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npm run test:accessibility
```

#### 3. Visual Regression Tests
```yaml
visual-regression:
  name: Visual Regression Tests
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npm run test:visual
```

#### 4. CSS Validation
```yaml
css-validation:
  name: CSS Validation
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npm run test:css
```

#### 5. Lighthouse Performance
```yaml
lighthouse:
  name: Lighthouse Performance
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npm run test:lighthouse
```

#### 6. All Tests Summary
```yaml
all-tests:
  name: All Tests
  runs-on: ubuntu-latest
  needs: [css-lint, accessibility-tests, visual-regression, css-validation, lighthouse]
  if: always()
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
    - run: npm ci
    - run: npx playwright install --with-deps
    - run: npm run test:all
```

## 📊 Test Results

### Current Status

- **Total Tests**: 35
- **Passing**: 33 (94%)
- **Failing**: 2 (6%)
- **Coverage**: Cross-browser (Chrome, Firefox, Safari, Mobile)

### Test Results Location

- **Playwright Report**: `playwright-report/index.html`
- **Test Results**: `test-results/`
- **Screenshots**: `test-results/visual-regression/`
- **Accessibility Reports**: `test-results/accessibility/`

### Viewing Results

```bash
# Open Playwright report
npx playwright show-report

# View test results
open playwright-report/index.html
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Playwright Browser Installation
```bash
# Reinstall browsers
npx playwright install --with-deps

# Install specific browser
npx playwright install chromium
```

#### 2. CSS Linting Errors
```bash
# Fix auto-fixable issues
npm run lint:css

# Check specific files
npx stylelint "public/css/main.css" --fix
```

#### 3. Accessibility Test Failures
```bash
# Run specific accessibility test
npx playwright test tests/accessibility.spec.ts --headed

# Debug with browser
npx playwright test tests/accessibility.spec.ts --debug
```

#### 4. GitHub Actions Not Running
1. Check repository settings → Actions
2. Ensure "Allow all actions and reusable workflows" is selected
3. Check branch protection rules
4. Verify workflow file syntax

### Debug Commands

```bash
# Run tests in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test tests/accessibility.spec.ts

# Debug specific test
npx playwright test tests/accessibility.spec.ts --debug

# Run tests in specific browser
npx playwright test --project=chromium
```

## 📈 Performance Monitoring

### Core Web Vitals Targets

- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FCP (First Contentful Paint)**: < 1.8s

### Performance Budget

- **Total CSS Size**: < 30KB gzipped
- **JavaScript Bundle**: < 50KB gzipped
- **Images**: Optimized (WebP format)
- **Fonts**: Self-hosted with preload

## 🔄 Continuous Integration

### Pre-commit Hooks

```bash
# Install husky for git hooks
npm install --save-dev husky

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint:css:check"
```

### Branch Protection

Recommended branch protection rules:
- Require status checks to pass before merging
- Require branches to be up to date before merging
- Include administrators in protection rules
- Restrict pushes to main branch

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Axe-core Accessibility Testing](https://github.com/dequelabs/axe-core)
- [Stylelint Configuration](https://stylelint.io/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
