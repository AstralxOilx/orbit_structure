"use client";

export type DensityPreference = "comfortable" | "compact";
export type LayoutPreference = "balanced" | "focus";
export type ViewPreference = "board" | "list" | "timeline";
export type LanguagePreference = "en" | "th";
export type DateFormatPreference = "locale" | "iso";
export interface WorkspacePreferences {
  density: DensityPreference;
  layout: LayoutPreference;
  defaultView: ViewPreference;
  language: LanguagePreference;
  dateFormat: DateFormatPreference;
  notifications: { activity: boolean; comments: boolean; deadlines: boolean };
}
export const DEFAULT_PREFERENCES: WorkspacePreferences = {
  density: "comfortable",
  layout: "balanced",
  defaultView: "board",
  language: "en",
  dateFormat: "locale",
  notifications: { activity: true, comments: true, deadlines: true },
};
const key = (workspaceId: string) =>
  `orbit.workspace.preferences.v1.${workspaceId}`;
export function readPreferences(workspaceId: string): WorkspacePreferences {
  try {
    const globalLanguage = localStorage.getItem("orbit.language.v1");
    const value = JSON.parse(localStorage.getItem(key(workspaceId)) ?? "null");
    return {
      ...DEFAULT_PREFERENCES,
      ...(value ?? {}),
      language:
        value?.language === "th" || value?.language === "en"
          ? value.language
          : globalLanguage === "th"
            ? "th"
            : "en",
      notifications: {
        ...DEFAULT_PREFERENCES.notifications,
        ...(value?.notifications ?? {}),
      },
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}
export function writePreferences(
  workspaceId: string,
  value: WorkspacePreferences,
) {
  localStorage.setItem(key(workspaceId), JSON.stringify(value));
}
