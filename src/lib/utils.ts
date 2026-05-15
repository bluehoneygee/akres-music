import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDisplayText(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "-";

  if (
    text.includes("@") ||
    /^\d{4}-\d{2}(-\d{2})?$/.test(text) ||
    /^\d{1,2}:\d{2}$/.test(text) ||
    /^[\d.,\s]+$/.test(text)
  ) {
    return text;
  }

  return text
    .split(/(\s+|\/|-)/)
    .map((part) => {
      if (/^\s+$|^\/$|^-$/.test(part)) return part;
      if (!/[a-zA-Z]/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join("");
}
