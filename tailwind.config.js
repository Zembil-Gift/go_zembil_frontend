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
        'gotham-book': ['Gotham-Book', 'sans-serif'],
        'gotham-medium': ['Gotham-Medium', 'sans-serif'],
        'gotham-bold': ['Gotham-Bold', 'sans-serif'],
        'gotham-black': ['Gotham-Black', 'sans-serif'],
        'gotham-ultra': ['Gotham-Ultra', 'sans-serif'],
        'gotham-thin': ['Gotham-Thin', 'sans-serif'],
        'gotham-xlight': ['Gotham-XLight', 'sans-serif'],
        'gotham-extra-light': ['Gotham-ExtraLight', 'sans-serif'],
        'gotham-extra-bold': ['Gotham-ExtraBold', 'sans-serif'],
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
        'yellow': '#FFFF00',
        'viridian-green': '#11A0A0',
        'june-bud': '#B2D55B',
        'eagle-green': '#01405C',
      },
      scale: {
        '102': '1.02',
      },
    },
  },
  plugins: [],
} 