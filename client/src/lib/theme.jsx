import React, { createContext, useContext, useEffect, useState } from "react";

export const THEME_STORAGE_KEY = "outcome-desk-theme";

/* ─── DESIGN TOKENS ──────────────────────────────────────────────────
   LIGHT: "Ivory & Obsidian" — premium editorial palette
   DARK:  "Velvet Noir" — rich jewel-tone dark dashboard
──────────────────────────────────────────────────────────────────── */
export const themes = {
  light: {
    bg: "#FAFAF7",
    surface: "#FFFFFF",
    surfaceSecondary: "#F3F2EC",
    sidebar: "#F0EFE8",
    card: "#FFFFFF",
    border: "#E2E0D6",
    line: "#E2E0D6",

    primary: "#1A1A2E",
    primaryHover: "#0F0F1F",
    secondary: "#4B5563",
    accent: "#C9A84C",
    accentHover: "#B8943F",

    primaryText: "#111118",
    secondaryText: "#6B7280",
    mutedText: "#9CA3AF",
    ink: "#111118",
    muted: "#6B7280",

    success: "#2D6A4F",
    warning: "#C9A84C",
    danger: "#9B2335",
    info: "#3A5A8A",

    // Semantic aliases
    neon: "#1A1A2E",
    pink: "#9B2335",
    yellow: "#C9A84C",
    cyan: "#3A5A8A",
    retro: "#F0EFE8",

    charts: {
      primary: "#1A1A2E",
      secondary: "#4B5563",
      comparison: "#3A5A8A",
      highlight: "#C9A84C",
      neutral: "#D1D5DB",
      grid: "#E2E0D6",
    },
  },
  dark: {
    bg: "#0D0D0D",
    surface: "#161616",
    surfaceSecondary: "#1E1E1E",
    sidebar: "#111111",
    card: "#161616",
    border: "#2A2A2A",
    line: "#2A2A2A",

    primary: "#E8C96D",
    primaryHover: "#D4B358",
    secondary: "#8E8E8E",
    accent: "#A07BFF",
    accentHover: "#8D64F0",

    primaryText: "#F0EDE8",
    secondaryText: "#8E8E8E",
    mutedText: "#5C5C5C",
    ink: "#F0EDE8",
    muted: "#8E8E8E",

    success: "#4CAF7D",
    warning: "#E8C96D",
    danger: "#E05C5C",
    info: "#6BA3D6",

    // Semantic aliases
    neon: "#E8C96D",
    pink: "#E05C5C",
    yellow: "#E8C96D",
    cyan: "#6BA3D6",
    retro: "#111111",

    charts: {
      primary: "#E8C96D",
      secondary: "#8E8E8E",
      comparison: "#6BA3D6",
      highlight: "#A07BFF",
      neutral: "#3A3A3A",
      grid: "#2A2A2A",
    },
  },
};

export const colors = themes.dark;

const ThemeContext = createContext({
  theme: "dark",
  toggleTheme: () => {},
  setTheme: () => {},
  colors: themes.dark,
  isDark: true,
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "light" || saved === "dark") return saved;
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "dark";
    }
  });

  const applyTheme = (newTheme) => {
    document.documentElement.setAttribute("data-theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    }
    // Update meta theme-color for mobile browser chrome
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", newTheme === "dark" ? "#0D0D0D" : "#FAFAF7");
    }
  };

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      try {
        if (!localStorage.getItem(THEME_STORAGE_KEY)) {
          setThemeState(e.matches ? "dark" : "light");
        }
      } catch {}
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setTheme = (t) => {
    if (t === "dark" || t === "light") setThemeState(t);
  };

  const currentColors = themes[theme] || themes.dark;
  const isDark = theme === "dark";

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, colors: currentColors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
