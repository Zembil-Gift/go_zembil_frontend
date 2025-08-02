// Brand Colors
export const brandColors = {
  primaryBlue: '#01415c',
  brandBlue: '#01415c',
  customYellow: '#ffff00',
  ethiopianGold: '#FDCB2D',
  deepForest: '#1C3A2D',
  warmRed: '#E94E1B',
  warmGold: '#CD853F',
  lightCream: '#F8F8F8',
  charcoal: '#222222',
} as const;

// CSS Custom Properties
export const cssVariables = {
  '--color-primary-blue': brandColors.primaryBlue,
  '--color-brand-blue': brandColors.brandBlue,
  '--color-custom-yellow': brandColors.customYellow,
  '--color-ethiopian-gold': brandColors.ethiopianGold,
  '--color-deep-forest': brandColors.deepForest,
  '--color-warm-red': brandColors.warmRed,
  '--color-warm-gold': brandColors.warmGold,
  '--color-light-cream': brandColors.lightCream,
  '--color-charcoal': brandColors.charcoal,
} as const;

// Tailwind class names
export const tailwindClasses = {
  primaryBlue: 'text-primary-blue',
  brandBlue: 'text-brand-blue',
  bgPrimaryBlue: 'bg-primary-blue',
  bgBrandBlue: 'bg-brand-blue',
  borderPrimaryBlue: 'border-primary-blue',
  borderBrandBlue: 'border-brand-blue',
  customYellow: 'text-custom-yellow',
  bgCustomYellow: 'bg-custom-yellow',
  borderCustomYellow: 'border-custom-yellow',
} as const;

// Utility function to apply theme colors
export const applyThemeColor = (color: keyof typeof brandColors) => {
  return brandColors[color];
};

// Utility function to get CSS variable
export const getCSSVariable = (variable: keyof typeof cssVariables) => {
  return cssVariables[variable];
};

// Font configuration
export const fonts = {
  primary: 'Gotham',
  fallback: 'Inter',
  serif: 'Playfair Display',
  weights: {
    thin: 'Gotham-Thin',
    extraLight: 'Gotham-ExtraLight',
    light: 'Gotham-Light',
    book: 'Gotham-Book',
    regular: 'Gotham',
    medium: 'Gotham-Medium',
    bold: 'Gotham-Bold',
    extraBold: 'Gotham-ExtraBold',
    black: 'Gotham-Black',
    ultra: 'Gotham-Ultra',
  },
} as const;

// Font utility functions
export const getFontFamily = (weight: keyof typeof fonts.weights = 'regular') => {
  return `${fonts.weights[weight]}, ${fonts.fallback}, sans-serif`;
};

export const getPrimaryFont = () => {
  return `${fonts.primary}, ${fonts.fallback}, sans-serif`;
}; 