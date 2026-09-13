/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    screens: {
      'xs': '380px',   // small phones (iPhone SE and up)
      'sm': '451px',   // tablet starts (per project spec: 451-768)
      'md': '769px',   // desktop starts (per project spec: 769+)
      'lg': '1024px',  // wider desktop, extra breathing room
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {},
  },
  plugins: [],
}
