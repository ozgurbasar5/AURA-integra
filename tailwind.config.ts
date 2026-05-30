import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        amber: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
      },
      animation: {
        "float": "float 3s ease-in-out infinite",
        "pulse-amber": "pulseAmber 2.5s infinite",
        "fade-in-up": "fadeInUp 0.6s ease both",
        "blink": "blink 1.2s infinite",
        "spin-slow": "spin 3s linear infinite",
        "modal-in": "modalIn 0.25s ease",
        "overlay-in": "overlayIn 0.2s ease"
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        },
        pulseAmber: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245,158,11,0.4)" },
          "50%": { boxShadow: "0 0 0 8px rgba(245,158,11,0)" }
        },
        fadeInUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" }
        },
        modalIn: {
          from: { opacity: "0", transform: "scale(0.92) translateY(-16px)" },
          to: { opacity: "1", transform: "scale(1) translateY(0)" }
        },
        overlayIn: {
          from: { opacity: "0" },
          to: { opacity: "1" }
        }
      }
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
};
export default config;
