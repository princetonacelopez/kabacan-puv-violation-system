/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./app/**/*.{js,ts,jsx,tsx,mdx}", // App Router files
      "./components/**/*.{js,ts,jsx,tsx,mdx}", // Custom components
      "./pages/**/*.{js,ts,jsx,tsx,mdx}", // If using Pages Router (optional)
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  };