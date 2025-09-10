# Design & CSS Best Practices (2025 Edition)

> **Target Audience**: Senior designers & frontend engineers  
> **Style**: Concise, table-first, examples over theory  
> **Focus**: Pragmatic implementation with copy-paste snippets

---

## 1. Core Principles

### **Progressive Enhancement**
- Start with semantic HTML, enhance with CSS/JS
- Ensure functionality without JavaScript
- Layer on visual enhancements progressively

### **Accessibility-First**
- WCAG 2.1 AA compliance as baseline
- Semantic HTML structure
- Keyboard navigation support
- Screen reader compatibility

### **Performance as a Feature**
- Core Web Vitals optimization
- Critical CSS inlining
- Lazy loading for non-critical resources
- Efficient asset delivery

### **Content-First Design**
- Typography hierarchy drives layout
- Content determines breakpoints
- Mobile-first responsive approach
- Readable line lengths (45-75 characters)

### **Privacy by Default**
- Minimal data collection
- User consent for tracking
- Secure data handling
- Transparent privacy policies

### **Resilient, System-Driven UI**
- Design system consistency
- Component-based architecture
- Graceful degradation
- Error state handling

---

## 2. CSS Architecture Comparison

| Approach | Use When | Pros | Cons | Example |
|----------|----------|------|------|---------|
| **Design Tokens + CSS Variables** | Multi-brand/themes | Consistent theming, easy maintenance | Needs governance, initial setup | `--color-bg: oklch(98% 0.02 250);` |
| **Utility-First (Tailwind pattern)** | Rapid shipping, prototypes | Small diffs, consistency, fast development | Class soup risk, learning curve | `class="grid gap-4 md:grid-cols-2"` |
| **BEM/Component CSS** | Complex apps, legacy systems | Encapsulation, clear naming | Verbose, maintenance overhead | `.card__title--large{}` |
| **CSS Modules** | SPA with bundlers | No global leaks, scoped styles | Build step required, tooling dependency | `styles.title` |
| **Cascade Layers** | Large codebases, design systems | Predictable overrides, clear hierarchy | Initial setup complexity | `@layer base, components, utilities;` |

### **Recommended Default Stack**
```
Design Tokens + Cascade Layers + Light Utilities
```

**Why this combination?**
- **Tokens**: Consistent theming across brands
- **Layers**: Predictable CSS cascade
- **Utilities**: Rapid prototyping and edge cases

---

## 3. Layout in 2025

### **Grid + Subgrid for Nested Layouts**
```css
/* Main grid container */
.grid {
  display: grid;
  grid: auto / 1fr 2fr;
  gap: var(--space-3);
}

/* Subgrid for nested items */
.item-list {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
}
```

### **Container Queries for Component Responsiveness**
```css
/* Container query setup */
.card {
  container-type: inline-size;
}

/* Responsive component behavior */
@container (min-width: 40rem) {
  .card__media {
    grid-column: span 2;
  }
}

@container (min-width: 60rem) {
  .card__content {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
}
```

### **Fallback to Flex for 1D Flows**
```css
/* Use flex for simple 1D layouts */
.nav {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

/* Responsive flex behavior */
@media (max-width: 768px) {
  .nav {
    flex-direction: column;
    gap: var(--space-1);
  }
}
```

---

## 4. Modern CSS Features

### **Cascade Layers**
```css
/* Define layer order */
@layer reset, base, components, utilities;

/* Reset layer */
@layer reset {
  *, *::before, *::after {
    box-sizing: border-box;
  }
}

/* Base layer */
@layer base {
  body {
    font-family: var(--font-sans);
    line-height: var(--line-height-relaxed);
  }
}

/* Components layer */
@layer components {
  .btn {
    padding: var(--space-2) var(--space-4);
    border-radius: var(--radius-md);
  }
}

/* Utilities layer */
@layer utilities {
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
}
```

### **Container Queries**
```css
/* Container query for responsive components */
.product-grid {
  container-type: inline-size;
  display: grid;
  gap: var(--space-4);
}

@container (min-width: 20rem) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@container (min-width: 40rem) {
  .product-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@container (min-width: 60rem) {
  .product-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

### **Subgrid**
```css
/* Parent grid */
.layout {
  display: grid;
  grid-template-columns: 1fr 2fr 1fr;
  gap: var(--space-4);
}

/* Child with subgrid */
.content-section {
  display: grid;
  grid-template-columns: subgrid;
  grid-column: 1 / -1;
}

