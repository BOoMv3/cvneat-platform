/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'fold': {'min': '280px'}, // Téléphones pliables en mode plié (Honor Magic V5, etc.) - min-width pour que fold: fonctionne
        'xs': '375px',   // Téléphones standards
      },
      colors: {
        primary: '#000000',
        secondary: '#4A4A4A',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
    require('@tailwindcss/forms'),
  ],
} 