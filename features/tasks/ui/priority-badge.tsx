import { ArrowUp, ChevronsUp, Minus, ArrowDown } from "lucide-react";
import type { Priority } from "../domain/task";
export function PriorityBadge({
  priority,
  compact = false,
}: {
  priority: Priority;
  compact?: boolean;
}) {
  const Icon =
    priority === "urgent"
      ? ChevronsUp
      : priority === "high"
        ? ArrowUp
        : priority === "low"
          ? ArrowDown
          : Minus;
  return (
    <span
      className={`priority priority-${priority}`}
      title={`${priority} priority`}
    >
      <Icon size={12} strokeWidth={2.2} />
      {!compact && (
        <span>
          {priority === "normal"
            ? "Medium"
            : priority.charAt(0).toUpperCase() + priority.slice(1)}
        </span>
      )}
    </span>
  );
}
