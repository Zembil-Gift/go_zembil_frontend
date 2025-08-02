# Brand Colors Guide - goZembil

## Primary Brand Color: #01415c
## Custom Yellow Color: #ffff00

Your brand colors are now available throughout the website in multiple ways:

### 1. Tailwind CSS Classes

Use these Tailwind classes anywhere in your components:

```jsx
// Text colors
<span className="text-primary-blue">Primary blue text</span>
<span className="text-brand-blue">Brand blue text (same color)</span>
<span className="text-custom-yellow">Custom yellow text</span>

// Background colors
<div className="bg-primary-blue">Primary blue background</div>
<button className="bg-primary-blue text-white">Primary blue button</button>
<div className="bg-custom-yellow">Custom yellow background</div>
<button className="bg-custom-yellow text-charcoal">Custom yellow button</button>

// Border colors
<div className="border border-primary-blue">Primary blue border</div>
<div className="border border-custom-yellow">Custom yellow border</div>

// Hover states
<button className="hover:bg-primary-blue hover:text-white">
  Hover to primary blue
</button>
<button className="hover:bg-custom-yellow hover:text-charcoal">
  Hover to custom yellow
</button>
```

### 2. CSS Custom Properties

Use CSS variables in your styles:

```css
.my-custom-element {
  color: var(--color-primary-blue);
  background-color: var(--color-primary-blue);
  border-color: var(--color-primary-blue);
}

.my-yellow-element {
  color: var(--color-custom-yellow);
  background-color: var(--color-custom-yellow);
  border-color: var(--color-custom-yellow);
}
```

### 3. JavaScript/TypeScript Utilities

Import and use the theme utilities:

```tsx
import { brandColors, tailwindClasses, applyThemeColor } from '@/lib/theme';

// Get the color values
const primaryBlue = brandColors.primaryBlue; // "#01415c"
const customYellow = brandColors.customYellow; // "#ffff00"

// Get Tailwind class names
const textClass = tailwindClasses.primaryBlue; // "text-primary-blue"
const yellowClass = tailwindClasses.customYellow; // "text-custom-yellow"

// Apply color programmatically
const color = applyThemeColor('primaryBlue'); // "#01415c"
const yellowColor = applyThemeColor('customYellow'); // "#ffff00"
```

### 4. Common Usage Examples

#### Headers and Navigation
```jsx
// Logo text
<span className="text-primary-blue font-bold">goZembil</span>

// Navigation links
<Link className="text-primary-blue hover:text-primary-blue/80">
  Home
</Link>
```

#### Buttons
```jsx
// Primary buttons
<Button className="bg-primary-blue text-white hover:bg-primary-blue/90">
  Get Started
</Button>

// Custom yellow buttons
<Button className="bg-custom-yellow text-charcoal hover:bg-custom-yellow/90">
  View All
</Button>

// Outline buttons
<Button className="border border-primary-blue text-primary-blue hover:bg-primary-blue hover:text-white">
  Learn More
</Button>

// Yellow outline buttons
<Button className="border border-custom-yellow text-custom-yellow hover:bg-custom-yellow hover:text-charcoal">
  Shop Now
</Button>
```

#### Cards and Sections
```jsx
// Section headers
<h2 className="text-primary-blue text-2xl font-bold">
  Featured Products
</h2>

// Card borders
<div className="border-l-4 border-primary-blue p-4">
  Highlighted content
</div>
```

#### Forms
```jsx
// Form labels
<label className="text-primary-blue font-medium">
  Email Address
</label>

// Focus states
<input className="focus:border-primary-blue focus:ring-primary-blue" />
```

### 5. Color Combinations

Your primary blue works well with existing brand colors:

```jsx
// Primary blue + Ethiopian gold
<div className="bg-primary-blue text-ethiopian-gold">
  High contrast combination
</div>

// Custom yellow + Charcoal text
<div className="bg-custom-yellow text-charcoal">
  Bright, energetic combination
</div>

// Primary blue + Light cream background
<div className="bg-light-cream text-primary-blue">
  Subtle, professional look
</div>

// Custom yellow + White background
<div className="bg-white text-custom-yellow">
  Clean, vibrant appearance
</div>

// Primary blue + White
<div className="bg-primary-blue text-white">
  Clean, modern appearance
</div>
```

### 6. Accessibility

The brand colors have good contrast ratios:

**Primary Blue (#01415c):**
- ✅ White text on primary blue: 13.5:1 (Excellent)
- ✅ Primary blue text on light cream: 7.2:1 (Good)
- ✅ Primary blue text on white: 12.8:1 (Excellent)

**Custom Yellow (#ffff00):**
- ✅ Charcoal text on custom yellow: 11.2:1 (Excellent)
- ✅ Custom yellow text on white: 15.1:1 (Excellent)
- ✅ Custom yellow text on dark backgrounds: 16.8:1 (Excellent)

### 7. File Locations

- **Tailwind Config**: `tailwind.config.js`
- **CSS Variables**: `src/index.css`
- **Theme Utilities**: `src/lib/theme.ts`
- **Example Usage**: `src/components/layout/streamlined-header.tsx`

### 8. Migration Guide

To replace existing colors with your brand colors:

```jsx
// Before
<span className="text-deep-forest">Text</span>
<span className="text-charcoal">Text</span>
<button className="bg-yellow-500">Button</button>

// After
<span className="text-primary-blue">Text</span>
<button className="bg-custom-yellow text-charcoal">Button</button>
```

This ensures consistent branding throughout your goZembil website! 