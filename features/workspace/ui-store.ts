"use client";

import { create } from "zustand";

interface WorkspaceUI {
  collapsed: boolean;
  mobileNav: boolean;
  theme: "light" | "dark";
  setCollapsed: (value: boolean) => void;
  setMobileNav: (value: boolean) => void;
  setTheme: (value: "light" | "dark") => void;
}

// This store contains preferences only, never user or workspace business data.
export const useWorkspaceUI = create<WorkspaceUI>((set) => ({
  collapsed: false,
  mobileNav: false,
  theme: "light",
  setCollapsed: (collapsed) => {
    try {
      localStorage.setItem(
        "orbit.sidebar",
        collapsed ? "collapsed" : "expanded",
      );
    } catch {
      /* Optional preference. */
    }
    set({ collapsed });
  },
  setMobileNav: (mobileNav) => set({ mobileNav }),
  setTheme: (theme) => {
    try {
      localStorage.setItem("orbit.theme", theme);
    } catch {
      /* Optional preference. */
    }
    set({ theme });
  },
}));
