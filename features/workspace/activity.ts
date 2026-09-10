"use client";

export type ActivityAction = "created" | "updated" | "moved" | "deleted";
export type ActivityEntity =
  "task" | "project" | "workspace" | "member" | "message";

export interface ActivityRecord {
  id: string;
  workspaceId: string;
  actorId: string;
  action: ActivityAction;
  entity: ActivityEntity;
  entityId: string;
  entityName: string;
  detail?: string;
  createdAt: number;
}

export const ACTIVITY_PREFIX = "orbit.workspace.activity.v1.";

export function readActivities(workspaceId: string): ActivityRecord[] {
  try {
    const value = JSON.parse(
      localStorage.getItem(ACTIVITY_PREFIX + workspaceId) ?? "[]",
    );
    return Array.isArray(value)
      ? value.filter((item): item is ActivityRecord =>
          Boolean(
            item &&
            typeof item.id === "string" &&
            typeof item.actorId === "string" &&
            typeof item.entityName === "string" &&
            typeof item.createdAt === "number",
          ),
        )
      : [];
  } catch {
    return [];
  }
}

export function appendActivity(
  workspaceId: string,
  input: Omit<ActivityRecord, "id" | "workspaceId" | "createdAt">,
) {
  try {
    const record: ActivityRecord = {
      ...input,
      id: crypto.randomUUID(),
      workspaceId,
      createdAt: Date.now(),
    };
    localStorage.setItem(
      ACTIVITY_PREFIX + workspaceId,
      JSON.stringify([record, ...readActivities(workspaceId)].slice(0, 500)),
    );
  } catch {
    // History must never prevent the original action from saving.
  }
}
