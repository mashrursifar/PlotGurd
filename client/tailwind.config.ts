import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        destructive: "var(--destructive)",
        "primary-hover": "var(--primary-hover)",
        "primary-pressed": "var(--primary-pressed)",
        "nav-hover": "var(--nav-hover)",
        land: {
          agricultural: "var(--land-agricultural)",
          "agricultural-stroke": "var(--land-agricultural-stroke)",
          residential: "var(--land-residential)",
          "residential-stroke": "var(--land-residential-stroke)",
          commercial: "var(--land-commercial)",
          "commercial-stroke": "var(--land-commercial-stroke)",
          wetland: "var(--land-wetland)",
          "wetland-stroke": "var(--land-wetland-stroke)",
          government: "var(--land-government)",
          "government-stroke": "var(--land-government-stroke)",
        },
        map: {
          background: "var(--map-background)",
          road: "var(--map-road)",
          "road-casing": "var(--map-road-casing)",
          river: "var(--map-river)",
          "river-edge": "var(--map-river-edge)",
          dispute: "var(--map-dispute)",
        },
      },
      borderRadius: {
        lg: "12px",
        md: "8px",
        sm: "8px",
        xl: "20px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(23, 50, 77, 0.06), 0 4px 12px rgba(23, 50, 77, 0.06)",
        panel: "0 8px 30px rgba(23, 50, 77, 0.14)",
        control: "0 2px 8px rgba(23, 50, 77, 0.12)",
      },
      fontSize: {
        label: ["13px", { lineHeight: "18px" }],
        brand: ["32px", { lineHeight: "40px" }],
      },
      fontFamily: {
        heading: ["Manrope", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
