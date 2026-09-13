"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemeProvider } from "next-themes";

/** One provider at the app root; reads the saved preference before first paint. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemeProvider
      attribute="data-theme"
      storageKey="orbit.theme"
      defaultTheme="light"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}
