/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0a0a0f",
        surface: "#13131a",
        border: "#1e1e2e",
        accent: "#7c6af7",
        "accent-hover": "#6b59e6",
        "text-primary": "#f0f0ff",
        "text-muted": "#8888aa",
        success: "#4ade80",
        warning: "#fbbf24",
        error: "#f87171",
        chatgpt: "#10a37f",
        claude: "#cc785c",
        gemini: "#4285f4",
        manual: "#8888aa",
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(124, 106, 247, 0.28)",
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(circle at top, rgba(124, 106, 247, 0.26), transparent 42%), radial-gradient(circle at 20% 80%, rgba(66, 133, 244, 0.12), transparent 28%)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};

