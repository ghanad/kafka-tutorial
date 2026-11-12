/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      fontFamily: {
        sans: ['Vazirmatn', 'Tahoma', 'system-ui', 'sans-serif'],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      boxShadow: {
        soft: '0 18px 50px -28px rgb(49 46 129 / 0.45)',
        glow: '0 0 0 1px rgb(99 102 241 / 0.18), 0 20px 60px -30px rgb(79 70 229 / 0.55)',
      },
      backgroundImage: {
        'grid-light':
          'linear-gradient(to right, rgb(99 102 241 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(99 102 241 / 0.08) 1px, transparent 1px)',
        'grid-dark':
          'linear-gradient(to right, rgb(129 140 248 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(129 140 248 / 0.08) 1px, transparent 1px)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '0.45' },
          '50%': { opacity: '0.9' },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
