import type { Config } from "tailwindcss";
import { tokens } from "./src/lib/tokens";

const config: Config = {
  theme: {
    extend: {
      colors: {
        paper: tokens.paper,
        receipt: tokens.receipt,
        ink: tokens.ink,
        blood: tokens.blood,
        mint: tokens.mint,
        chartreuse: tokens.chartreuse,
      },
      boxShadow: {
        neo: tokens.shadow,
      },
      fontFamily: {
        sans: ["var(--font-space-mono)", "JetBrains Mono", "Courier New", "monospace"],
        mono: ["var(--font-space-mono)", "JetBrains Mono", "Courier New", "monospace"],
      },
    },
  },
};

export default config;
