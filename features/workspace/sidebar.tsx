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
  PanelLeftClose,
  Plus,
  UsersRound,
  Orbit,
} from "lucide-react";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import { IconButton, OrbitMark } from "@/shared/ui";
import { MEMBERS, PROJECTS } from "./data";
import { ThemeToggle } from "@/shared/theme/theme-toggle";
import { useWorkspaceUI } from "./ui-store";
import type { WorkspacePage } from "../tasks/domain/task";

export type WorkspaceModal =
  "search" | "share" | "display" | "help" | "settings" | "member" | null;

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
  const collapsed = useWorkspaceUI((state) => state.collapsed);
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
      aria-label="Workspace navigation"
    >
      <div className="brand-row">
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="Orbit overview"
        >
          <Orbit size={32} strokeWidth={1.6} />
          <span>
            orbit<span className="brand-period">.</span>
          </span>
        </button>
        <IconButton
          label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          aria-controls="workspace-sidebar"
          className="collapse-control"
          onClick={() => useWorkspaceUI.getState().setCollapsed(!collapsed)}
        >
          <PanelLeftClose size={17} />
        </IconButton>
        <IconButton
          className="sidebar-mobile-close"
          label="Close navigation"
          onClick={() => useWorkspaceUI.getState().setMobileNav(false)}
        >
          <X size={18} />
        </IconButton>
      </div>
      <div className="sidebar-scroll">
        <button
          className="workspace-switcher"
          onClick={() => onModal("settings")}
        >
          <span className="workspace-logo">
            s<span>✳</span>
          </span>
          <span className="workspace-switch-copy">
            <strong>Studio workspace</strong>
            <small>
              Pro plan <span>✦</span>
            </small>
          </span>
          <ChevronsUpDown size={14} />
        </button>
        <div className="sidebar-group-label">WORKSPACE</div>
        <nav className="primary-nav">
          {[
            {
              key: "overview",
              label: "Overview",
              icon: LayoutDashboard,
              count: 0,
            },
            {
              key: "my-tasks",
              label: "My tasks",
              icon: ListTodo,
              count: myCount,
            },
            { key: "inbox", label: "Inbox", icon: Inbox, count: inboxCount },
            { key: "teams", label: "Team", icon: UsersRound, count: 0 },
          ].map((item) => (
            <button
              key={item.key}
              className={`nav-item ${page === item.key ? "active" : ""}`}
              onClick={() => navigate(item.key as WorkspacePage)}
              title={item.label}
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
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-group-label project-label">
          <span>PROJECTS</span>
          <button
            aria-label="Browse projects"
            title="Browse projects"
            onClick={() => navigate("overview")}
          >
            <Plus size={15} />
          </button>
        </div>
        <nav className="project-nav">
          {PROJECTS.map((project) => (
            <button
              key={project.id}
              className={`nav-item project-nav-item ${page === "project" && projectId === project.id ? "active" : ""}`}
              onClick={() => navigate("project", project.id)}
              title={project.name}
              aria-label={project.name}
              aria-current={
                page === "project" && projectId === project.id
                  ? "page"
                  : undefined
              }
            >
              <span className={`project-dot dot-${project.color}`} />
              <span>{project.name}</span>
              {page === "project" && projectId === project.id && (
                <span className="active-project-dot" />
              )}
            </button>
          ))}
        </nav>
        <button
          className="all-projects-link"
          onClick={() => navigate("overview")}
        >
          <LayoutGrid size={14} />
          <span>All projects</span>
          <ArrowUpRight size={13} />
        </button>
        <div className="sidebar-group-label team-label">YOUR TEAM</div>
        <div className="sidebar-team">
          {MEMBERS.slice(1, 4).map((member) => (
            <button
              key={member.id}
              onClick={() => onMember(member.id)}
              title={member.name}
            >
              <Avatar id={member.id} size="xs" />
              <span>{member.name}</span>
              <span className="member-role-short">{member.team}</span>
            </button>
          ))}
        </div>
        <div className="workspace-note">
          <span className="note-sparkle">✦</span>
          <strong>Good work happens together.</strong>
          <p>A little clarity. A lot of possibility.</p>
          <button onClick={() => onModal("share")}>
            Bring your team along <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
      <div className="sidebar-bottom">
        <button
          className="sidebar-help"
          onClick={() => onModal("help")}
          title="Help and shortcuts"
        >
          <CircleHelp size={17} />
          <span>Help & shortcuts</span>
          <kbd>?</kbd>
        </button>
        <div className="profile-row">
          <button
            className="profile-button"
            onClick={() => onMember("alex")}
            title="Alex Morgan"
          >
            <Avatar id="alex" size="sm" />
            <span>
              <strong>Alex Morgan</strong>
              <small>Personal account</small>
            </span>
          </button>
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}
