/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./data/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#171613",
        olive: "#424933",
        "olive-dark": "#343a28",
        paper: "#fcfaf6",
        panel: "#f7f3ed",
        line: "#d9d2c7",
        muted: "#6c675f",
        sand: "#efe9df",
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 18px 50px rgba(38, 35, 30, 0.04)",
        menu: "0 24px 60px rgba(38, 35, 30, 0.14)",
      },
    },
  },
  plugins: [],
};
