/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#070b09",
        panel: "#101714",
        panelAlt: "#16201c",
        line: "rgba(255,255,255,0.08)",
        accent: "#1ed760",
        accentSoft: "#7bf2a6",
        text: "#f5f7f5",
        muted: "#9eaaa5"
      },
      boxShadow: {
        glow: "0 20px 80px rgba(30, 215, 96, 0.18)"
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "sans-serif"]
      }
    }
  },
  plugins: []
};