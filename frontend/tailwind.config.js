/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
  file: [],
  references: [
    {
      path: "./tsconfig.app.json",
    },
    {
      path: "./tsconfig.node.json",
    },
  ],
};
