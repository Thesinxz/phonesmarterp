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
                brand: {
                    50: "#e8f0f9",
                    100: "#c5d8ef",
                    200: "#9dbde4",
                    300: "#74a2d9",
                    400: "#558ed1",
                    500: "#2E6DA4",
                    600: "#265d8c",
                    700: "#1E3A5F",
                    800: "#162b47",
                    900: "#0d1c2f",
                },
                accent: {
                    DEFAULT: "#7C3AED",
                    light: "#a78bfa",
                    dark: "#5b21b6",
                },
                glass: {
                    white: "rgba(255,255,255,0.10)",
                    border: "rgba(255,255,255,0.18)",
                    dark: "rgba(15,23,42,0.60)",
                },
            },
            backgroundImage: {
                "sidebar-gradient": "linear-gradient(180deg, #1E3A5F 0%, #2d1b69 100%)",
                "hero-gradient": "linear-gradient(135deg, #1E3A5F 0%, #2d1b69 50%, #1E3A5F 100%)",
                "card-gradient": "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 100%)",
            },
            backdropBlur: {
                xs: "2px",
                glass: "20px",
            },
            boxShadow: {
                glass: "0 8px 32px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)",
                "glass-lg": "0 20px 60px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.15)",
                "brand-glow": "0 0 30px rgba(46,109,164,0.35)",
            },
            animation: {
                "fade-in": "fadeIn 0.4s ease-out",
                "slide-up": "slideUp 0.4s ease-out",
                "slide-right": "slideRight 0.3s ease-out",
                "count-up": "countUp 1s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
            },
            keyframes: {
                fadeIn: { from: { opacity: "0" }, to: { opacity: "1" } },
                slideUp: { from: { opacity: "0", transform: "translateY(16px)" }, to: { opacity: "1", transform: "translateY(0)" } },
                slideRight: { from: { opacity: "0", transform: "translateX(-16px)" }, to: { opacity: "1", transform: "translateX(0)" } },
                countUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "translateY(0)" } },
            },
            fontFamily: {
                sans: ["var(--font-inter)", "system-ui", "sans-serif"],
            },
            borderRadius: {
                "2xl": "1rem",
                "3xl": "1.5rem",
                "4xl": "2rem",
            },
        },
    },
    plugins: [],
};

export default config;
