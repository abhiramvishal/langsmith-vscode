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
        background: "#0d0d14",
        fuchsia: "#e040fb",
        mint: "#00e5a0",
        coral: "#ff6b35",
        cyan: "#40d9ff",
        amber: "#ffd740",
        success: "#00ffb3",
        error: "#ff3d71",
        pending: "#ffaa00",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
