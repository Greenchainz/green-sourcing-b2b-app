/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './emails/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // GreenChainz Brand Palette - Dark Green + Teal
        // Professional, trustworthy, sustainable
        gc: {
          // Primary: Evergreen (Dark foundation)
          evergreen: {
            DEFAULT: '#11270b',
            50: '#f4f8f3',
            100: '#e5ede3',
            200: '#c8dbc3',
            300: '#9fc096',
            400: '#71a365',
            500: '#4f8340',
            600: '#3c6831',
            700: '#11270b',  // Main brand dark
          },
          // Accent: Bright Fern (Primary action color)
          fern: {
            DEFAULT: '#71b340',
            50: '#f5faf0',
            100: '#e8f4dd',
            200: '#d1e9bc',
            300: '#afd88e',
            400: '#8bc45e',
            500: '#71b340',  // Main accent
            600: '#569130',
            700: '#437028',
            800: '#385a24',
            900: '#304c21',
          },
          // Secondary: Sage Green
          sage: {
            DEFAULT: '#669d31',
            50: '#f6faf0',
            100: '#eaf4dd',
            200: '#d4e8bb',
            300: '#b4d68e',
            400: '#92c161',
            500: '#669d31',  // Secondary
            600: '#578730',
            700: '#446928',
            800: '#385424',
            900: '#304620',
          },
          // Tertiary: Forest Moss
          moss: {
            DEFAULT: '#598b2c',
            50: '#f6faf1',
            100: '#eaf4de',
            200: '#d5e8be',
            300: '#b6d692',
            400: '#94c064',
            500: '#598b2c',  // Tertiary
            600: '#4d7726',
            700: '#3d5e20',
            800: '#344d1e',
            900: '#2c411b',
          },
          // Dark Accent: Olive Leaf
          olive: {
            DEFAULT: '#3c5a14',
            50: '#f6f9f0',
            100: '#eaf2dc',
            200: '#d4e4b9',
            300: '#b5d08a',
            400: '#94b85b',
            500: '#739d3b',
            600: '#598029',
            700: '#456423',
            800: '#3c5a14',  // Dark accent
            900: '#334b17',
          },
          // Teal accents for variety
          teal: {
            DEFAULT: '#0d9488',
            50: '#f0fdfa',
            100: '#ccfbf1',
            200: '#99f6e4',
            300: '#5eead4',
            400: '#2dd4bf',
            500: '#14b8a6',
            600: '#0d9488',
            700: '#0f766e',
            800: '#115e59',
            900: '#134e4a',
          },
        },
        // Keep legacy aliases for compatibility
        brand: {
          50: '#f5faf0',
          100: '#e8f4dd',
          200: '#d1e9bc',
          300: '#afd88e',
          400: '#8bc45e',
          500: '#71b340',  // Bright Fern
          600: '#569130',
          700: '#11270b',  // Evergreen
          800: '#0d1f08',
          900: '#091506',
          950: '#050b03',
        },
        ocean: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
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

