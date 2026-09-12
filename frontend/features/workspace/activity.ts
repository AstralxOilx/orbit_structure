"use client";

export type ActivityAction = "created" | "updated" | "moved" | "deleted" | "comment";
export type ActivityStatus = "pending" | "success" | "failed";
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
  status: ActivityStatus;
  read?: boolean;
  createdAt: number;
}

export const ACTIVITY_PREFIX = "orbit.workspace.activity.v1.";
const ACTIVITY_EVENT = "orbit:activity-changed";

function notifyActivityChanged(workspaceId: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(ACTIVITY_EVENT, { detail: { workspaceId } }),
    );
  }
}

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
            (item.status === undefined ||
              item.status === "pending" ||
              item.status === "success" ||
              item.status === "failed") &&
            typeof item.createdAt === "number",
          ),
        )
      .map((item) => ({
        ...item,
        status: item.status ?? "success",
      }))
      : [];
  } catch {
    return [];
  }
}

export function appendActivity(
  workspaceId: string,
  input: Omit<ActivityRecord, "id" | "workspaceId" | "createdAt" | "status"> &
    Partial<Pick<ActivityRecord, "status">>,
): string | null {
  try {
    const record: ActivityRecord = {
      ...input,
      id: crypto.randomUUID(),
      workspaceId,
      status: input.status ?? "success",
      createdAt: Date.now(),
    };
    localStorage.setItem(
      ACTIVITY_PREFIX + workspaceId,
      JSON.stringify([record, ...readActivities(workspaceId)].slice(0, 500)),
    );
    notifyActivityChanged(workspaceId);
    return record.id;
  } catch {
    // History must never prevent the original action from saving.
    return null;
  }
}

export function updateActivityStatus(
  workspaceId: string,
  activityId: string,
  status: ActivityStatus,
  detail?: string,
) {
  try {
    const activities = readActivities(workspaceId);
    const next = activities.map((activity) =>
      activity.id === activityId
        ? { ...activity, status, ...(detail === undefined ? {} : { detail }) }
        : activity,
    );
    if (!activities.some((activity) => activity.id === activityId)) return;
    localStorage.setItem(ACTIVITY_PREFIX + workspaceId, JSON.stringify(next));
    notifyActivityChanged(workspaceId);
  } catch {
    // Activity status must never affect the original operation.
  }
}

export function subscribeActivityChanges(
  workspaceId: string,
  listener: () => void,
) {
  const onChange = (event: Event) => {
    const detail = (event as CustomEvent<{ workspaceId?: string }>).detail;
    if (!detail?.workspaceId || detail.workspaceId === workspaceId) listener();
  };
  window.addEventListener(ACTIVITY_EVENT, onChange);
  return () => window.removeEventListener(ACTIVITY_EVENT, onChange);
}
