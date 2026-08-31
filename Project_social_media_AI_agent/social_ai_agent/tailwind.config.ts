import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#dde8ff",
          500: "#4f6ef7",
          600: "#3b5ce6",
          700: "#2d4acc",
          900: "#1a2980",
        },
      },
    },
  },
  plugins: [],
};
export default config;
