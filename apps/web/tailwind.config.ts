import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        stardust: {
          950: "#0b0620",
          900: "#140a33",
          800: "#1f1147",
          600: "#4c2f8f",
          400: "#8a6fd6",
          200: "#d9cbfa",
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
