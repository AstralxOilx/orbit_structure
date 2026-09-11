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

const RepositoryContext = createContext<TaskRepository | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { workspace } = useCatalog();
  const [repository] = useState(() =>
    createTaskRepository(
      workspace.id === "studio" ? INITIAL_TASKS : [],
      workspace.id,
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
    queueMicrotask(() => setStarted(true));
    return stop;
  }, [repository]);
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
