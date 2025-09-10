# CSS System Guide - Content Pipeline (2025)

## 🎯 Overview

This document provides comprehensive guidance for using the modern CSS system built for the Content Pipeline project. The system follows 2025 best practices and includes advanced features like OKLCH colors, Container Queries, and comprehensive accessibility support.

## 📁 File Structure

```
public/css/
├── main.css              # Main entry point
├── design-tokens.css     # CSS custom properties & design tokens
├── modern-features.css   # Container Queries, Cascade Layers, Subgrid
├── layout-system.css     # Grid, Flexbox, and responsive utilities
└── components.css        # Component library (buttons, cards, forms, etc.)
```

## 🎨 Design Tokens

### Color System (OKLCH)

```css
/* Primary Colors */
--color-primary: oklch(60% 0.15 260);
--color-primary-hover: oklch(55% 0.15 260);
--color-primary-active: oklch(50% 0.15 260);

/* Semantic Colors */
--color-success: oklch(65% 0.15 140);
--color-warning: oklch(70% 0.15 60);
--color-error: oklch(60% 0.15 20);
--color-info: oklch(65% 0.15 220);

/* Neutral Colors */
--color-neutral-50: oklch(98% 0.02 260);
--color-neutral-100: oklch(95% 0.02 260);
--color-neutral-900: oklch(20% 0.02 260);
```

### Typography Scale

```css
/* Fluid Typography with clamp() */
--text-xs: clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem);
--text-sm: clamp(0.875rem, 0.8rem + 0.375vw, 1rem);
--text-base: clamp(1rem, 0.95rem + 0.25vw, 1.125rem);
--text-lg: clamp(1.125rem, 1.05rem + 0.375vw, 1.25rem);
--text-xl: clamp(1.25rem, 1.15rem + 0.5vw, 1.5rem);
--text-2xl: clamp(1.5rem, 1.35rem + 0.75vw, 1.875rem);
--text-3xl: clamp(1.875rem, 1.65rem + 1.125vw, 2.25rem);
--text-4xl: clamp(2.25rem, 1.95rem + 1.5vw, 3rem);
```

### Spacing System

```css
/* 8px Grid System */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

## 🧩 Component Library

### Buttons

```html
<!-- Button Base -->
<button class="btn">Default Button</button>

<!-- Variants -->
<button class="btn btn--primary">Primary</button>
<button class="btn btn--secondary">Secondary</button>
<button class="btn btn--ghost">Ghost</button>
<button class="btn btn--danger">Danger</button>

<!-- Sizes -->
<button class="btn btn--sm">Small</button>
<button class="btn btn--lg">Large</button>
<button class="btn btn--xl">Extra Large</button>

<!-- Combined -->
<button class="btn btn--primary btn--lg">Large Primary</button>
```

### Cards

```html
<!-- Basic Card -->
<div class="card">
  <div class="card__content">
    <p>Card content</p>
  </div>
</div>

<!-- Card with Header -->
<div class="card">
  <div class="card__header">
    <h3 class="card__title">Card Title</h3>
    <p class="card__subtitle">Card subtitle</p>
  </div>
  <div class="card__content">
    <p>Card content</p>
  </div>
  <div class="card__footer">
    <button class="btn btn--primary">Action</button>
  </div>
</div>

<!-- Card Variants -->
<div class="card card--elevated">Elevated Card</div>
<div class="card card--interactive">Interactive Card</div>
<div class="card card--bordered">Bordered Card</div>
```

### Forms

```html
<!-- Form Group -->
<div class="form-group">
  <label for="email" class="form-label form-label--required">Email</label>
  <input type="email" id="email" class="form-input" placeholder="Enter email">
  <div class="form-error">Please enter a valid email</div>
</div>

<!-- Textarea -->
<div class="form-group">
  <label for="message" class="form-label">Message</label>
  <textarea id="message" class="form-input form-textarea" placeholder="Enter message"></textarea>
</div>

<!-- Select -->
<div class="form-group">
  <label for="category" class="form-label">Category</label>
  <select id="category" class="form-input form-select">
    <option>Option 1</option>
    <option>Option 2</option>
  </select>
</div>
```

### Status Indicators

```html
<!-- Status Badges -->
<span class="status status--success">Success</span>
<span class="status status--warning">Warning</span>
<span class="status status--error">Error</span>
<span class="status status--info">Info</span>
<span class="status status--neutral">Neutral</span>

