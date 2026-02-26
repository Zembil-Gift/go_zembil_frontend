/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      'sans': ['DM Sans', 'sans-serif'],
      'serif': ['Playfair Display', 'serif'],
      'mono': ['ui-monospace', 'SFMono-Regular', 'monospace'],
    },
    extend: {
      /* Fluid typography - conservative scaling (max ~2–4% larger than min at 1440px) */
      /* Use text-fixed-xs, text-fixed-sm etc. where fluid scaling would break layout (e.g. charts) */
      fontSize: {
        'xs': ['clamp(0.75rem, 0.74rem + 0.04vw, 0.77rem)', { lineHeight: '1rem' }],
        'sm': ['clamp(0.875rem, 0.86rem + 0.06vw, 0.9rem)', { lineHeight: '1.25rem' }],
        'base': ['clamp(1rem, 0.98rem + 0.08vw, 1.03rem)', { lineHeight: '1.5rem' }],
        'lg': ['clamp(1.125rem, 1.1rem + 0.1vw, 1.16rem)', { lineHeight: '1.75rem' }],
        'xl': ['clamp(1.25rem, 1.22rem + 0.12vw, 1.28rem)', { lineHeight: '1.75rem' }],
        '2xl': ['clamp(1.5rem, 1.46rem + 0.17vw, 1.56rem)', { lineHeight: '2rem' }],
        '3xl': ['clamp(1.875rem, 1.82rem + 0.23vw, 1.96rem)', { lineHeight: '2.25rem' }],
        '4xl': ['clamp(2.25rem, 2.18rem + 0.31vw, 2.38rem)', { lineHeight: '2.5rem' }],
        '5xl': ['clamp(3rem, 2.9rem + 0.42vw, 3.15rem)', { lineHeight: '1' }],
        '6xl': ['clamp(3.75rem, 3.62rem + 0.52vw, 3.92rem)', { lineHeight: '1' }],
        '7xl': ['clamp(4.5rem, 4.34rem + 0.63vw, 4.7rem)', { lineHeight: '1' }],
        '8xl': ['clamp(6rem, 5.78rem + 0.9vw, 6.25rem)', { lineHeight: '1' }],
        '9xl': ['clamp(8rem, 7.7rem + 1.2vw, 8.35rem)', { lineHeight: '1' }],
        /* Fixed sizes for charts, SVG labels, or components that break with fluid scaling */
        'fixed-xs': ['0.75rem', { lineHeight: '1rem' }],
        'fixed-sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'fixed-base': ['1rem', { lineHeight: '1.5rem' }],
      },
      fontFamily: {
        'gotham': ['Gotham', 'sans-serif'],
        'gotham-light': ['Gotham-Light', 'sans-serif'],
        'gotham-medium': ['Gotham-Medium', 'sans-serif'],
        'gotham-bold': ['Gotham-Bold', 'sans-serif'],
        'display': ['DM Sans', 'sans-serif'],
        'body': ['DM Sans', 'sans-serif'],
      },
      colors: {
        // Ethiopian themed colors
        'ethiopian-gold': '#FDCB2D',
        'deep-forest': '#1C3A2D',
        'warm-red': '#E94E1B',
        'warm-gold': '#CD853F',
        'light-cream': '#F8F8F8',
        'charcoal': '#222222',
        // Brand colors
        'viridian-green': '#11A0A0',
        'june-bud': '#B2D55B',
        'eagle-green': '#01405C',
        // UI colors (CSS custom properties for theme support)
        'background': 'hsl(var(--background) / <alpha-value>)',
        'foreground': 'hsl(var(--foreground) / <alpha-value>)',
        'muted': 'hsl(var(--muted) / <alpha-value>)',
        'muted-foreground': 'hsl(var(--muted-foreground) / <alpha-value>)',
        'popover': 'hsl(var(--popover) / <alpha-value>)',
        'popover-foreground': 'hsl(var(--popover-foreground) / <alpha-value>)',
        'card': 'hsl(var(--card) / <alpha-value>)',
        'card-foreground': 'hsl(var(--card-foreground) / <alpha-value>)',
        'border': 'hsl(var(--border) / <alpha-value>)',
        'input': 'hsl(var(--input) / <alpha-value>)',
        'primary': 'hsl(var(--primary) / <alpha-value>)',
        'primary-foreground': 'hsl(var(--primary-foreground) / <alpha-value>)',
        'secondary': 'hsl(var(--secondary) / <alpha-value>)',
        'secondary-foreground': 'hsl(var(--secondary-foreground) / <alpha-value>)',
        'accent': 'hsl(var(--accent) / <alpha-value>)',
        'accent-foreground': 'hsl(var(--accent-foreground) / <alpha-value>)',
        'destructive': 'hsl(var(--destructive) / <alpha-value>)',
        'destructive-foreground': 'hsl(var(--destructive-foreground) / <alpha-value>)',
        'ring': 'hsl(var(--ring) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}