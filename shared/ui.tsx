"use client";

import {
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import {
  ArrowUp,
  ChevronsUp,
  Minus,
  ArrowDown,
  X,
  Circle,
  CircleDashed,
  CircleDot,
  CheckCircle2,
} from "lucide-react";
import { MEMBERS, TAG_COLORS } from "@/features/workspace/data";
import {
  STATUS_META,
  type Priority,
  type TaskStatus,
} from "@/features/tasks/domain/task";

export function OrbitMark({ small = false }: { small?: boolean }) {
  return (
    <span className={`orbit-mark ${small ? "small" : ""}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="2.3" />
        <ellipse
          cx="16"
          cy="16"
          rx="16"
          ry="6.5"
          transform="rotate(-40 16 16)"
          stroke="currentColor"
          strokeWidth="2"
        />
        <circle cx="26" cy="8" r="3" fill="currentColor" />
      </svg>
    </span>
  );
}

export function Avatar({
  id,
  size = "sm",
  label = true,
}: {
  id: string;
  size?: "xs" | "sm" | "md" | "lg";
  label?: boolean;
}) {
  const member = MEMBERS.find((item) => item.id === id);
  return (
    <span
      className={`avatar avatar-${size} avatar-${member?.color ?? "slate"}`}
      title={label ? (member?.name ?? "Unassigned") : undefined}
      aria-label={label ? (member?.name ?? "Unassigned") : undefined}
    >
      {member?.initials ?? "?"}
    </span>
  );
}

export function Tag({ name }: { name: string }) {
  return (
    <span className={`tag tag-${TAG_COLORS[name] ?? "purple"}`}>
      <span />
      {name}
    </span>
  );
}

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

export function IconButton({
  label,
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      className={`icon-button ${className}`}
      title={label}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function Dialog({
  children,
  title,
  onClose,
  className = "",
}: {
  children: ReactNode;
  title: string;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => {
      dialog?.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`dialog ${className}`}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            onClose();
        }
      }}
    >
      <div className="dialog-heading">
        <h2>{title}</h2>
        <IconButton label="Close dialog" onClick={onClose}>
          <X size={19} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}

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

export function ViewSkeleton() {
  return (
    <div className="view-skeleton" aria-label="Loading view" aria-busy="true">
      {[0, 1, 2, 3].map((column) => (
        <div key={column}>
          <span className="skeleton skeleton-heading" />
          {[0, 1, 2].map((card) => (
            <span className="skeleton skeleton-card" key={card} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function formatDate(date: string) {
  return date
    ? new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(
        new Date(`${date}T12:00:00`),
      )
    : "No date";
}
