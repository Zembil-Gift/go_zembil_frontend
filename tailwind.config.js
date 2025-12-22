/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      'sans': ['Gotham', 'Inter', 'sans-serif'],
      'serif': ['Playfair Display', 'serif'],
      'mono': ['ui-monospace', 'SFMono-Regular', 'monospace'],
    },
    extend: {
      fontFamily: {
        'gotham': ['Gotham', 'sans-serif'],
        'gotham-light': ['Gotham-Light', 'sans-serif'],
        'gotham-medium': ['Gotham-Medium', 'sans-serif'],
        'gotham-bold': ['Gotham-Bold', 'sans-serif'],
        'display': ['Gotham-ExtraBold', 'sans-serif'],
        'body': ['Gotham', 'sans-serif'],
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