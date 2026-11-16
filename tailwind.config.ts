import type { Config } from "tailwindcss";
import typography from "@tailwindcss/typography";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#eef3fb",
          100: "#d9e4f5",
          200: "#b5c9ea",
          300: "#86a5db",
          400: "#5880c8",
          500: "#3763b0",
          600: "#284d92",
          700: "#1f3d75",
          800: "#1a3260",
          900: "#0f1f45",
        },
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: { fadeUp: "fadeUp .35s ease-out both" },
    },
  },
  plugins: [typography],
};

export default config;
