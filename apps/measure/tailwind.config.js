/** @type {import('tailwindcss').Config} */
// PoolOS look: light, rounded, friendly (v2 design). The colour names are kept
// from the original dark theme so every screen re-themes without markup changes:
//   ink-950  page background      ink-900  cards, inputs, panels (white)
//   ink-50   main text            ink-100  muted text and hairlines
// Warning/error/success text shades are darkened to read on white in sun.
export default {
  content: ['./index.html', './src/**/*.{svelte,js,ts}'],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#1d2a36',
          100: '#3c4e5e',
          900: '#ffffff',
          950: '#eef3f7',
        },
        pool: {
          50: '#e3f5fd',
          500: '#0a7fc0',
          600: '#0a8fd0',
          700: '#077ab5',
          900: '#05587f',
        },
        yellow: { 200: '#8a5a00', 300: '#a5610a', 400: '#a5610a', 500: '#f39c12' },
        red: { 300: '#b42b30', 400: '#b42b30', 500: '#e5484d', 600: '#d93a3f', 700: '#b42b30' },
        green: { 300: '#1b7d4e', 400: '#1b7d4e', 500: '#2bb673' },
        blue: { 300: '#0a6f9e' },
      },
      fontFamily: {
        sans: ['Nunito', '"Segoe UI"', 'Arial', 'sans-serif'],
      },
      fontWeight: {
        // Nunito reads best heavy outdoors
        semibold: '800',
        bold: '900',
      },
      fontSize: {
        // Larger base for phone field use
        base: ['1.0625rem', '1.5rem'],
        lg: ['1.25rem', '1.75rem'],
        xl: ['1.5rem', '2rem'],
        '2xl': ['1.875rem', '2.25rem'],
      },
      spacing: {
        // Larger tap targets
        'btn': '3.5rem',
        'field': '3.25rem',
      },
      boxShadow: {
        card: '0 2px 0 #dbe4eb, 0 8px 18px rgba(30, 60, 90, .08)',
      },
    },
  },
  plugins: [],
};
