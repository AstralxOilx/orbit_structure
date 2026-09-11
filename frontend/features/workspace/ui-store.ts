"use client";

import { create } from "zustand";

interface WorkspaceUI {
  collapsed: boolean;
  mobileNav: boolean;
  setCollapsed: (value: boolean) => void;
  setMobileNav: (value: boolean) => void;
}

// This store contains preferences only, never user or workspace business data.
export const useWorkspaceUI = create<WorkspaceUI>((set) => ({
  collapsed: false,
  mobileNav: false,
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
}));
