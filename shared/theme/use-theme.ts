"use client";

import { useSyncExternalStore } from "react";
import { useTheme as useNextTheme } from "next-themes";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;
export type ThemePreference = "light" | "dark" | "system";

export function useTheme() {
  const theme = useNextTheme();
  const ready = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    theme: ready ? theme.theme : undefined,
    resolvedTheme: ready ? theme.resolvedTheme : undefined,
    setTheme: (value: ThemePreference) => theme.setTheme(value),
    ready,
  };
}
