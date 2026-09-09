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
import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  CheckCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  Columns3,
  FolderKanban,
  Globe2,
  Inbox,
  LayoutGrid,
  List,
  Menu,
  PanelLeftClose,
  Plus,
  Search,
  Share2,
  Smartphone,
  Star,
  UsersRound,
  X,
} from "lucide-react";
import { EmptyState, IconButton, ViewSkeleton } from "@/shared/ui";
import {
  DEFAULT_FILTERS,
  type Priority,
  type TaskFilters,
  type TaskStatus,
  type ViewMode,
  type WorkspacePage,
} from "@/features/tasks/domain/task";
import { useFilteredTasks } from "@/features/tasks/model/use-filtered-tasks";
import { MEMBERS, PROJECTS } from "./data";
import { useSaveState, useTasks, WorkspaceProvider } from "./provider";
import { useWorkspaceUI } from "./ui-store";
import { PresenceLayer } from "@/features/collaboration/presence-layer";
import { Sidebar, type WorkspaceModal } from "./sidebar";
import { WorkspaceModals } from "./workspace-modals";
import { TeamPage, InboxPage } from "./secondary-pages";
import { TaskToolbar } from "@/features/tasks/ui/task-toolbar";

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
  const params = useSearchParams();
  const tasks = useTasks();
  const save = useSaveState();
  const collapsed = useWorkspaceUI((state) => state.collapsed);
  const mobileNav = useWorkspaceUI((state) => state.mobileNav);
  const [modal, setModal] = useState<WorkspaceModal>(null);
  const [newStatus, setNewStatus] = useState<TaskStatus | null>(null);
  const [toast, setToast] = useState("");
  const [starred, setStarred] = useState(false);
  const [density, setDensity] = useState("comfortable");
  const [selectedMember, setSelectedMember] = useState("alex");
  const [inboxRead, setInboxRead] = useState(false);
  const openedDrawer = useRef(false);
  const { data: projects = PROJECTS } = useQuery({
    queryKey: ["local-workspace", "projects"],
    queryFn: async () => PROJECTS,
    initialData: PROJECTS,
    staleTime: Infinity,
  });
  const projectId = projects.some(
    (project) => project.id === params.get("project"),
  )
    ? params.get("project")!
    : "website";
  const project = projects.find((item) => item.id === projectId)!;
  const page: WorkspacePage = [
    "overview",
    "my-tasks",
    "teams",
    "inbox",
  ].includes(params.get("section") ?? "")
    ? (params.get("section") as WorkspacePage)
    : "project";
  const view: ViewMode = ["board", "list", "timeline"].includes(
    params.get("view") ?? "",
  )
    ? (params.get("view") as ViewMode)
    : "board";
  const taskId = params.get("task");
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
  const onAdd = useCallback((status: TaskStatus) => setNewStatus(status), []);
  const notify = useCallback((message: string) => setToast(message), []);
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
    (id: string) => navigate("project", id),
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
          ? task.assigneeId === "alex"
          : task.projectId === projectId,
      ),
    [tasks, projectId, page],
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
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 3800);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (!taskId && newStatus === null)
          setModal((old) => (old === "search" ? null : "search"));
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
        setNewStatus("backlog");
      }
    };
    document.addEventListener("keydown", listener);
    return () => document.removeEventListener("keydown", listener);
  }, [modal, taskId, newStatus]);
  const pageTitle =
    page === "project"
      ? project.name
      : page === "overview"
        ? "Workspace overview"
        : page === "teams"
          ? "The people behind the progress"
          : page === "inbox"
            ? "Your inbox"
            : "My tasks";
  return (
    <div
      className={`workspace ${collapsed ? "sidebar-collapsed" : ""} ${mobileNav ? "mobile-nav-open" : ""} density-${density}`}
    >
      <a href="#workspace-main" className="skip-link">
        Skip to workspace
      </a>
      <button
        className="mobile-nav-scrim"
        aria-hidden={!mobileNav}
        tabIndex={-1}
        aria-label="Close navigation"
        onClick={() => useWorkspaceUI.getState().setMobileNav(false)}
      />
      <Sidebar
        page={page}
        projectId={projectId}
        myCount={
          tasks.filter(
            (task) => task.assigneeId === "alex" && task.status !== "done",
          ).length
        }
        inboxCount={
          inboxRead
            ? 0
            : tasks.reduce((count, task) => count + task.comments.length, 0)
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
              label="Open navigation"
              aria-expanded={mobileNav}
              aria-controls="workspace-sidebar"
              onClick={() => useWorkspaceUI.getState().setMobileNav(true)}
            >
              <Menu size={20} />
            </IconButton>
            {collapsed && (
              <IconButton
                className="expand-control"
                label="Expand sidebar"
                onClick={() => useWorkspaceUI.getState().setCollapsed(false)}
              >
                <PanelLeftClose size={17} />
              </IconButton>
            )}
            <span className="breadcrumb-home">
              <FolderKanban size={15} />
              <span>{page === "project" ? "Projects" : "Workspace"}</span>
            </span>
            <ChevronRight size={13} />
            <strong>{page === "project" ? project.name : pageTitle}</strong>
          </div>
          <div className="topbar-actions">
            <button
              className="global-search-trigger"
              onClick={() => setModal("search")}
            >
              <Search size={15} />
              <span>Search anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <span className="topbar-divider" />
            <IconButton
              label="Open notifications"
              className="notification-button"
              onClick={() => navigate("inbox")}
            >
              <Bell size={18} />
              {!inboxRead && <i />}
            </IconButton>
            <button
              className="avatar-button topbar-avatar"
              onClick={() => onMember("alex")}
              aria-label="Your profile"
            >
              <Avatar id="alex" size="sm" />
            </button>
          </div>
        </header>
        <main
          id="workspace-main"
          className={`workspace-main ${!isTasksPage ? "page-scrollable" : ""}`}
        >
          <div className="page-heading">
            <div className="page-heading-main">
              <span
                className={`project-symbol project-icon-${page === "project" ? project.color : "purple"}`}
              >
                {page === "project" ? (
                  projectId === "website" ? (
                    <Globe2 size={27} strokeWidth={1.7} />
                  ) : projectId === "mobile" ? (
                    <Smartphone size={27} />
                  ) : (
                    <LayoutGrid size={27} />
                  )
                ) : page === "overview" ? (
                  <ChartNoAxesCombined size={27} />
                ) : page === "teams" ? (
                  <UsersRound size={27} />
                ) : page === "inbox" ? (
                  <Inbox size={27} />
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
                            ? "Remove project from favorites"
                            : "Favorite project"
                        }
                        aria-pressed={starred}
                        onClick={() => setStarred(!starred)}
                      >
                        <Star
                          size={18}
                          fill={starred ? "currentColor" : "none"}
                        />
                      </button>
                      <span className="on-track-badge">
                        <span />
                        On track
                      </span>
                    </>
                  )}
                </div>
                <p>
                  {page === "project"
                    ? project.description
                    : page === "overview"
                      ? "A little clarity for everything you’re building together."
                      : page === "teams"
                        ? "Great things happen when the right people come together."
                        : page === "inbox"
                          ? "Stay in the loop, without losing your focus."
                          : "Your priorities, your progress, your space to focus."}
                </p>
              </div>
            </div>
            <div className="page-heading-actions">
              {isTasksPage ? (
                <>
                  <div className="avatar-stack" aria-label="Project team">
                    {MEMBERS.slice(0, 4).map((member) => (
                      <Avatar id={member.id} key={member.id} size="sm" />
                    ))}
                    <button
                      onClick={() => setModal("share")}
                      aria-label="View all project members"
                    >
                      +1
                    </button>
                  </div>
                  <button
                    className="button share-button"
                    onClick={() => setModal("share")}
                  >
                    <Share2 size={14} />
                    <span>Share</span>
                  </button>
                  <button
                    className="button button-primary"
                    onClick={() => setNewStatus("backlog")}
                  >
                    <Plus size={17} />
                    Add task
                  </button>
                </>
              ) : page === "inbox" ? (
                <button className="button" onClick={() => setInboxRead(true)}>
                  <CheckCheck size={16} />
                  Mark all as read
                </button>
              ) : (
                <button
                  className="button button-primary"
                  onClick={() => setModal("share")}
                >
                  <Plus size={16} />
                  Share workspace
                </button>
              )}
            </div>
          </div>
          {isTasksPage ? (
            <>
              <div className="project-context">
                <span>
                  <CalendarDays size={14} />
                  Due <strong>{project.due}</strong>
                </span>
                <i />
                <span>
                  <UsersRound size={14} />
                  {page === "my-tasks" ? "Assigned to you" : project.team}
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
                  <strong>{percent}%</strong> complete{" "}
                  <span className="muted">
                    ({done}/{projectTasks.length})
                  </span>
                </span>
              </div>
              <div className="view-tabs-row">
                <div
                  className="view-tabs"
                  role="tablist"
                  aria-label="Task views"
                >
                  {(
                    [
                      { id: "board", label: "Board", icon: Columns3 },
                      { id: "list", label: "List", icon: List },
                      {
                        id: "timeline",
                        label: "Timeline",
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
                <div
                  className={`save-state save-${save.status}`}
                  title={save.message}
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
                      ? "Changes not saved"
                      : save.status === "saving"
                        ? "Saving…"
                        : "All changes saved"}
                  </span>
                </div>
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
                  />
                ) : view === "list" ? (
                  <ListView
                    tasks={filteredTasks}
                    onOpen={openTask}
                    onAdd={onAdd}
                  />
                ) : (
                  <TimelineView tasks={filteredTasks} onOpen={openTask} />
                )}
              </div>
              <div className="canvas-footer">
                <span>
                  <span className="footer-dot" />A little progress, every day.
                </span>
                <span>
                  {filters.sort !== "manual" ? (
                    "Choose Manual sort to drag cards"
                  ) : (
                    <>
                      Tip: press <kbd>N</kbd> to create a task
                    </>
                  )}
                </span>
              </div>
            </>
          ) : page === "overview" ? (
            <AnalyticsView
              tasks={tasks}
              onProject={onProject}
              onOpen={openTask}
            />
          ) : page === "teams" ? (
            <TeamPage tasks={tasks} onMember={onMember} />
          ) : (
            <InboxPage tasks={tasks} read={inboxRead} onOpen={openTask} />
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
      {newStatus !== null && (
        <NewTaskDialog
          projectId={projectId}
          status={newStatus}
          onClose={() => setNewStatus(null)}
          onCreated={(id) => {
            setNewStatus(null);
            notify("A new task. A little more progress.");
            openTask(id);
          }}
        />
      )}
      {modal && (
        <WorkspaceModals
          key={modal}
          modal={modal}
          close={() => setModal(null)}
          projectId={projectId}
          tasks={tasks}
          memberId={selectedMember}
          onOpen={openTask}
          notify={notify}
          density={density}
          setDensity={setDensity}
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Check size={15} />
          </span>
          {toast}
          <button
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <PresenceLayer scope={`${projectId}.${view}`} />
    </div>
  );
}

export default function WorkspaceApp() {
  return (
    <WorkspaceProvider>
      <Suspense fallback={<ViewSkeleton />}>
        <Workspace />
      </Suspense>
    </WorkspaceProvider>
  );
}
