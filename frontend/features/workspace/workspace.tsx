"use client";

import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  Columns3,
  FolderKanban,
  Inbox,
  History,
  List,
  MessageCircle,
  Menu,
  PanelLeftClose,
  Plus,
  Search,
  Settings,
  Share2,
  Star,
  UsersRound,
  X,
} from "lucide-react";
import {
  EmptyState,
  IconButton,
  Toast,
  Tooltip,
  ViewSkeleton,
  CatalogSkeleton,
  LanguageSwitcher,
  NewUserTooltip,
} from "@/shared/ui";
import {
  DEFAULT_FILTERS,
  type Priority,
  type TaskFilters,
  type TaskStatus,
  type ViewMode,
  type WorkspacePage,
} from "@/features/tasks/domain/task";
import { useFilteredTasks } from "@/features/tasks/model/use-filtered-tasks";
import { useMembers } from "@/features/workspace/catalog";
import { CatalogProvider, useCatalog } from "./catalog";
import { CatalogDialog } from "./catalog-dialog";
import { useSaveState, useTasks, WorkspaceProvider } from "./provider";
import { useWorkspaceUI } from "./ui-store";
import { PresenceLayer } from "@/features/collaboration/presence-layer";
import { Sidebar, type WorkspaceModal } from "./sidebar";
import { WorkspaceModals } from "./workspace-modals";
import {
  ActivityPage,
  DiscussionPage,
  TeamPage,
  InboxPage,
} from "./secondary-pages";
import { TaskToolbar } from "@/features/tasks/ui/task-toolbar";
import { ProjectIcon } from "./ui/project-icon";
import { NotificationCenter } from "./notification-center";
import {
  markNotificationsRead,
  useWorkspaceActivityFeed,
} from "./activity-feed";
import { OnboardingDialog } from "./onboarding";
import { rememberRecent } from "./recent";
import {
  DEFAULT_PREFERENCES,
  readPreferences,
  writePreferences,
  type WorkspacePreferences,
} from "./preferences";

const BoardView = dynamic(() => import("@/features/tasks/ui/board-view"), {
  loading: ViewSkeleton,
});
const ListView = dynamic(() => import("@/features/tasks/ui/list-view"), {
  loading: ViewSkeleton,
});
const TimelineView = dynamic(
  () => import("@/features/tasks/ui/timeline-view"),
  { loading: ViewSkeleton },
);
const AnalyticsView = dynamic(
  () => import("@/features/analytics/analytics-view"),
  { loading: ViewSkeleton },
);
const TaskDrawer = dynamic(() => import("@/features/tasks/ui/task-drawer"));
const NewTaskDialog = dynamic(() =>
  import("@/features/tasks/ui/task-drawer").then(
    (module) => module.NewTaskDialog,
  ),
);

