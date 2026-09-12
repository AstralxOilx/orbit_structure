import { INITIAL_TASKS } from "../../workspace/data";
import { isTask, type Task, type TaskStatus } from "../domain/task";
import { isScopeDeleted } from "../../workspace/deletions";
import {
  appendActivity,
  updateActivityStatus,
} from "../../workspace/activity";

const PREFIX = "orbit.workspace.task.v1.";
type Listener = () => void;
export type SaveState = {
  status: "saved" | "saving" | "error";
  message: string;
};

/** Local-first adapter. Replace this boundary with the revisioned command API. */
export function createTaskRepository(
  initial: readonly Task[] = INITIAL_TASKS,
  workspaceId = "studio",
  persistTask?: (task: Task) => Promise<Task>,
  persistUpdate?: (task: Task) => Promise<Task>,
  persistDelete?: (task: Task) => Promise<void>,
) {
  const storagePrefix =
    workspaceId === "studio"
      ? PREFIX
      : `orbit.workspace.${workspaceId}.task.v1.`;
  const channelName =
    workspaceId === "studio"
      ? "orbit.workspace.tasks.v1"
      : `orbit.workspace.${workspaceId}.tasks.v1`;
  const records = new Map(initial.map((task) => [task.id, task]));
  const listeners = new Set<Listener>();
  const entityListeners = new Map<string, Set<Listener>>();
  const statusListeners = new Set<Listener>();
  let snapshot = initial.filter((task) => !task.deleted);
  const serverSnapshot = snapshot;
  const initialStatus: SaveState = {
    status: "saved",
    message: "Saved on this device",
  };
  let saveState = initialStatus;
  let actor = "";
  let channel: BroadcastChannel | null = null;
  let active = false;
  let pending = 0;

  const status = (next: SaveState) => {
    saveState = next;
    statusListeners.forEach((notify) => notify());
  };
  const publish = (id: string) => {
    snapshot = Array.from(records.values()).filter((task) => !task.deleted);
    listeners.forEach((notify) => notify());
    entityListeners.get(id)?.forEach((notify) => notify());
  };
  const newer = (a: Task, b?: Task) =>
    !b ||
    a.updatedAt > b.updatedAt ||
    (a.updatedAt === b.updatedAt && a.actor > b.actor);
  const receive = (incoming: unknown) => {
    if (!isTask(incoming) || !newer(incoming, records.get(incoming.id))) return;
    records.set(incoming.id, incoming);
    publish(incoming.id);
  };
  const commit = (
    next: Task,
    previous?: Task,
    activityId?: string | null,
  ) => {
    const markActivity = (result: "success" | "failed") => {
      if (activityId) updateActivityStatus(workspaceId, activityId, result);
    };
    try {
      if (isScopeDeleted(workspaceId, next.projectId)) {
        markActivity("failed");
        status({
          status: "error",
          message:
            "This workspace or project was deleted. Changes were not saved.",
        });
        return;
      }
    } catch {
      markActivity("failed");
      status({
        status: "error",
        message: "Browser storage is unavailable. Changes cannot be saved.",
      });
      return;
    }
    records.set(next.id, next);
    publish(next.id);
    pending++;
    status({ status: "saving", message: "Saving changes…" });
    queueMicrotask(() => {
      try {
        if (isScopeDeleted(workspaceId, next.projectId)) {
          pending--;
          markActivity("failed");
          if (!pending) status(initialStatus);
          return;
        }
        localStorage.setItem(storagePrefix + next.id, JSON.stringify(next));
        channel?.postMessage(next);
        pending--;
        if (!pending) status(initialStatus);
      } catch {
        pending--;
        markActivity("failed");
        // Only roll back this operation; a newer local/remote edit wins.
        if (records.get(next.id) === next) {
          if (previous) records.set(next.id, previous);
          else records.delete(next.id);
          publish(next.id);
        }
        status({
          status: "error",
          message:
            "Couldn’t save on this device. Check browser storage and try again.",
        });
      }
    });
    if (next.deleted && persistDelete) {
      void persistDelete(next)
        .then(() => markActivity("success"))
        .catch(() => {
          markActivity("failed");
          status({
            status: "error",
            message: "Could not delete the task on the server.",
          });
        });
    } else if (!next.deleted && persistUpdate) {
      void persistUpdate(next)
        .then((remote) => {
          markActivity("success");
          if (!remote || records.get(next.id) !== next) return;
          const merged = {
            ...next,
            ...remote,
            statusHistory: next.statusHistory,
            comments: next.comments,
            dependsOn: next.dependsOn,
            cover: next.cover,
            actor,
            updatedAt: Math.max(next.updatedAt, remote.updatedAt),
          };
          records.set(next.id, merged);
          publish(next.id);
        })
        .catch(() => {
          markActivity("failed");
          status({
            status: "error",
            message: "Could not save task changes to the server.",
          });
        });
    }
  };

  const repository = {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    getTask: (id: string) => records.get(id),
    getServerTask: (id: string) => initial.find((task) => task.id === id),
    hydrate(nextTasks: readonly Task[]) {
      records.clear();
      nextTasks.forEach((task) => records.set(task.id, task));
      snapshot = Array.from(records.values()).filter((task) => !task.deleted);
      listeners.forEach((notify) => notify());
    },
    getSaveState: () => saveState,
    getServerSaveState: () => initialStatus,
    subscribe(notify: Listener) {
      listeners.add(notify);
      return () => {
        listeners.delete(notify);
      };
    },
    subscribeStatus(notify: Listener) {
      statusListeners.add(notify);
      return () => {
        statusListeners.delete(notify);
      };
    },
    subscribeTask(id: string, notify: Listener) {
      const bucket = entityListeners.get(id) ?? new Set<Listener>();
      bucket.add(notify);
      entityListeners.set(id, bucket);
      return () => {
        bucket.delete(notify);
        if (!bucket.size) entityListeners.delete(id);
      };
    },
    update(
      id: string,
      patch: Partial<Omit<Task, "id" | "actor" | "updatedAt">>,
    ) {
      const previous = records.get(id);
      if (!previous || previous.deleted) return;
      const updatedAt = Math.max(Date.now(), previous.updatedAt + 1);
      const statusHistory =
        patch.status && patch.status !== previous.status
          ? [
              ...(previous.statusHistory ?? []),
              { from: previous.status, to: patch.status, at: updatedAt },
            ]
          : previous.statusHistory;
      const next = {
        ...previous,
        ...patch,
        statusHistory,
        updatedAt,
        actor,
      };
      const activityId = appendActivity(workspaceId, {
        actorId: "alex",
        action: patch.deleted
          ? "deleted"
          : patch.status !== previous.status
            ? "moved"
            : "updated",
        entity: "task",
        entityId: id,
        entityName: previous.title,
        detail:
          patch.status !== previous.status
            ? `${previous.status} → ${patch.status}`
            : undefined,
        status: persistUpdate || persistDelete ? "pending" : "success",
      });
      commit(next, previous, activityId);
    },
    restore(id: string) {
      const previous = records.get(id);
      if (!previous || !previous.deleted) return;
      const next = {
        ...previous,
        deleted: false,
        updatedAt: Math.max(Date.now(), previous.updatedAt + 1),
        actor,
      };
      const activityId = appendActivity(workspaceId, {
        actorId: "alex",
        action: "updated",
        entity: "task",
        entityId: id,
        entityName: previous.title,
        detail: "Restored after deletion",
        status: persistUpdate ? "pending" : "success",
      });
      commit(next, previous, activityId);
    },
    create(task: Omit<Task, "id" | "actor" | "updatedAt">) {
      const id = `ORB-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;
      const updatedAt = Date.now();
      const created = {
        ...task,
        id,
        actor,
        updatedAt,
        statusHistory: [{ from: null, to: task.status, at: updatedAt }],
      } satisfies Task;
      const activityId = appendActivity(workspaceId, {
        actorId: "alex",
        action: "created",
        entity: "task",
        entityId: id,
        entityName: task.title,
        status: persistTask ? "pending" : "success",
      });
      commit(created);
      if (persistTask) {
        void persistTask(created)
          .then((remote) => {
            updateActivityStatus(workspaceId, activityId ?? "", "success");
            if (records.get(id) !== created) return;
            records.delete(id);
            records.set(remote.id, remote);
            publish(id);
            publish(remote.id);
          })
          .catch(() => {
            updateActivityStatus(workspaceId, activityId ?? "", "failed");
            status({
              status: "error",
              message: "Could not save task to the server.",
            });
          });
      }
      return id;
    },
    setDependencies(id: string, dependencyIds: string[]): string | null {
      const task = records.get(id);
      if (!task || task.deleted) return "This task is no longer available.";
      const unique = [...new Set(dependencyIds)];
      // Always allow removing links, including links to deleted tasks or cycles
      // received from another tab. Adding links validates the complete graph.
      if (
        unique.every((dependencyId) => task.dependsOn?.includes(dependencyId))
      ) {
        repository.update(id, { dependsOn: unique });
        return null;
      }
      for (const dependencyId of unique) {
        const dependency = records.get(dependencyId);
        if (
          !dependency ||
          dependency.deleted ||
          dependency.projectId !== task.projectId
        )
          return "Choose an available task in this project.";
        const pending = [dependencyId];
        const visited = new Set<string>();
        while (pending.length) {
          const current = pending.pop()!;
          if (current === id)
            return "This link would create a circular dependency.";
          if (visited.has(current)) continue;
          visited.add(current);
          const record = records.get(current);
          if (record && !record.deleted)
            pending.push(...(record.dependsOn ?? []));
        }
      }
      repository.update(id, { dependsOn: unique });
      return null;
    },
    move(
      id: string,
      toStatus: TaskStatus,
      anchorId?: string,
      placement: "before" | "after" = "before",
      scope: "project" | "workspace" = "project",
    ) {
      const current = records.get(id);
      if (!current || current.deleted || anchorId === id) return;
      const siblings = snapshot
        .filter(
          (task) =>
            (scope === "workspace" || task.projectId === current.projectId) &&
            task.status === toStatus &&
            task.id !== id,
        )
        .sort((a, b) => a.rank - b.rank);
      const anchor = siblings.findIndex((task) => task.id === anchorId);
      const index =
        anchor < 0 ? siblings.length : anchor + (placement === "after" ? 1 : 0);
      const before =
        siblings[index - 1]?.rank ?? (siblings[index]?.rank ?? 0) - 2048;
      const after = siblings[index]?.rank ?? before + 2048;
      repository.update(id, { status: toStatus, rank: (before + after) / 2 });
    },
    start() {
      if (active) return () => {};
      active = true;
      actor = crypto.randomUUID();
      try {
        const changed: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key?.startsWith(storagePrefix)) continue;
          try {
            const task: unknown = JSON.parse(
              localStorage.getItem(key) ?? "null",
            );
            if (isTask(task) && newer(task, records.get(task.id))) {
              records.set(task.id, task);
              changed.push(task.id);
            }
          } catch {
            /* An invalid record cannot take down the workspace. */
          }
        }
        if (changed.length) {
          snapshot = Array.from(records.values()).filter(
            (task) => !task.deleted,
          );
          listeners.forEach((notify) => notify());
          changed.forEach((id) =>
            entityListeners.get(id)?.forEach((notify) => notify()),
          );
        }
      } catch {
        status({
          status: "error",
          message: "Browser storage is unavailable. Changes cannot be saved.",
        });
      }
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel(channelName);
        channel.onmessage = (event: MessageEvent<unknown>) =>
          receive(event.data);
      }
      const onStorage = (event: StorageEvent) => {
        if (event.key?.startsWith(storagePrefix) && event.newValue) {
          try {
            receive(JSON.parse(event.newValue));
          } catch {
            /* Ignore invalid external data. */
          }
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        active = false;
        channel?.close();
        channel = null;
        window.removeEventListener("storage", onStorage);
      };
    },
  };
  return repository;
}

export type TaskRepository = ReturnType<typeof createTaskRepository>;
