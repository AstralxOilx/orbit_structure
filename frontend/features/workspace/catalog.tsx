"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { PROJECTS, MEMBERS } from "./data";
import {
  WORKSPACE_DELETED_PREFIX,
  PROJECT_DELETED_PREFIX,
  isScopeDeleted,
} from "./deletions";
import { appendActivity } from "./activity";
import {
  createProject as createProjectApi,
  createWorkspace as createWorkspaceApi,
  currentUser,
  listMembers,
  listProjects,
  listWorkspaces,
  joinWorkspace as joinWorkspaceApi,
  updateWorkspace as updateWorkspaceApi,
  deleteWorkspace as deleteWorkspaceApi,
  updateProject as updateProjectApi,
  deleteProject as deleteProjectApi,
  addMember as addMemberApi,
  updateMember as updateMemberApi,
  removeMember as removeMemberApi,
  rotateWorkspaceInviteCode,
} from "@/lib/auth-api";
import {
  isRealtimeWorkspaceId,
  subscribeWorkspaceRealtime,
} from "@/lib/workspace-realtime";

export interface WorkspaceRecord {
  id: string;
  name: string;
  inviteCode: string;
  createdAt: number;
  logo: WorkspaceLogo;
  initials: string;
  color: WorkspaceColor;
}
export type WorkspaceLogo =
  "initials" | "orbit" | "spark" | "layers" | "rocket";
export type WorkspaceColor = "purple" | "blue" | "peach" | "green";
export interface ProjectRecord {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  due: string;
  team: string;
}
export type WorkspaceRole = "owner" | "admin" | "member";
export interface WorkspaceMember {
  id: string;
  workspaceId: string;
  name: string;
  email: string;
  role: WorkspaceRole;
  initials: string;
  color: string;
  team: string;
}
type CatalogState = {
  workspaces: WorkspaceRecord[];
  projects: ProjectRecord[];
  members: WorkspaceMember[];
};
const DEFAULT_WORKSPACE: WorkspaceRecord = {
  id: "studio",
  name: "Studio workspace",
  inviteCode: "ORBIT-STUDIO",
  createdAt: 0,
  logo: "initials",
  initials: "SW",
  color: "purple",
};
const DEFAULT_PROJECTS: ProjectRecord[] = PROJECTS.map((project) => ({
  ...project,
  workspaceId: "studio",
}));
const WORKSPACE_PREFIX = "orbit.catalog.workspace.v1.";
const PROJECT_PREFIX = "orbit.catalog.project.v1.";
const MEMBER_PREFIX = "orbit.catalog.member.v1.";
const MEMBER_REMOVED_PREFIX = "orbit.catalog.member-removed.v1.";
const ACTIVE_KEY = "orbit.catalog.active.v1";

