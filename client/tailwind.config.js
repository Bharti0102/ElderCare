/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0284c7', // Primary accessible blue
          600: '#0369a1',
          700: '#075985',
          800: '#0c4a6e',
          900: '#082f49',
        },
        care: {
          emerald: '#059669',
          amber: '#d97706',
          rose: '#e11d48',
          indigo: '#4f46e5',
        }
      },
      fontSize: {
        'elder-base': ['1.125rem', { lineHeight: '1.75rem' }],
        'elder-lg': ['1.25rem', { lineHeight: '1.875rem' }],
        'elder-xl': ['1.5rem', { lineHeight: '2rem' }],
        'elder-2xl': ['1.875rem', { lineHeight: '2.25rem' }],
      }
    },
  },
  plugins: [],
};
