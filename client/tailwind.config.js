/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: {
          page: 'rgb(var(--bg-page) / <alpha-value>)',
          DEFAULT: 'rgb(var(--bg-surface) / <alpha-value>)',
          hover: 'rgb(var(--bg-surface-hover) / <alpha-value>)',
          sunken: 'rgb(var(--bg-surface-sunken) / <alpha-value>)',
        },
        ink: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted: 'rgb(var(--text-muted) / <alpha-value>)',
        },
        line: {
          DEFAULT: 'rgb(var(--border-default) / <alpha-value>)',
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
        },
        brand: {
          DEFAULT: 'rgb(var(--brand) / <alpha-value>)',
          hover: 'rgb(var(--brand-hover) / <alpha-value>)',
          light: 'rgb(var(--brand-light) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
