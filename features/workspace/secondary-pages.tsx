"use client";

import { Select } from "@/shared/ui/select";

import { useEffect, useState } from "react";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import {
  ArrowUpRight,
  Check,
  MessageSquare,
  Search,
  Pencil,
  Sparkles,
  Trash2,
  X,
  History,
  Plus,
} from "lucide-react";
import { DiscussionSkeleton, EmptyState, Input, Tooltip } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { useMembers } from "@/features/workspace/catalog";
import { useCatalog, useProjects } from "./catalog";
import type { Task } from "../tasks/domain/task";
import {
  ACTIVITY_PREFIX,
  appendActivity,
  readActivities,
  type ActivityAction,
  type ActivityEntity,
  type ActivityRecord,
} from "./activity";

const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  created: "workspace.activityCreated",
  updated: "workspace.activityUpdated",
  moved: "workspace.activityMoved",
  deleted: "workspace.activityDeleted",
};

export function ActivityPage() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const { workspace } = useCatalog();
  const members = useMembers();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState<"all" | ActivityEntity>("all");
  const [activityLimit, setActivityLimit] = useState(50);
  const storageKey = ACTIVITY_PREFIX + workspace.id;
  useEffect(() => {
    const load = () => setActivities(readActivities(workspace.id));
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, [storageKey, workspace.id]);
  const filtered = activities.filter((item) => {
    const matchesEntity = entity === "all" || item.entity === entity;
    const haystack = `${item.entityName} ${item.detail ?? ""}`.toLowerCase();
    return (
      matchesEntity &&
      (!query.trim() || haystack.includes(query.trim().toLowerCase()))
    );
  });
  const visibleActivities = filtered.slice(0, activityLimit);
  const icon = (item: ActivityRecord) =>
    item.action === "created" ? (
      <Plus size={15} />
    ) : item.action === "moved" ? (
      <History size={15} />
    ) : item.action === "deleted" ? (
      <Trash2 size={15} />
    ) : (
      <Pencil size={15} />
    );
  return (
    <section
      className="activity-page"
      aria-label={t("workspace.workspaceActivityLog")}
    >
      <div className="activity-heading">
        <div>
          <h2>{t("workspace.recentActivity")}</h2>
          <p>{t("workspace.activityDescription")}</p>
        </div>
        <span>
          {filtered.length}{" "}
          {filtered.length === 1 ? t("workspace.event") : t("workspace.events")}
        </span>
      </div>
      <div className="activity-toolbar">
        <div className="activity-search">
          <Input
            label=""
            className="activity-search-input"
            icon={<Search size={15} aria-hidden="true" />}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("search.activity")}
          />
        </div>
        <Select
          value={entity}
          onChange={(event) => setEntity(event.target.value as typeof entity)}
          aria-label={t("workspace.filterActivityType")}
        >
          <option value="all">{t("workspace.allActivity")}</option>
          <option value="task">{t("workspace.tasks")}</option>
          <option value="project">{t("workspace.projects")}</option>
          <option value="message">{t("workspace.discussion")}</option>
          <option value="member">{t("workspace.members")}</option>
          <option value="workspace">
            {t("workspace.breadcrumbWorkspace")}
          </option>
        </Select>
      </div>
      <div className="activity-list">
        {!filtered.length ? (
          <EmptyState
            title={
              query || entity !== "all"
                ? t("workspace.noMatchingActivity")
                : t("workspace.noActivity")
            }
            description={
              query || entity !== "all"
                ? t("workspace.clearActivityFilter")
                : t("workspace.changesAppearHere")
            }
            action={
              query || entity !== "all" ? (
                <button
                  className="button"
                  onClick={() => {
                    setQuery("");
                    setEntity("all");
                  }}
                >
                  {t("workspace.clearFilters")}
                </button>
              ) : undefined
            }
          />
        ) : (
          visibleActivities.map((item) => {
            const member = members.find((person) => person.id === item.actorId);
            return (
              <article className="activity-item" key={item.id}>
                <Avatar id={item.actorId} size="sm" />
                <div className="activity-item-copy">
                  <p>
                    <strong>
                      {member?.name ??
                        (item.actorId === "alex"
                          ? t("workspace.alexMorgan")
                          : t("workspace.teammateLabel"))}
                    </strong>{" "}
                    {t(ACTIVITY_ACTION_LABELS[item.action])}{" "}
                    <b>{item.entityName}</b>
                  </p>
                  {item.detail && <small>{item.detail}</small>}
                </div>
                <time dateTime={new Date(item.createdAt).toISOString()}>
                  {new Intl.DateTimeFormat(locale, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(item.createdAt)}
                </time>
                <span
                  className={`activity-action activity-${item.action}`}
                  aria-hidden="true"
                >
                  {icon(item)}
                </span>
              </article>
            );
          })
        )}
      </div>
      {visibleActivities.length < filtered.length && (
        <button
          className="activity-load-more"
          type="button"
          onClick={() => setActivityLimit((limit) => limit + 50)}
        >
          Load more activity
        </button>
      )}
    </section>
  );
}

