"use client";

import {
  ArrowUpRight,
  ChevronsUpDown,
  CircleHelp,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Moon,
  PanelLeftClose,
  Plus,
  Sun,
  UsersRound,
} from "lucide-react";
import { Avatar, IconButton, OrbitMark } from "@/shared/ui";
import { MEMBERS, PROJECTS } from "./data";
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
  const theme = useWorkspaceUI((state) => state.theme);
  return (
    <aside className="sidebar" aria-label="Workspace navigation">
      <div className="brand-row">
        <button
          className="brand"
          onClick={() => navigate("overview")}
          aria-label="Orbit overview"
        >
          <OrbitMark />
          <span>
            orbit<span className="brand-period">.</span>
          </span>
        </button>
        <IconButton
          label="Collapse sidebar"
          className="collapse-control"
          onClick={() => useWorkspaceUI.getState().setCollapsed(!collapsed)}
        >
          <PanelLeftClose size={17} />
        </IconButton>
      </div>
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
      <div className="sidebar-bottom">
        <div className="workspace-note">
          <span className="note-sparkle">✦</span>
          <strong>Good work happens together.</strong>
          <p>A little clarity. A lot of possibility.</p>
          <button onClick={() => onModal("share")}>
            Bring your team along <ArrowUpRight size={14} />
          </button>
        </div>
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
          <IconButton
            label={
              theme === "light"
                ? "Switch to dark theme"
                : "Switch to light theme"
            }
            onClick={() =>
              useWorkspaceUI
                .getState()
                .setTheme(theme === "light" ? "dark" : "light")
            }
          >
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </IconButton>
        </div>
      </div>
    </aside>
  );
}