function Workspace() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  const MEMBERS = useMembers();
  const params = useSearchParams();
  const tasks = useTasks();
  const save = useSaveState();
  const collapsed = useWorkspaceUI((state) => state.collapsed);
  const mobileNav = useWorkspaceUI((state) => state.mobileNav);
  const [modal, setModal] = useState<WorkspaceModal>(null);
  const [newStatus, setNewStatus] = useState<TaskStatus | null>(null);
  const [toast, setToast] = useState<{ message: string; action?: () => void }>({
    message: "",
  });
  const [starredProjectIds, setStarredProjectIds] = useState<string[]>([]);
  const [density, setDensity] = useState("comfortable");
  const [preferences, setPreferences] =
    useState<WorkspacePreferences>(DEFAULT_PREFERENCES);
  const { projects, workspace, currentUserId } = useCatalog();
  const currentMember = MEMBERS.find((member) => member.id === currentUserId) ??
    MEMBERS.find((member) => member.role === "owner");
  const [selectedMember, setSelectedMember] = useState(currentMember?.id ?? "");
  const [inboxRead, setInboxRead] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<number | null>(null);
  const openedDrawer = useRef(false);
  const inboxActivities = useWorkspaceActivityFeed(workspace.id);
  useEffect(() => {
    if (
      currentMember &&
      !MEMBERS.some((member) => member.id === selectedMember)
    )
      queueMicrotask(() => setSelectedMember(currentMember.id));
  }, [currentMember, MEMBERS, selectedMember]);
  const projectId = projects.some(
    (project) => project.id === params.get("project"),
  )
    ? params.get("project")!
    : (projects[0]?.id ?? "");
  const project = projects.find((item) => item.id === projectId);
  const starred = starredProjectIds.includes(projectId);
  useEffect(() => {
    const next = readPreferences(workspace.id);
    queueMicrotask(() => {
      setPreferences(next);
      setDensity(next.density);
    });
    localStorage.setItem("orbit.language.v1", next.language);
    document.documentElement.lang = next.language;
    document.documentElement.dataset.dateFormat = next.dateFormat;
  }, [workspace.id]);
  useEffect(() => {
    const key = `orbit.workspace.favorites.v1.${workspace.id}`;
    try {
      const stored = JSON.parse(localStorage.getItem(key) ?? "[]");
      if (Array.isArray(stored) && stored.every((id) => typeof id === "string")) {
        queueMicrotask(() => setStarredProjectIds(stored));
        return;
      }
    } catch {
      // Fall back to the former per-project preference below.
    }
    const migrated = projects
      .filter(
        (item) =>
          localStorage.getItem(
            `orbit.workspace.favorite.v1.${workspace.id}.${item.id}`,
          ) === "1",
      )
      .map((item) => item.id);
    queueMicrotask(() => setStarredProjectIds(migrated));
  }, [projects, workspace.id]);
  useEffect(() => {
    const key = `orbit.onboarding.v1.${workspace.id}`;
    if (localStorage.getItem(key) === "1") return;
    queueMicrotask(() =>
      setOnboardingStep(projects.length ? (tasks.length ? null : 2) : 1),
    );
  }, [workspace.id, projects.length, tasks.length]);
  const updatePreferences = useCallback(
    (next: WorkspacePreferences) => {
      setPreferences(next);
      setDensity(next.density);
      document.documentElement.lang = next.language;
      document.documentElement.dataset.dateFormat = next.dateFormat;
      writePreferences(workspace.id, next);
    },
    [workspace.id],
  );
  const page: WorkspacePage = !projects.length
    ? "overview"
    : [
          "overview",
          "my-tasks",
          "teams",
          "inbox",
          "discussion",
          "activity",
        ].includes(params.get("section") ?? "")
      ? (params.get("section") as WorkspacePage)
      : "project";
  const view: ViewMode = ["board", "list", "timeline"].includes(
    params.get("view") ?? "",
  )
    ? (params.get("view") as ViewMode)
    : preferences.defaultView;
  const taskId = tasks.some((task) => task.id === params.get("task"))
    ? params.get("task")
    : null;
  const query = params.get("q") ?? "";
  const deferredQuery = useDeferredValue(query);
  const filters: TaskFilters = useMemo(
    () => ({
      ...DEFAULT_FILTERS,
      query: deferredQuery,
      priority: ["low", "normal", "high", "urgent"].includes(
        params.get("priority") ?? "",
      )
        ? (params.get("priority") as Priority)
        : "all",
      assigneeId: params.get("assignee") ?? "all",
      tag: params.get("tag") ?? "all",
      due: ["week", "overdue"].includes(params.get("due") ?? "")
        ? (params.get("due") as TaskFilters["due"])
        : "all",
      hideDone: params.get("hideDone") === "1",
      sort: ["priority", "due"].includes(params.get("sort") ?? "")
        ? (params.get("sort") as TaskFilters["sort"])
        : "manual",
    }),
    [params, deferredQuery],
  );
  const setLocation = useCallback(
    (changes: Record<string, string | null>, replace = false) => {
      const url = new URL(window.location.href);
      Object.entries(changes).forEach(([key, value]) => {
        if (value === null || value === "" || value === "all")
          url.searchParams.delete(key);
        else url.searchParams.set(key, value);
      });
      if (replace) window.history.replaceState(null, "", url);
      else window.history.pushState(null, "", url);
    },
    [],
  );
  const openTask = useCallback(
    (id: string) => {
      openedDrawer.current = true;
      if (project)
        rememberRecent(workspace.id, {
          type: "task",
          id,
          name: tasks.find((item) => item.id === id)?.title ?? id,
        });
      setLocation({ task: id });
    },
    [setLocation],
  );
  const closeTask = useCallback(() => {
    if (openedDrawer.current) {
      openedDrawer.current = false;
      window.history.back();
    } else setLocation({ task: null }, true);
  }, [setLocation]);
  const onAdd = useCallback(
    (status: TaskStatus) => {
      if (!projectId) setModal("new-project");
      else setNewStatus(status);
    },
    [projectId],
  );
  const notify = useCallback(
    (message: string, action?: () => void) => setToast({ message, action }),
    [],
  );
  const toggleProjectStar = useCallback(
    (id: string) => {
      setStarredProjectIds((current) => {
        const next = current.includes(id)
          ? current.filter((projectId) => projectId !== id)
          : [...current, id];
        try {
          localStorage.setItem(
            `orbit.workspace.favorites.v1.${workspace.id}`,
            JSON.stringify(next),
          );
        } catch {
          // Keep the current session responsive when browser storage is unavailable.
        }
        return next;
      });
    },
    [workspace.id],
  );
  const navigate = useCallback(
    (section: WorkspacePage, id?: string) => {
      setLocation({
        section: section === "project" ? null : section,
        project: id ?? projectId,
        task: null,
        q: null,
      });
      useWorkspaceUI.getState().setMobileNav(false);
    },
    [projectId, setLocation],
  );
  const onProject = useCallback(
    (id: string) => {
      const item = projects.find((value) => value.id === id);
      if (item)
        rememberRecent(workspace.id, { type: "project", id, name: item.name });
      navigate("project", id);
    },
    [navigate, projects, workspace.id],
  );
  const onCommand = useCallback(
    (command: string) => {
      if (command === "new-task") setNewStatus("backlog");
      else if (command === "new-project") setModal("new-project");
      else navigate(command as WorkspacePage);
    },
    [navigate],
  );
  const onMember = (id: string) => {
    setSelectedMember(id);
    setModal("member");
  };
  const projectTasks = useMemo(
    () =>
      tasks.filter((task) =>
        page === "my-tasks"
          ? task.assigneeId === currentMember?.id
          : task.projectId === projectId,
      ),
    [tasks, projectId, page, currentMember?.id],
  );
  const { tasks: filteredTasks, pending: filtersPending } = useFilteredTasks(
    projectTasks,
    filters,
    `${page}.${projectId}`,
  );
  const done = projectTasks.filter((task) => task.status === "done").length;
  const percent = projectTasks.length
    ? Math.round((done / projectTasks.length) * 100)
    : 0;
  const hasFilters =
    query ||
    filters.priority !== "all" ||
    filters.assigneeId !== "all" ||
    filters.tag !== "all" ||
    filters.due !== "all";
  const clearTaskFilters = useCallback(
    () =>
      setLocation({
        q: null,
        priority: null,
        assignee: null,
        tag: null,
        due: null,
        sort: null,
        hideDone: null,
      }),
    [setLocation],
  );
  const isTasksPage = page === "project" || page === "my-tasks";

  useEffect(() => {
    try {
      useWorkspaceUI.setState({
        collapsed: localStorage.getItem("orbit.sidebar") === "collapsed",
      });
    } catch {
      /* Preferences are optional. */
    }
  }, []);

  useEffect(() => {
    if (!toast.message) return;
    const timer = setTimeout(() => setToast({ message: "" }), 8000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (save.status !== "error") return;
    queueMicrotask(() => setToast({ message: save.message }));
  }, [save.status, save.message]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!taskId && newStatus === null)
          setModal((old) => (old === "search" ? null : "search"));
      }
      if (event.key === "?" && !modal && !taskId && newStatus === null) {
        event.preventDefault();
        setModal("help");
      }
      if (
        (event.target as HTMLElement)?.matches(
          "input, textarea, select, [contenteditable=true]",
        )
      )
        return;
      if (
        event.key.toLowerCase() === "n" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !modal &&
        !taskId &&
        newStatus === null
      ) {
        event.preventDefault();
        onAdd("backlog");
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [modal, taskId, newStatus, onAdd]);
  const pageTitle =
    page === "project"
      ? project?.name
      : page === "overview"
        ? t("page.overview")
        : page === "teams"
          ? t("page.team")
          : page === "inbox"
            ? t("page.inbox")
            : page === "discussion"
              ? t("page.discussion")
              : page === "activity"
                ? t("page.activity")
                : t("page.tasks");
  return (
    <div
      className={`workspace ${collapsed ? "sidebar-collapsed" : ""} ${mobileNav ? "mobile-nav-open" : ""} density-${density} layout-${preferences.layout}`}
    >
      <a href="#workspace-main" className="skip-link">
        {t("workspace.skipWorkspace")}
      </a>
      <button
        className="mobile-nav-scrim"
        aria-hidden={!mobileNav}
        tabIndex={-1}
        aria-label={t("workspace.closeNavigation")}
        onClick={() => useWorkspaceUI.getState().setMobileNav(false)}
      />
      <Sidebar
        page={page}
        projectId={projectId}
        starredProjectIds={starredProjectIds}
        myCount={
          tasks.filter(
            (task) =>
              task.assigneeId === currentMember?.id && task.status !== "done",
          ).length
        }
        inboxCount={
          inboxActivities.filter((item) => !item.read).length
        }
        navigate={navigate}
        onModal={setModal}
        onMember={onMember}
      />
      <div className="main-column">
        <header className="topbar">
          <div className="breadcrumbs">
            <IconButton
              className="mobile-menu-button"
              label={t("workspace.openNavigation")}
              aria-expanded={mobileNav}
              aria-controls="workspace-sidebar"
              onClick={() => useWorkspaceUI.getState().setMobileNav(true)}
            >
              <Menu size={20} />
            </IconButton>
            {collapsed && (
              <IconButton
                className="expand-control"
                label={t("workspace.expandSidebar")}
                onClick={() => useWorkspaceUI.getState().setCollapsed(false)}
              >
                <PanelLeftClose size={17} />
              </IconButton>
            )}
            <button
              className="breadcrumb-home"
              onClick={() => navigate("overview")}
            >
              <FolderKanban size={15} />
              <span>
                {page === "project"
                  ? t("workspace.breadcrumbProjects")
                  : t("workspace.breadcrumbWorkspace")}
              </span>
            </button>
            <ChevronRight size={13} />
            {page === "project" ? (
              <button
                className="breadcrumb-current"
                onClick={() => navigate("project", projectId)}
              >
                {project?.name}
              </button>
            ) : (
              <strong>{pageTitle}</strong>
            )}
          </div>
          <div className="topbar-actions">
            <button
              className="global-search-trigger"
              onClick={() => setModal("search")}
            >
              <Search size={15} />
              <span>{t("workspace.search")}</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <LanguageSwitcher
              compact
              value={preferences.language}
              onChange={(language) =>
                updatePreferences({ ...preferences, language })
              }
            />
            <NotificationCenter
              workspaceId={workspace.id}
              tasks={tasks}
              onOpenInbox={() => navigate("inbox")}
              onOpenTask={openTask}
              onOpenProject={onProject}
              onOpenDiscussion={() => navigate("discussion")}
              notifications={preferences.notifications}
            />
            <button
              className="avatar-button topbar-avatar"
              onClick={() => onMember(currentMember?.id ?? "")}
              aria-label={t("workspace.yourProfile")}
            >
              <Avatar id={currentMember?.id ?? ""} size="sm" />
            </button>
          </div>
        </header>
        <main
          id="workspace-main"
          aria-busy={save.status === "saving"}
          className={`workspace-main ${!isTasksPage ? "page-scrollable" : ""} ${page === "discussion" ? "discussion-main" : ""}`}
        >
          <div className="page-heading">
            <div className="page-heading-main">
              <span
                className={`project-symbol project-icon-${page === "project" ? project?.color : "purple"}`}
              >
                {page === "project" && project ? (
                  <ProjectIcon project={project} size={27} />
                ) : page === "overview" ? (
                  <ChartNoAxesCombined size={27} />
                ) : page === "teams" ? (
                  <UsersRound size={27} />
                ) : page === "inbox" ? (
                  <Inbox size={27} />
                ) : page === "discussion" ? (
                  <MessageCircle size={27} />
                ) : page === "activity" ? (
                  <History size={27} />
                ) : (
                  <CheckCheck size={27} />
                )}
              </span>
              <div>
                <div className="page-title-row">
                  <h1>{pageTitle}</h1>
                  {page === "project" && (
                    <>
                      <button
                        className={`star-button ${starred ? "is-starred" : ""}`}
                        aria-label={
                          starred
                            ? t("workspace.removeFavorite")
                            : t("workspace.favoriteProject")
                        }
                        aria-pressed={starred}
                        onClick={() => {
                          toggleProjectStar(projectId);
                        }}
                      >
                        <Star
                          size={18}
                          fill={starred ? "currentColor" : "none"}
                        />
                      </button>
                      <span className="on-track-badge">
                        <span />
                        {t("workspace.onTrack")}
                      </span>
                    </>
                  )}
                </div>
                <p>
                  {page === "project"
                    ? project?.description
                    : page === "overview"
                      ? t("workspace.overviewDescription")
                      : page === "teams"
                        ? t("workspace.teamDescription")
                          : page === "inbox"
                            ? t("workspace.inboxDescription")
                            : page === "discussion"
                              ? t("workspace.discussionDescription")
                            : page === "activity"
                              ? t("workspace.activityDescription")
                              : t("workspace.tasksDescription")}
                </p>
              </div>
            </div>
            <div className="page-heading-actions">
              {isTasksPage ? (
                <>
                  <div
                    className="avatar-stack"
                    aria-label={t("workspace.projectTeam")}
                  >
                    {MEMBERS.slice(0, 4).map((member) => (
                      <Avatar id={member.id} key={member.id} size="sm" />
                    ))}
                    <button
                      onClick={() => setModal("share")}
                      aria-label={t("workspace.viewProjectMembers")}
                    >
                      {MEMBERS.length > 4 ? (
                        `+${MEMBERS.length - 4}`
                      ) : (
                        <UsersRound size={14} />
                      )}
                    </button>
                  </div>
                  <button
                    className="button share-button"
                    onClick={() => setModal("share")}
                  >
                    <Share2 size={14} />
                    <span>{t("workspace.share")}</span>
                  </button>
                  {page === "project" && project && (
                    <button
                      className="button"
                      aria-label={t("workspace.projectSettings")}
                      onClick={() => setModal("project-settings")}
                    >
                      <Settings size={15} />
                      <span>{t("workspace.settings")}</span>
                    </button>
                  )}
                  <button
                    className="button button-primary"
                    onClick={() => setNewStatus("backlog")}
                  >
                    <Plus size={17} />
                    {t("workspace.addTask")}
                  </button>
                </>
              ) : page === "inbox" ? (
                <button
                  className="button"
                  onClick={() => {
                    markNotificationsRead(
                      workspace.id,
                      inboxActivities.map((item) => `activity-${item.id}`),
                    );
                    setInboxRead(true);
                  }}
                >
                  <CheckCheck size={16} />
                  {t("workspace.markRead")}
                </button>
              ) : page === "discussion" || page === "activity" ? null : (
                <button
                  className="button button-primary"
                  onClick={() =>
                    setModal(page === "overview" ? "new-project" : "share")
                  }
                >
                  <Plus size={16} />
                  {page === "overview"
                    ? t("workspace.createProject")
                    : t("workspace.share")}
                </button>
              )}
            </div>
          </div>
          {isTasksPage ? (
            <>
              <div className="project-context">
                <span>
                  <CalendarDays size={14} />
                  {t("workspace.due")}{" "}
                  <strong>
                    {project?.due && project.due !== "Not scheduled"
                      ? new Intl.DateTimeFormat(locale, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }).format(new Date(project.due))
                      : t("workspace.notScheduled")}
                  </strong>
                </span>
                <i />
                <span>
                  <UsersRound size={14} />
                  {page === "my-tasks"
                    ? t("workspace.assignedToYou")
                    : project?.team}
                </span>
                <i />
                <span className="context-progress">
                  <span
                    className="progress-ring"
                    style={{
                      background: `conic-gradient(var(--accent) ${percent}%, var(--border) 0)`,
                    }}
                  >
                    <i />
                  </span>
                  <strong>{percent}%</strong> {t("workspace.complete")}{" "}
                  <span className="muted">
                    ({done}/{projectTasks.length})
                  </span>
                </span>
              </div>
              <div className="view-tabs-row">
                <div
                  className="view-tabs"
                  role="tablist"
                  aria-label={t("workspace.taskViews")}
                >
                  {(
                    [
                      {
                        id: "board",
                        label: t("workspace.board"),
                        icon: Columns3,
                      },
                      { id: "list", label: t("workspace.list"), icon: List },
                      {
                        id: "timeline",
                        label: t("workspace.timeline"),
                        icon: ChartNoAxesCombined,
                      },
                    ] as const
                  ).map((tab) => (
                    <button
                      id={`tab-${tab.id}`}
                      role="tab"
                      aria-controls={`panel-${tab.id}`}
                      aria-selected={view === tab.id}
                      tabIndex={view === tab.id ? 0 : -1}
                      key={tab.id}
                      className={view === tab.id ? "active" : ""}
                      onClick={() => setLocation({ view: tab.id })}
                      onKeyDown={(event) => {
                        if (
                          event.key !== "ArrowRight" &&
                          event.key !== "ArrowLeft"
                        )
                          return;
                        event.preventDefault();
                        const modes: ViewMode[] = ["board", "list", "timeline"];
                        const next =
                          modes[
                            (modes.indexOf(view) +
                              (event.key === "ArrowRight" ? 1 : 2)) %
                              3
                          ];
                        setLocation({ view: next });
                        document.getElementById(`tab-${next}`)?.focus();
                      }}
                    >
                      <tab.icon size={16} />
                      {tab.label}
                    </button>
                  ))}
                </div>
                <Tooltip content={save.message} side="top">
                  <div
                    className={`save-state save-${save.status}`}
                    role="status"
                    aria-live="polite"
                  >
                    {save.status === "saving" ? (
                      <Clock3 size={13} />
                    ) : save.status === "error" ? (
                      <CircleHelp size={13} />
                    ) : (
                      <CheckCheck size={14} />
                    )}
                    <span>
                      {save.status === "error"
                        ? t("workspace.saveFailed")
                        : save.status === "saving"
                          ? t("workspace.saving")
                          : t("workspace.allChangesSaved")}
                    </span>
                  </div>
                </Tooltip>
              </div>
              <TaskToolbar
                filters={filters}
                query={query}
                count={filteredTasks.length}
                setLocation={setLocation}
                onDisplay={() => setModal("display")}
              />
              <div
                className="view-content"
                role="tabpanel"
                id={`panel-${view}`}
                aria-labelledby={`tab-${view}`}
                aria-busy={query !== deferredQuery || filtersPending}
              >
                {filtersPending && filteredTasks.length === 0 ? (
                  <ViewSkeleton />
                ) : filteredTasks.length === 0 && hasFilters ? (
                  <EmptyState
                    action={
                      <button
                        className="button"
                        onClick={() =>
                          setLocation({
                            q: null,
                            priority: null,
                            assignee: null,
                            tag: null,
                            due: null,
                          })
                        }
                      >
                        Clear filters
                      </button>
                    }
                  />
                ) : view === "board" ? (
                  <BoardView
                    tasks={filteredTasks}
                    onOpen={openTask}
                    onAdd={onAdd}
                    manual={filters.sort === "manual"}
                    onManualReorder={() => setLocation({ sort: null })}
                    crossProject={page === "my-tasks"}
                    hasTasks={projectTasks.length > 0}
                    onClearFilters={clearTaskFilters}
                  />
                ) : view === "list" ? (
                  <ListView
                    tasks={filteredTasks}
                    onOpen={openTask}
                    onAdd={onAdd}
                    onNotify={notify}
                    hasTasks={projectTasks.length > 0}
                    onClearFilters={clearTaskFilters}
                  />
                ) : (
                  <TimelineView
                    tasks={filteredTasks}
                    onOpen={openTask}
                    hasTasks={projectTasks.length > 0}
                    onClearFilters={clearTaskFilters}
                  />
                )}
              </div>
              <div className="canvas-footer">
                <span>
                  <span className="footer-dot" />
                  {t("workspace.progressEveryDay")}
                </span>
                <span>
                  {filters.sort !== "manual" ? (
                    t("workspace.dragManualOrder")
                  ) : (
                    <>{t("workspace.tipCreateTask")}</>
                  )}
                </span>
              </div>
            </>
          ) : page === "overview" && !projects.length ? (
            <EmptyState
              title={t("workspace.workspaceReadyTitle")}
              description={t("workspace.firstProjectDescription")}
              action={
                <NewUserTooltip
                  id="first-project"
                  content={t("workspace.startProject")}
                  side="top"
                >
                  <button
                    className="button button-primary"
                    onClick={() => setModal("new-project")}
                  >
                    <Plus size={16} />
                    {t("workspace.createFirstProject")}
                  </button>
                </NewUserTooltip>
              }
            />
          ) : page === "overview" ? (
            <AnalyticsView
              tasks={tasks}
              onProject={onProject}
              onOpen={openTask}
            />
          ) : page === "teams" ? (
            <TeamPage tasks={tasks} onMember={onMember} />
          ) : page === "discussion" ? (
            <DiscussionPage onNotify={notify} />
          ) : page === "activity" ? (
            <ActivityPage tasks={tasks} />
          ) : (
            <InboxPage
              tasks={tasks}
              read={inboxRead}
              onRead={() => setInboxRead(true)}
              onOpen={openTask}
            />
          )}
        </main>
      </div>
      {taskId && (
        <TaskDrawer
          key={taskId}
          taskId={taskId}
          onClose={closeTask}
          onNotify={notify}
        />
      )}
      {newStatus !== null && projectId && (
        <NewTaskDialog
          projectId={projectId}
          status={newStatus}
          onClose={() => setNewStatus(null)}
          onCreated={(id) => {
            setNewStatus(null);
            notify(t("workspace.newTaskToast"));
            openTask(id);
          }}
        />
      )}
      {(modal === "workspaces" || modal === "new-project") && (
        <CatalogDialog
          tasks={tasks}
          mode={modal}
          onClose={() => setModal(null)}
          onWorkspace={() => {
            setModal(null);
            setLocation({
              section: "overview",
              project: null,
              task: null,
              q: null,
              priority: null,
              assignee: null,
              tag: null,
              due: null,
              sort: null,
              hideDone: null,
            });
          }}
          onProject={(id) => {
            setModal(null);
            setLocation({
              section: null,
              project: id,
              task: null,
              q: null,
              priority: null,
              assignee: null,
              tag: null,
              due: null,
              sort: null,
              hideDone: null,
            });
            notify(t("workspace.projectCreatedToast"));
          }}
          onNotify={notify}
        />
      )}
      {modal && modal !== "workspaces" && modal !== "new-project" && (
        <WorkspaceModals
          key={modal}
          modal={modal}
          close={() => setModal(null)}
          projectId={projectId}
          tasks={tasks}
          memberId={selectedMember}
          onOpen={openTask}
          onProject={onProject}
          onMember={onMember}
          onCommand={onCommand}
          notify={notify}
          density={density}
          setDensity={(value) =>
            updatePreferences({
              ...preferences,
              density: value as "comfortable" | "compact",
            })
          }
          preferences={preferences}
          onPreferencesChange={updatePreferences}
        />
      )}
      {toast.message && (
        <Toast
          message={toast.message}
          action={toast.action ? t("workspace.undoAction") : undefined}
          onAction={() => {
            toast.action?.();
            setToast({ message: t("workspace.itemRestored") });
          }}
          onDismiss={() => setToast({ message: "" })}
        />
      )}
      {onboardingStep !== null && (
        <OnboardingDialog
          step={onboardingStep}
          onClose={() => {
            localStorage.setItem(`orbit.onboarding.v1.${workspace.id}`, "1");
            setOnboardingStep(null);
          }}
          onAction={(step) => {
            if (step === 1) {
              setOnboardingStep(2);
              setModal("new-project");
            } else if (step === 2 && projectId) {
              localStorage.setItem(`orbit.onboarding.v1.${workspace.id}`, "1");
              setOnboardingStep(null);
              setNewStatus("backlog");
            }
          }}
        />
      )}
      <PresenceLayer scope={`${workspace.id}.${projectId}.${view}`} />
    </div>
  );
}

