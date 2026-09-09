"use client";

import { memo } from "react";
import {
  CalendarDays,
  Check,
  ListChecks,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import { useRepository, useTask } from "@/features/workspace/provider";
import { Avatar, Tag, PriorityBadge, formatDate } from "@/shared/ui";
import { STATUSES, STATUS_META, type TaskStatus } from "../domain/task";

export function CoverArt({ type }: { type: "website" | "palette" }) {
  if (type === "palette")
    return (
      <span className="card-cover palette-cover" aria-hidden="true">
        <span className="palette-swatch swatch-one" />
        <span className="palette-swatch swatch-two" />
        <span className="palette-swatch swatch-three" />
        <span className="palette-swatch swatch-four" />
        <span className="palette-swatch swatch-five" />
        <span className="palette-caption">A little more us.</span>
      </span>
    );
  return (
    <span className="card-cover website-cover" aria-hidden="true">
      <span className="mini-site">
        <span className="mini-site-nav">
          <b>
            form<span>®</span>
          </b>
          <i />
          <i />
          <i />
          <em />
        </span>
        <span className="mini-site-body">
          <span className="mini-site-copy">
            <small>LESS, BUT BETTER</small>
            <b>
              Make room
              <br />
              for what matters.
            </b>
            <span className="mini-copy-lines" />
            <em>Explore the collection ↗</em>
          </span>
          <span className="mini-site-art">
            <i className="vase vase-one" />
            <i className="vase vase-two" />
            <span className="art-circle" />
          </span>
        </span>
      </span>
      <span className="cover-file">Homepage exploration · v02</span>
    </span>
  );
}

export const TaskCard = memo(function TaskCard({
  id,
  onOpen,
  overlay = false,
}: {
  id: string;
  onOpen: (id: string) => void;
  overlay?: boolean;
}) {
  const task = useTask(id);
  const repository = useRepository();
  if (!task || task.deleted) return null;
  const complete = task.subtasks.filter((item) => item.done).length;
  return (
    <article
      data-task-anchor={overlay ? undefined : id}
      className={`task-card ${task.status === "done" ? "completed-card" : ""} ${overlay ? "overlay-card" : ""}`}
    >
      <div className="card-top">
        <span className="card-tags">
          {task.tags.map((tag) => (
            <Tag key={tag} name={tag} />
          ))}
        </span>
        <details className="task-menu">
          <summary
            aria-label={`Actions for ${task.title}`}
            title="Task actions"
          >
            <MoreHorizontal size={17} />
          </summary>
          <div className="task-menu-panel">
            <span>Move to</span>
            {STATUSES.map((status) => (
              <button
                type="button"
                key={status}
                onClick={(event) => {
                  repository.move(id, status as TaskStatus);
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                {STATUS_META[status].label}
                {status === task.status && <Check size={13} />}
              </button>
            ))}
          </div>
        </details>
      </div>
      <button type="button" className="card-main" onClick={() => onOpen(id)}>
        <strong className="card-title">{task.title}</strong>
        {task.cover ? (
          <CoverArt type={task.cover} />
        ) : (
          <span className="card-description">
            {task.id === "ORB-102"
              ? "Find opportunities to simplify and improve our current experience."
              : task.id === "ORB-105"
                ? "Reusable, accessible components that bring everything together."
                : task.id === "ORB-103"
                  ? "The right words, in the right places."
                  : task.id === "ORB-106"
                    ? "Connect the dots across every touchpoint."
                    : task.description.split("\n")[0]}
          </span>
        )}
      </button>
      <div className="card-meta">
        <span className="task-code">{task.id}</span>
        <PriorityBadge priority={task.priority} />
      </div>
      {task.subtasks.length > 0 && (
        <div className="card-checklist">
          <span>
            <ListChecks size={13} />
            <span>Checklist</span>
            <b>
              {complete}/{task.subtasks.length}
            </b>
          </span>
          <div className="tiny-progress">
            <i
              style={{ width: `${(complete / task.subtasks.length) * 100}%` }}
            />
          </div>
        </div>
      )}
      <div className="card-footer">
        <span
          className={`card-date ${task.status === "done" ? "is-done" : ""}`}
        >
          {task.status === "done" ? (
            <Check size={13} />
          ) : (
            <CalendarDays size={13} />
          )}{" "}
          {formatDate(task.dueOn)}
        </span>
        <span className="card-footer-right">
          {task.comments.length > 0 && (
            <span className="comment-count">
              <MessageSquare size={13} />
              {task.comments.length}
            </span>
          )}
          <button
            className="avatar-button"
            aria-label={`Open ${task.title} details`}
            onClick={() => onOpen(id)}
          >
            <Avatar id={task.assigneeId} size="xs" />
          </button>
        </span>
      </div>
    </article>
  );
});
