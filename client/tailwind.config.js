/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          DEFAULT: '#0B0D0C',
          950: '#0B0D0C',
          900: '#111311',
          800: '#181A18',
        },
        card: {
          DEFAULT: '#151715',
          surface: '#151715',
          hover: '#1C1F1C',
          border: 'rgba(185, 176, 160, 0.12)',
        },
        gold: {
          DEFAULT: '#E5B45B',
          champagne: '#E5B45B',
          hover: '#D49E3F',
          muted: 'rgba(229, 180, 91, 0.15)',
          glow: 'rgba(229, 180, 91, 0.25)',
        },
        emerald: {
          DEFAULT: '#059669',
          run: '#059669',
          muted: 'rgba(5, 150, 105, 0.15)',
        },
        ruby: {
          DEFAULT: '#C83C3C',
          red: '#C83C3C',
          muted: 'rgba(200, 60, 60, 0.15)',
        },
        ivory: {
          DEFAULT: '#F5F0E6',
          warm: '#F5F0E6',
        },
        warmgray: {
          DEFAULT: '#B9B0A0',
          muted: '#B9B0A0',
        },
        darkolive: {
          DEFAULT: '#252419',
          surface: '#252419',
          border: 'rgba(229, 180, 91, 0.25)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-gold': '0 0 20px -3px rgba(229, 180, 91, 0.25)',
        'glow-emerald': '0 0 20px -3px rgba(5, 150, 105, 0.25)',
        'glow-ruby': '0 0 20px -3px rgba(200, 60, 60, 0.25)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
      }
    },
  },
  plugins: [],
}