function ScopedWorkspace() {
  const { workspace, ready, workspaces } = useCatalog();
  if (!ready) return <CatalogSkeleton />;
  if (!workspaces.length) return <WorkspaceWelcome />;
  return (
    <WorkspaceProvider key={workspace.id}>
      <Suspense fallback={<ViewSkeleton />}>
        <Workspace />
      </Suspense>
    </WorkspaceProvider>
  );
}

function WorkspaceWelcome() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(true);
  return (
    <main className="workspace-welcome">
      <EmptyState
        title={t("workspace.freshStart")}
        description={t("workspace.noWorkspaces")}
        action={
          <button
            className="button button-primary"
            onClick={() => setOpen(true)}
          >
            <Plus size={16} />
            {t("workspace.createWorkspace")}
          </button>
        }
      />
      {open && (
        <CatalogDialog
          mode="workspaces"
          onClose={() => setOpen(false)}
          onWorkspace={() => setOpen(false)}
          onProject={() => setOpen(false)}
        />
      )}
      {onboarding && !open && (
        <OnboardingDialog
          step={0}
          onClose={() => setOnboarding(false)}
          onAction={() => {
            setOnboarding(false);
            setOpen(true);
          }}
        />
      )}
    </main>
  );
}

export default function WorkspaceApp() {
  return (
    <CatalogProvider>
      <ScopedWorkspace />
    </CatalogProvider>
  );
}
