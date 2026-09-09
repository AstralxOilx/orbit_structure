"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createTaskRepository,
  type TaskRepository,
} from "../tasks/model/repository";

const RepositoryContext = createContext<TaskRepository | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [repository] = useState(createTaskRepository);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  useEffect(() => repository.start(), [repository]);
  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryContext value={repository}>{children}</RepositoryContext>
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
  return useSyncExternalStore(
    repository.subscribe,
    repository.getSnapshot,
    repository.getServerSnapshot,
  );
}

export function useTask(id: string) {
  const repository = useRepository();
  const subscribe = useCallback(
    (notify: () => void) => repository.subscribeTask(id, notify),
    [repository, id],
  );
  const read = useCallback(() => repository.getTask(id), [repository, id]);
  const readServer = useCallback(
    () => repository.getServerTask(id),
    [repository, id],
  );
  return useSyncExternalStore(subscribe, read, readServer);
}

export function useSaveState() {
  const repository = useRepository();
  return useSyncExternalStore(
    repository.subscribeStatus,
    repository.getSaveState,
    repository.getServerSaveState,
  );
}
