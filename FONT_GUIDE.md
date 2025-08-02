# Font Guide - goZembil (Gotham)

## Primary Font: Gotham

Your website now uses **Gotham** as the primary font family throughout the entire application. Gotham is a modern, clean, and professional sans-serif font that perfectly complements your brand.

## Font Configuration

### 1. Default Font Stack
```css
font-family: 'Gotham', 'Inter', sans-serif;
```

- **Primary**: Gotham
- **Fallback**: Inter (Google Fonts)
- **Generic**: sans-serif

### 2. Available Font Weights

Gotham comes with multiple weights for different design needs:

```jsx
// Thin
<span className="font-gotham-thin">Thin text</span>

// Extra Light
<span className="font-gotham-extra-light">Extra Light text</span>

// Light
<span className="font-gotham-light">Light text</span>

// Book (Regular)
<span className="font-gotham-book">Book weight text</span>

// Regular
<span className="font-gotham">Regular text</span>

// Medium
<span className="font-gotham-medium">Medium text</span>

// Bold
<span className="font-gotham-bold">Bold text</span>

// Extra Bold
<span className="font-gotham-extra-bold">Extra Bold text</span>

// Black
<span className="font-gotham-black">Black text</span>

// Ultra
<span className="font-gotham-ultra">Ultra text</span>
```

### 3. Tailwind Classes

Use these Tailwind classes for consistent typography:

```jsx
// Default font (Gotham)
<div className="font-sans">Default text</div>

// Display font (Gotham Extra Bold)
<h1 className="font-display">Display heading</h1>

// Body font (Gotham)
<p className="font-body">Body text</p>

// Custom weights
<h2 className="font-gotham-bold">Bold heading</h2>
<p className="font-gotham-light">Light paragraph</p>
```

### 4. JavaScript/TypeScript Utilities

Import and use font utilities in your components:

```tsx
import { fonts, getFontFamily, getPrimaryFont } from '@/lib/theme';

// Get font family with specific weight
const boldFont = getFontFamily('bold'); // "Gotham-Bold, Inter, sans-serif"

// Get primary font
const primaryFont = getPrimaryFont(); // "Gotham, Inter, sans-serif"

// Access font weights
const fontWeights = fonts.weights; // All available weights
```

### 5. Common Usage Patterns

#### Headings
```jsx
// Main headings
<h1 className="font-gotham-extra-bold text-4xl text-primary-blue">
  Welcome to goZembil
</h1>

// Section headings
<h2 className="font-gotham-bold text-2xl text-charcoal">
  Featured Products
</h2>

// Subsection headings
<h3 className="font-gotham-medium text-xl text-primary-blue">
  Product Categories
</h3>
```

#### Body Text
```jsx
// Regular body text
<p className="font-gotham text-base text-charcoal">
  Your main content text here.
</p>

// Light body text
<p className="font-gotham-light text-sm text-muted-foreground">
  Secondary or descriptive text.
</p>
```

#### Navigation
```jsx
// Navigation links
<Link className="font-gotham-medium text-primary-blue hover:text-primary-blue/80">
  Home
</Link>

// Logo text
<span className="font-gotham-bold text-xl text-primary-blue">
  goZembil
</span>
```

#### Buttons
```jsx
// Primary buttons
<Button className="font-gotham-medium bg-primary-blue text-white">
  Get Started
</Button>

// Secondary buttons
<Button className="font-gotham border border-primary-blue text-primary-blue">
  Learn More
</Button>
```

### 6. Typography Scale

Recommended font sizes with Gotham:

```jsx
// Display text
<h1 className="font-gotham-extra-bold text-5xl lg:text-6xl">Display</h1>

// Large headings
<h2 className="font-gotham-bold text-3xl lg:text-4xl">Large Heading</h2>

// Medium headings
<h3 className="font-gotham-bold text-2xl lg:text-3xl">Medium Heading</h3>

// Small headings
<h4 className="font-gotham-medium text-xl lg:text-2xl">Small Heading</h4>

// Body text
<p className="font-gotham text-base lg:text-lg">Body text</p>

// Small text
<p className="font-gotham-light text-sm">Small text</p>

// Caption text
<p className="font-gotham-light text-xs">Caption</p>
```

### 7. Font Combinations

Gotham works beautifully with your brand colors:

```jsx
// Primary blue headings
<h2 className="font-gotham-bold text-primary-blue">
  Brand Headings
</h2>

// Ethiopian gold accents
<span className="font-gotham-medium text-ethiopian-gold">
  Accent Text
</span>

// Charcoal body text
<p className="font-gotham text-charcoal">
  Readable body text
</p>
```

### 8. Responsive Typography

```jsx
// Responsive font sizes
<h1 className="font-gotham-extra-bold text-3xl sm:text-4xl md:text-5xl lg:text-6xl">
  Responsive Heading
</h1>

// Responsive line heights
<p className="font-gotham text-base leading-relaxed lg:leading-loose">
  Responsive body text with appropriate line height
</p>
```

### 9. Accessibility

Gotham provides excellent readability:
- ✅ High contrast ratios
- ✅ Clear letterforms
- ✅ Good x-height
- ✅ Consistent character spacing

### 10. File Locations

- **Font Import**: `src/index.css` (lines 1-2)
- **Tailwind Config**: `tailwind.config.js`
- **Theme Utilities**: `src/lib/theme.ts`
- **CSS Utilities**: `src/index.css` (lines 127-137)

### 11. Best Practices

1. **Use appropriate weights**: Light for body text, Bold for headings
2. **Maintain hierarchy**: Use consistent font sizes and weights
3. **Consider readability**: Don't use ultra-thin weights for small text
4. **Be consistent**: Use the same font weights for similar elements
5. **Test on different devices**: Ensure Gotham renders well across platforms

Your goZembil website now has a consistent, professional typography system built around the beautiful Gotham font family! 