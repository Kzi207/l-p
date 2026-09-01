import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FFF8F0",
        blush: "#FFB6C1",
        cocoa: "#4A3B34",
      },
      fontFamily: {
        display: ["var(--font-baloo)", "sans-serif"],
        sans: ["var(--font-inter)", "sans-serif"],
        handwritten: ["var(--font-caveat)", "cursive"],
      },
      boxShadow: {
        soft: "8px 8px 18px rgba(148, 116, 98, 0.14), -8px -8px 18px rgba(255, 255, 255, 0.9)",
        insetSoft: "inset 4px 4px 10px rgba(148, 116, 98, 0.12), inset -4px -4px 10px rgba(255, 255, 255, 0.9)",
      },
    },
  },
  plugins: [],
};

export default config;
