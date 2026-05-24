"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

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

  function setThemeValue(nextTheme: Theme) {
    setTheme(nextTheme);
    window.localStorage.setItem("theme", nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_10px_24px_rgba(15,23,42,.08)] backdrop-blur-xl",
        className,
      )}
      role="group"
      aria-label="Theme switch"
    >
      <button
        aria-label="Aktifkan light mode"
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-zinc-600 transition-colors dark:text-zinc-300",
          theme === "light" &&
            "bg-zinc-900 text-white shadow-[0_8px_20px_rgba(15,23,42,.25)] dark:bg-sky-300 dark:text-zinc-900",
        )}
        onClick={() => setThemeValue("light")}
        type="button"
      >
        <Sun className="size-4" />
        {showLabel ? <span className="text-xs font-medium">Light</span> : null}
      </button>
      <button
        aria-label="Aktifkan dark mode"
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-zinc-600 transition-colors dark:text-zinc-300",
          theme === "dark" &&
            "bg-zinc-900 text-white shadow-[0_8px_20px_rgba(15,23,42,.25)] dark:bg-sky-300 dark:text-zinc-900",
        )}
        onClick={() => setThemeValue("dark")}
        type="button"
      >
        <Moon className="size-4" />
        {showLabel ? <span className="text-xs font-medium">Dark</span> : null}
      </button>
    </div>
  );
}
