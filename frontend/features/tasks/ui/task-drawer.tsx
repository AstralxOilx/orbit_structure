"use client";

import { DateInput } from "@/shared/ui/date-input";

import { Select } from "@/shared/ui/select";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import { StatusIcon } from "@/features/tasks/ui/status-icon";
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
import { Input } from "@/shared/ui";
import {
  useRepository,
  useSaveState,
  useTask,
} from "@/features/workspace/provider";
import { TAG_COLORS } from "@/features/workspace/data";
import { useMembers } from "@/features/workspace/catalog";
import { useProjects } from "@/features/workspace/catalog";
import { taskStatusLabel } from "@/shared/i18n/task-copy";
import { Dialog } from "@/shared/ui";
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
  const { t } = useTranslation();
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <textarea
      className="task-title-input"
      aria-label={t("workspace.taskTitle")}
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
  onNotify: (message: string, action?: () => void) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const task = useTask(taskId);
  const PROJECTS = useProjects();
  const MEMBERS = useMembers();
  const repository = useRepository();
  const saving = useSaveState().status === "saving";
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
              {t("workspace.status")}
            </span>
            <Select
              value={task.status}
              onChange={(event) =>
                repository.move(task.id, event.target.value as TaskStatus)
              }
            >
              {STATUSES.map((status) => (
                <option key={status} value={status}>
                  {taskStatusLabel(t, status)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            <span>
              <UserRound size={15} />
              {t("workspace.assignee")}
            </span>
            <span className="assignee-control">
              <Avatar id={task.assigneeId} size="xs" />
              <Select
                value={task.assigneeId}
                onChange={(event) =>
                  repository.update(task.id, { assigneeId: event.target.value })
                }
              >
                <option value="">{t("workspace.unassigned")}</option>
                {MEMBERS.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </span>
          </label>
          <label>
            <span>
              <Flag size={15} />
              {t("workspace.priority")}
            </span>
            <Select
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
            </Select>
          </label>
          <div className="task-date-property">
            <span>
              <CalendarDays size={15} />
              {t("workspace.startDate")}
            </span>
            <DateInput
              density="compact"
              aria-label={t("workspace.taskStartDate")}
              value={task.startOn}
              max={task.dueOn || undefined}
              onValueChange={(value) =>
                repository.update(task.id, { startOn: value })
              }
            />
          </div>
          <div className="task-date-property">
            <span>
              <CalendarDays size={15} />
              {t("workspace.dueDate")}
            </span>
            <DateInput
              density="compact"
              aria-label={t("workspace.taskDueDate")}
              value={task.dueOn}
              min={task.startOn || undefined}
              onValueChange={(value) =>
                repository.update(task.id, { dueOn: value })
              }
            />
          </div>
          <div className="property-tags">
            <span>
              <TagIcon size={15} />
              {t("workspace.tags")}
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
              {t("workspace.checklist")}{" "}
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
            <Input
              label=""
              value={subtask}
              className="subtask-input"
              onChange={(event) => setSubtask(event.target.value)}
              placeholder={t("workspace.addChecklistItem")}
              aria-label={t("workspace.newChecklistItem")}
            />
            <button type="submit" disabled={saving}>
              {t("workspace.addAction")}
            </button>
          </form>
        </section>
        <section className="drawer-section">
          <div className="section-label">
            <h3>
              <MessageSquare size={15} />
              {t("workspace.activity")}{" "}
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
                    {new Intl.DateTimeFormat(locale, {
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
              aria-label={t("workspace.addComment")}
              placeholder={t("workspace.leaveThought")}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <div>
              <Avatar id="alex" size="xs" />
              <button
                className="button button-primary button-small"
                disabled={saving || !comment.trim()}
              >
                <Send size={13} />
                {t("workspace.comment")}
              </button>
            </div>
          </form>
        </section>
        <div className="drawer-danger">
          {confirmDelete ? (
            <>
              <span>{t("workspace.deleteTaskConfirm")}</span>
              <button
                className="danger-button"
                disabled={saving}
                onClick={() => {
                  repository.update(task.id, { deleted: true });
                  onClose();
                  onNotify(t("workspace.taskDeleted"), () =>
                    repository.restore(task.id),
                  );
                }}
              >
                {t("workspace.deleteTask")}
              </button>
              <button onClick={() => setConfirmDelete(false)}>
                {t("workspace.cancel")}
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} />
              {t("workspace.deleteTask")}
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
  const { t } = useTranslation();
  const MEMBERS = useMembers();
  const repository = useRepository();
  const [title, setTitle] = useState("");
  const PROJECTS = useProjects();
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
        {t("workspace.addTaskTo")}{" "}
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
        <Input
          label={t("workspace.taskName")}
          autoFocus
          placeholder={t("workspace.whatNeedsDone")}
          value={title}
          maxLength={180}
          required
          onChange={(event) => setTitle(event.target.value)}
        />
        <label className="form-label">
          {t("workspace.description")}{" "}
          <span className="muted">{t("workspace.optional")}</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder={t("workspace.contextPlaceholder")}
            rows={3}
          />
        </label>
        <div className="form-grid">
          <label className="form-label">
            {t("workspace.status")}
            <Select
              value={taskStatus}
              onChange={(event) =>
                setTaskStatus(event.target.value as TaskStatus)
              }
            >
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {taskStatusLabel(t, value)}
                </option>
              ))}
            </Select>
          </label>
          <label className="form-label">
            {t("workspace.priority")}
            <Select
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority)}
            >
              <option value="low">{t("workspace.low")}</option>
              <option value="normal">{t("workspace.medium")}</option>
              <option value="high">{t("workspace.high")}</option>
              <option value="urgent">{t("workspace.urgent")}</option>
            </Select>
          </label>
          <label className="form-label">
            {t("workspace.assignee")}
            <Select
              value={assignee}
              onChange={(event) => setAssignee(event.target.value)}
            >
              <option value="">{t("workspace.unassigned")}</option>
              {MEMBERS.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </label>
          <div className="form-label">
            <DateInput
              label={t("workspace.dueDate")}
              value={due}
              onValueChange={(value) => setDue(value)}
            />
          </div>
          <label className="form-label">
            {t("workspace.tags")}
            <Select
              value={tag}
              onChange={(event) => setTag(event.target.value)}
            >
              <option value="">{t("workspace.noTag")}</option>
              {Object.keys(TAG_COLORS).map((value) => (
                <option key={value}>{value}</option>
              ))}
            </Select>
          </label>
        </div>
        <div className="dialog-actions">
          <button className="button" type="button" onClick={onClose}>
            {t("workspace.cancel")}
          </button>
          <button className="button button-primary" disabled={!title.trim()}>
            <Plus size={15} />
            {t("workspace.createTask")}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
