import type { TFunction } from "i18next";
import type { TaskStatus } from "@/features/tasks/domain/task";

export function taskStatusLabel(t: TFunction, status: TaskStatus) {
  return t(
    (
      {
        backlog: "workspace.statusTodo",
        progress: "workspace.statusProgress",
        review: "workspace.statusReview",
        done: "workspace.statusDone",
      } as const
    )[status],
  );
}

export function taskStatusDescription(t: TFunction, status: TaskStatus) {
  return t(
    (
      {
        backlog: "workspace.statusTodoDescription",
        progress: "workspace.statusProgressDescription",
        review: "workspace.statusReviewDescription",
        done: "workspace.statusDoneDescription",
      } as const
    )[status],
  );
}