function isWorkspace(value: unknown): value is WorkspaceRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as WorkspaceRecord;
  return (
    typeof item.id === "string" &&
    /^[a-zA-Z0-9-]+$/.test(item.id) &&
    typeof item.name === "string" &&
    item.name.length > 0 &&
    item.name.length <= 80 &&
    typeof item.inviteCode === "string" &&
    Number.isFinite(item.createdAt) &&
    (item.logo === undefined ||
      ["initials", "orbit", "spark", "layers", "rocket"].includes(item.logo)) &&
    (item.initials === undefined ||
      (typeof item.initials === "string" && item.initials.length <= 3)) &&
    (item.color === undefined ||
      ["purple", "blue", "peach", "green"].includes(item.color))
  );
}
function normalizeWorkspace(value: WorkspaceRecord): WorkspaceRecord {
  return {
    ...DEFAULT_WORKSPACE,
    ...value,
    initials:
      value.initials?.trim().slice(0, 3).toUpperCase() ||
      value.name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 3)
        .toUpperCase(),
  };
}
function isProject(value: unknown): value is ProjectRecord {
  if (!value || typeof value !== "object") return false;
  const item = value as ProjectRecord;
  return (
    [
      "id",
      "workspaceId",
      "name",
      "description",
      "color",
      "icon",
      "due",
      "team",
    ].every((key) => typeof item[key as keyof ProjectRecord] === "string") &&
    /^[a-zA-Z0-9-]+$/.test(item.id) &&
    item.name.trim().length > 0 &&
    item.name.length <= 100
  );
}
function isMember(value: unknown): value is WorkspaceMember {
  if (!value || typeof value !== "object") return false;
  const item = value as WorkspaceMember;
  return (
    typeof item.id === "string" &&
    typeof item.workspaceId === "string" &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    item.name.length <= 80 &&
    typeof item.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item.email) &&
    ["owner", "admin", "member"].includes(item.role) &&
    typeof item.initials === "string" &&
    typeof item.color === "string" &&
    typeof item.team === "string"
  );
}
function readCatalog() {
  const workspaces = new Map([[DEFAULT_WORKSPACE.id, DEFAULT_WORKSPACE]]);
  const projects = new Map(
    DEFAULT_PROJECTS.map((project) => [project.id, project]),
  );
  const members = new Map<string, WorkspaceMember>();
  for (const member of MEMBERS)
    if (
      localStorage.getItem(MEMBER_REMOVED_PREFIX + "studio." + member.id) ===
      null
    )
      members.set(`studio:${member.id}`, {
        ...member,
        workspaceId: "studio",
        role: (member.id === "alex" ? "owner" : "member") as WorkspaceRole,
      });
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (
      !key ||
      (!key.startsWith(WORKSPACE_PREFIX) &&
        !key.startsWith(PROJECT_PREFIX) &&
        !key.startsWith(MEMBER_PREFIX))
    )
      continue;
    try {
      const value: unknown = JSON.parse(localStorage.getItem(key) ?? "null");
      if (
        key.startsWith(WORKSPACE_PREFIX) &&
        isWorkspace(value) &&
        key === WORKSPACE_PREFIX + value.id
      )
        workspaces.set(value.id, normalizeWorkspace(value));
      if (
        key.startsWith(PROJECT_PREFIX) &&
        isProject(value) &&
        key === PROJECT_PREFIX + value.id
      )
        projects.set(value.id, value);
      if (
        key.startsWith(MEMBER_PREFIX) &&
        isMember(value) &&
        key === MEMBER_PREFIX + value.workspaceId + "." + value.id
      )
        members.set(`${value.workspaceId}:${value.id}`, value);
    } catch {
      /* Ignore malformed external records. */
    }
  }
  return {
    workspaces: [...workspaces.values()].filter(
      (workspace) => !isScopeDeleted(workspace.id),
    ),
    projects: [...projects.values()].filter(
      (project) =>
        workspaces.has(project.workspaceId) &&
        !isScopeDeleted(project.workspaceId, project.id),
    ),
    members: [...members.values()].filter((member) =>
      workspaces.has(member.workspaceId),
    ),
  };
}
type CatalogContextValue = {
  workspaces: WorkspaceRecord[];
  projects: ProjectRecord[];
  members: WorkspaceMember[];
  currentUserId: string;
  workspace: WorkspaceRecord;
  ready: boolean;
  error: string;
  deleteProject: (id: string, confirmation: string) => Promise<() => void>;
  deleteWorkspace: (id: string, confirmation: string) => Promise<() => void>;
  switchWorkspace: (id: string) => void;
  createWorkspace: (name: string) => Promise<string>;
  updateWorkspace: (input: {
    name: string;
    logo: WorkspaceLogo;
    initials: string;
    color: WorkspaceColor;
  }) => void;
  updateProject: (
    id: string,
    input: Pick<
      ProjectRecord,
      "name" | "description" | "color" | "icon" | "due"
    >,
  ) => void;
  joinWorkspace: (code: string) => Promise<string>;
  createProject: (
    input: Pick<
      ProjectRecord,
      "name" | "description" | "color" | "due" | "icon"
    >,
  ) => Promise<string>;
  addMember: (
    input: Pick<WorkspaceMember, "name" | "email" | "role" | "team" | "color">,
  ) => string | Promise<string>;
  updateMemberRole: (id: string, role: WorkspaceRole) => void | Promise<void>;
  updateMemberProfile: (
    id: string,
    input: Pick<WorkspaceMember, "name" | "email" | "role" | "team" | "color">,
  ) => void | Promise<void>;
  removeMember: (id: string) => (() => void) | Promise<void | (() => void)>;
  rotateInviteCode: () => Promise<void>;
};
const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<CatalogState>({
    workspaces: [DEFAULT_WORKSPACE],
    projects: DEFAULT_PROJECTS,
    members: MEMBERS.map((member) => ({
      ...member,
      workspaceId: "studio",
      role: member.id === "alex" ? ("owner" as const) : ("member" as const),
    })),
  });
  const [activeId, setActiveId] = useState("studio");
  const [currentUserId, setCurrentUserId] = useState("alex");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    try {
      const next = readCatalog();
      queueMicrotask(() => setCatalog(next));
      const saved = localStorage.getItem(ACTIVE_KEY);
      if (next.workspaces.some((workspace) => workspace.id === saved))
        queueMicrotask(() => setActiveId(saved!));
    } catch {
      queueMicrotask(() =>
        setError(
          "Browser storage is unavailable. Workspace changes cannot be saved.",
        ),
      );
    }
    queueMicrotask(() => setReady(true));
    let cancelled = false;
    void (async () => {
      try {
        const [remoteWorkspaces, user] = await Promise.all([
          listWorkspaces(),
          currentUser(),
        ]);
        const [projectResults, memberResults] = await Promise.all([
          Promise.allSettled(
            remoteWorkspaces.map((item) => listProjects(item.id)),
          ),
          Promise.allSettled(
            remoteWorkspaces.map((item) => listMembers(item.id)),
          ),
        ]);
        const remoteProjects = projectResults
          .filter((result) => result.status === "fulfilled")
          .flatMap((result) => result.value);
        const remoteMembers = memberResults
          .filter((result) => result.status === "fulfilled")
          .flatMap((result) => result.value);
        if (cancelled) return;
        setCurrentUserId(user.id);
        const workspaces = remoteWorkspaces.map((item) =>
          normalizeWorkspace({
            id: item.id,
            name: item.name,
            inviteCode: item.inviteCode,
            createdAt: Date.parse(item.createdAt) || Date.now(),
            logo: item.logo || "initials",
            initials: item.initials || item.name.slice(0, 3).toUpperCase(),
            color: item.color || "purple",
          }),
        );
        // Existing server workspaces should not reopen the first-run tour on
        // every refresh. A newly created workspace can still start its tour.
        workspaces.forEach((item) =>
          localStorage.setItem(`orbit.onboarding.v1.${item.id}`, "1"),
        );
        const projects = remoteProjects.map((item) => ({
          id: item.id,
          workspaceId: item.workspaceId,
          name: item.name,
          description: item.description ?? "",
          color: item.color || "purple",
          icon: item.icon || "other",
          due: item.dueOn || "Not scheduled",
          team:
            workspaces.find((workspace) => workspace.id === item.workspaceId)
              ?.name ?? "",
        }));
        const members: WorkspaceMember[] = remoteMembers.map((member) => ({
          id: member.id,
          workspaceId: member.workspaceId,
          name: member.name,
          email: member.email,
          role: member.role,
          initials: member.initials,
          color: member.color,
          team: member.team,
        }));
        if (!members.length) {
          remoteWorkspaces.forEach((item) => {
            if (item.ownerId !== user.id) return;
            members.push({
              id: user.id,
              workspaceId: item.id,
              name: user.name,
              email: user.email,
              role: "owner",
              initials: user.initials,
              color: user.color,
              team: "Workspace owner",
            });
          });
        }
        setCatalog({ workspaces, projects, members });
        const saved = localStorage.getItem(ACTIVE_KEY);
        const active = workspaces.some((item) => item.id === saved)
          ? saved!
          : workspaces[0]?.id;
        if (active) {
          localStorage.setItem(ACTIVE_KEY, active);
          setActiveId(active);
        }
      } catch {
        // Keep the local demo fallback when the API is unavailable.
      }
    })();
    const refresh = (event: StorageEvent) => {
      if (
        event.key !== null &&
        !event.key.startsWith(WORKSPACE_PREFIX) &&
        !event.key.startsWith(PROJECT_PREFIX) &&
        !event.key.startsWith(WORKSPACE_DELETED_PREFIX) &&
        !event.key.startsWith(PROJECT_DELETED_PREFIX) &&
        !event.key.startsWith(MEMBER_PREFIX) &&
        !event.key.startsWith(MEMBER_REMOVED_PREFIX)
      )
        return;
      try {
        queueMicrotask(() => setCatalog(readCatalog()));
      } catch {
        setError("Could not reload workspaces from browser storage.");
      }
    };
    window.addEventListener("storage", refresh);
    return () => {
      cancelled = true;
      window.removeEventListener("storage", refresh);
    };
  }, []);
  const remoteWorkspaceIds = catalog.workspaces
    .filter((item) => isRealtimeWorkspaceId(item.id))
    .map((item) => item.id)
    .join(",");
  useEffect(() => {
    const ids = remoteWorkspaceIds ? remoteWorkspaceIds.split(",") : [];
    const unsubscribers = ids.map((workspaceId) =>
      subscribeWorkspaceRealtime(workspaceId, (event) => {
        if (event.type !== "member") return;
        void listMembers(workspaceId).then((items) => {
          const members = items.map((member) => ({
            id: member.id,
            workspaceId: member.workspaceId,
            name: member.name,
            email: member.email,
            role: member.role,
            initials: member.initials,
            color: member.color,
            team: member.team,
          }));
          setCatalog((current) => ({
            ...current,
            members: [
              ...current.members.filter((member) => member.workspaceId !== workspaceId),
              ...members,
            ],
          }));
        }).catch(() => undefined);
      }),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [remoteWorkspaceIds]);
  const workspace = catalog.workspaces.find((item) => item.id === activeId) ??
    catalog.workspaces[0] ?? {
      id: "",
      name: "No workspace",
      inviteCode: "",
      createdAt: 0,
      logo: "initials",
      initials: "NW",
      color: "purple",
    };
  const projects = useMemo(
    () =>
      catalog.projects.filter(
        (project) => project.workspaceId === workspace.id,
      ),
    [catalog.projects, workspace.id],
  );
  const members = useMemo(
    () =>
      catalog.members.filter((member) => member.workspaceId === workspace.id),
    [catalog.members, workspace.id],
  );
  const switchWorkspace = (id: string) => {
    if (!ready) throw new Error("Workspaces are still loading.");
    if (!catalog.workspaces.some((item) => item.id === id))
      throw new Error("Workspace not found.");
    localStorage.setItem(ACTIVE_KEY, id);
    setActiveId(id);
    setError("");
  };
  const createWorkspace = async (name: string) => {
    if (!ready) throw new Error("Workspaces are still loading.");
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > 80)
      throw new Error("Enter a workspace name between 1 and 80 characters.");
    const created = await createWorkspaceApi(trimmed);
    const item: WorkspaceRecord = {
      id: created.id,
      name: trimmed,
      inviteCode: created.inviteCode,
      createdAt: Date.parse(created.createdAt) || Date.now(),
      logo: created.logo || "initials",
      initials: created.initials || name.slice(0, 3).toUpperCase(),
      color: created.color || "purple",
    };
    localStorage.setItem(WORKSPACE_PREFIX + item.id, JSON.stringify(item));
    const owner = MEMBERS.find((member) => member.id === "alex");
    if (owner)
      localStorage.setItem(
        MEMBER_PREFIX + item.id + ".alex",
        JSON.stringify({ ...owner, workspaceId: item.id, role: "owner" }),
      );
    localStorage.setItem(ACTIVE_KEY, item.id);
    setCatalog(readCatalog());
    setActiveId(item.id);
    appendActivity(item.id, {
      actorId: created.ownerId,
      action: "created",
      entity: "workspace",
      entityId: item.id,
      entityName: item.name,
    });
    return item.id;
  };
  const updateWorkspace = async (input: {
    name: string;
    logo: WorkspaceLogo;
    initials: string;
    color: WorkspaceColor;
  }) => {
    if (!ready) throw new Error("Workspaces are still loading.");
    const name = input.name.trim();
    const initials = input.initials.trim().slice(0, 3).toUpperCase();
    if (!name || name.length > 80)
      throw new Error("Enter a workspace name between 1 and 80 characters.");
    if (input.logo === "initials" && !initials)
      throw new Error("Enter 1 to 3 letters for the workspace mark.");
    const current = catalog.workspaces.find((item) => item.id === workspace.id);
    if (!current) throw new Error("This workspace is no longer available.");
    const remote = await updateWorkspaceApi(current.id, { name, logo: input.logo, initials, color: input.color });
    const updated = normalizeWorkspace({
      ...current,
      name: remote.name,
      logo: remote.logo || input.logo,
      initials: remote.initials || initials,
      color: remote.color || input.color,
    });
    localStorage.setItem(
      WORKSPACE_PREFIX + updated.id,
      JSON.stringify(updated),
    );
    setCatalog((currentCatalog) => ({
      ...currentCatalog,
      workspaces: currentCatalog.workspaces.map((item) =>
        item.id === updated.id ? updated : item,
      ),
    }));
    setError("");
    appendActivity(updated.id, {
      actorId: "alex",
      action: "updated",
      entity: "workspace",
      entityId: updated.id,
      entityName: updated.name,
    });
  };
  const updateProject = async (
    id: string,
    input: Pick<
      ProjectRecord,
      "name" | "description" | "color" | "icon" | "due"
    >,
  ) => {
    if (!ready) throw new Error("Workspaces are still loading.");
    const name = input.name.trim();
    if (!name || name.length > 100)
      throw new Error("Enter a project name between 1 and 100 characters.");
    const current = catalog.projects.find(
      (item) => item.id === id && item.workspaceId === workspace.id,
    );
    if (!current) throw new Error("This project is no longer available.");
    if (
        catalog.projects.some(
        (item) =>
          item.id !== id &&
          item.workspaceId === workspace.id &&
          item.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    )
      throw new Error(
        "A project with this name already exists in this workspace.",
      );
    const remote = await updateProjectApi(id, {
      name,
      description: input.description.trim().slice(0, 500),
      color: input.color,
      icon: input.icon,
      dueOn: input.due || undefined,
    });
    const updated: ProjectRecord = {
      ...current,
      name: remote.name,
      description: remote.description,
      color: remote.color,
      icon: remote.icon,
      due: remote.dueOn || "Not scheduled",
    };
    localStorage.setItem(
      PROJECT_PREFIX + id,
      JSON.stringify(updated),
    );
    setCatalog((currentCatalog) => ({
      ...currentCatalog,
      projects: currentCatalog.projects.map((item) =>
        item.id === id ? updated : item,
      ),
    }));
    appendActivity(workspace.id, {
      actorId: "alex",
      action: "updated",
      entity: "project",
      entityId: id,
      entityName: name,
    });
  };
  const joinWorkspace = async (code: string) => {
    if (!ready) throw new Error("Workspaces are still loading.");
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) throw new Error("Enter a workspace code.");
    const localWorkspace = catalog.workspaces.find(
      (item) =>
        !isRealtimeWorkspaceId(item.id) &&
        item.inviteCode.trim().toUpperCase() === normalizedCode,
    );
    if (localWorkspace) {
      switchWorkspace(localWorkspace.id);
      return localWorkspace.id;
    }
    const remote = await joinWorkspaceApi(normalizedCode);
    const item = normalizeWorkspace({
      id: remote.id,
      name: remote.name,
      inviteCode: remote.inviteCode,
      createdAt: Date.parse(remote.createdAt) || Date.now(),
      logo: remote.logo || "initials",
      initials: remote.initials || remote.name.slice(0, 3).toUpperCase(),
      color: remote.color || "purple",
    });
    const remoteProjects = await listProjects(item.id);
    const remoteMembers = await listMembers(item.id);
    const projects = remoteProjects.map((project) => ({
      id: project.id,
      workspaceId: project.workspaceId,
      name: project.name,
      description: project.description ?? "",
      color: project.color || "purple",
      icon: project.icon || "other",
      due: project.dueOn || "Not scheduled",
      team: item.name,
    }));
    localStorage.setItem(ACTIVE_KEY, item.id);
    setCatalog((current) => ({
      ...current,
      workspaces: [
        ...current.workspaces.filter((workspace) => workspace.id !== item.id),
        item,
      ],
      projects: [
        ...current.projects.filter(
          (project) => project.workspaceId !== item.id,
        ),
        ...projects,
      ],
      members: [
        ...current.members.filter((member) => member.workspaceId !== item.id),
        ...remoteMembers.map((member) => ({
          id: member.id,
          workspaceId: member.workspaceId,
          name: member.name,
          email: member.email,
          role: member.role,
          initials: member.initials,
          color: member.color,
          team: member.team,
        })),
      ],
    }));
    setActiveId(item.id);
    return item.id;
  };
  const createProject = async (
    input: Pick<
      ProjectRecord,
      "name" | "description" | "color" | "due" | "icon"
    >,
  ) => {
    if (!ready) throw new Error("Workspaces are still loading.");
    const name = input.name.trim();
    if (!name || name.length > 100)
      throw new Error("Enter a project name between 1 and 100 characters.");
    if (!catalog.workspaces.some((item) => item.id === workspace.id))
      throw new Error(
        "This workspace was deleted. Switch to another workspace.",
      );
    if (
      catalog.projects.some(
        (project) =>
          project.workspaceId === workspace.id &&
          project.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    )
      throw new Error(
        "A project with this name already exists in this workspace.",
      );
    const remote = await createProjectApi(workspace.id, {
      name,
      description: input.description.trim().slice(0, 500),
      color: input.color,
      icon: input.icon,
      dueOn: input.due || undefined,
    });
    const item: ProjectRecord = {
      ...input,
      name: remote.name,
      description: remote.description,
      id: remote.id,
      workspaceId: remote.workspaceId,
      icon: remote.icon,
      team: workspace.name,
      due: remote.dueOn || "Not scheduled",
    };
    localStorage.setItem(PROJECT_PREFIX + item.id, JSON.stringify(item));
    setCatalog((currentCatalog) => ({
      ...currentCatalog,
      projects: [...currentCatalog.projects, item],
    }));
    appendActivity(workspace.id, {
      actorId: "alex",
      action: "created",
      entity: "project",
      entityId: item.id,
      entityName: item.name,
    });
    return item.id;
  };
  const deleteProject = async (id: string, confirmation: string) => {
    if (!ready) throw new Error("Workspaces are still loading.");
    const target = catalog.projects.find(
      (project) => project.id === id && project.workspaceId === workspace.id,
    );
    if (!target) throw new Error("This project is no longer available.");
    if (confirmation !== target.name)
      throw new Error("The project name must match exactly.");
    await deleteProjectApi(id);
    // One durable tombstone commits the deletion; seed data and late tab writes
    // cannot make this project visible again.
    localStorage.setItem(PROJECT_DELETED_PREFIX + id, String(Date.now()));
    setCatalog((currentCatalog) => ({
      ...currentCatalog,
      projects: currentCatalog.projects.filter((item) => item.id !== id),
    }));
    appendActivity(workspace.id, {
      actorId: "alex",
      action: "deleted",
      entity: "project",
      entityId: target.id,
      entityName: target.name,
    });
    return () => {
      localStorage.removeItem(PROJECT_DELETED_PREFIX + target.id);
      setCatalog(readCatalog());
      appendActivity(workspace.id, {
        actorId: "alex",
        action: "updated",
        entity: "project",
        entityId: target.id,
        entityName: target.name,
        detail: "Restored after deletion",
      });
    };
  };
  const deleteWorkspace = async (id: string, confirmation: string) => {
    if (!ready) throw new Error("Workspaces are still loading.");
    const target = catalog.workspaces.find((item) => item.id === id);
    if (!target) throw new Error("This workspace is no longer available.");
    if (confirmation !== target.name)
      throw new Error("The workspace name must match exactly.");
    await deleteWorkspaceApi(id);
    appendActivity(workspace.id, {
      actorId: "alex",
      action: "deleted",
      entity: "workspace",
      entityId: target.id,
      entityName: target.name,
    });
    localStorage.setItem(WORKSPACE_DELETED_PREFIX + id, String(Date.now()));
    setCatalog((currentCatalog) => ({
      ...currentCatalog,
      workspaces: currentCatalog.workspaces.filter((item) => item.id !== id),
      projects: currentCatalog.projects.filter(
        (project) => project.workspaceId !== id,
      ),
      members: currentCatalog.members.filter(
        (member) => member.workspaceId !== id,
      ),
    }));
    return () => {
      localStorage.removeItem(WORKSPACE_DELETED_PREFIX + target.id);
      setCatalog(readCatalog());
      appendActivity(target.id, {
        actorId: "alex",
        action: "updated",
        entity: "workspace",
        entityId: target.id,
        entityName: target.name,
        detail: "Restored after deletion",
      });
    };
  };
  const rotateInviteCode = async () => {
    if (!isRealtimeWorkspaceId(workspace.id)) return;
    const updated = await rotateWorkspaceInviteCode(workspace.id);
    setCatalog((current) => ({
      ...current,
      workspaces: current.workspaces.map((item) => item.id === workspace.id
        ? normalizeWorkspace({ ...item, inviteCode: updated.inviteCode })
        : item),
    }));
  };
  const addMember = async (
    input: Pick<WorkspaceMember, "name" | "email" | "role" | "team" | "color">,
  ): Promise<string> => {
    if (!ready) throw new Error("Workspaces are still loading.");
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name || name.length > 80)
      throw new Error("Enter a member name between 1 and 80 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Enter a valid email address.");
    if (members.some((member) => member.email.toLowerCase() === email))
      throw new Error("This email is already a member of the workspace.");
    if (isRealtimeWorkspaceId(workspace.id)) {
      const remote = await addMemberApi(workspace.id, {
        email,
        role: input.role === "admin" ? "admin" : "member",
        team: input.team.trim().slice(0, 60) || "General",
      });
      const item: WorkspaceMember = {
        id: remote.id,
        workspaceId: remote.workspaceId,
        name: remote.name,
        email: remote.email,
        role: remote.role,
        team: remote.team,
        initials: remote.initials,
        color: remote.color,
      };
      setCatalog((current) => ({
        ...current,
        members: [...current.members.filter((value) => value.id !== item.id), item],
      }));
      return item.id;
    }
    const id = crypto.randomUUID();
    const item: WorkspaceMember = {
      id,
      workspaceId: workspace.id,
      name,
      email,
      role: input.role,
      team: input.team.trim().slice(0, 60) || "General",
      color: input.color,
      initials: name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
    localStorage.setItem(
      MEMBER_PREFIX + workspace.id + "." + id,
      JSON.stringify(item),
    );
    setCatalog(readCatalog());
    appendActivity(workspace.id, {
      actorId: "alex",
      action: "created",
      entity: "member",
      entityId: item.id,
      entityName: item.name,
    });
    return id;
  };
  const updateMemberRole = async (id: string, role: WorkspaceRole) => {
    const target = members.find((member) => member.id === id);
    if (!target) throw new Error("Member not found.");
    if (isRealtimeWorkspaceId(workspace.id)) {
      const updated = await updateMemberApi(workspace.id, id, {
        name: target.name,
        email: target.email,
        role,
        team: target.team,
        color: target.color,
      });
      setCatalog((current) => ({
        ...current,
        members: current.members.map((member) => member.id === id ? {
          ...member,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          team: updated.team,
          initials: updated.initials,
          color: updated.color,
        } : member),
      }));
      return;
    }
    if (target.role === "owner" && role !== "owner")
      throw new Error(
        "The workspace owner cannot be downgraded in local mode.",
      );
    localStorage.setItem(
      MEMBER_PREFIX + workspace.id + "." + id,
      JSON.stringify({ ...target, role }),
    );
    setCatalog(readCatalog());
    appendActivity(workspace.id, {
      actorId: "alex",
      action: "updated",
      entity: "member",
      entityId: target.id,
      entityName: target.name,
      detail: `Role changed to ${role}`,
    });
  };
  const updateMemberProfile = async (
    id: string,
    input: Pick<WorkspaceMember, "name" | "email" | "role" | "team" | "color">,
  ) => {
    if (!ready) throw new Error("Workspaces are still loading.");
    const target = members.find((member) => member.id === id);
    if (!target) throw new Error("Member not found.");
    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    if (!name || name.length > 80)
      throw new Error("Enter a name between 1 and 80 characters.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      throw new Error("Enter a valid email address.");
    const updated: WorkspaceMember = {
      ...target,
      ...input,
      name,
      email,
      team: input.team.trim().slice(0, 60) || "General",
      initials: name
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
    if (isRealtimeWorkspaceId(workspace.id)) {
      const remote = await updateMemberApi(workspace.id, id, {
        name: updated.name,
        email: updated.email,
        role: updated.role,
        team: updated.team,
        color: updated.color,
      });
      setCatalog((current) => ({
        ...current,
        members: current.members.map((member) => member.id === id ? {
          ...member,
          name: remote.name,
          email: remote.email,
          role: remote.role,
          team: remote.team,
          initials: remote.initials,
          color: remote.color,
        } : member),
      }));
      return;
    }
    localStorage.setItem(
      MEMBER_PREFIX + workspace.id + "." + id,
      JSON.stringify(updated),
    );
    setCatalog(readCatalog());
    appendActivity(workspace.id, {
      actorId: "alex",
      action: "updated",
      entity: "member",
      entityId: updated.id,
      entityName: updated.name,
    });
  };
  const removeMember = async (id: string) => {
    const target = members.find((member) => member.id === id);
    if (!target) throw new Error("Member not found.");
    if (target.role === "owner" || target.id === "alex")
      throw new Error("The workspace owner cannot be removed.");
    if (isRealtimeWorkspaceId(workspace.id)) {
      await removeMemberApi(workspace.id, id);
      setCatalog((current) => ({
        ...current,
        members: current.members.filter((member) => member.id !== id),
      }));
      return;
    }
    localStorage.removeItem(MEMBER_PREFIX + workspace.id + "." + id);
    localStorage.setItem(
      MEMBER_REMOVED_PREFIX + workspace.id + "." + id,
      String(Date.now()),
    );
    setCatalog(readCatalog());
    appendActivity(workspace.id, {
      actorId: "alex",
      action: "deleted",
      entity: "member",
      entityId: target.id,
      entityName: target.name,
    });
    return () => {
      localStorage.setItem(
        MEMBER_PREFIX + workspace.id + "." + target.id,
        JSON.stringify(target),
      );
      localStorage.removeItem(
        MEMBER_REMOVED_PREFIX + workspace.id + "." + target.id,
      );
      setCatalog(readCatalog());
      appendActivity(workspace.id, {
        actorId: "alex",
        action: "updated",
        entity: "member",
        entityId: target.id,
        entityName: target.name,
        detail: "Restored after deletion",
      });
    };
  };
  return (
    <CatalogContext
      value={{
        workspaces: catalog.workspaces,
        projects,
        members,
        currentUserId,
        workspace,
        ready,
        error,
        switchWorkspace,
        createWorkspace,
        updateWorkspace,
        updateProject,
        joinWorkspace,
        createProject,
        deleteProject,
        deleteWorkspace,
        addMember,
        updateMemberRole,
        updateMemberProfile,
        removeMember,
        rotateInviteCode,
      }}
    >
      {children}
    </CatalogContext>
  );
}

export function useCatalog() {
  const context = useContext(CatalogContext);
  if (!context) throw new Error("Workspace catalog requires CatalogProvider.");
  return context;
}
export function useProjects() {
  return useCatalog().projects;
}
export function useMembers() {
  return useCatalog().members;
}
