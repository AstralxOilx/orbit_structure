"use client";

export type RecentItem = {
  type: "task" | "project";
  id: string;
  name: string;
  at: number;
};
const key = (workspaceId: string) => `orbit.workspace.recent.v1.${workspaceId}`;
export function readRecent(workspaceId: string): RecentItem[] {
  try {
    const value = JSON.parse(localStorage.getItem(key(workspaceId)) ?? "[]");
    return Array.isArray(value) ? value.slice(0, 8) : [];
  } catch {
    return [];
  }
}
export function rememberRecent(
  workspaceId: string,
  item: Omit<RecentItem, "at">,
) {
  try {
    localStorage.setItem(
      key(workspaceId),
      JSON.stringify(
        [
          { ...item, at: Date.now() },
          ...readRecent(workspaceId).filter(
            (old) => !(old.type === item.type && old.id === item.id),
          ),
        ].slice(0, 8),
      ),
    );
  } catch {
    /* Optional preference. */
  }
}
