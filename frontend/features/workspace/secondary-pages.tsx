"use client";

import { Select } from "@/shared/ui/select";

import { useEffect, useRef, useState } from "react";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import {
  ArrowUpRight,
  Check,
  Hash,
  MessageSquare,
  Search,
  Pencil,
  Sparkles,
  Trash2,
  X,
  History,
  Plus,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
} from "lucide-react";
import { DiscussionSkeleton, EmptyState, Input, Tooltip } from "@/shared/ui";
import { useTranslation } from "react-i18next";
import { useMembers } from "@/features/workspace/catalog";
import { useCatalog, useProjects } from "./catalog";
import type { Task } from "../tasks/domain/task";
import {
  createDiscussionMessage,
  currentUser,
  deleteDiscussionMessage,
  listDiscussion,
  listWorkspaceActivityLog,
  updateDiscussionMessage,
  type DiscussionMessageApiRecord,
  type WorkspaceActivityApiRecord,
} from "@/lib/auth-api";
import {
  isRealtimeWorkspaceId,
  subscribeWorkspaceRealtime,
} from "@/lib/workspace-realtime";
import {
  ACTIVITY_PREFIX,
  appendActivity,
  readActivities,
  type ActivityAction,
  type ActivityEntity,
  type ActivityRecord,
  subscribeActivityChanges,
} from "./activity";
import {
  markNotificationsRead,
  useWorkspaceActivityFeed,
} from "./activity-feed";

const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  created: "workspace.activityCreated",
  updated: "workspace.activityUpdated",
  moved: "workspace.activityMoved",
  deleted: "workspace.activityDeleted",
  comment: "workspace.comment",
};

type ActivitySort = "newest" | "oldest";
type ActivityRange = "all" | "1" | "3" | "7" | "30";

function apiActivityToRecord(item: WorkspaceActivityApiRecord): ActivityRecord {
  return {
    id: item.id,
    workspaceId: item.workspaceId,
    actorId: item.actorId,
    action: item.action as ActivityAction,
    entity: item.entityType as ActivityEntity,
    entityId: item.entityId,
    entityName: item.entityName,
    detail: item.detail,
    status: "success",
    createdAt: Date.parse(item.createdAt),
  };
}

