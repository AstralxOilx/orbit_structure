"use client";

import { useRef, useState } from "react";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import { PriorityBadge } from "@/features/tasks/ui/priority-badge";
import { StatusIcon } from "@/features/tasks/ui/status-icon";
import { TaskTag as Tag } from "@/features/tasks/ui/task-tag";
import { formatDate } from "@/shared/lib/format-date";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/shared/ui";
import { useRepository } from "@/features/workspace/provider";
import {
  STATUSES,
  STATUS_META,
  type Task,
  type TaskStatus,
} from "../domain/task";

export default function ListView({
  tasks,
  onOpen,
  onAdd,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
  onAdd: (status: TaskStatus) => void;
}) {
  "use no memo"; // Virtualizer methods read live measurements.
  const parent = useRef<HTMLDivElement>(null);
  const repository = useRepository();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // Explicitly opted out of React Compiler above; measurement methods remain live.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => parent.current,
    estimateSize: () => 66,
    overscan: 8,
    getItemKey: (index) => tasks[index].id,
    initialRect: { width: 1100, height: 650 },
  });
  const toggle = (id: string) =>
    setSelected((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return (
    <div className="list-view">
      {selected.size > 0 && (
        <div className="bulk-toolbar">
          <strong>{selected.size} selected</strong>
          <select
            aria-label="Move selected tasks"
            defaultValue=""
            onChange={(event) => {
              selected.forEach((id) =>
                repository.move(id, event.target.value as TaskStatus),
              );
              setSelected(new Set());
            }}
          >
            <option value="" disabled>
              Move to…
            </option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_META[status].label}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              selected.forEach((id) =>
                repository.update(id, { deleted: true }),
              );
              setSelected(new Set());
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
          <button onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}
      <div
        className="task-table"
        role="table"
        aria-label="Project tasks"
        aria-rowcount={tasks.length + 1}
      >
        <div className="list-header list-grid" role="row">
          <span role="columnheader">
            <input
              type="checkbox"
              aria-label="Select all visible tasks"
              checked={
                tasks.length > 0 && tasks.every((task) => selected.has(task.id))
              }
              onChange={(event) =>
                setSelected(
                  event.target.checked
                    ? new Set(tasks.map((task) => task.id))
                    : new Set(),
                )
              }
            />
          </span>
          <span role="columnheader">Task name</span>
          <span role="columnheader">
            Status <ChevronDown size={12} />
          </span>
          <span role="columnheader">Priority</span>
          <span role="columnheader">Assignee</span>
          <span role="columnheader">Due date</span>
          <span role="columnheader">Tags</span>
        </div>
        <div ref={parent} className="list-scroll" role="rowgroup">
          <div
            style={{ height: virtualizer.getTotalSize(), position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((row) => {
              const task = tasks[row.index];
              return (
                <div
                  role="row"
                  aria-rowindex={row.index + 2}
                  className={`list-grid list-row ${selected.has(task.id) ? "selected-row" : ""}`}
                  key={row.key}
                  style={{
                    height: row.size,
                    transform: `translateY(${row.start}px)`,
                  }}
                >
                  <span role="cell">
                    <input
                      type="checkbox"
                      aria-label={`Select ${task.title}`}
                      checked={selected.has(task.id)}
                      onChange={() => toggle(task.id)}
                    />
                  </span>
                  <span role="cell" className="list-task-title">
                    <StatusIcon status={task.status} />
                    <button onClick={() => onOpen(task.id)}>
                      {task.title}
                      <small>{task.id}</small>
                    </button>
                  </span>
                  <span role="cell">
                    <select
                      aria-label={`Status for ${task.title}`}
                      className={`inline-status status-${STATUS_META[task.status].color}`}
                      value={task.status}
                      onChange={(event) =>
                        repository.move(
                          task.id,
                          event.target.value as TaskStatus,
                        )
                      }
                    >
                      {STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {STATUS_META[status].label}
                        </option>
                      ))}
                    </select>
                  </span>
                  <span role="cell">
                    <PriorityBadge priority={task.priority} />
                  </span>
                  <span role="cell">
                    <Avatar id={task.assigneeId} size="xs" />
                  </span>
                  <span role="cell" className="list-date">
                    {formatDate(task.dueOn)}
                  </span>
                  <span role="cell" className="list-tags">
                    {task.tags.map((tag) => (
                      <Tag key={tag} name={tag} />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
          {!tasks.length && <EmptyState />}
        </div>
      </div>
      <button className="list-add" onClick={() => onAdd("backlog")}>
        <Plus size={16} /> Add a new task
      </button>
    </div>
  );
}
