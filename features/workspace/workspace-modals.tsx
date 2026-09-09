"use client";

import { useState } from "react";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import { StatusIcon } from "@/features/tasks/ui/status-icon";
import { ArrowUpRight, CheckCheck, Search } from "lucide-react";
import { Dialog, EmptyState, OrbitMark } from "@/shared/ui";
import { MEMBERS, PROJECTS } from "./data";
import { ThemeSelect } from "@/shared/theme/theme-select";
import type { WorkspaceModal } from "./sidebar";
import type { Task } from "../tasks/domain/task";

export function WorkspaceModals({
  modal,
  close,
  projectId,
  tasks,
  memberId,
  onOpen,
  notify,
  density,
  setDensity,
}: {
  modal: WorkspaceModal;
  close: () => void;
  projectId: string;
  tasks: readonly Task[];
  memberId: string;
  onOpen: (id: string) => void;
  notify: (message: string) => void;
  density: string;
  setDensity: (value: string) => void;
}) {
  const [query, setQuery] = useState("");
  const project = PROJECTS.find((value) => value.id === projectId)!;
  const appearance = <ThemeSelect className="form-label" />;
  if (modal === "search") {
    const results = tasks
      .filter((task) =>
        `${task.title} ${task.id}`.toLowerCase().includes(query.toLowerCase()),
      )
      .slice(0, 12);
    return (
      <Dialog
        title="Find your next focus"
        onClose={close}
        className="search-dialog"
      >
        <div className="command-search">
          <Search size={20} />
          <input
            autoFocus
            placeholder="Search tasks, ideas, and the little details…"
            aria-label="Search the workspace"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>ESC</kbd>
        </div>
        <div className="command-results">
          <span className="command-section-label">
            {query ? `${results.length} results` : "YOUR TASKS"}
          </span>
          {results.map((task) => (
            <button
              key={task.id}
              onClick={() => {
                close();
                onOpen(task.id);
              }}
            >
              <StatusIcon status={task.status} />
              <span>
                <strong>{task.title}</strong>
                <small>
                  {task.id} ·{" "}
                  {PROJECTS.find((item) => item.id === task.projectId)?.name}
                </small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
          {!results.length && (
            <EmptyState
              title="Nothing here just yet"
              description="Try a different task name or ID."
            />
          )}
        </div>
        <div className="command-footer">
          <span>
            <kbd>Tab</kbd> to navigate
          </span>
          <span>
            <kbd>↵</kbd> to open
          </span>
        </div>
      </Dialog>
    );
  }
  if (modal === "share")
    return (
      <Dialog title="Good work is better together" onClose={close}>
        <p className="dialog-description">Share a link to {project.name}.</p>
        <div className="share-link">
          <span>
            {typeof window !== "undefined"
              ? `${window.location.host}/?project=${projectId}`
              : "Project link"}
          </span>
          <button
            className="button button-primary button-small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${window.location.origin}/?project=${projectId}`,
                );
                notify("Project link copied");
              } catch {
                notify(
                  "Couldn’t access clipboard. Copy the project URL from your address bar.",
                );
              }
            }}
          >
            Copy link
          </button>
        </div>
        <h3 className="share-members-heading">
          Project team <span>{MEMBERS.length}</span>
        </h3>
        {MEMBERS.map((member) => (
          <div className="share-member" key={member.id}>
            <Avatar id={member.id} />
            <span>
              <strong>{member.name}</strong>
              <small>{member.email}</small>
            </span>
            <span>{member.id === "alex" ? "Owner" : "Member"}</span>
          </div>
        ))}
        <p className="local-sharing-note">
          Changes are saved on this device and sync between its browser tabs.
          Sharing changes across devices requires a connected team service.
        </p>
      </Dialog>
    );
  if (modal === "display")
    return (
      <Dialog title="Make this space yours" onClose={close}>
        <p className="dialog-description">
          A comfortable view helps you do your best work.
        </p>
        <label className="form-label">
          Density
          <select
            value={density}
            onChange={(event) => setDensity(event.target.value)}
          >
            <option value="comfortable">
              Comfortable — a little room to breathe
            </option>
            <option value="compact">Compact — more tasks in view</option>
          </select>
        </label>
        {appearance}
        <div className="dialog-actions">
          <button className="button button-primary" onClick={close}>
            Done
          </button>
        </div>
      </Dialog>
    );
  if (modal === "help")
    return (
      <Dialog title="A few little shortcuts" onClose={close}>
        <p className="dialog-description">Less clicking. More doing.</p>
        {[
          ["Search your workspace", "⌘ / Ctrl + K"],
          ["Create a task", "N"],
          ["Close a dialog or cancel a drag", "Esc"],
          ["Lift or drop a focused drag handle", "Space"],
          ["Move a lifted task", "Arrow keys"],
        ].map(([label, key]) => (
          <div key={key} className="shortcut-row">
            <span>{label}</span>
            <kbd>{key}</kbd>
          </div>
        ))}
        <p className="local-sharing-note">
          Open a task to edit its title, dates, description, checklist, and
          comments. Use its menu to move it between columns without dragging.
        </p>
      </Dialog>
    );
  if (modal === "settings")
    return (
      <Dialog title="Studio workspace" onClose={close}>
        <div className="settings-brand">
          <OrbitMark />
          <div>
            <h3>A home for your best work.</h3>
            <p>Projects, tasks, and people. All in orbit.</p>
          </div>
        </div>
        {appearance}
        <div className="workspace-storage-info">
          <CheckCheck size={18} />
          <div>
            <strong>Saved on this device</strong>
            <p>
              Your task changes persist when you refresh. Other tabs on this
              browser stay in sync.
            </p>
          </div>
        </div>
      </Dialog>
    );
  if (modal === "member") {
    const member = MEMBERS.find((value) => value.id === memberId)!;
    const assignments = tasks.filter((task) => task.assigneeId === member.id);
    return (
      <Dialog title="Team member" onClose={close}>
        <div className="member-profile">
          <Avatar id={member.id} size="lg" />
          <h2>{member.name}</h2>
          <p>
            {member.role} · {member.team}
          </p>
          <span>{member.email}</span>
        </div>
        <h3 className="share-members-heading">
          Assigned tasks <span>{assignments.length}</span>
        </h3>
        <div className="member-assignment-list">
          {assignments.map((task) => (
            <button
              key={task.id}
              onClick={() => {
                close();
                onOpen(task.id);
              }}
            >
              <StatusIcon status={task.status} />
              <span>{task.title}</span>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      </Dialog>
    );
  }
  return null;
}
