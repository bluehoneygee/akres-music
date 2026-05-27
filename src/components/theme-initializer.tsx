"use client";

import { useEffect } from "react";

export function ThemeInitializer() {
  useEffect(() => {
    try {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = localStorage.getItem("theme") || (prefersDark ? "dark" : "light");
      document.documentElement.dataset.theme = theme;
      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch {
      // no-op
    }
  }, []);

  return null;
}
