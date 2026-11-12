/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 0 20px -5px rgba(56, 189, 248, 0.3)',
      },
    },
  },
  plugins: [],
}
