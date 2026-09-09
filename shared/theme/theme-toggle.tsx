"use client";

import { Moon, Sun, SunMoon } from "lucide-react";
import { IconButton } from "@/shared/ui/icon-button";
import { useTheme } from "./use-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, setTheme, ready } = useTheme();
  const dark = resolvedTheme === "dark";
  return (
    <IconButton
      className={`theme-toggle ${className}`}
      label={
        ready ? `Switch to ${dark ? "light" : "dark"} theme` : "Loading theme"
      }
      disabled={!ready}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      {!ready ? (
        <SunMoon size={17} />
      ) : dark ? (
        <Sun size={17} />
      ) : (
        <Moon size={17} />
      )}
    </IconButton>
  );
}
