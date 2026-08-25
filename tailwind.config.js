/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Segoe UI"', '-apple-system', 'BlinkMacSystemFont', 'Roboto', 'sans-serif'],
      },
      colors: {
        // Brand green #00891D – single green used across full project
        green: {
          50: '#e8f5ea',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#4caf50',
          500: '#00a322',
          600: '#00891D', // Brand green (main)
          700: '#006b17',
          800: '#005212',
          900: '#003d0e',
          950: '#002909',
        },
        // Teal & cyan alias to same green (no other greens in project)
        teal: {
          50: '#e8f5ea',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#4caf50',
          500: '#00a322',
          600: '#00891D',
          700: '#006b17',
          800: '#005212',
          900: '#003d0e',
          950: '#002909',
        },
        cyan: {
          50: '#e8f5ea',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#4caf50',
          500: '#00a322',
          600: '#00891D',
          700: '#006b17',
          800: '#005212',
          900: '#003d0e',
          950: '#002909',
        },
      },
    },
  },
  plugins: [],
};
