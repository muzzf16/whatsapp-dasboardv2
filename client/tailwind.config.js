/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'abu-terang': '#F8F9FA',
        'biru-lembut': '#E7F1FF',
      },
    },
  },
  plugins: [],
}