/* Nested items align with parent grid */
.content-section h2 {
  grid-column: 1;
}

.content-section p {
  grid-column: 2;
}

.content-section aside {
  grid-column: 3;
}
```

---

## 5. Design Tokens Implementation

### **CSS Custom Properties Structure**
```css
:root {
  /* Colors - OKLCH for better color space */
  --color-primary: oklch(0.7 0.15 250);
  --color-primary-hover: oklch(0.6 0.15 250);
  --color-bg: oklch(0.98 0.02 250);
  --color-text: oklch(0.2 0.02 250);
  
  /* Spacing scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* Typography */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;
  
  /* Border radius */
  --radius-sm: 0.125rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
}
```

### **Theme Switching**
```css
/* Light theme (default) */
:root {
  --color-bg: oklch(0.98 0.02 250);
  --color-text: oklch(0.2 0.02 250);
  --color-border: oklch(0.9 0.02 250);
}

/* Dark theme */
[data-theme="dark"] {
  --color-bg: oklch(0.1 0.02 250);
  --color-text: oklch(0.9 0.02 250);
  --color-border: oklch(0.2 0.02 250);
}

/* Auto theme (respects system preference) */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: oklch(0.1 0.02 250);
    --color-text: oklch(0.9 0.02 250);
    --color-border: oklch(0.2 0.02 250);
  }
}
```

---

## 6. Performance Optimization

### **Critical CSS Inlining**
```html
<!-- Inline critical CSS -->
<style>
  /* Critical above-the-fold styles */
  .header { display: flex; justify-content: space-between; }
  .hero { padding: var(--space-8) 0; }
</style>

<!-- Load non-critical CSS asynchronously -->
<link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="styles.css"></noscript>
```

### **Efficient Asset Loading**
```css
/* Use modern image formats */
.hero-image {
  background-image: image-set(
    url('hero.avif') type('image/avif'),
    url('hero.webp') type('image/webp'),
    url('hero.jpg') type('image/jpeg')
  );
}

/* Lazy loading for non-critical images */
.lazy-image {
  loading: lazy;
  decoding: async;
}
```

---

## 7. Accessibility Checklist

### **Semantic HTML**
- [ ] Use proper heading hierarchy (h1 → h2 → h3)
- [ ] Include alt text for all images
- [ ] Use semantic elements (nav, main, article, section)
- [ ] Provide form labels and error messages

### **Keyboard Navigation**
- [ ] All interactive elements are keyboard accessible
- [ ] Focus indicators are visible
- [ ] Tab order is logical
- [ ] Skip links for main content

### **Screen Reader Support**
- [ ] Use ARIA labels where needed
- [ ] Provide live regions for dynamic content
- [ ] Ensure color isn't the only way to convey information
- [ ] Test with actual screen readers

### **Color and Contrast**
- [ ] Minimum 4.5:1 contrast ratio for normal text
- [ ] Minimum 3:1 contrast ratio for large text
- [ ] Test with color blindness simulators
- [ ] Provide alternative ways to convey information

---

## 8. Responsive Design Patterns

### **Mobile-First Breakpoints**
```css
/* Mobile first approach */
.container {
  padding: var(--space-4);
}

/* Tablet and up */
@media (min-width: 768px) {
  .container {
    padding: var(--space-6);
  }
}

