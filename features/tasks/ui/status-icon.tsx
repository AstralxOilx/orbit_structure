import { Circle, CircleDashed, CircleDot, CheckCircle2 } from "lucide-react";
import { STATUS_META, type TaskStatus } from "../domain/task";
export function StatusIcon({
  status,
  size = 15,
}: {
  status: TaskStatus;
  size?: number;
}) {
  const Icon =
    status === "done"
      ? CheckCircle2
      : status === "progress"
        ? CircleDot
        : status === "review"
          ? CircleDashed
          : Circle;
  return (
    <Icon
      size={size}
      className={`status-icon status-${STATUS_META[status].color}`}
      strokeWidth={2}
    />
  );
}
