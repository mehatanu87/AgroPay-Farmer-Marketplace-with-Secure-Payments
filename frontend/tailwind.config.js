/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        agro: {
          50: "#f2f9ee",
          100: "#e0f0d6",
          200: "#c2e1af",
          300: "#9ccd80",
          400: "#79b859",
          500: "#5a9c3d",
          600: "#457c2e",
          700: "#376226",
          800: "#2e4e22",
          900: "#28421f",
        },
        earth: {
          50: "#faf6f0",
          100: "#f0e6d6",
          200: "#e0c9a8",
          300: "#cba474",
          400: "#b9854d",
          500: "#a06d3a",
          600: "#82552f",
          700: "#68432a",
          800: "#563828",
          900: "#493023",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