/* Desktop and up */
@media (min-width: 1024px) {
  .container {
    padding: var(--space-8);
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

### **Fluid Typography**
```css
/* Fluid typography using clamp() */
.heading-1 {
  font-size: clamp(2rem, 4vw, 4rem);
  line-height: var(--line-height-tight);
}

.body-text {
  font-size: clamp(1rem, 2vw, 1.125rem);
  line-height: var(--line-height-normal);
}
```

### **Responsive Images**
```css
/* Responsive image with aspect ratio */
.responsive-image {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

/* Art direction for different screen sizes */
.hero-image {
  background-image: url('hero-mobile.jpg');
}

@media (min-width: 768px) {
  .hero-image {
    background-image: url('hero-desktop.jpg');
  }
}
```

---

## 9. Component Architecture

### **BEM Methodology**
```css
/* Block */
.card {
  background: var(--color-bg);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

/* Element */
.card__title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--space-2);
}

.card__content {
  color: var(--color-text);
  line-height: var(--line-height-normal);
}

/* Modifier */
.card--featured {
  border: 2px solid var(--color-primary);
  box-shadow: var(--shadow-lg);
}

.card--compact {
  padding: var(--space-2);
}

.card--compact .card__title {
  font-size: var(--font-size-md);
}
```

### **CSS Modules Pattern**
```css
/* styles.module.css */
.title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-bold);
  margin-bottom: var(--space-2);
}

.content {
  color: var(--color-text);
  line-height: var(--line-height-normal);
}

.featured {
  border: 2px solid var(--color-primary);
  box-shadow: var(--shadow-lg);
}
```

---

## 10. Testing and Validation

### **CSS Testing Checklist**
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile device testing (iOS, Android)
- [ ] Accessibility testing (WAVE, axe-core)
- [ ] Performance testing (Lighthouse, WebPageTest)
- [ ] Visual regression testing

### **Automated Testing**
```javascript
// Example: CSS custom property validation
const root = document.documentElement;
const computedStyle = getComputedStyle(root);

// Check if design tokens are properly defined
const requiredTokens = [
  '--color-primary',
  '--space-4',
  '--font-sans',
  '--radius-md'
];

requiredTokens.forEach(token => {
  if (!computedStyle.getPropertyValue(token)) {
    console.warn(`Missing design token: ${token}`);
  }
});
```

---

## 11. Copy-Paste Snippets

### **Modern Button Component**
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  line-height: var(--line-height-tight);
  text-decoration: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn--primary {
  background: var(--color-primary);
  color: white;
}

.btn--primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn--secondary {
  background: transparent;
  color: var(--color-primary);
  border-color: var(--color-primary);
}

.btn--secondary:hover {
  background: var(--color-primary);
  color: white;
}
```

### **Responsive Grid System**
```css
.grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
}

.grid--2-cols {
  grid-template-columns: repeat(2, 1fr);
}

.grid--3-cols {
  grid-template-columns: repeat(3, 1fr);
}

@media (max-width: 768px) {
  .grid--2-cols,
  .grid--3-cols {
    grid-template-columns: 1fr;
  }
}
```

### **Accessible Form Styling**
```css
.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  font-weight: var(--font-weight-medium);
  margin-bottom: var(--space-1);
  color: var(--color-text);
}

.form-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
  font-size: var(--font-size-sm);
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.1);
}

.form-error {
  color: var(--color-error);
  font-size: var(--font-size-xs);
  margin-top: var(--space-1);
}
```

---

## 12. Future-Proofing

### **CSS Feature Detection**
```css
/* Use @supports for progressive enhancement */
@supports (display: grid) {
  .layout {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr;
  }
}

@supports not (display: grid) {
  .layout {
    display: flex;
    flex-wrap: wrap;
  }
}

/* Container queries support */
@supports (container-type: inline-size) {
  .card {
    container-type: inline-size;
  }
}
```

### **Progressive Enhancement Strategy**
1. **Base**: Semantic HTML with basic styling
2. **Enhanced**: CSS Grid, Flexbox, modern features
3. **Advanced**: Container queries, subgrid, new CSS features
4. **Fallbacks**: Graceful degradation for older browsers

---

## 13. Tools and Resources

### **Essential Tools**
- **Design**: Figma, Sketch, Adobe XD
- **Development**: VS Code, Chrome DevTools, Firefox Developer Tools
- **Testing**: BrowserStack, CrossBrowserTesting
- **Performance**: Lighthouse, WebPageTest, GTmetrix
- **Accessibility**: WAVE, axe-core, Color Oracle

### **CSS Frameworks (2025)**
- **Tailwind CSS**: Utility-first, highly customizable
- **UnoCSS**: On-demand atomic CSS engine
- **Open Props**: CSS custom properties library
- **Pico CSS**: Minimal CSS framework
- **Water.css**: Just-add-water CSS

### **Learning Resources**
- **MDN Web Docs**: Comprehensive CSS reference
- **CSS-Tricks**: Practical CSS techniques
- **A List Apart**: Web design and development articles
- **Smashing Magazine**: Design and development insights
- **Web.dev**: Google's web development guide

---

## 14. Quick Reference

### **CSS Units**
- `rem`: Relative to root font size
- `em`: Relative to parent font size
- `vw/vh`: Viewport width/height
- `%`: Percentage of parent
- `px`: Absolute pixels (use sparingly)

### **Common Breakpoints**
- Mobile: `320px - 767px`
- Tablet: `768px - 1023px`
- Desktop: `1024px - 1439px`
- Large Desktop: `1440px+`

### **Performance Targets**
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

---

*Last updated: January 2025*
*For questions or contributions, please refer to the project documentation.*
