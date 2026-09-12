"use client";

import { DateInput } from "@/shared/ui/date-input";

import { Select } from "@/shared/ui/select";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import { StatusIcon } from "@/features/tasks/ui/status-icon";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  Flag,
  History,
  ListChecks,
  MessageSquare,
  Pencil,
  Plus,
  Search,
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
import { useCatalog, useMembers } from "@/features/workspace/catalog";
import { useProjects } from "@/features/workspace/catalog";
import { taskStatusLabel } from "@/shared/i18n/task-copy";
import { Dialog } from "@/shared/ui";
import {
  createTaskActivity,
  currentUser,
  deleteTaskActivity,
  listTaskActivities,
  listTaskActivityLog,
  updateTaskActivity,
  type TaskActivityApiRecord,
} from "@/lib/auth-api";
import { subscribeWorkspaceRealtime } from "@/lib/workspace-realtime";
import {
  STATUSES,
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

function isRemoteTaskId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

type CommentSort = "newest" | "oldest";
type CommentRange = "all" | "1" | "3" | "7" | "30";
const ACTIVITY_LABELS: Record<string, string> = {
  created: "workspace.activityCreated",
  updated: "workspace.activityUpdated",
  moved: "workspace.activityMoved",
  deleted: "workspace.activityDeleted",
};

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
  const { workspace } = useCatalog();
  const repository = useRepository();
  const saving = useSaveState().status === "saving";
  const [comment, setComment] = useState("");
  const [subtask, setSubtask] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [confirmSubtaskId, setConfirmSubtaskId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [apiActivities, setApiActivities] = useState<TaskActivityApiRecord[]>([]);
  const [apiActivityLog, setApiActivityLog] = useState<TaskActivityApiRecord[]>([]);
  const [commentQuery, setCommentQuery] = useState("");
  const [commentSort, setCommentSort] = useState<CommentSort>("newest");
  const [commentRange, setCommentRange] = useState<CommentRange>("all");
  const [commentFilterNow] = useState(() => Date.now());
  const [activitySort, setActivitySort] = useState<CommentSort>("newest");
  const [activityRange, setActivityRange] = useState<CommentRange>("all");
  const [activityActor, setActivityActor] = useState("all");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [commentSaving, setCommentSaving] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("alex");
  const remoteTask = isRemoteTaskId(taskId);
  useEffect(() => {
    if (!remoteTask) {
      setCurrentUserId("alex");
      return;
    }
    let current = true;
    void currentUser()
      .then((user) => {
        if (current) setCurrentUserId(user.id);
      })
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, [remoteTask]);
  useEffect(() => {
    let current = true;
    if (!remoteTask) {
      return () => { current = false; };
    }
    const loadActivities = () => {
      void listTaskActivities(taskId)
        .then((items) => {
          if (current) setApiActivities(items);
        })
        .catch(() => { if (current) setApiActivities([]); });
      void listTaskActivityLog(taskId)
        .then((items) => { if (current) setApiActivityLog(items); })
        .catch(() => { if (current) setApiActivityLog([]); });
    };
    loadActivities();
    const unsubscribeRealtime = subscribeWorkspaceRealtime(workspace.id, (event) => {
      if (
        (event.type === "task_activity" || event.type === "task") &&
        event.entityId === taskId
      ) {
        loadActivities();
      }
    });
    return () => {
      current = false;
      unsubscribeRealtime();
    };
  }, [remoteTask, taskId, workspace.id]);
  const apiComments = apiActivities.filter((item) => item.action === "comment");
  const activityLog = apiActivityLog.filter((item) => item.action !== "comment");
  const activityCutoff = activityRange === "all"
    ? 0
    : commentFilterNow - Number(activityRange) * 24 * 60 * 60 * 1000;
  const filteredActivityLog = [...activityLog]
    .filter((item) => activityActor === "all" || item.actorId === activityActor)
    .filter((item) => !activityCutoff || Date.parse(item.createdAt) >= activityCutoff)
    .sort((a, b) => {
      const difference = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      return activitySort === "newest" ? difference : -difference;
    });
  const normalizedCommentQuery = commentQuery.trim().toLowerCase();
  const cutoff = commentRange === "all"
    ? 0
    : commentFilterNow - Number(commentRange) * 24 * 60 * 60 * 1000;
  const sortComments = <T extends { createdAt: string }>(items: T[]) =>
    [...items].sort((a, b) => {
      const difference = Date.parse(b.createdAt) - Date.parse(a.createdAt);
      return commentSort === "newest" ? difference : -difference;
    });
  const filteredApiComments = sortComments(apiComments.filter((item) =>
    (!normalizedCommentQuery || `${item.actorName} ${item.detail}`.toLowerCase().includes(normalizedCommentQuery)) &&
    (!cutoff || Date.parse(item.createdAt) >= cutoff),
  ));
  const filteredLocalComments = sortComments((task?.comments ?? []).filter((item) => {
    const authorName = MEMBERS.find((member) => member.id === item.authorId)?.name ?? "Team member";
    return (!normalizedCommentQuery || `${authorName} ${item.body}`.toLowerCase().includes(normalizedCommentQuery)) &&
      (!cutoff || Date.parse(item.createdAt) >= cutoff);
  }));
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
          onTextChange={(description) =>
            repository.update(task.id, { description })
          }
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
          {task.subtasks.map((item) =>
            editingSubtaskId === item.id ? (
              <form
                className="subtask-row subtask-edit-row"
                key={item.id}
                onSubmit={(event) => {
                  event.preventDefault();
                  const title = editingSubtaskTitle.trim();
                  if (!title) return;
                  repository.update(task.id, {
                    subtasks: task.subtasks.map((value) =>
                      value.id === item.id ? { ...value, title } : value,
                    ),
                  });
                  setEditingSubtaskId(null);
                }}
              >
                <Input
                  label=""
                  value={editingSubtaskTitle}
                  autoFocus
                  aria-label={t("workspace.checklist")}
                  onChange={(event) => setEditingSubtaskTitle(event.target.value)}
                />
                <button type="submit" disabled={saving || !editingSubtaskTitle.trim()}>
                  {t("workspace.save")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingSubtaskId(null)}
                >
                  {t("workspace.cancel")}
                </button>
              </form>
            ) : (
              <div
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
                {confirmSubtaskId === item.id ? (
                  <>
                    <span className="subtask-delete-confirm">
                      {t("workspace.deleteChecklistConfirm")}
                    </span>
                    <button
                      type="button"
                      className="danger-button"
                      disabled={saving}
                      onClick={() => {
                        repository.update(task.id, {
                          subtasks: task.subtasks.filter(
                            (value) => value.id !== item.id,
                          ),
                        });
                        setConfirmSubtaskId(null);
                      }}
                    >
                      {t("workspace.deleteAction")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmSubtaskId(null)}
                    >
                      {t("workspace.cancel")}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="subtask-action"
                      aria-label={`${t("workspace.edit")} ${item.title}`}
                      onClick={() => {
                        setEditingSubtaskId(item.id);
                        setEditingSubtaskTitle(item.title);
                      }}
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="subtask-action subtask-delete-action"
                      aria-label={`${t("workspace.deleteAction")} ${item.title}`}
                      onClick={() => setConfirmSubtaskId(item.id)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ),
          )}
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
              {t("workspace.taskComments")}{" "}
              <span className="small-count">{remoteTask ? apiComments.length : task.comments.length}</span>
            </h3>
          </div>
          <div className="comment-filter">
            <Input
              label=""
              icon={<Search size={14} aria-hidden="true" />}
              value={commentQuery}
              onChange={(event) => setCommentQuery(event.target.value)}
              placeholder={t("search.activity")}
              aria-label={t("workspace.taskComments")}
            />
            <Select
              value={commentSort}
              onChange={(event) => setCommentSort(event.target.value as CommentSort)}
              aria-label={t("workspace.commentSort")}
            >
              <option value="newest">{t("workspace.newestComments")}</option>
              <option value="oldest">{t("workspace.oldestComments")}</option>
            </Select>
            <Select
              value={commentRange}
              onChange={(event) => setCommentRange(event.target.value as CommentRange)}
              aria-label={t("workspace.commentPeriod")}
            >
              <option value="all">{t("workspace.allTime")}</option>
              <option value="1">{t("workspace.lastDays", { count: 1 })}</option>
              <option value="3">{t("workspace.lastDays", { count: 3 })}</option>
              <option value="7">{t("workspace.lastDays", { count: 7 })}</option>
              <option value="30">{t("workspace.lastDays", { count: 30 })}</option>
            </Select>
          </div>
          <div className="comment-list">
          {filteredApiComments.map((item) => (
            <div className="activity-comment" key={item.id}>
              <Avatar id={item.actorId} size="sm" />
              <div>
                {editingCommentId === item.id ? (
                  <form className="comment-edit-form" onSubmit={(event) => {
                    event.preventDefault();
                    const body = editingCommentBody.trim();
                    if (!body) return;
                    setCommentSaving(true);
                    void updateTaskActivity(task.id, item.id, { detail: body })
                      .then((updated) => {
                        setApiActivities((current) => current.map((value) => value.id === item.id ? updated : value));
                        setEditingCommentId(null);
                        setEditingCommentBody("");
                        onNotify(t("workspace.messageUpdated"));
                      })
                      .catch((error: unknown) => onNotify(error instanceof Error ? error.message : "Unable to update comment."))
                      .finally(() => setCommentSaving(false));
                  }}>
                    <Input label="" value={editingCommentBody} autoFocus onChange={(event) => setEditingCommentBody(event.target.value)} />
                    <button type="submit" className="button button-small" disabled={commentSaving || !editingCommentBody.trim()}>{t("workspace.save")}</button>
                    <button type="button" className="button button-small" disabled={commentSaving} onClick={() => { setEditingCommentId(null); setEditingCommentBody(""); }}>{t("workspace.cancel")}</button>
                  </form>
                ) : (
                  <>
                    <p>
                      <strong>{item.actorName || MEMBERS.find((member) => member.id === item.actorId)?.name || t("workspace.teammateLabel")}</strong>
                      <time>{new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(item.createdAt))}</time>
                    </p>
                    <span>{item.detail}</span>
                    {item.actorId === currentUserId && (
                      <div className="comment-actions">
                        {deletingCommentId === item.id ? (
                          <>
                            <span>{t("workspace.deleteActivityConfirm")}</span>
                            <button type="button" disabled={commentSaving} onClick={() => setDeletingCommentId(null)}>{t("workspace.cancel")}</button>
                            <button type="button" disabled={commentSaving} onClick={() => {
                              setCommentSaving(true);
                              void deleteTaskActivity(task.id, item.id)
                                .then(() => {
                                  setApiActivities((current) => current.filter((value) => value.id !== item.id));
                                  setDeletingCommentId(null);
                                  onNotify(t("workspace.messageDeleted"));
                                })
                                .catch((error: unknown) => onNotify(error instanceof Error ? error.message : "Unable to delete comment."))
                                .finally(() => setCommentSaving(false));
                            }}>{t("workspace.deleteAction")}</button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => { setEditingCommentId(item.id); setEditingCommentBody(item.detail); }}>{t("workspace.edit")}</button>
                            <button type="button" onClick={() => setDeletingCommentId(item.id)}>{t("workspace.deleteAction")}</button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
          {!remoteTask && filteredLocalComments.map((item) => (
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
                {editingCommentId === item.id ? (
                  <form className="comment-edit-form" onSubmit={(event) => {
                    event.preventDefault();
                    const body = editingCommentBody.trim();
                    if (!body) return;
                    repository.update(task.id, {
                      comments: task.comments.map((comment) => comment.id === item.id ? { ...comment, body } : comment),
                    });
                    setEditingCommentId(null);
                    setEditingCommentBody("");
                    onNotify(t("workspace.messageUpdated"));
                  }}>
                    <Input label="" value={editingCommentBody} autoFocus onChange={(event) => setEditingCommentBody(event.target.value)} />
                    <button type="submit" className="button button-small" disabled={!editingCommentBody.trim()}>{t("workspace.save")}</button>
                    <button type="button" className="button button-small" onClick={() => { setEditingCommentId(null); setEditingCommentBody(""); }}>{t("workspace.cancel")}</button>
                  </form>
                ) : (
                  <>
                    <span>{item.body}</span>
                    {item.authorId === currentUserId && (
                      <div className="comment-actions">
                        {deletingCommentId === item.id ? (
                          <>
                            <span>{t("workspace.deleteActivityConfirm")}</span>
                            <button type="button" onClick={() => setDeletingCommentId(null)}>{t("workspace.cancel")}</button>
                            <button type="button" onClick={() => {
                              repository.update(task.id, {
                                comments: task.comments.filter((comment) => comment.id !== item.id),
                              });
                              setDeletingCommentId(null);
                              onNotify(t("workspace.messageDeleted"));
                            }}>{t("workspace.deleteAction")}</button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => { setEditingCommentId(item.id); setEditingCommentBody(item.body); }}>{t("workspace.edit")}</button>
                            <button type="button" onClick={() => setDeletingCommentId(item.id)}>{t("workspace.deleteAction")}</button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
           </div>
          ))}
          </div>
          <form
            className="comment-form"
            onSubmit={(event) => {
              event.preventDefault();
              if (!comment.trim()) return;
              if (remoteTask) {
                void createTaskActivity(task.id, { action: "comment", detail: comment.trim() })
                  .then((created) => { setApiActivities((current) => [created, ...current]); setComment(""); })
                  .catch(() => undefined);
              } else {
                repository.update(task.id, {
                  comments: [...task.comments, { id: crypto.randomUUID(), authorId: "alex", body: comment.trim(), createdAt: new Date().toISOString() }],
                });
                setComment("");
              }
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
        {remoteTask && (
          <section className="drawer-section activity-log-section">
            <div className="section-label">
              <h3>
                <History size={15} />
                {t("workspace.activity")} {" "}
                <span className="small-count">{activityLog.length}</span>
              </h3>
            </div>
            <div className="activity-filter">
              <Select
                value={activitySort}
                onChange={(event) => setActivitySort(event.target.value as CommentSort)}
                aria-label={t("workspace.commentSort")}
              >
                <option value="newest">{t("workspace.newestComments")}</option>
                <option value="oldest">{t("workspace.oldestComments")}</option>
              </Select>
              <Select
                value={activityRange}
                onChange={(event) => setActivityRange(event.target.value as CommentRange)}
                aria-label={t("workspace.commentPeriod")}
              >
                <option value="all">{t("workspace.allTime")}</option>
                <option value="1">{t("workspace.lastDays", { count: 1 })}</option>
                <option value="3">{t("workspace.lastDays", { count: 3 })}</option>
                <option value="7">{t("workspace.lastDays", { count: 7 })}</option>
                <option value="30">{t("workspace.lastDays", { count: 30 })}</option>
              </Select>
              <Select
                value={activityActor}
                onChange={(event) => setActivityActor(event.target.value)}
                aria-label={t("workspace.activityActor")}
              >
                <option value="all">{t("workspace.allMembers")}</option>
                {MEMBERS.map((member) => (
                  <option key={member.id} value={member.id}>{member.name}</option>
                ))}
              </Select>
            </div>
            <div className="activity-log-list">
              {filteredActivityLog.map((item) => (
                <div className="activity-log-item" key={item.id}>
                  <Avatar id={item.actorId} size="xs" />
                  <div>
                    <p>
                      <strong>{item.actorName || t("workspace.teammateLabel")}</strong>{" "}
                      {t(ACTIVITY_LABELS[item.action] ?? item.action)}
                    </p>
                    <span>{item.detail}</span>
                    <time>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}</time>
                  </div>
                </div>
              ))}
              {!filteredActivityLog.length && <p className="activity-log-empty">{t("workspace.noActivity")}</p>}
            </div>
          </section>
        )}
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
  const [assignee, setAssignee] = useState("");
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
