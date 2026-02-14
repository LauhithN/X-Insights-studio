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
      colors: {
        ink: "#0b0f14",
        mist: "#0f1621",
        glass: "rgba(255, 255, 255, 0.06)",
        edge: "rgba(255, 255, 255, 0.12)",
        neon: "#6ef3c5",
        ember: "#ff7a59",
        slate: "#c8d5e2"
      },
      boxShadow: {
        glow: "0 0 24px rgba(110, 243, 197, 0.18)",
        card: "0 20px 60px rgba(0,0,0,0.45)"
      }
    }
  },
  plugins: []
};
