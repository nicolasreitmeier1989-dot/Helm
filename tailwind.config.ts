import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Flipped scale: ink-0 = pure white, ink-1000 = pure black.
        // Lower indices = lighter (backgrounds), higher = darker (text).
        ink: {
          0: "#ffffff",
          50: "#fafafa",
          100: "#f5f5f5",
          200: "#ebebeb",
          300: "#dcdcdc",
          400: "#bdbdbd",
          500: "#8a8a8a",
          600: "#5a5a5a",
          700: "#3d3d3d",
          800: "#262626",
          900: "#141414",
          950: "#0a0a0a",
          1000: "#000000",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        display: ["var(--font-display)", "var(--font-inter)", "sans-serif"],
      },
      letterSpacing: {
        widest: "0.25em",
        wider: "0.18em",
      },
    },
  },
  plugins: [],
};

export default config;
