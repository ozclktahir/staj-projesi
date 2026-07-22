import type { Config } from "tailwindcss";

/**
 * Tailwind v4 CSS-first yapıda çalışır; darkMode class senkronu için
 * globals.css içindeki @custom-variant dark (&:where(.dark, .dark *)) esastır.
 * Bu dosya darkMode: 'class' bilgisini açıkça tutar.
 */
const config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
} satisfies Config;

export default config;
