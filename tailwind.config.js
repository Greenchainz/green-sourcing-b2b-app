/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './emails/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
        },
      },
      boxShadow: {
        glass: '0 10px 30px rgba(2, 44, 34, 0.12)',
        glow: '0 0 0 1px rgba(16, 185, 129, 0.10), 0 18px 50px rgba(16, 185, 129, 0.20)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

