import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-display)", "serif"],
        display: ["var(--font-display)", "serif"],
        body: ["var(--font-body)", "serif"],
      },
      // The palette lives in globals.css as custom properties; these are the
      // same values exposed to utilities so page code can stay readable.
      colors: {
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          faint: "var(--ink-faint)",
        },
        vellum: {
          DEFAULT: "var(--vellum)",
          warm: "var(--vellum-warm)",
          deep: "var(--vellum-deep)",
        },
        rubric: "var(--rubric)",
        gilt: "var(--gilt)",
        fell: {
          DEFAULT: "var(--fell)",
          deep: "var(--fell-deep)",
        },
        lake: "var(--lake)",
      },
    },
  },
  plugins: [],
};
export default config;
