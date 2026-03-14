/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        display: ['"Syne"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ink: {
          50: '#f0f0f4',
          100: '#e2e2ea',
          200: '#c5c5d5',
          300: '#9898b0',
          400: '#6b6b8a',
          500: '#4a4a6a',
          600: '#363652',
          700: '#232338',
          800: '#15152a',
          900: '#0a0a1a',
          950: '#050510',
        },
        accent: {
          DEFAULT: '#7c6af7',
          light: '#a89bf9',
          dark: '#5a4ad4',
        },
        jade: {
          DEFAULT: '#2dd4a0',
          light: '#6ee9c0',
          dark: '#1aab7e',
        },
        coral: {
          DEFAULT: '#f97462',
          light: '#fba396',
          dark: '#e84f3c',
        },
        amber: {
          DEFAULT: '#f5b944',
          light: '#f8cf7a',
          dark: '#d4952a',
        }
      },
      backgroundImage: {
        'mesh': 'radial-gradient(at 40% 20%, hsla(253,91%,70%,0.15) 0px, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.08) 0px, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,0.05) 0px, transparent 50%)',
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-up': 'fadeUp 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        slideIn: {
          from: { transform: 'translateX(-12px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        fadeUp: {
          from: { transform: 'translateY(12px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      }
    },
  },
  plugins: [],
}
