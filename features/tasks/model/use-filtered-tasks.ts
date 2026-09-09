"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { filterTasks, type Task, type TaskFilters } from "../domain/task";
import type { FilterRequest, FilterResult } from "./filter.worker";

/** Small views stay synchronous; large working sets filter off the main thread. */
export function useFilteredTasks(
  tasks: readonly Task[],
  filters: TaskFilters,
  scope: string,
) {
  const large = tasks.length >= 1000;
  const worker = useRef<Worker | null>(null);
  const sent = useRef(new Map<string, Task>());
  const request = useRef(0);
  const [result, setResult] = useState<{
    ids: string[];
    source: readonly Task[];
    key: string;
    scope: string;
  } | null>(null);
  const filterKey = JSON.stringify(filters);
  const smallResult = useMemo(
    () => (large ? null : filterTasks(tasks, filters)),
    [tasks, filters, large],
  );
  const byId = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );

  useEffect(() => {
    if (!large) return;
    const instance = new Worker(
      new URL("./filter.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current = instance;
    sent.current = new Map();
    return () => {
      instance.terminate();
      worker.current = null;
    };
  }, [large]);
  useEffect(() => {
    const instance = worker.current;
    if (!large || !instance) return;
    const requestId = ++request.current;
    const incoming = new Map(tasks.map((task) => [task.id, task]));
    const changed = tasks.filter((task) => sent.current.get(task.id) !== task);
    const removed = Array.from(sent.current.keys()).filter(
      (id) => !incoming.has(id),
    );
    sent.current = incoming;
    instance.onmessage = ({ data }: MessageEvent<FilterResult>) => {
      if (data.requestId !== request.current) return;
      setResult({ ids: data.ids, source: tasks, key: filterKey, scope });
    };
    instance.onerror = () =>
      setResult({
        ids: filterTasks(tasks, filters).map((task) => task.id),
        source: tasks,
        key: filterKey,
        scope,
      });
    const message: FilterRequest = { requestId, changed, removed, filters };
    instance.postMessage(message);
  }, [tasks, filters, filterKey, scope, large]);

  const visible = useMemo(
    () =>
      smallResult ??
      (result?.scope === scope
        ? result.ids.flatMap((id) => {
            const task = byId.get(id);
            return task ? [task] : [];
          })
        : []),
    [smallResult, result, scope, byId],
  );
  return {
    tasks: visible,
    pending:
      large &&
      (result?.source !== tasks ||
        result?.key !== filterKey ||
        result?.scope !== scope),
  };
}
