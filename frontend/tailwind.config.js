/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'green-primary': '#2D5016',
                'green-secondary': '#4A7C2C',
                'green-accent': '#7CB342',
                'green-light': '#AED581',
                'neutral-dark': '#212121',
                'neutral-medium': '#757575',
                'neutral-light': '#E0E0E0',
            },
        },
    },
    plugins: [],
}
