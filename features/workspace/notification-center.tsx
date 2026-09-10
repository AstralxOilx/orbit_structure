"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, Check, CheckCheck, MessageSquare, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  readActivities,
  ACTIVITY_PREFIX,
  type ActivityRecord,
} from "./activity";
import type { Task } from "../tasks/domain/task";
import type { WorkspacePreferences } from "./preferences";

type Notice = {
  id: string;
  title: string;
  detail: string;
  createdAt: number;
  kind: "activity" | "comment" | "deadline";
  target: "task" | "project" | "discussion" | "inbox";
  targetId?: string;
};
const readKey = (workspaceId: string) =>
  `orbit.notifications.read.v1.${workspaceId}`;

export function NotificationCenter({
  workspaceId,
  tasks,
  onOpenInbox,
  onOpenTask,
  onOpenProject,
  onOpenDiscussion,
  notifications,
}: {
  workspaceId: string;
  tasks: readonly Task[];
  onOpenInbox: () => void;
  onOpenTask: (id: string) => void;
  onOpenProject: (id: string) => void;
  onOpenDiscussion: () => void;
  notifications: WorkspacePreferences["notifications"];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [read, setRead] = useState<string[]>([]);
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 60_000);
    const load = () => {
      setActivities(readActivities(workspaceId));
      try {
        setRead(JSON.parse(localStorage.getItem(readKey(workspaceId)) ?? "[]"));
      } catch {
        setRead([]);
      }
    };
    load();
    const onStorage = (event: StorageEvent) => {
      if (
        event.key?.startsWith(ACTIVITY_PREFIX) ||
        event.key === readKey(workspaceId)
      )
        load();
    };
    const onPointer = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearInterval(clock);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [workspaceId]);
  const notices = useMemo<Notice[]>(() => {
    const activityNotices = activities.map((item) => ({
      id: `activity-${item.id}`,
      title: `${item.action[0].toUpperCase()}${item.action.slice(1)} ${item.entity}`,
      detail: item.entityName,
      createdAt: item.createdAt,
      kind: "activity" as const,
      targetId: item.entityId,
      target:
        item.entity === "task"
          ? ("task" as const)
          : item.entity === "project"
            ? ("project" as const)
            : item.entity === "message"
              ? ("discussion" as const)
              : ("inbox" as const),
    }));
    const commentNotices = tasks.flatMap((task) =>
      task.comments.slice(-3).map((comment) => ({
        id: `comment-${comment.id}`,
        title: t("workspace.newTaskComment"),
        detail: task.title,
        createdAt: Date.parse(comment.createdAt),
        kind: "comment" as const,
        targetId: task.id,
        target: "task" as const,
      })),
    );
    const deadlineNotices = tasks
      .filter(
        (task) =>
          task.dueOn &&
          task.status !== "done" &&
          Date.parse(`${task.dueOn}T23:59:59`) - now < 7 * 86_400_000 &&
          Date.parse(`${task.dueOn}T23:59:59`) >= now,
      )
      .map((task) => ({
        id: `deadline-${task.id}-${task.dueOn}`,
        title: t("workspace.taskDueSoon"),
        detail: task.title,
        createdAt: Date.parse(`${task.dueOn}T09:00:00`),
        kind: "deadline" as const,
        targetId: task.id,
        target: "task" as const,
      }));
    return [...activityNotices, ...commentNotices, ...deadlineNotices]
      .filter((item) =>
        item.kind === "activity"
          ? notifications.activity
          : item.kind === "comment"
            ? notifications.comments
            : notifications.deadlines,
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 30);
  }, [activities, tasks, now, notifications, t]);
  const unread = notices.filter((item) => !read.includes(item.id));
  const visible = notices
    .filter((item) => filter === "all" || !read.includes(item.id))
    .slice(0, 8);
  const markRead = (id: string) => {
    const next = [...new Set([...read, id])];
    setRead(next);
    localStorage.setItem(readKey(workspaceId), JSON.stringify(next));
  };
  const markAllRead = () => {
    const next = [...new Set([...read, ...notices.map((item) => item.id)])];
    setRead(next);
    localStorage.setItem(readKey(workspaceId), JSON.stringify(next));
  };
  const openNotice = (item: Notice) => {
    markRead(item.id);
    setOpen(false);
    if (item.target === "task" && item.targetId) onOpenTask(item.targetId);
    else if (item.target === "project" && item.targetId)
      onOpenProject(item.targetId);
    else if (item.target === "discussion") onOpenDiscussion();
    else onOpenInbox();
  };
  return (
    <div className="notification-center" ref={ref}>
      <button
        type="button"
        className="notification-trigger notification-button"
        aria-label={`${t("workspace.notifications")}${unread.length ? `, ${t("workspace.unreadCount", { count: unread.length })}` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell size={18} />
        {unread.length > 0 && (
          <b>{unread.length > 99 ? "99+" : unread.length}</b>
        )}
      </button>
      {open && (
        <section
          className="notification-popover"
          aria-label={t("workspace.notificationCenter")}
        >
          <header>
            <div>
              <strong>{t("workspace.notifications")}</strong>
              <small>
                {unread.length
                  ? t("workspace.unreadCount", { count: unread.length })
                  : t("workspace.allCaughtUp")}
              </small>
            </div>
            <button
              type="button"
              aria-label={t("workspace.closeNotifications")}
              onClick={() => setOpen(false)}
            >
              <X size={15} />
            </button>
          </header>
          <div className="notification-filters" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={filter === "all"}
              onClick={() => setFilter("all")}
            >
              {t("workspace.all")}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={filter === "unread"}
              onClick={() => setFilter("unread")}
            >
              {t("workspace.unread")}{" "}
              {unread.length > 0 && <b>{unread.length}</b>}
            </button>
          </div>
          <div className="notification-list">
            {visible.length ? (
              visible.map((item) => (
                <button
                  type="button"
                  className={`notification-item ${read.includes(item.id) ? "is-read" : ""}`}
                  key={item.id}
                  onClick={() => openNotice(item)}
                >
                  <span
                    className={`notification-icon notification-${item.kind}`}
                  >
                    {item.kind === "comment" ? (
                      <MessageSquare size={14} />
                    ) : item.kind === "deadline" ? (
                      <Bell size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                  </span>
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <time>
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                    }).format(item.createdAt)}
                  </time>
                </button>
              ))
            ) : (
              <div className="notification-empty">
                <CheckCheck size={22} />
                <strong>
                  {filter === "unread"
                    ? t("workspace.noUnreadNotifications")
                    : t("workspace.noNotificationsYet")}
                </strong>
                <span>{t("workspace.updatesAndReminders")}</span>
              </div>
            )}
          </div>
          <footer>
            {unread.length > 0 && (
              <button type="button" onClick={markAllRead}>
                {t("workspace.markRead")}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onOpenInbox();
              }}
            >
              {t("workspace.viewInbox")}
            </button>
          </footer>
        </section>
      )}
    </div>
  );
}
