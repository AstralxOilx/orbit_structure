export const STATUSES = ["backlog", "progress", "review", "done"] as const;
export type TaskStatus = (typeof STATUSES)[number];
export interface StatusTransition {
  from: TaskStatus | null;
  to: TaskStatus;
  at: number;
}
export type Priority = "urgent" | "high" | "normal" | "low";
export type ViewMode = "board" | "list" | "timeline";
export type WorkspacePage =
  | "project"
  | "overview"
  | "my-tasks"
  | "teams"
  | "inbox"
  | "discussion"
  | "activity";

export interface Task {
  id: string;
  title: string;
  description: string;
  projectId: string;
  status: TaskStatus;
  priority: Priority;
  tags: string[];
  assigneeId: string;
  startOn: string;
  dueOn: string;
  /** IDs of tasks that must finish before this task starts. */
  dependsOn?: string[];
  statusHistory?: StatusTransition[];
  rank: number;
  subtasks: { id: string; title: string; done: boolean }[];
  comments: { id: string; authorId: string; body: string; createdAt: string }[];
  cover?: "website" | "palette";
  updatedAt: number;
  actor: string;
  deleted?: boolean;
}

export interface TaskFilters {
  query: string;
  priority: Priority | "all";
  assigneeId: string;
  tag: string;
  due: "all" | "week" | "overdue";
  hideDone: boolean;
  sort: "manual" | "priority" | "due";
}

export const DEFAULT_FILTERS: TaskFilters = {
  query: "",
  priority: "all",
  assigneeId: "all",
  tag: "all",
  due: "all",
  hideDone: false,
  sort: "manual",
};

export const STATUS_META: Record<
  TaskStatus,
  { label: string; color: string; description: string }
> = {
  backlog: {
    label: "To do",
    color: "slate",
    description: "Ready when you are",
  },
  progress: {
    label: "In progress",
    color: "blue",
    description: "Great things in the making",
  },
  review: {
    label: "In review",
    color: "amber",
    description: "A fresh pair of eyes",
  },
  done: {
    label: "Done",
    color: "green",
    description: "Little wins, big progress",
  },
};

const priorityOrder: Record<Priority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

export function filterTasks(
  tasks: readonly Task[],
  filters: TaskFilters,
  now = new Date(),
): Task[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const week = new Date(today);
  week.setDate(week.getDate() + 7);
  const query = filters.query.trim().toLocaleLowerCase();
  return tasks
    .filter((task) => {
      if (task.deleted || (filters.hideDone && task.status === "done"))
        return false;
      if (
        query &&
        !`${task.title} ${task.id} ${task.tags.join(" ")}`
          .toLocaleLowerCase()
          .includes(query)
      )
        return false;
      if (filters.priority !== "all" && filters.priority !== task.priority)
        return false;
      if (
        filters.assigneeId !== "all" &&
        filters.assigneeId !== task.assigneeId
      )
        return false;
      if (filters.tag !== "all" && !task.tags.includes(filters.tag))
        return false;
      if (filters.due !== "all") {
        if (!task.dueOn) return false;
        const due = new Date(`${task.dueOn}T00:00:00`);
        if (
          filters.due === "overdue" &&
          (due >= today || task.status === "done")
        )
          return false;
        if (filters.due === "week" && (due < today || due > week)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (filters.sort === "priority")
        return (
          priorityOrder[a.priority] - priorityOrder[b.priority] ||
          a.rank - b.rank
        );
      if (filters.sort === "due")
        return (
          (a.dueOn || "9999").localeCompare(b.dueOn || "9999") ||
          a.rank - b.rank
        );
      return a.rank - b.rank || a.id.localeCompare(b.id);
    });
}

export function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === "string" &&
    typeof task.title === "string" &&
    typeof task.projectId === "string" &&
    typeof task.description === "string" &&
    STATUSES.includes(task.status as TaskStatus) &&
    ["urgent", "high", "normal", "low"].includes(task.priority ?? "") &&
    Array.isArray(task.tags) &&
    task.tags.every((tag) => typeof tag === "string") &&
    typeof task.assigneeId === "string" &&
    typeof task.startOn === "string" &&
    typeof task.dueOn === "string" &&
    (task.statusHistory === undefined ||
      (Array.isArray(task.statusHistory) &&
        task.statusHistory.every(
          (event) =>
            event &&
            (event.from === null || STATUSES.includes(event.from)) &&
            STATUSES.includes(event.to) &&
            Number.isFinite(event.at) &&
            event.at >= 0,
        ))) &&
    (task.dependsOn === undefined ||
      (Array.isArray(task.dependsOn) &&
        task.dependsOn.every((id) => typeof id === "string"))) &&
    typeof task.rank === "number" &&
    Number.isFinite(task.rank) &&
    Array.isArray(task.subtasks) &&
    task.subtasks.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.title === "string" &&
        typeof item.done === "boolean",
    ) &&
    Array.isArray(task.comments) &&
    task.comments.every(
      (item) =>
        item &&
        typeof item.id === "string" &&
        typeof item.authorId === "string" &&
        typeof item.body === "string" &&
        typeof item.createdAt === "string",
    ) &&
    typeof task.updatedAt === "number" &&
    Number.isFinite(task.updatedAt) &&
    typeof task.actor === "string"
  );
}
