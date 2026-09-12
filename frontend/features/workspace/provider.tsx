"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createTaskRepository,
  type TaskRepository,
} from "../tasks/model/repository";
import { useCatalog } from "./catalog";
import { INITIAL_TASKS } from "./data";
import { ViewSkeleton } from "@/shared/ui";
import {
  createTask as createTaskApi,
  deleteTask as deleteTaskApi,
  listTasks,
  updateTask as updateTaskApi,
  type TaskApiRecord,
} from "@/lib/auth-api";
import type { Task } from "../tasks/domain/task";
import { subscribeWorkspaceRealtime } from "@/lib/workspace-realtime";

function fromApiTask(task: TaskApiRecord): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? "",
    projectId: task.projectId,
    status: task.status,
    priority: task.priority,
    tags: task.tags ?? [],
    assigneeId: task.assigneeId ?? "",
    startOn: task.startOn ?? "",
    dueOn: task.dueOn ?? "",
    rank: Number(task.rank) || 0,
    subtasks: (task.checklist ?? []).map((item) => ({
      id: item.id,
      title: item.title,
      done: item.done,
    })),
    comments: [],
    updatedAt: Date.parse(task.updatedAt) || Date.now(),
    actor: "server",
    statusHistory: [],
  };
}

// Local fallback projects use keys such as "website". The API expects the
// database project UUID in both the URL and the task.project_id column.
function isApiProjectId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
function isApiTaskId(value: string) {
  return isApiProjectId(value);
}

const RepositoryContext = createContext<TaskRepository | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { workspace, projects, members } = useCatalog();
  const ownerId = members.find((member) => member.role === "owner")?.id;
  const [repository] = useState(() =>
    createTaskRepository(
      workspace.id === "studio" ? INITIAL_TASKS : [],
      workspace.id,
      workspace.id === "studio"
        ? undefined
        : async (task) =>
            fromApiTask(
              await createTaskApi(task.projectId, {
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                assigneeId:
                  task.assigneeId === "alex"
                    ? ownerId
                    : task.assigneeId || undefined,
                startOn: task.startOn || undefined,
                dueOn: task.dueOn || undefined,
                rank: task.rank,
                tags: task.tags,
                checklist: task.subtasks.map((item, position) => ({
                  title: item.title,
                  done: item.done,
                  position,
                })),
              }),
            ),
      workspace.id === "studio"
        ? undefined
        : async (task) => {
            if (!isApiTaskId(task.id)) return task;
            return fromApiTask(
              await updateTaskApi(task.id, {
                title: task.title,
                description: task.description,
                status: task.status,
                priority: task.priority,
                assigneeId:
                  task.assigneeId === "alex"
                    ? ownerId
                    : task.assigneeId || undefined,
                startOn: task.startOn || undefined,
                dueOn: task.dueOn || undefined,
                rank: task.rank,
                tags: task.tags,
                checklist: task.subtasks.map((item, position) => ({
                  title: item.title,
                  done: item.done,
                  position,
                })),
              }),
            );
          },
      workspace.id === "studio"
        ? undefined
        : async (task) => {
            if (isApiTaskId(task.id)) await deleteTaskApi(task.id);
          },
    ),
  );
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const stop = repository.start();
    const remoteProjects = projects.filter((project) =>
      isApiProjectId(project.id),
    );
    const refreshTasks = () => Promise.all(remoteProjects.map((project) => listTasks(project.id)))
      .then((groups) => {
        const tasks: Task[] = groups.flat().map(fromApiTask);
        repository.hydrate(tasks);
      })
      .catch(() => {
        // Keep the repository's local fallback when the API is unavailable.
      });
    void refreshTasks();
    const unsubscribeRealtime = subscribeWorkspaceRealtime(workspace.id, (event) => {
      if (event.type === "task" || event.type === "project") void refreshTasks();
    });
    queueMicrotask(() => setStarted(true));
    return () => {
      unsubscribeRealtime();
      stop();
    };
  }, [repository, projects, ownerId, workspace.id]);
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryContext value={repository}>
        {started ? children : <ViewSkeleton />}
      </RepositoryContext>
    </QueryClientProvider>
  );
}

export function useRepository() {
  const repository = useContext(RepositoryContext);
  if (!repository)
    throw new Error("Task consumers must be inside WorkspaceProvider");
  return repository;
}

export function useTasks() {
  const repository = useRepository();
  const { projects } = useCatalog();
  const tasks = useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getServerSnapshot,
  );
  return useMemo(() => {
    const ids = new Set(projects.map((project) => project.id));
    return tasks.filter((task) => ids.has(task.projectId));
  }, [tasks, projects]);
}

export function useTask(id: string) {
  const repository = useRepository();
  const { projects } = useCatalog();
  const subscribe = useCallback(
    (notify: () => void) => repository.subscribeTask(id, notify),
    [repository, id],
  );
  const read = useCallback(() => repository.getTask(id), [repository, id]);
  const readServer = useCallback(
    () => repository.getServerTask(id),
    [repository, id],
  );
  const task = useSyncExternalStore(subscribe, read, readServer);
  return task && projects.some((project) => project.id === task.projectId)
    ? task
    : undefined;
}

export function useSaveState() {
  const repository = useRepository();
  return useSyncExternalStore(
    repository.subscribeStatus,
    repository.getSaveState,
    repository.getServerSaveState,
  );
}