<!-- Alerts -->
<div class="alert alert--success">
  <div class="alert__title">Success!</div>
  <div class="alert__content">Operation completed successfully.</div>
</div>

<div class="alert alert--error">
  <div class="alert__title">Error</div>
  <div class="alert__content">Something went wrong.</div>
</div>
```

## 🎯 Layout System

### CSS Grid

```html
<!-- Auto-fit Grid -->
<div class="grid grid--cols-3 gap-4">
  <div class="card">Item 1</div>
  <div class="card">Item 2</div>
  <div class="card">Item 3</div>
</div>

<!-- Responsive Grid -->
<div class="grid grid--responsive gap-6">
  <div class="card">Responsive Item</div>
</div>
```

### Flexbox Utilities

```html
<!-- Flex Container -->
<div class="flex gap-4 items-center">
  <button class="btn btn--primary">Button</button>
  <span class="text-sm text-muted">Helper text</span>
</div>

<!-- Flex with Space Between -->
<div class="flex justify-between items-center">
  <h3>Title</h3>
  <button class="btn btn--ghost">Action</button>
</div>
```

## 🌙 Dark Mode

### Automatic Detection

```css
/* Dark mode is automatically applied based on system preference */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: oklch(18% 0.03 260);
    --color-text: oklch(95% 0.02 260);
  }
}
```

### Manual Toggle

```javascript
// Toggle dark mode
document.documentElement.setAttribute('data-theme', 'dark');
document.documentElement.setAttribute('data-theme', 'light');
document.documentElement.removeAttribute('data-theme'); // Auto
```

## ♿ Accessibility Features

### ARIA Support

```html
<!-- Proper ARIA labels -->
<button class="btn" aria-label="Close dialog" aria-describedby="close-desc">
  <span aria-hidden="true">×</span>
</button>
<p id="close-desc" class="sr-only">Closes the current dialog</p>

<!-- Live regions for dynamic content -->
<div class="alert" role="alert" aria-live="assertive">
  Error message appears here
</div>

<!-- Form labels -->
<label for="username" class="form-label">Username</label>
<input id="username" class="form-input" aria-describedby="username-help">
<p id="username-help" class="form-help">Enter your username</p>
```

### Focus Management

```css
/* Focus indicators are automatically applied */
.btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Skip links for keyboard navigation */
.skip-link {
  position: absolute;
  top: -40px;
  left: var(--space-2);
  /* ... */
}
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm run test:all

# Run specific test suites
npm run test:accessibility
npm run test:visual
npm run test:css
npm run test:lighthouse

# Run CSS linting
npm run lint:css
npm run lint:css:check
```

### Test Coverage

- **Accessibility**: WCAG 2.1 AA compliance testing
- **Visual Regression**: Screenshot comparison across browsers
- **CSS Validation**: Modern CSS feature verification
- **Performance**: Lighthouse audits for Core Web Vitals
- **Cross-browser**: Chrome, Firefox, Safari, Mobile testing

## 🚀 Performance

### Optimizations

- **CSS Custom Properties**: Efficient theming and configuration
- **Cascade Layers**: Organized CSS architecture for better performance
- **Container Queries**: Component-based responsive design
- **Fluid Typography**: Reduces layout shifts
- **OKLCH Colors**: Better color space for modern displays

### Bundle Size

- **Main CSS**: ~15KB gzipped
- **Component Library**: ~8KB gzipped
- **Design Tokens**: ~3KB gzipped
- **Total**: ~26KB gzipped

## 🔧 Customization

### Extending the System

```css
/* Add custom design tokens */
:root {
  --color-brand: oklch(65% 0.2 300);
  --space-custom: 2.5rem;
}

/* Create custom components */
.custom-component {
  background: var(--color-brand);
  padding: var(--space-custom);
  border-radius: var(--radius-lg);
}
```

### Theme Override

```css
/* Override theme variables */
[data-theme="custom"] {
  --color-primary: oklch(70% 0.2 180);
  --color-bg: oklch(10% 0.02 180);
  --color-text: oklch(90% 0.02 180);
}
```

## 📚 Resources

- [OKLCH Color Space](https://oklch.com/)
- [Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [CSS Cascade Layers](https://developer.mozilla.org/en-US/docs/Web/CSS/@layer)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Playwright Testing](https://playwright.dev/)
- [Axe-core Accessibility](https://github.com/dequelabs/axe-core)
