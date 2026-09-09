"use client";

import { useId } from "react";
import { useTheme, type ThemePreference } from "./use-theme";

export function ThemeSelect({
  className = "",
  label = "Appearance",
}: {
  className?: string;
  label?: string;
}) {
  const id = useId();
  const { theme, setTheme, ready } = useTheme();
  return (
    <label className={`theme-select ${className}`} htmlFor={id}>
      {label}
      <select
        id={id}
        disabled={!ready}
        value={theme ?? "dark"}
        onChange={(event) => setTheme(event.target.value as ThemePreference)}
      >
        <option value="light">Light</option>
        <option value="dark">Dark</option>
        <option value="system">System</option>
      </select>
    </label>
  );
}
