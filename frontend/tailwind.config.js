/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        soc: {
          bg: "#080D16",
          sidebar: "#0D1421",
          card: "#111C2B",
          cardHover: "#152336",
          secondary: "#172437",
          border: "#1E2D42",
          borderLight: "#273A56",
          accent: "#20D6C2",
          accentHover: "#1ABCA9",
          secondaryAccent: "#638CFF",
          critical: "#FF4D6D",
          high: "#FF9F43",
          medium: "#F6C85F",
          low: "#38C995",
          normal: "#20D6C2",
          text: "#EDF3FC",
          muted: "#91A0B5",
          subtle: "#5A6E87",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Courier New", "monospace"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 20px -2px rgba(0, 0, 0, 0.4)",
        glowAccent: "0 0 15px -3px rgba(32, 214, 194, 0.3)",
        glowCritical: "0 0 15px -3px rgba(255, 77, 109, 0.3)",
      },
    },
  },
  plugins: [],
};
