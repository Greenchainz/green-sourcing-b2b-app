/** @type {import('tailwindcss').Config} */
export default {
  content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // GreenChainz Brand Colors (from layout.css spec in blueprint)
        primary: {
          DEFAULT: 'hsl(142.1, 76.2%, 36.3%)', // Main green
          hover: 'hsl(142.1, 76.2%, 32%)',     // Darker on hover
          light: 'hsl(142.1, 76.2%, 45%)',     // Lighter variant
        },
        // System Colors (for UI consistency)
        background: 'hsl(0, 0%, 100%)',        // White
        foreground: 'hsl(222.2, 84%, 4.9%)',   // Near-black for text
        muted: {
          DEFAULT: 'hsl(210, 40%, 96.1%)',     // Light gray backgrounds
          foreground: 'hsl(215.4, 16.3%, 46.9%)', // Muted text
        },
        border: 'hsl(214.3, 31.8%, 91.4%)',    // Subtle borders
        destructive: {
          DEFAULT: 'hsl(0, 84.2%, 60.2%)',     // Red for errors
          foreground: 'hsl(0, 0%, 100%)',      // White text on red
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'], // Clean, modern font
      },
    },
  },
  plugins: [],
}
