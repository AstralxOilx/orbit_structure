export type AuthUser = {
  id: string;
  key: string;
  email: string;
  name: string;
  initials: string;
  color: string;
};

export type WorkspaceApiRecord = {
  id: string;
  key: string;
  name: string;
  inviteCode: string;
  ownerId: string;
  createdAt: string;
  logo: "initials" | "orbit" | "spark" | "layers" | "rocket";
  initials: string;
  color: "purple" | "blue" | "peach" | "green";
};

export type ProjectApiRecord = {
  id: string;
  key: string;
  workspaceId: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  dueOn?: string;
};
export type MemberApiRecord = {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: "owner" | "admin" | "member";
  initials: string;
  color: string;
  team: string;
};

export type TaskApiRecord = {
  id: string;
  key: string;
  projectId: string;
  title: string;
  description: string;
  status: "backlog" | "progress" | "review" | "done";
  priority: "urgent" | "high" | "normal" | "low";
  assigneeId?: string;
  startOn?: string;
  dueOn?: string;
  rank: string;
  revision: number;
  updatedAt: string;
  tags: string[];
  checklist: ChecklistApiItem[];
};
export type ChecklistApiItem = {
  id: string;
  title: string;
  done: boolean;
  position: number;
};
export type TaskActivityApiRecord = {
  id: string;
  taskId: string;
  actorId: string;
  actorName: string;
  action: "created" | "updated" | "moved" | "deleted" | "comment";
  detail: string;
  createdAt: string;
  updatedAt: string;
};
export type WorkspaceActivityApiRecord = {
  id: string;
  workspaceId: string;
  actorId: string;
  actorName: string;
  entityType: string;
  entityId: string;
  entityName: string;
  action: "created" | "updated" | "moved" | "deleted" | "comment";
  detail: string;
  createdAt: string;
  read?: boolean;
};
export type DiscussionMessageApiRecord = {
  id: string;
  workspaceId: string;
  authorId: string;
  authorName: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};
export type TaskWriteInput = Omit<
  TaskApiRecord,
  "id" | "key" | "projectId" | "revision" | "updatedAt" | "checklist" | "rank"
> & {
  checklist?: Array<Omit<ChecklistApiItem, "id">>;
  rank?: number;
};

const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL;

function apiUrl() {
  if (CONFIGURED_API_URL) return CONFIGURED_API_URL;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "http://localhost:8080";
}
const API_REQUEST_TIMEOUT_MS = 12_000;

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    API_REQUEST_TIMEOUT_MS,
  );
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}${path}`, {
      ...init,
      credentials: "include",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", ...init.headers },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("The request timed out. Please try again.");
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
  const body = (await response.json().catch(() => null)) as
    { error?: string } | T | null;
  if (!response.ok) {
    throw new Error(
      body && typeof body === "object" && "error" in body && body.error
        ? body.error
        : "Authentication request failed.",
    );
  }
  return body as T;
}

export function login(
  identifier: string,
  password: string,
  rememberMe = false,
) {
  return request<AuthUser>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password, rememberMe }),
  });
}

export function register(name: string, email: string, password: string) {
  return request<AuthUser>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  });
}

export function createWorkspace(name: string) {
  return request<WorkspaceApiRecord>("/api/workspaces", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}
export function updateWorkspace(
  workspaceId: string,
  input: Pick<WorkspaceApiRecord, "name" | "logo" | "initials" | "color">,
) {
  return request<WorkspaceApiRecord>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}
export function deleteWorkspace(workspaceId: string) {
  return request<void>(`/api/workspaces/${encodeURIComponent(workspaceId)}`, {
    method: "DELETE",
  });
}

export function joinWorkspace(code: string) {
  return request<WorkspaceApiRecord>("/api/workspaces/join", {
    method: "POST",
    body: JSON.stringify({ code: code.trim().toUpperCase() }),
  });
}

export function listWorkspaces() {
  return request<WorkspaceApiRecord[]>("/api/workspaces", { method: "GET" });
}

export function listProjects(workspaceId: string) {
  return request<ProjectApiRecord[]>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/projects`,
    { method: "GET" },
  );
}