export function ActivityPage({ tasks: _tasks }: { tasks: Task[] }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const { workspace } = useCatalog();
  const members = useMembers();
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [query, setQuery] = useState("");
  const [entity, setEntity] = useState<"all" | ActivityEntity>("all");
  const [sort, setSort] = useState<ActivitySort>("newest");
  const [range, setRange] = useState<ActivityRange>("all");
  const [actor, setActor] = useState("all");
  const [filterNow] = useState(() => Date.now());
  const [activityLimit, setActivityLimit] = useState(50);
  const storageKey = ACTIVITY_PREFIX + workspace.id;
  useEffect(() => {
    let remoteActivities: ActivityRecord[] = [];
    const load = () => {
      const remoteKeys = new Set(
        remoteActivities.map((item) => `${item.entity}:${item.entityId}:${item.action}`),
      );
      const localActivities = readActivities(workspace.id).filter(
        (item) => !remoteKeys.has(`${item.entity}:${item.entityId}:${item.action}`),
      );
      setActivities([...remoteActivities, ...localActivities]);
    };
    load();
    window.addEventListener("storage", load);
    const unsubscribeActivityChanges = subscribeActivityChanges(
      workspace.id,
      load,
    );
    let current = true;
    void listWorkspaceActivityLog(workspace.id)
      .then((items) => {
        if (!current) return;
        remoteActivities = items.map(apiActivityToRecord);
        load();
      })
      .catch(() => undefined);
    const unsubscribeRealtime = subscribeWorkspaceRealtime(workspace.id, () => {
      void listWorkspaceActivityLog(workspace.id)
        .then((items) => {
          if (!current) return;
          remoteActivities = items.map(apiActivityToRecord);
          load();
        })
        .catch(() => undefined);
    });
    return () => {
      current = false;
      window.removeEventListener("storage", load);
      unsubscribeActivityChanges();
      unsubscribeRealtime();
    };
  }, [storageKey, workspace.id]);
  const cutoff = range === "all" ? 0 : filterNow - Number(range) * 24 * 60 * 60 * 1000;
  const filtered = activities.filter((item) => {
    const matchesEntity = entity === "all" || item.entity === entity;
    const matchesActor = actor === "all" || item.actorId === actor;
    const haystack = `${item.entityName} ${item.detail ?? ""}`.toLowerCase();
    return (
      matchesEntity &&
      matchesActor &&
      (!cutoff || item.createdAt >= cutoff) &&
      (!query.trim() || haystack.includes(query.trim().toLowerCase()))
    );
  }).sort((a, b) => sort === "newest" ? b.createdAt - a.createdAt : a.createdAt - b.createdAt);
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
        <Select
          value={sort}
          onChange={(event) => setSort(event.target.value as ActivitySort)}
          aria-label={t("workspace.commentSort")}
        >
          <option value="newest">{t("workspace.newestComments")}</option>
          <option value="oldest">{t("workspace.oldestComments")}</option>
        </Select>
        <Select
          value={range}
          onChange={(event) => setRange(event.target.value as ActivityRange)}
          aria-label={t("workspace.commentPeriod")}
        >
          <option value="all">{t("workspace.allTime")}</option>
          <option value="1">{t("workspace.lastDays", { count: 1 })}</option>
          <option value="3">{t("workspace.lastDays", { count: 3 })}</option>
          <option value="7">{t("workspace.lastDays", { count: 7 })}</option>
          <option value="30">{t("workspace.lastDays", { count: 30 })}</option>
        </Select>
        <Select
          value={actor}
          onChange={(event) => setActor(event.target.value)}
          aria-label={t("workspace.activityActor")}
        >
          <option value="all">{t("workspace.allMembers")}</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>{member.name}</option>
          ))}
        </Select>
      </div>
      <div className="activity-list">
        {!filtered.length ? (
          <EmptyState
            title={
              query || entity !== "all" || actor !== "all" || range !== "all"
                ? t("workspace.noMatchingActivity")
                : t("workspace.noActivity")
            }
            description={
              query || entity !== "all" || actor !== "all" || range !== "all"
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
                    setActor("all");
                    setRange("all");
                    setSort("newest");
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
                  className={`activity-result activity-result-${item.status}`}
                  title={t(`workspace.activityStatus.${item.status}`)}
                >
                  {item.status === "success" ? (
                    <CheckCircle2 size={14} aria-hidden="true" />
                  ) : item.status === "failed" ? (
                    <CircleAlert size={14} aria-hidden="true" />
                  ) : (
                    <LoaderCircle size={14} aria-hidden="true" />
                  )}
                  <span>{t(`workspace.activityStatus.${item.status}`)}</span>
                </span>
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
function apiDiscussionToMessage(item: DiscussionMessageApiRecord): DiscussionMessage {
  return {
    id: item.id,
    authorId: item.authorId,
    body: item.body,
    createdAt: Date.parse(item.createdAt),
    editedAt: Date.parse(item.updatedAt) > Date.parse(item.createdAt)
      ? Date.parse(item.updatedAt)
      : undefined,
  };
}
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
  const [loadError, setLoadError] = useState("");
  const [retryVersion, setRetryVersion] = useState(0);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [currentUserId, setCurrentUserId] = useState("alex");
  const storageKey = `orbit.workspace.discussion.v1.${workspace.id}`;
  const remoteWorkspace = isRealtimeWorkspaceId(workspace.id);
  useEffect(() => {
    if (remoteWorkspace) {
      let current = true;
      let latestRequest = 0;
      const loadRemote = (showLoading = false) => {
        const requestId = ++latestRequest;
        if (showLoading) setLoading(true);
        setLoadError("");
        void listDiscussion(workspace.id)
          .then((items) => {
            if (!current || requestId !== latestRequest) return;
            setMessages(items.map(apiDiscussionToMessage));
            setLoadError("");
          })
          .catch((error: unknown) => {
            if (!current || requestId !== latestRequest) return;
            setMessages([]);
            setLoadError(
              error instanceof Error
                ? error.message
                : "Unable to load workspace discussion.",
            );
          })
          .finally(() => {
            if (current && requestId === latestRequest) setLoading(false);
          });
      };
      void currentUser().then((user) => { if (current) setCurrentUserId(user.id); }).catch(() => undefined);
      loadRemote(true);
      const unsubscribeRealtime = subscribeWorkspaceRealtime(workspace.id, (event) => {
        if (event.type === "discussion") loadRemote();
      });
      return () => {
        current = false;
        unsubscribeRealtime();
      };
    }
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
    queueMicrotask(() => {
      setLoadError("");
      setLoading(false);
    });
    const onStorage = (event: StorageEvent) => {
      if (event.key === storageKey) load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [remoteWorkspace, retryVersion, storageKey, workspace.id]);
  if (loading) return <DiscussionSkeleton />;
  if (loadError) {
    return (
      <section
        className="discussion-page discussion-error-state"
        aria-label={t("workspace.discussionLabel")}
      >
        <div className="discussion-error" role="alert">
          <CircleAlert size={24} aria-hidden="true" />
          <strong>{t("workspace.discussionLoadError")}</strong>
          <p>{loadError}</p>
          <button
            type="button"
            className="button button-primary"
            onClick={() => setRetryVersion((version) => version + 1)}
          >
            {t("workspace.discussionRetry")}
          </button>
        </div>
      </section>
    );
  }
  const send = () => {
    const body = draft.trim();
    if (!body) return;
    if (remoteWorkspace) {
      if (saving || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      void createDiscussionMessage(workspace.id, body)
        .then((created) => {
          setMessages((current) => current.some((message) => message.id === created.id)
            ? current
            : [...current, apiDiscussionToMessage(created)]);
          setDraft("");
          onNotify(t("workspace.messageSent"));
        })
        .catch((error: unknown) =>
          onNotify(
            error instanceof Error ? error.message : "Unable to send message.",
          ),
        )
        .finally(() => {
          savingRef.current = false;
          setSaving(false);
        });
      return;
    }
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
    if (remoteWorkspace) {
      if (saving || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      void updateDiscussionMessage(workspace.id, id, body)
        .then((updated) => {
          setMessages((current) => current.map((message) => message.id === id ? apiDiscussionToMessage(updated) : message));
          setEditingId(null);
          setEditDraft("");
          onNotify(t("workspace.messageUpdated"));
        })
        .catch((error: unknown) =>
          onNotify(
            error instanceof Error
              ? error.message
              : "Unable to update message.",
          ),
        )
        .finally(() => {
          savingRef.current = false;
          setSaving(false);
        });
      return;
    }
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
    if (remoteWorkspace) {
      if (saving || savingRef.current) return;
      savingRef.current = true;
      setSaving(true);
      void deleteDiscussionMessage(workspace.id, id)
        .then(() => {
          setMessages((current) => current.filter((message) => message.id !== id));
          setDeletingId(null);
          onNotify(t("workspace.messageDeleted"));
        })
        .catch((error: unknown) =>
          onNotify(
            error instanceof Error
              ? error.message
              : "Unable to delete message.",
          ),
        )
        .finally(() => {
          savingRef.current = false;
          setSaving(false);
        });
      return;
    }
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
      <header className="discussion-channel-header">
        <div className="discussion-channel-mark" aria-hidden="true">
          <Hash size={19} />
        </div>
        <div>
          <h2>{workspace.name}</h2>
          <p>{t("workspace.discussionLabel")}</p>
        </div>
      </header>
      <div className="discussion-thread">
        {!messages.length && (
          <div className="discussion-empty">
            <MessageSquare size={28} />
            <strong>{t("workspace.startConversation")}</strong>
            <p>{t("workspace.discussionDescription")}</p>
          </div>
        )}
        {messages.map((message, index) => {
          const member = MEMBERS.find((item) => item.id === message.authorId);
          const previous = messages[index - 1];
          const showDayDivider =
            !previous ||
            new Date(previous.createdAt).toDateString() !==
              new Date(message.createdAt).toDateString();
          return (
            <div className="discussion-message-group" key={message.id}>
              {showDayDivider && (
                <div className="discussion-day-divider">
                  <span>
                    {new Intl.DateTimeFormat(locale, {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    }).format(message.createdAt)}
                  </span>
                </div>
              )}
              <article
                className={`discussion-message ${message.authorId === currentUserId ? "is-own" : ""}`}
              >
              <Avatar id={message.authorId} size="sm" />
              <div>
                  <div className="discussion-message-meta">
                    <strong>
                      {message.authorId === currentUserId
                        ? (member?.name ?? t("workspace.you"))
                        : (member?.name ?? t("workspace.teammate"))}
                    </strong>
                    {message.authorId === currentUserId && (
                      <span className="discussion-you-badge">
                        {t("workspace.you")}
                      </span>
                    )}
                    <time dateTime={new Date(message.createdAt).toISOString()}>
                    {new Intl.DateTimeFormat(locale, {
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
                {message.authorId === currentUserId && editingId !== message.id && (
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
            </div>
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
        <Avatar id={currentUserId} size="sm" />
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
        <button
          className="button button-primary"
          disabled={!draft.trim() || saving}
        >
          {saving ? "Sending…" : "Send"}
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
          key={item.id}
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
            {/* <small>
              <MessageSquare size={12} />
              ·{" "}
              {item.entity} ·{" "}
              {new Intl.DateTimeFormat(locale, {
                month: "short",
                day: "numeric",
              }).format(item.createdAt)}
            </small> */}
            {/* <small>
              <MessageSquare size={12} />
              {PROJECTS.find((value) => value.id === item.task.projectId)?.name}{" "}
              Â·{" "}
              {new Intl.DateTimeFormat(locale, {
                month: "short",
                day: "numeric",
              }).format(new Date(item.createdAt))}
            </small> */}
            {/* <small>
              <MessageSquare size={12} />
              {item.entity} ·{" "}
              {new Intl.DateTimeFormat(locale, {
                month: "short",
                day: "numeric",
              }).format(item.createdAt)}
            </small> */}
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
  tasks: _tasks,
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
  const MEMBERS = useMembers();
  const { workspace } = useCatalog();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [query, setQuery] = useState("");
  const activities = useWorkspaceActivityFeed(workspace.id);
  const unreadActivities = activities.filter((item) => !item.read);
  const allRead = activities.length > 0 ? unreadActivities.length === 0 : read;
  const markInboxRead = () => {
    markNotificationsRead(
      workspace.id,
      activities.map((item) => `activity-${item.id}`),
    );
    onRead();
  };
  const visible = activities.filter((item) => {
    const text = `${item.entityName} ${item.detail ?? ""}`.toLowerCase();
    return text.includes(query.toLowerCase()) &&
      (filter === "all" || !item.read);
  });
  return (
    <div className="inbox-page">
      <div className="inbox-heading">
        <div>
          <h2>{t("workspace.notifications")}</h2>
          <p>{t("workspace.stayUpdated")}</p>
        </div>
        <span>
          {activities.length}{" "}
          {activities.length === 1
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
            {t("workspace.allActivity")} <b>{activities.length}</b>
          </button>
          <button
            role="tab"
            aria-selected={filter === "unread"}
            onClick={() => setFilter("unread")}
          >
            {t("workspace.unread")} <b>{unreadActivities.length}</b>
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
        {!allRead && (
          <button className="inbox-mark-read" onClick={markInboxRead}>
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
          {allRead ? t("workspace.allCaughtUp") : t("workspace.needsAttention")}
        </span>
      </div>
      {visible.map((item) => (
        <button
          key={item.id}
          className={`inbox-item ${!item.read ? "unread" : ""}`}
          onClick={() => {
            markInboxRead();
            if (item.entity === "task") onOpen(item.entityId);
          }}
        >
          <Avatar id={item.actorId} size="md" />
          <span className="inbox-item-copy">
            <strong>
              {MEMBERS.find((member) => member.id === item.actorId)?.name ??
                (item.actorId === "alex"
                  ? t("workspace.you")
                  : t("workspace.teammate"))}{" "}
              <span>{t(ACTIVITY_ACTION_LABELS[item.action])}</span>{" "}
              {item.entityName}
            </strong>
            <span>{item.detail || item.entityName}</span>
            {/* <small>
              <MessageSquare size={12} />
              {
                PROJECTS.find((value) => value.id === item.task.projectId)?.name
              }{" "}
              ·{" "}
              {new Intl.DateTimeFormat(locale, {
                month: "short",
                day: "numeric",
              }).format(new Date(item.createdAt))}
            </small> */}
            <small>
              <MessageSquare size={12} />
              {item.entity} ·{" "}
              {new Intl.DateTimeFormat(locale, {
                month: "short",
                day: "numeric",
              }).format(item.createdAt)}
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
