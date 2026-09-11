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
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init.headers },
  });
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

export function listTasks(projectId: string) {
  return request<TaskApiRecord[]>(
    `/api/projects/${encodeURIComponent(projectId)}/tasks`,
    { method: "GET" },
  );
}

export function createTask(
  projectId: string,
  input: Omit<
    TaskApiRecord,
    "id" | "key" | "projectId" | "revision" | "updatedAt" | "rank"
  > & { rank?: number },
) {
  return request<TaskApiRecord>(
    `/api/projects/${encodeURIComponent(projectId)}/tasks`,
    { method: "POST", body: JSON.stringify(input) },
  );
}

export function currentUser() {
  return request<AuthUser>("/api/auth/me", { method: "GET" });
}

export function logout() {
  return request<{ status: string }>("/api/auth/logout", { method: "POST" });
}