export function listMembers(workspaceId: string) {
  return request<MemberApiRecord[]>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members`,
    { method: "GET" },
  );
}
export function addMember(
  workspaceId: string,
  input: { email: string; role: "admin" | "member"; team: string },
) {
  return request<MemberApiRecord>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
export function updateMember(
  workspaceId: string,
  memberId: string,
  input: Pick<MemberApiRecord, "name" | "email" | "role" | "team" | "color">,
) {
  return request<MemberApiRecord>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}
export function removeMember(workspaceId: string, memberId: string) {
  return request<void>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberId)}`,
    { method: "DELETE" },
  );
}
export function rotateWorkspaceInviteCode(workspaceId: string) {
  return request<WorkspaceApiRecord>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/invite-code/rotate`,
    { method: "POST", body: JSON.stringify({}) },
  );
}

export function createProject(
  workspaceId: string,
  input: Pick<ProjectApiRecord, "name" | "description" | "color" | "icon"> & {
    dueOn?: string;
  },
) {
  return request<ProjectApiRecord>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/projects`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
export function updateProject(
  projectId: string,
  input: Pick<ProjectApiRecord, "name" | "description" | "color" | "icon"> & {
    dueOn?: string;
  },
) {
  return request<ProjectApiRecord>(
    `/api/projects/${encodeURIComponent(projectId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}
export function deleteProject(projectId: string) {
  return request<void>(`/api/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });
}

export function listTasks(projectId: string) {
  return request<TaskApiRecord[]>(
    `/api/projects/${encodeURIComponent(projectId)}/tasks`,
    { method: "GET" },
  );
}

export function createTask(projectId: string, input: TaskWriteInput) {
  return request<TaskApiRecord>(
    `/api/projects/${encodeURIComponent(projectId)}/tasks`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
export function updateTask(taskId: string, input: TaskWriteInput) {
  return request<TaskApiRecord>(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
export function deleteTask(taskId: string) {
  return request<void>(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "DELETE",
  });
}
export function listTaskActivities(taskId: string) {
  return request<TaskActivityApiRecord[]>(
    `/api/tasks/${encodeURIComponent(taskId)}/activities`,
    { method: "GET" },
  );
}
export function listTaskActivityLog(taskId: string) {
  return request<TaskActivityApiRecord[]>(
    `/api/tasks/${encodeURIComponent(taskId)}/activity-log`,
    { method: "GET" },
  );
}
export function listWorkspaceActivityLog(workspaceId: string) {
  return request<WorkspaceActivityApiRecord[]>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/activity-log`,
    { method: "GET" },
  );
}
export function listWorkspaceNotifications(workspaceId: string) {
  return request<WorkspaceActivityApiRecord[]>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/notifications`,
    { method: "GET" },
  );
}
export function markWorkspaceNotificationsRead(
  workspaceId: string,
  activityIds: string[],
) {
  return request<void>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/notifications/read`,
    { method: "POST", body: JSON.stringify({ activityIds }) },
  );
}
export function listDiscussion(workspaceId: string) {
  return request<DiscussionMessageApiRecord[]>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/discussion`,
    { method: "GET" },
  );
}
export function createDiscussionMessage(workspaceId: string, body: string) {
  return request<DiscussionMessageApiRecord>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/discussion`,
    { method: "POST", body: JSON.stringify({ body }) },
  );
}
export function updateDiscussionMessage(
  workspaceId: string,
  messageId: string,
  body: string,
) {
  return request<DiscussionMessageApiRecord>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/discussion/${encodeURIComponent(messageId)}`,
    { method: "PATCH", body: JSON.stringify({ body }) },
  );
}
export function deleteDiscussionMessage(
  workspaceId: string,
  messageId: string,
) {
  return request<void>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/discussion/${encodeURIComponent(messageId)}`,
    { method: "DELETE" },
  );
}
export function createTaskActivity(
  taskId: string,
  input: Pick<TaskActivityApiRecord, "action" | "detail">,
) {
  return request<TaskActivityApiRecord>(
    `/api/tasks/${encodeURIComponent(taskId)}/activities`,
    { method: "POST", body: JSON.stringify(input) },
  );
}
export function updateTaskActivity(
  taskId: string,
  activityId: string,
  input: Pick<TaskActivityApiRecord, "detail">,
) {
  return request<TaskActivityApiRecord>(
    `/api/tasks/${encodeURIComponent(taskId)}/activities/${encodeURIComponent(activityId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );
}
export function deleteTaskActivity(taskId: string, activityId: string) {
  return request<void>(
    `/api/tasks/${encodeURIComponent(taskId)}/activities/${encodeURIComponent(activityId)}`,
    { method: "DELETE" },
  );
}

export function currentUser() {
  return request<AuthUser>("/api/auth/me", { method: "GET" });
}

export function logout() {
  return request<{ status: string }>("/api/auth/logout", { method: "POST" });
}
