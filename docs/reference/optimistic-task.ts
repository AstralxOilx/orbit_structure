/**
 * Framework-independent reconciliation core for one task.
 * Inputs are immutable and must be decoded/validated at the transport boundary.
 * Ordering, networking, persistence, and subscriptions belong to separate adapters.
 */
export type Priority = "low" | "normal" | "high" | "urgent";

export type TaskFields = Readonly<{
  title: string;
  priority: Priority;
  dueOn: string | null; // Calendar date, YYYY-MM-DD; not an instant.
}>;

export type TaskSnapshot = Readonly<{
  id: string;
  revision: number;
  value: TaskFields | null; // null is an authoritative deletion tombstone.
}>;

export type TaskEdit =
  | Readonly<{ kind: "rename"; title: string }>
  | Readonly<{ kind: "set-priority"; priority: Priority }>
  | Readonly<{ kind: "set-due"; dueOn: string | null }>;

export type PendingEdit = Readonly<{
  commandId: string;
  edit: TaskEdit;
}>;

export type TaskEntry = Readonly<{
  base: TaskSnapshot;
  pending: readonly PendingEdit[];
}>;

export function createTaskEntry(base: TaskSnapshot): TaskEntry {
  return { base, pending: [] };
}

export function enqueueEdit(entry: TaskEntry, edit: PendingEdit): TaskEntry {
  if (entry.base.value === null) {
    throw new Error("Cannot edit a deleted task");
  }
  if (entry.pending.some((item) => item.commandId === edit.commandId)) {
    throw new Error("A pending commandId must identify exactly one intent");
  }
  return { ...entry, pending: [...entry.pending, edit] };
}

function removePending(entry: TaskEntry, commandId?: string): TaskEntry {
  if (!commandId || !entry.pending.some((item) => item.commandId === commandId)) {
    return entry;
  }
  return {
    ...entry,
    pending: entry.pending.filter((item) => item.commandId !== commandId),
  };
}

/**
 * Merge a full server entity, optionally acknowledging one local command.
 * Even an old acknowledgement must settle its command without replacing newer data.
 * Equal revisions must describe equal values: the server protocol enforces this.
 */
export function reconcileTask(
  entry: TaskEntry,
  incoming: TaskSnapshot,
  acknowledgedCommandId?: string,
): TaskEntry {
  if (incoming.id !== entry.base.id) {
    throw new Error("Cannot reconcile a different task");
  }
  const settled = removePending(entry, acknowledgedCommandId);
  if (incoming.revision <= settled.base.revision) return settled;
  return { ...settled, base: incoming };
}

/** Call only for a definitive rejection, never for an ambiguous network timeout. */
export function rejectEdit(
  entry: TaskEntry,
  commandId: string,
  latest?: TaskSnapshot,
): TaskEntry {
  const rebased = latest ? reconcileTask(entry, latest) : entry;
  return removePending(rebased, commandId);
}

/** A pure projection; the store caches its result between entry changes. */
export function visibleTask(entry: TaskEntry): TaskFields | null {
  if (entry.base.value === null) return null;
  return entry.pending.reduce<TaskFields>((task, pending) => {
    switch (pending.edit.kind) {
      case "rename":
        return { ...task, title: pending.edit.title };
      case "set-priority":
        return { ...task, priority: pending.edit.priority };
      case "set-due":
        return { ...task, dueOn: pending.edit.dueOn };
    }
  }, entry.base.value);
}