type DiscussionMessage = {
  id: string;
  authorId: string;
  body: string;
  createdAt: number;
  editedAt?: number;
};
const MOCK_DISCUSSION_MESSAGES: DiscussionMessage[] = [
  {
    id: "discussion-mock-1",
    authorId: "alex",
    body: "The new workspace direction is coming together nicely. I added the latest notes to the Website redesign project.",
    createdAt: Date.parse("2026-09-10T09:15:00+07:00"),
  },
  {
    id: "discussion-mock-2",
    authorId: "sarah",
    body: "I’ll review the homepage concepts this afternoon. The calmer layout feels like the right direction.",
    createdAt: Date.parse("2026-09-10T10:05:00+07:00"),
  },
  {
    id: "discussion-mock-3",
    authorId: "james",
    body: "The component library is ready for a first pass. Please leave any feedback here so we keep decisions in one place.",
    createdAt: Date.parse("2026-09-10T11:20:00+07:00"),
  },
];

export function DiscussionPage({
  onNotify,
}: {
  onNotify: (message: string, action?: () => void) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const { workspace } = useCatalog();
  const MEMBERS = useMembers();
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const storageKey = `orbit.workspace.discussion.v1.${workspace.id}`;
  useEffect(() => {
    const load = () => {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const saved = JSON.parse(stored);
          if (Array.isArray(saved)) setMessages(saved);
        } else {
          const initial =
            workspace.id === "studio" ? MOCK_DISCUSSION_MESSAGES : [];
          setMessages(initial);
          if (initial.length)
            localStorage.setItem(storageKey, JSON.stringify(initial));
        }
      } catch {
        setMessages([]);
      }
    };
    load();
    queueMicrotask(() => setLoading(false));
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [storageKey]);
  if (loading) return <DiscussionSkeleton />;
  const send = () => {
    const body = draft.trim();
    if (!body) return;
    const next = [
      ...messages,
      {
        id: crypto.randomUUID(),
        authorId: "alex",
        body,
        createdAt: Date.now(),
      },
    ];
    setMessages(next);
    setDraft("");
    localStorage.setItem(storageKey, JSON.stringify(next));
    appendActivity(workspace.id, {
      actorId: "alex",
      action: "created",
      entity: "message",
      entityId: next[next.length - 1].id,
      entityName: body.slice(0, 80),
      detail: "Workspace discussion",
    });
    onNotify(t("workspace.messageSent"));
  };
  const saveEdit = (id: string) => {
    const body = editDraft.trim();
    if (!body) return;
    const next = messages.map((message) =>
      message.id === id ? { ...message, body, editedAt: Date.now() } : message,
    );
    setMessages(next);
    setEditingId(null);
    setEditDraft("");
    localStorage.setItem(storageKey, JSON.stringify(next));
    appendActivity(workspace.id, {
      actorId: "alex",
      action: "updated",
      entity: "message",
      entityId: id,
      entityName: body.slice(0, 80),
      detail: "Workspace discussion",
    });
    onNotify(t("workspace.messageUpdated"));
  };
  const deleteMessage = (id: string) => {
    const removed = messages.find((message) => message.id === id);
    if (!removed) return;
    const next = messages.filter((message) => message.id !== id);
    setMessages(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
    appendActivity(workspace.id, {
      actorId: "alex",
      action: "deleted",
      entity: "message",
      entityId: id,
      entityName: "Discussion message",
      detail: "Workspace discussion",
    });
    setDeletingId(null);
    onNotify(t("workspace.messageDeleted"), () => {
      const restored = [...next, removed].sort(
        (a, b) => a.createdAt - b.createdAt,
      );
      setMessages(restored);
      localStorage.setItem(storageKey, JSON.stringify(restored));
      onNotify(t("workspace.messageRestored"));
    });
  };
  return (
    <section
      className="discussion-page"
      aria-label={t("workspace.discussionLabel")}
    >
      <div className="discussion-thread">
        {!messages.length && (
          <div className="discussion-empty">
            <MessageSquare size={28} />
            <strong>{t("workspace.startConversation")}</strong>
            <p>{t("workspace.discussionDescription")}</p>
          </div>
        )}
        {messages.map((message) => {
          const member = MEMBERS.find((item) => item.id === message.authorId);
          return (
            <article
              className={`discussion-message ${message.authorId === "alex" ? "is-own" : ""}`}
              key={message.id}
            >
              <Avatar id={message.authorId} size="sm" />
              <div>
                <div className="discussion-message-meta">
                  <strong>
                    {message.authorId === "alex"
                      ? t("workspace.you")
                      : (member?.name ?? t("workspace.teammate"))}
                  </strong>
                  <time dateTime={new Date(message.createdAt).toISOString()}>
                    {new Intl.DateTimeFormat(locale, {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(message.createdAt)}
                  </time>
                </div>
                {editingId === message.id ? (
                  <div className="discussion-edit-box">
                    <textarea
                      aria-label={t("workspace.editMessage")}
                      value={editDraft}
                      maxLength={2000}
                      autoFocus
                      onChange={(event) => setEditDraft(event.target.value)}
                    />
                    <div>
                      <button type="button" onClick={() => setEditingId(null)}>
                        <X size={14} /> {t("workspace.cancel")}
                      </button>
                      <button
                        type="button"
                        className="discussion-save-edit"
                        disabled={!editDraft.trim()}
                        onClick={() => saveEdit(message.id)}
                      >
                        <Check size={14} /> {t("workspace.save")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p>{message.body}</p>
                    {message.editedAt && (
                      <small className="discussion-edited">
                        {t("workspace.edited")}
                      </small>
                    )}
                  </>
                )}
                {message.authorId === "alex" && editingId !== message.id && (
                  <div className="discussion-message-actions">
                    {deletingId === message.id ? (
                      <div className="discussion-delete-confirm" role="alert">
                        <span>{t("workspace.deleteMessageConfirm")}</span>
                        <button
                          type="button"
                          onClick={() => setDeletingId(null)}
                        >
                          {t("workspace.cancel")}
                        </button>
                        <button
                          type="button"
                          className="discussion-delete-confirm-button"
                          onClick={() => deleteMessage(message.id)}
                        >
                          <Trash2 size={13} /> {t("workspace.delete")}
                        </button>
                      </div>
                    ) : (
                      <>
                        <Tooltip
                          content={t("workspace.editMessage")}
                          side="top"
                        >
                          <button
                            type="button"
                            aria-label={t("workspace.editMessage")}
                            onClick={() => {
                              setEditingId(message.id);
                              setEditDraft(message.body);
                            }}
                          >
                            <Pencil size={13} />
                          </button>
                        </Tooltip>
                        <Tooltip
                          content={t("workspace.deleteMessage")}
                          side="top"
                        >
                          <button
                            type="button"
                            aria-label={t("workspace.deleteMessage")}
                            onClick={() => setDeletingId(message.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        </Tooltip>
                      </>
                    )}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>
      <form
        className="discussion-composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <Avatar id="alex" size="sm" />
        <textarea
          aria-label={t("workspace.writeMessage")}
          value={draft}
          rows={1}
          maxLength={2000}
          placeholder={t("workspace.shareUpdate")}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send();
            }
          }}
        />
        <button className="button button-primary" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}

export function TeamPage({
  tasks,
  onMember,
}: {
  tasks: readonly Task[];
  onMember: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const MEMBERS = useMembers();
  const [teamFilter, setTeamFilter] = useState("All teams");
  const visibleMembers = MEMBERS.filter(
    (member) => teamFilter === "All teams" || member.team === teamFilter,
  );
  return (
    <div className="team-page">
      <div className="team-toolbar">
        <span>{t("workspace.teamSummary", { count: MEMBERS.length })}</span>
        <Select
          aria-label={t("workspace.filterTeamMembers")}
          value={teamFilter}
          onChange={(event) => setTeamFilter(event.target.value)}
        >
          {[
            t("workspace.allTeams"),
            ...new Set(MEMBERS.map((member) => member.team)),
          ].map((team) => (
            <option key={team}>{team}</option>
          ))}
        </Select>
      </div>
      <div className="member-grid">
        {!visibleMembers.length && (
          <EmptyState
            title={
              MEMBERS.length
                ? t("workspace.noMembersMatch")
                : t("workspace.noMembersYet")
            }
            description={
              MEMBERS.length
                ? t("workspace.tryAnotherTeam")
                : t("workspace.inviteTeammates")
            }
            action={
              MEMBERS.length ? (
                <button
                  className="button"
                  onClick={() => setTeamFilter("All teams")}
                >
                  Show all members
                </button>
              ) : undefined
            }
          />
        )}
        {visibleMembers.map((member) => {
          const memberTasks = tasks.filter(
            (task) => task.assigneeId === member.id,
          );
          const finished = memberTasks.filter(
            (task) => task.status === "done",
          ).length;
          return (
            <button
              className="member-card"
              key={member.id}
              onClick={() => onMember(member.id)}
            >
              <span className="member-card-top">
                <span className={`team-chip tag-${member.color}`}>
                  {member.team}
                </span>
                <ArrowUpRight size={16} />
              </span>
              <Avatar id={member.id} size="lg" />
              <h3>
                {member.name}
                {member.id === "alex" && <span>{t("workspace.you")}</span>}
              </h3>
              <p>{member.role}</p>
              <div className="member-card-stats">
                <span>
                  <strong>{memberTasks.length - finished}</strong>
                  {t("workspace.activeTasks")}
                </span>
                <span>
                  <strong>{finished}</strong>
                  {t("workspace.completedTasks")}
                </span>
              </div>
              <span className="member-email">{member.email}</span>
            </button>
          );
        })}
      </div>
      <div className="team-bottom-note">
        <Sparkles size={21} />
        <div>
          <strong>{t("workspace.differentStrengths")}</strong>
          <p>{t("workspace.teamNote")}</p>
        </div>
      </div>
    </div>
  );
}

function InboxPageLegacy({
  tasks,
  read,
  onOpen,
}: {
  tasks: readonly Task[];
  read: boolean;
  onOpen: (id: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const PROJECTS = useProjects();
  const MEMBERS = useMembers();
  const comments = tasks
    .flatMap((task) => task.comments.map((comment) => ({ ...comment, task })))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="inbox-page">
      <div className="inbox-section-heading">
        <span>{t("workspace.recentActivity")}</span>
        <span>
          {read ? "You’re all caught up" : `${comments.length} updates`}
        </span>
      </div>
      {comments.map((item) => (
        <button
          key={`${item.task.id}-${item.id}`}
          className={`inbox-item ${!read ? "unread" : ""}`}
          onClick={() => onOpen(item.task.id)}
        >
          <Avatar id={item.authorId} size="md" />
          <span className="inbox-item-copy">
            <strong>
              {MEMBERS.find((member) => member.id === item.authorId)?.name}{" "}
              <span>{t("workspace.commentedOn")}</span> {item.task.title}
            </strong>
            <span>{item.body}</span>
            <small>
              <MessageSquare size={12} />
              {
                PROJECTS.find((value) => value.id === item.task.projectId)?.name
              }{" "}
              ·{" "}
              {new Intl.DateTimeFormat(locale, {
                month: "short",
                day: "numeric",
              }).format(new Date(item.createdAt))}
            </small>
          </span>
          {!read && <i />}
        </button>
      ))}
      {!comments.length && (
        <EmptyState
          title={t("workspace.quietMoment")}
          description={t("workspace.commentsAndConversations")}
        />
      )}
    </div>
  );
}

export function InboxPage({
  tasks,
  read,
  onOpen,
  onRead,
}: {
  tasks: readonly Task[];
  read: boolean;
  onOpen: (id: string) => void;
  onRead: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const PROJECTS = useProjects();
  const MEMBERS = useMembers();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [query, setQuery] = useState("");
  const comments = tasks
    .flatMap((task) => task.comments.map((comment) => ({ ...comment, task })))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const visible = comments.filter((item) => {
    const text = `${item.body} ${item.task.title}`.toLowerCase();
    return text.includes(query.toLowerCase()) && (filter === "all" || !read);
  });
  return (
    <div className="inbox-page">
      <div className="inbox-heading">
        <div>
          <h2>{t("workspace.notifications")}</h2>
          <p>{t("workspace.stayUpdated")}</p>
        </div>
        <span>
          {comments.length}{" "}
          {comments.length === 1
            ? t("workspace.notification")
            : t("workspace.notificationsPlural")}
        </span>
      </div>
      <div className="inbox-toolbar">
        <div
          className="inbox-filter-tabs"
          role="tablist"
          aria-label={t("workspace.notifications")}
        >
          <button
            role="tab"
            aria-selected={filter === "all"}
            onClick={() => setFilter("all")}
          >
            {t("workspace.allActivity")} <b>{comments.length}</b>
          </button>
          <button
            role="tab"
            aria-selected={filter === "unread"}
            onClick={() => setFilter("unread")}
          >
            {t("workspace.unread")} <b>{read ? 0 : comments.length}</b>
          </button>
        </div>
        <div className="inbox-search">
          <Input
            label=""
            aria-label={t("search.notifications")}
            className="inbox-search-input"
            icon={<Search size={14} aria-hidden="true" />}
            placeholder={t("search.notifications")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        {!read && (
          <button className="inbox-mark-read" onClick={onRead}>
            {t("workspace.markRead")}
          </button>
        )}
      </div>
      <div className="inbox-section-heading">
        <span>
          {visible.length}{" "}
          {visible.length === 1
            ? t("workspace.update")
            : t("workspace.updates")}
        </span>
        <span>
          {read ? t("workspace.allCaughtUp") : t("workspace.needsAttention")}
        </span>
      </div>
      {visible.map((item) => (
        <button
          key={`${item.task.id}-${item.id}`}
          className={`inbox-item ${!read ? "unread" : ""}`}
          onClick={() => {
            onRead();
            onOpen(item.task.id);
          }}
        >
          <Avatar id={item.authorId} size="md" />
          <span className="inbox-item-copy">
            <strong>
              {MEMBERS.find((member) => member.id === item.authorId)?.name}{" "}
              <span>{t("workspace.commentedOn")}</span> {item.task.title}
            </strong>
            <span>{item.body}</span>
            <small>
              <MessageSquare size={12} />
              {
                PROJECTS.find((value) => value.id === item.task.projectId)?.name
              }{" "}
              ·{" "}
              {new Intl.DateTimeFormat(locale, {
                month: "short",
                day: "numeric",
              }).format(new Date(item.createdAt))}
            </small>
          </span>
          {!read && <i />}
        </button>
      ))}
      {!visible.length && (
        <EmptyState
          title={
            query || filter === "unread"
              ? t("workspace.noMatchingActivity")
              : t("workspace.allCaughtUp")
          }
          description={
            query || filter === "unread"
              ? t("workspace.tryAnotherSearch")
              : t("workspace.newActivityHere")
          }
        />
      )}
    </div>
  );
}
