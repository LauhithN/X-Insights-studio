/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"]
      },
      colors: {
        ink: "#120f0b",
        mist: "#1b1611",
        cinder: "#2a2118",
        glass: "rgba(245, 229, 204, 0.08)",
        edge: "rgba(247, 224, 188, 0.2)",
        neon: "#d7ff70",
        ember: "#ff8652",
        slate: "#c7b291",
        sand: "#f5ead5"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(215, 255, 112, 0.3), 0 0 36px rgba(215, 255, 112, 0.2)",
        card: "0 24px 70px rgba(0,0,0,0.45)",
        lift: "0 12px 32px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};
