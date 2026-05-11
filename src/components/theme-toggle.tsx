"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function ThemeToggle({
  className,
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme") as Theme | null;
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const nextTheme = savedTheme ?? preferredTheme;

    setTheme(nextTheme);
    applyTheme(nextTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    window.localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <Button
      aria-label={theme === "dark" ? "Aktifkan light mode" : "Aktifkan dark mode"}
      className={className}
      onClick={toggleTheme}
      size={showLabel ? "default" : "icon"}
      variant="glass"
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      {showLabel ? <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span> : null}
    </Button>
  );
}
