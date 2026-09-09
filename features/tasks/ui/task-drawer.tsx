"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Flag,
  ListChecks,
  MessageSquare,
  Plus,
  Send,
  Tag as TagIcon,
  Trash2,
  UserRound,
} from "lucide-react";
import { useRepository, useTask } from "@/features/workspace/provider";
import { MEMBERS, PROJECTS, TAG_COLORS } from "@/features/workspace/data";
import { Avatar, Dialog, StatusIcon } from "@/shared/ui";
import {
  STATUSES,
  STATUS_META,
  type Priority,
  type TaskStatus,
} from "../domain/task";

const DescriptionEditor = dynamic(
  () => import("@/features/collaboration/description-editor"),
  { loading: () => <div className="skeleton editor-skeleton" /> },
);

function TaskTitleEditor({
  title,
  onSave,
}: {
  title: string;
  onSave: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <textarea
      className="task-title-input"
      aria-label="Task title"
      value={draft ?? title}
      rows={2}
      maxLength={180}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const value = draft?.trim();
        if (value && value !== title) onSave(value);
        setDraft(null);
      }}
    />
  );
}

export default function TaskDrawer({
  taskId,
  onClose,
  onNotify,
}: {
  taskId: string;
  onClose: () => void;
  onNotify: (message: string) => void;
}) {
  const task = useTask(taskId);
  const repository = useRepository();
  const [comment, setComment] = useState("");
  const [subtask, setSubtask] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!task || task.deleted)
    return (
      <Dialog title="Task unavailable" onClose={onClose}>
        <p className="dialog-description">
          This task has been deleted or is no longer available.
        </p>
        <button className="button button-primary" onClick={onClose}>
          Back to workspace
        </button>
      </Dialog>
    );
  const completed = task.subtasks.filter((item) => item.done).length;
  return (
    <Dialog title={task.id} onClose={onClose} className="task-drawer">
      <div className="drawer-scroll">
        <div className="drawer-breadcrumb">
          {PROJECTS.find((project) => project.id === task.projectId)?.name}
          <ArrowUpRight size={13} />
        </div>
        <TaskTitleEditor
          key={`title:${task.id}`}
          title={task.title}
          onSave={(title) => repository.update(task.id, { title })}
        />
        <div className="task-properties">
          <label>
            <span>
              <StatusIcon status={task.status} />
              Status
            </span>
            <select
              value={task.status}
              onChange={(event) =>
                repository.move(task.id, event.target.value as TaskStatus)
              }
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_META[status].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              <UserRound size={15} />
              Assignee
            </span>
            <span className="assignee-control">
              <Avatar id={task.assigneeId} size="xs" />
              <select
                value={task.assigneeId}
                onChange={(event) =>
                  repository.update(task.id, { assigneeId: event.target.value })
                }
              >
                <option value="">Unassigned</option>
                {MEMBERS.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label>
            <span>
              <Flag size={15} />
              Priority
            </span>
            <select
              value={task.priority}
              onChange={(event) =>
                repository.update(task.id, {
                  priority: event.target.value as Priority,
                })
              }
            >
              <option value="low">↓ Low</option>
              <option value="normal">— Medium</option>
              <option value="high">↑ High</option>
              <option value="urgent">⇈ Urgent</option>
            </select>
          </label>
          <label>
            <span>
              <CalendarDays size={15} />
              Start date
            </span>
            <input
              type="date"
              aria-label="Task start date"
              value={task.startOn}
              max={task.dueOn || undefined}
              onChange={(event) =>
                repository.update(task.id, { startOn: event.target.value })
              }
            />
          </label>
          <label>
            <span>
              <CalendarDays size={15} />
              Due date
            </span>
            <input
              type="date"
              aria-label="Task due date"
              value={task.dueOn}
              min={task.startOn || undefined}
              onChange={(event) =>
                repository.update(task.id, { dueOn: event.target.value })
              }
            />
          </label>
          <div className="property-tags">
            <span>
              <TagIcon size={15} />
              Tags
            </span>
            <div>
              {Object.keys(TAG_COLORS).map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`tag-toggle ${task.tags.includes(tag) ? "active" : ""}`}
                  onClick={() =>
                    repository.update(task.id, {
                      tags: task.tags.includes(tag)
                        ? task.tags.filter((value) => value !== tag)
                        : [...task.tags, tag],
                    })
                  }
                >
                  {task.tags.includes(tag) && <Check size={10} />} {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
        <DescriptionEditor
          key={`description:${task.id}`}
          taskId={task.id}
          initialText={task.description}
        />
        <section className="drawer-section">
          <div className="section-label">
            <h3>
              <ListChecks size={16} />
              Checklist{" "}
              <span className="small-count">
                {completed}/{task.subtasks.length}
              </span>
            </h3>
          </div>
          {task.subtasks.map((item) => (
            <label
              className={`subtask-row ${item.done ? "subtask-done" : ""}`}
              key={item.id}
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() =>
                  repository.update(task.id, {
                    subtasks: task.subtasks.map((value) =>
                      value.id === item.id
                        ? { ...value, done: !value.done }
                        : value,
                    ),
                  })
                }
              />
              <span>{item.title}</span>
            </label>
          ))}
          <form
            className="add-subtask"
            onSubmit={(event) => {
              event.preventDefault();
              if (!subtask.trim()) return;
              repository.update(task.id, {
                subtasks: [
                  ...task.subtasks,
                  {
                    id: crypto.randomUUID(),
                    title: subtask.trim(),
                    done: false,
                  },
                ],
              });
              setSubtask("");
            }}
          >
            <Plus size={15} />
            <input
              value={subtask}
              onChange={(event) => setSubtask(event.target.value)}
              placeholder="Add a checklist item"
              aria-label="New checklist item"
            />
            <button type="submit">Add</button>
          </form>
        </section>
        <section className="drawer-section">
          <div className="section-label">
            <h3>
              <MessageSquare size={15} />
              Activity{" "}
              <span className="small-count">{task.comments.length}</span>
            </h3>
          </div>
          {task.comments.map((item) => (
            <div className="activity-comment" key={item.id}>
              <Avatar id={item.authorId} size="sm" />
              <div>
                <p>
                  <strong>
                    {MEMBERS.find((member) => member.id === item.authorId)
                      ?.name ?? "Team member"}
                  </strong>
                  <time>
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                    }).format(new Date(item.createdAt))}
                  </time>
                </p>
                <span>{item.body}</span>
              </div>
            </div>
          ))}
          <form
            className="comment-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!comment.trim()) return;
              repository.update(task.id, {
                comments: [
                  ...task.comments,
                  {
                    id: crypto.randomUUID(),
                    authorId: "alex",
                    body: comment.trim(),
                    createdAt: new Date().toISOString(),
                  },
                ],
              });
              setComment("");
            }}
          >
            <textarea
              aria-label="Add a comment"
              placeholder="Leave a thought for your team…"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <div>
              <Avatar id="alex" size="xs" />
              <button
                className="button button-primary button-small"
                disabled={!comment.trim()}
              >
                <Send size={13} />
                Comment
              </button>
            </div>
          </form>
        </section>
        <div className="drawer-danger">
          {confirmDelete ? (
            <>
              <span>Delete this task?</span>
              <button
                className="danger-button"
                onClick={() => {
                  repository.update(task.id, { deleted: true });
                  onClose();
                  onNotify("Task deleted");
                }}
              >
                Delete task
              </button>
              <button onClick={() => setConfirmDelete(false)}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} />
              Delete task
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

export function NewTaskDialog({
  projectId,
  status,
  onClose,
  onCreated,
}: {
  projectId: string;
  status: TaskStatus;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const repository = useRepository();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [taskStatus, setTaskStatus] = useState(status);
  const [priority, setPriority] = useState<Priority>("normal");
  const [assignee, setAssignee] = useState("alex");
  const [due, setDue] = useState("");
  const [tag, setTag] = useState("Design");
  return (
    <Dialog
      title="A new task, a little more progress"
      onClose={onClose}
      className="new-task-dialog"
    >
      <p className="dialog-description">
        Add a task to{" "}
        {PROJECTS.find((project) => project.id === projectId)?.name}.
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!title.trim()) return;
          const tasks = repository
            .getSnapshot()
            .filter(
              (task) =>
                task.projectId === projectId && task.status === taskStatus,
            );
          const id = repository.create({
            title: title.trim(),
            description,
            projectId,
            status: taskStatus,
            priority,
            assigneeId: assignee,
            dueOn: due,
            startOn: "",
            tags: tag ? [tag] : [],
            subtasks: [],
            comments: [],
            rank: Math.max(0, ...tasks.map((task) => task.rank)) + 1024,
          });
          onCreated(id);
        }}
      >
        <label className="form-label">
          Task name
          <input
            autoFocus
            placeholder="What needs to get done?"
            value={title}
            maxLength={180}
            required
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label className="form-label">
          Description <span className="muted">optional</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="A little context goes a long way…"
            rows={3}
          />
        </label>
        <div className="form-grid">
          <label className="form-label">
            Status
            <select
              value={taskStatus}
              onChange={(event) =>
                setTaskStatus(event.target.value as TaskStatus)
              }
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {STATUS_META[value].label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Priority
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
            >
              <option value="low">Low</option>
              <option value="normal">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </label>
          <label className="form-label">
            Assignee
            <select
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="">Unassigned</option>
              {MEMBERS.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-label">
            Due date
            <input
              type="date"
              value={due}
              onChange={(event) => setDue(event.target.value)}
            />
          </label>
          <label className="form-label">
            Tag
            <select
              value={tag}
              onChange={(event) => setTag(event.target.value)}
            >
              <option value="">No tag</option>
              {Object.keys(TAG_COLORS).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="dialog-actions">
          <button className="button" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="button button-primary" disabled={!title.trim()}>
            <Plus size={15} />
            Create task
          </button>
        </div>
      </form>
    </Dialog>
  );
}
