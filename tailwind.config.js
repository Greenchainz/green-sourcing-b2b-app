/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './emails/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Dollar Bill / Money Green palette - inspired by US currency
        money: {
          50: '#f0fdf4',   // Lightest money green
          100: '#dcfce7',  // Very light
          200: '#bbf7d0',  // Light green
          300: '#86efac',  // Soft money green
          400: '#4ade80',  // Medium green
          500: '#22c55e',  // Primary money green
          600: '#16a34a',  // Classic dollar bill green
          700: '#15803d',  // Deep money green
          800: '#166534',  // Dark dollar green
          900: '#14532d',  // Very dark green
          950: '#052e16',  // Almost black green
        },
        brand: {
          50: '#ecfdf8',   // Lightest mint
          100: '#d1fae9',  // Light mint
          200: '#a7f3d5',  // Soft green
          300: '#6ee7c2',  // Light teal
          400: '#34d399',  // Emerald
          500: '#10b981',  // Primary green
          600: '#059669',  // Deep green
          700: '#047857',  // Forest green
          800: '#065f46',  // Dark forest
          900: '#064e3b',  // Darkest green
          950: '#022c22',  // Almost black green
        },
        ocean: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#22d3ee',
          500: '#06b6d4',  // Primary teal
          600: '#0891b2',
          700: '#0e7490',
          800: '#155e75',
          900: '#164e63',
        },
        midnight: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',  // Deep blue
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'slide-in': 'slideIn 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(16, 185, 129, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(2, 44, 34, 0.08)',
        'glass-lg': '0 12px 48px rgba(2, 44, 34, 0.12)',
        'glow': '0 0 0 1px rgba(16, 185, 129, 0.1), 0 20px 60px rgba(16, 185, 129, 0.3)',
        'glow-blue': '0 0 0 1px rgba(6, 182, 212, 0.1), 0 20px 60px rgba(6, 182, 212, 0.25)',
        'premium': '0 10px 40px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02)',
        'premium-lg': '0 20px 60px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.03)',
        'inner-glow': 'inset 0 1px 2px rgba(255, 255, 255, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer-gradient': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}

