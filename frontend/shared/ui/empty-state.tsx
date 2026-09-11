import type { ReactNode } from "react";
import { OrbitMark } from "./orbit-mark";

export function EmptyState({
  title = "A little room for something great",
  description = "No tasks match these filters. Try changing your search.",
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-orbit">
        <OrbitMark />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
