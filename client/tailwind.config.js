/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: {
          base: '#080c14',       // Deep navy/charcoal base
          sidebar: '#0e1420',    // Sidebar background
          navbar: 'rgba(14, 20, 32, 0.7)', // Glass navbar
          card: 'rgba(20, 28, 45, 0.45)',  // Semi-transparent cards
          cardHover: 'rgba(28, 38, 60, 0.6)'
        },
        brand: {
          orange: '#f97316',     // Primary Orange accent
          orangeDark: '#ea580c', // Dark orange hover
          orangeLight: 'rgba(249, 115, 22, 0.15)', // Light glass highlights
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif'],
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        glassBorder: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.05)',
      },
      backdropBlur: {
        glass: '12px',
      }
    },
  },
  plugins: [],
}
