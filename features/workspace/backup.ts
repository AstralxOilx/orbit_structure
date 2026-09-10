"use client";

import type {
  ProjectRecord,
  WorkspaceMember,
  WorkspaceRecord,
} from "./catalog";
import type { Task } from "../tasks/domain/task";
import { ACTIVITY_PREFIX, type ActivityRecord } from "./activity";
import { parseWorkspaceBackup } from "@/lib/schemas/workspace-backup.schema";

export interface WorkspaceBackup {
  format: "orbit-workspace-backup";
  version: 1;
  exportedAt: string;
  workspace: WorkspaceRecord;
  projects: ProjectRecord[];
  members: WorkspaceMember[];
  tasks: Task[];
  discussion: unknown[];
  activity: ActivityRecord[];
}

const TASK_PREFIX = "orbit.workspace.task.v1.";
const PROJECT_PREFIX = "orbit.catalog.project.v1.";
const MEMBER_PREFIX = "orbit.catalog.member.v1.";
const DISCUSSION_PREFIX = "orbit.workspace.discussion.v1.";

export function createBackup(
  workspace: WorkspaceRecord,
  projects: readonly ProjectRecord[],
  members: readonly WorkspaceMember[],
  tasks: readonly Task[],
): WorkspaceBackup {
  let discussion: unknown[] = [];
  try {
    const value = JSON.parse(
      localStorage.getItem(DISCUSSION_PREFIX + workspace.id) ?? "[]",
    );
    if (Array.isArray(value)) discussion = value;
  } catch {
    /* Keep export valid when discussion data is malformed. */
  }
  let activity: ActivityRecord[] = [];
  try {
    const value = JSON.parse(
      localStorage.getItem(ACTIVITY_PREFIX + workspace.id) ?? "[]",
    );
    if (Array.isArray(value)) activity = value;
  } catch {
    /* Keep export valid when activity data is malformed. */
  }
  return {
    format: "orbit-workspace-backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    workspace,
    projects: [...projects],
    members: [...members],
    tasks: [...tasks],
    discussion,
    activity,
  };
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function backupToJson(backup: WorkspaceBackup) {
  return JSON.stringify(backup, null, 2);
}

export function tasksToCsv(tasks: readonly Task[]) {
  const escape = (value: unknown) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    [
      "ID",
      "Title",
      "Status",
      "Priority",
      "Assignee",
      "Project",
      "Start",
      "Due",
      "Updated",
    ],
    ...tasks.map((task) => [
      task.id,
      task.title,
      task.status,
      task.priority,
      task.assigneeId,
      task.projectId,
      task.startOn,
      task.dueOn,
      new Date(task.updatedAt).toISOString(),
    ]),
  ]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
}

export function restoreBackup(backup: WorkspaceBackup) {
  parseWorkspaceBackup(backup);
  if (
    !backup.workspace?.id ||
    backup.workspace.id !== backup.workspace.id.replace(/[^a-zA-Z0-9-]/g, "")
  )
    throw new Error("This backup has an invalid workspace.");
  const workspaceId = backup.workspace.id;
  const taskPrefix =
    workspaceId === "studio"
      ? TASK_PREFIX
      : `orbit.workspace.${workspaceId}.task.v1.`;
  localStorage.setItem(
    "orbit.catalog.workspace.v1." + workspaceId,
    JSON.stringify(backup.workspace),
  );
  for (const key of Object.keys(localStorage)) {
    let remove =
      key.startsWith(MEMBER_PREFIX + workspaceId + ".") ||
      key.startsWith(taskPrefix);
    if (key.startsWith(PROJECT_PREFIX)) {
      try {
        remove =
          remove ||
          JSON.parse(localStorage.getItem(key) ?? "null")?.workspaceId ===
            workspaceId;
      } catch {
        /* Ignore malformed unrelated project records. */
      }
    }
    if (remove) localStorage.removeItem(key);
  }
  for (const project of backup.projects)
    localStorage.setItem(PROJECT_PREFIX + project.id, JSON.stringify(project));
  for (const member of backup.members)
    localStorage.setItem(
      MEMBER_PREFIX + workspaceId + "." + member.id,
      JSON.stringify(member),
    );
  for (const task of backup.tasks)
    localStorage.setItem(taskPrefix + task.id, JSON.stringify(task));
  localStorage.setItem(
    DISCUSSION_PREFIX + workspaceId,
    JSON.stringify(backup.discussion),
  );
  localStorage.setItem(
    ACTIVITY_PREFIX + workspaceId,
    JSON.stringify(backup.activity),
  );
  localStorage.setItem("orbit.catalog.active.v1", workspaceId);
}
