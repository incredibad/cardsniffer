/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        display: ["Cinzel", "serif"],
      },
      colors: {
        ink: {
          950: "#0b0a08",
          900: "#141210",
          800: "#1f1c18",
          700: "#2b2620",
          600: "#3a332a",
        },
        gold: {
          300: "#e8cf8a",
          400: "#d4af5a",
          500: "#c9a227",
          600: "#a5811c",
          700: "#7d6216",
        },
      },
    },
  },
  plugins: [],
};
