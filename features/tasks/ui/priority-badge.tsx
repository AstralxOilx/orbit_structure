import { ArrowUp, ChevronsUp, Minus, ArrowDown } from "lucide-react";
import type { Priority } from "../domain/task";
import { Tooltip } from "@/shared/ui";
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
    <Tooltip content={`${priority} priority`}>
      <span className={`priority priority-${priority}`}>
        <Icon size={12} strokeWidth={2.2} />
        {!compact && (
          <span>
            {priority === "normal"
              ? "Medium"
              : priority.charAt(0).toUpperCase() + priority.slice(1)}
          </span>
        )}
      </span>
    </Tooltip>
  );
}
