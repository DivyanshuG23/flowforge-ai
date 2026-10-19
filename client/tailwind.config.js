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
          850: '#141714',
          800: '#181A18',
          700: '#222622',
        },
        card: {
          DEFAULT: '#151715',
          surface: '#151715',
          hover: '#1C1F1C',
          active: '#242824',
          border: 'rgba(185, 176, 160, 0.12)',
          borderSubtle: 'rgba(185, 176, 160, 0.08)',
          borderHighlight: 'rgba(185, 176, 160, 0.22)',
        },
        gold: {
          DEFAULT: '#E5B45B',
          champagne: '#E5B45B',
          hover: '#D49E3F',
          active: '#BF8C34',
          muted: 'rgba(229, 180, 91, 0.15)',
          glow: 'rgba(229, 180, 91, 0.25)',
          border: 'rgba(229, 180, 91, 0.3)',
        },
        emerald: {
          DEFAULT: '#059669',
          run: '#059669',
          hover: '#047857',
          muted: 'rgba(5, 150, 105, 0.15)',
          glow: 'rgba(5, 150, 105, 0.25)',
          border: 'rgba(5, 150, 105, 0.3)',
        },
        ruby: {
          DEFAULT: '#C83C3C',
          red: '#C83C3C',
          hover: '#A82F2F',
          muted: 'rgba(200, 60, 60, 0.15)',
          glow: 'rgba(200, 60, 60, 0.25)',
          border: 'rgba(200, 60, 60, 0.3)',
        },
        ivory: {
          DEFAULT: '#F5F0E6',
          warm: '#F5F0E6',
          light: '#FAF7F2',
          surface: '#F1ECE1',
          border: '#DDD5C5',
          muted: '#D8D1C3',
          dark: '#3A3833',
        },
        warmgray: {
          DEFAULT: '#B9B0A0',
          muted: '#B9B0A0',
          subtle: 'rgba(185, 176, 160, 0.65)',
        },
        darkolive: {
          DEFAULT: '#252419',
          surface: '#252419',
          hover: '#2E2C1E',
          border: 'rgba(229, 180, 91, 0.25)',
        },
        steel: {
          DEFAULT: '#1E2220',
          light: '#282D2A',
          border: 'rgba(185, 176, 160, 0.18)',
        },
        tech: {
          cyan: '#06B6D4',
          indigo: '#6366F1',
          amber: '#F59E0B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-gold': '0 0 20px -3px rgba(229, 180, 91, 0.25)',
        'glow-gold-lg': '0 0 35px -5px rgba(229, 180, 91, 0.35)',
        'glow-emerald': '0 0 20px -3px rgba(5, 150, 105, 0.25)',
        'glow-ruby': '0 0 20px -3px rgba(200, 60, 60, 0.25)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
        'card-hover': '0 10px 30px -5px rgba(0, 0, 0, 0.75)',
        'inner-highlight': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
        'inner-gold': 'inset 0 1px 0 0 rgba(229, 180, 91, 0.3)',
      }
    },
  },
  plugins: [],
}
