/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: "#080c14",
          card: "#0d1322",
          border: "#1a243b",
          cyan: "#00f0ff",
          amber: "#ffaa00",
          red: "#ff3366",
          blue: "#0ea5e9",
          green: "#00ff88"
        }
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"]
      }
    },
  },
  plugins: [],
}
