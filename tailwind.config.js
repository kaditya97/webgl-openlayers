/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      './src/**/*.{ts,tsx}',
    ],
    theme: {
      extend: {
        colors: {
          primary: "#ff0000",
          secondary: "#FF7722",
          grey: "#F2F2F2",
        },
      },
    },
    plugins: [],
  };