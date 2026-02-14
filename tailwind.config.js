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
        ink: "#060a10",
        mist: "#0a0f16",
        glass: "rgba(255, 255, 255, 0.04)",
        edge: "rgba(255, 255, 255, 0.08)",
        neon: "#6ef3c5",
        ember: "#ff7a59",
        blue: "#5b8def",
        slate: "#c8d5e2"
      },
      fontFamily: {
        sans: ["var(--font-space)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"]
      },
      animation: {
        "spin-slow": "spinSlow 1.5s linear infinite",
        "progress-slide": "progressSlide 1.8s ease-in-out infinite"
      },
      keyframes: {
        spinSlow: {
          to: { transform: "rotate(360deg)" }
        },
        progressSlide: {
          "0%": { transform: "translateX(-100%)" },
          "50%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(100%)" }
        }
      },
      boxShadow: {
        glow: "0 0 16px rgba(110, 243, 197, 0.12)",
        card: "0 8px 32px rgba(0,0,0,0.35)"
      }
    }
  },
  plugins: []
};
