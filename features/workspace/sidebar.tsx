"use client";

import { useEffect, useRef } from "react";
import {
  X,
  ArrowUpRight,
  ChevronsUpDown,
  CircleHelp,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  MessageCircle,
  History,
  PanelLeftClose,
  Plus,
  Settings,
  UsersRound,
  Orbit,
} from "lucide-react";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import { IconButton, OrbitMark, Tooltip } from "@/shared/ui";
import { useMembers } from "@/features/workspace/catalog";
import { useCatalog } from "./catalog";
import { ProjectIcon } from "./ui/project-icon";
import { WorkspaceLogo } from "./ui/workspace-logo";
import { ThemeToggle } from "@/shared/theme/theme-toggle";
import { useWorkspaceUI } from "./ui-store";
import type { WorkspacePage } from "../tasks/domain/task";
import { useTranslation } from "react-i18next";

export type WorkspaceModal =
  | "search"
  | "share"
  | "display"
  | "help"
  | "settings"
  | "backup"
  | "project-settings"
  | "member"
  | "profile-settings"
  | "workspaces"
  | "new-project"
  | null;

export function Sidebar({
  page,
  projectId,
  myCount,
  inboxCount,
  navigate,
  onModal,
  onMember,
}: {
  page: WorkspacePage;
  projectId: string;
  myCount: number;
  inboxCount: number;
  navigate: (page: WorkspacePage, projectId?: string) => void;
  onModal: (modal: WorkspaceModal) => void;
  onMember: (id: string) => void;
}) {
  const MEMBERS = useMembers();
  const { t } = useTranslation();
  const currentMember = MEMBERS.find((member) => member.id === "alex");
  const collapsed = useWorkspaceUI((state) => state.collapsed);
  const { projects: PROJECTS, workspace } = useCatalog();
  const mobileNav = useWorkspaceUI((state) => state.mobileNav);
  const sidebarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 900px)");
    if (!mobileNav || !media.matches) return;
    const onViewportChange = (event: MediaQueryListEvent) => {
      if (!event.matches) useWorkspaceUI.getState().setMobileNav(false);
    };
    const previous = document.activeElement as HTMLElement | null;
    const frame = requestAnimationFrame(() =>
      sidebarRef.current
        ?.querySelector<HTMLButtonElement>(".sidebar-mobile-close")
        ?.focus(),
    );
    const onKeyDown = (event: KeyboardEvent) => {
      if (!media.matches) return;
      if (event.key === "Escape") {
        event.preventDefault();
        useWorkspaceUI.getState().setMobileNav(false);
      }
      if (event.key !== "Tab") return;
      const controls = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href], select:not(:disabled), [tabindex='0']",
        ) ?? [],
      ).filter(
        (node) =>
          node.getClientRects().length &&
          getComputedStyle(node).visibility !== "hidden",
      );
      const first = controls[0],
        last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    media.addEventListener("change", onViewportChange);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      media.removeEventListener("change", onViewportChange);
      if (previous?.isConnected && previous.getClientRects().length)
        previous.focus();
    };
  }, [mobileNav]);
  return (
    <aside
      ref={sidebarRef}
      id="workspace-sidebar"
      className="sidebar"
      aria-label={t("workspace.workspaceNavigation")}
    >
      <div className="brand-row">
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label={t("brand.overview")}
        >
          <Orbit size={32} strokeWidth={1.6} />
          <span>
            orbit<span className="brand-period">.</span>
          </span>
        </button>
        <IconButton
          label={collapsed ? t("actions.expand") : t("actions.collapse")}
          aria-expanded={!collapsed}
          aria-controls="workspace-sidebar"
          className="collapse-control"
          onClick={() => useWorkspaceUI.getState().setCollapsed(!collapsed)}
        >
          <PanelLeftClose size={17} />
        </IconButton>
        <IconButton
          className="sidebar-mobile-close"
          label={t("actions.close")}
          onClick={() => useWorkspaceUI.getState().setMobileNav(false)}
        >
          <X size={18} />
        </IconButton>
      </div>
      <div className="sidebar-scroll">
        <button
          className="workspace-switcher"
          onClick={() => onModal("workspaces")}
        >
          <WorkspaceLogo workspace={workspace} />
          <span className="legacy-workspace-logo">
            s<span>✳</span>
          </span>
          <span className="workspace-switch-copy">
            <strong>{workspace.name}</strong>
            <small>
              {t("workspace.switchOrJoin")} <span>✦</span>
            </small>
          </span>
          <ChevronsUpDown size={14} />
        </button>
        <button
          className="workspace-settings-link"
          onClick={() => onModal("settings")}
        >
          <Settings size={15} />
          <span>{t("actions.settings")}</span>
        </button>
        <button
          className="workspace-settings-link"
          onClick={() => onModal("backup")}
        >
          <ArrowUpRight size={15} />
          <span>{t("actions.backup")}</span>
        </button>
        <div className="sidebar-group-label">{t("nav.workspace")}</div>
        <nav className="primary-nav">
          {[
            {
              key: "overview",
              label: t("nav.overview"),
              icon: LayoutDashboard,
              count: 0,
            },
            {
              key: "my-tasks",
              label: t("nav.tasks"),
              icon: ListTodo,
              count: myCount,
            },
            {
              key: "inbox",
              label: t("nav.inbox"),
              icon: Inbox,
              count: inboxCount,
            },
            {
              key: "discussion",
              label: t("nav.discussion"),
              icon: MessageCircle,
              count: 0,
            },
            {
              key: "activity",
              label: t("nav.activity"),
              icon: History,
              count: 0,
            },
            { key: "teams", label: t("nav.team"), icon: UsersRound, count: 0 },
          ].map((item) => (
            <Tooltip key={item.key} content={item.label}>
              <button
                key={item.key}
                className={`nav-item ${page === item.key ? "active" : ""}`}
                onClick={() => navigate(item.key as WorkspacePage)}
                aria-label={item.label}
                aria-current={page === item.key ? "page" : undefined}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.count > 0 && (
                  <b
                    className={`nav-count ${item.key === "inbox" ? "purple-count" : ""}`}
                  >
                    {item.count}
                  </b>
                )}
              </button>
            </Tooltip>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-group-label project-label">
          <span>{t("workspace.projectsLabel")}</span>
          <button
            aria-label={t("workspace.createProject")}
            onClick={() => onModal("new-project")}
          >
            <Tooltip content={t("workspace.createProject")}>
              <Plus size={15} />
            </Tooltip>
          </button>
        </div>
        <nav className="project-nav">
          {PROJECTS.map((project) => (
            <Tooltip key={project.id} content={project.name}>
              <button
                key={project.id}
                className={`nav-item project-nav-item ${page === "project" && projectId === project.id ? "active" : ""}`}
                onClick={() => navigate("project", project.id)}
                aria-label={project.name}
                aria-current={
                  page === "project" && projectId === project.id
                    ? "page"
                    : undefined
                }
              >
                <span
                  className={`project-nav-icon project-icon-${project.color}`}
                >
                  <ProjectIcon project={project} size={14} />
                </span>
                <span>{project.name}</span>
                {page === "project" && projectId === project.id && (
                  <span className="active-project-dot" />
                )}
              </button>
            </Tooltip>
          ))}
        </nav>
        <button
          className="all-projects-link"
          onClick={() => navigate("overview")}
        >
          <LayoutGrid size={14} />
          <span>{t("workspace.allProjectsLabel")}</span>
          <ArrowUpRight size={13} />
        </button>
        <div className="sidebar-group-label team-label">
          {t("workspace.yourTeam")}
        </div>
        <div className="sidebar-team">
          {MEMBERS.slice(1, 4).map((member) => (
            <button key={member.id} onClick={() => onMember(member.id)}>
              <Avatar id={member.id} size="xs" />
              <span>{member.name}</span>
              <span className="member-role-short">{member.team}</span>
            </button>
          ))}
        </div>
        <div className="workspace-note">
          <span className="note-sparkle">✦</span>
          <strong>{t("workspace.teamTogether")}</strong>
          <p>{t("workspace.clarityPossibility")}</p>
          <button onClick={() => onModal("share")}>
            {t("workspace.bringTeamAlong")} <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      <div className="sidebar-bottom">
        <button className="sidebar-help" onClick={() => onModal("help")}>
          <Tooltip content={t("workspace.helpShortcuts")}>
            <CircleHelp size={17} />
          </Tooltip>
          <span>{t("workspace.helpShortcuts")}</span>
          <kbd>?</kbd>
        </button>
        <div className="profile-row">
          <button
            className="profile-button"
            onClick={() => onModal("profile-settings")}
          >
            <Avatar id="alex" size="sm" />
            <span>
              <strong>
                {currentMember?.name ?? t("workspace.alexMorgan")}
              </strong>
              <small>
                {currentMember?.team ?? t("workspace.personalAccount")}
              </small>
            </span>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
