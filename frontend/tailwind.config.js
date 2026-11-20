/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gridNavy: {
          950: '#060B19',
          900: '#0B132B',
          800: '#1C2541',
          700: '#3A506B',
        },
        electricCyan: {
          DEFAULT: '#00F0FF',
          glow: 'rgba(0, 240, 255, 0.4)',
          500: '#00F0FF',
          400: '#38F3FF',
        },
        energyGreen: {
          DEFAULT: '#10B981',
          glow: 'rgba(16, 185, 129, 0.4)',
          500: '#10B981',
        },
        energyAmber: {
          DEFAULT: '#F59E0B',
          glow: 'rgba(245, 158, 11, 0.4)',
          500: '#F59E0B',
        },
        crimsonFault: {
          DEFAULT: '#EF4444',
          glow: 'rgba(239, 68, 68, 0.4)',
          500: '#EF4444',
        },
      },
      boxShadow: {
        'cyan-glow': '0 0 20px -2px rgba(0, 240, 255, 0.35)',
        'green-glow': '0 0 20px -2px rgba(16, 185, 129, 0.35)',
        'amber-glow': '0 0 20px -2px rgba(245, 158, 11, 0.35)',
        'red-glow': '0 0 25px 0px rgba(239, 68, 68, 0.5)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'flow-dash': 'flowDash 1s linear infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: 1, filter: 'drop-shadow(0 0 8px rgba(0, 240, 255, 0.6))' },
          '50%': { opacity: 0.6, filter: 'drop-shadow(0 0 2px rgba(0, 240, 255, 0.2))' },
        },
      },
    },
  },
  plugins: [],
};
