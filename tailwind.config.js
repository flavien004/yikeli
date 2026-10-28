/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class', // mode sombre désactivé par défaut : interface claire
  theme: {
    extend: {
      colors: {
        brand: '#E87722',
        zinc: {
          50: '#FFFDFB', 100: '#FFF7EF', 200: '#F7E9DA', 300: '#EBD9C5',
          400: '#B9A593', 500: '#8C7A69', 600: '#6C5B4C', 700: '#4F4136',
          800: '#35291F', 900: '#241A12', 950: '#170F09',
        },
      },
    },
  },
  plugins: [],
};
