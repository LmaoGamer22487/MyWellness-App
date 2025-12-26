/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            colors: {
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                chart: {
                    1: "hsl(var(--chart-1))",
                    2: "hsl(var(--chart-2))",
                    3: "hsl(var(--chart-3))",
                    4: "hsl(var(--chart-4))",
                    5: "hsl(var(--chart-5))",
                },
                burgundy: {
                    50: "#fcf4f5",
                    100: "#f8e8eb",
                    200: "#f0d2d8",
                    300: "#e5b0ba",
                    400: "#d48293",
                    500: "#c05a70",
                    600: "#a63e56",
                    700: "#8b2d42",
                    800: "#722f37",
                    900: "#602a33",
                    950: "#361319",
                },
                violet: {
                    50: "#f6f4fe",
                    100: "#efe9fc",
                    200: "#e2d6fa",
                    300: "#cbb6f5",
                    400: "#af8eee",
                    500: "#9263e5",
                    600: "#7d42d8",
                    700: "#6a2ebc",
                    800: "#5d3a9b",
                    900: "#4a1d75",
                    950: "#2e0b52",
                },
            },
            fontFamily: {
                heading: ["Playfair Display", "serif"],
                body: ["Manrope", "sans-serif"],
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
            },
        },
    },
    plugins: [require("tailwindcss-animate")],
};
