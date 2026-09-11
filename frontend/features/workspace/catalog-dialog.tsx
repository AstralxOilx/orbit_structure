"use client";

import { DateInput } from "@/shared/ui/date-input";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, FolderPlus, LogIn, Plus, Trash2 } from "lucide-react";
import { Dialog, EmptyState, Input, Select } from "@/shared/ui";
import { useCatalog } from "./catalog";
import { WorkspaceLogo } from "./ui/workspace-logo";
import { DeleteConfirmation } from "@/shared/ui/delete-confirmation";
import type { Task } from "@/features/tasks/domain/task";
import { ProjectIcon } from "./ui/project-icon";

export function CatalogDialog({
  mode,
  onClose,
  onWorkspace,
  onProject,
  tasks = [],
  onNotify,
}: {
  mode: "workspaces" | "new-project";
  onClose: () => void;
  onWorkspace: () => void;
  onProject: (id: string) => void;
  tasks?: readonly Task[];
  onNotify?: (message: string, action?: () => void) => void;
}) {
  const { t } = useTranslation();
  const catalog = useCatalog();
  const [tab, setTab] = useState<"switch" | "create" | "join" | "manage">(
    "switch",
  );
  const [deleting, setDeleting] = useState<{
    kind: "project" | "workspace" | "member";
    id: string;
    name: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("purple");
  const [icon, setIcon] = useState("website");
  const [due, setDue] = useState("");
  const [error, setError] = useState("");
  const [retryAction, setRetryAction] = useState<(() => void) | null>(null);
  const [copied, setCopied] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberRole, setMemberRole] = useState<"admin" | "member">("member");
  const [memberTeam, setMemberTeam] = useState("General");
  const [memberColor, setMemberColor] = useState("purple");
  const run = async (action: () => void | Promise<void>) => {
    try {
      await action();
      setError("");
      setRetryAction(null);
    } catch (cause) {
      setRetryAction(() => () => run(action));
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save. Check browser storage and try again.",
      );
    }
  };
  if (deleting)
    return (
      <DeleteConfirmation
        key={`${deleting.kind}-${deleting.id}`}
        kind={deleting.kind}
        name={deleting.name}
        onClose={() => setDeleting(null)}
        impact={
          deleting.kind === "workspace"
            ? `This removes ${catalog.projects.length} projects and ${tasks.length} tasks, including their comments, checklists and recorded history. Its workspace code will stop working. Other workspaces are unaffected.`
            : deleting.kind === "project"
              ? `This removes ${tasks.filter((task) => task.projectId === deleting.id).length} tasks, including their comments, checklists and recorded history. Other projects are unaffected.`
              : "This removes the member from this workspace and prevents them from being assigned new tasks. Existing task history remains unchanged."
        }
        onDelete={(confirmation) => {
          const undo =
            deleting.kind === "workspace"
              ? catalog.deleteWorkspace(deleting.id, confirmation)
              : deleting.kind === "project"
                ? catalog.deleteProject(deleting.id, confirmation)
                : catalog.removeMember(deleting.id);
          onNotify?.(
            `${deleting.kind[0].toUpperCase()}${deleting.kind.slice(1)} deleted`,
            undo,
          );
          if (deleting.kind === "member") onClose();
          else onWorkspace();
        }}
      />
    );
  return (
    <Dialog
      title={
        mode === "new-project"
          ? t("workspace.createProject")
          : t("workspace.yourWorkspaces")
      }
      onClose={onClose}
      className="catalog-dialog"
    >
      {mode === "new-project" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () =>
              onProject(
                await catalog.createProject({
                  name,
                  description,
                  color,
                  due,
                  icon,
                }),
              ),
            );
          }}
        >
          <p className="dialog-description">
            A new space for your next idea in{" "}
            <strong>{catalog.workspace.name}</strong>.
          </p>
          <div className="catalog-project-preview">
            <span className={`catalog-project-icon project-icon-${color}`}>
              <ProjectIcon project={{ icon }} size={19} />
            </span>
            <strong>{name.trim() || t("workspace.newProject")}</strong>
            <FolderPlus size={20} />
          </div>
          <Input
            label={t("workspace.projectName")}
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={100}
            required
            autoFocus
            placeholder="e.g. Customer portal"
          />
          <label className="form-label">
            {t("workspace.description")}{" "}
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={500}
              rows={3}
              placeholder="What are we working toward?"
            />
          </label>
          <div className="form-grid">
            <label className="form-label">
              {t("workspace.projectIcon")}
              <Select
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
              >
                <option value="website">
                  {t("workspace.projectTypes.website")}
                </option>
                <option value="app">{t("workspace.projectTypes.app")}</option>
                <option value="game">{t("workspace.projectTypes.game")}</option>
                <option value="design">
                  {t("workspace.projectTypes.design")}
                </option>
                <option value="marketing">
                  {t("workspace.projectTypes.marketing")}
                </option>
                <option value="code">{t("workspace.projectTypes.code")}</option>
                <option value="other">
                  {t("workspace.projectTypes.other")}
                </option>
              </Select>
            </label>
            <label className="form-label">
              {t("workspace.projectColor")}
              <Select
                value={color}
                onChange={(event) => setColor(event.target.value)}
              >
                <option value="purple">{t("workspace.colors.purple")}</option>
                <option value="blue">{t("workspace.colors.blue")}</option>
                <option value="peach">{t("workspace.colors.peach")}</option>
                <option value="green">{t("workspace.colors.green")}</option>
              </Select>
            </label>
            <div className="form-label">
              <DateInput
                label="Due date (optional)"
                value={due}
                onValueChange={(value) => setDue(value)}
              />
            </div>
          </div>
          {error && (
            <p className="catalog-error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="button button-primary"
              disabled={!catalog.ready || !name.trim()}
            >
              <Plus size={15} />
              {t("workspace.createProject")}
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="dialog-description">
            Keep each team&apos;s projects and tasks in its own workspace.
          </p>
          <div
            className="catalog-tabs"
            role="group"
            aria-label="Workspace action"
          >
            {(
              [
                ["switch", "Switch"],
                ["create", "Create"],
                ["join", "Join"],
                ["manage", "Manage"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                aria-pressed={tab === value}
                onClick={() => {
                  setTab(value);
                  setError("");
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "switch" && (
            <>
              <div className="catalog-workspace-list">
                {catalog.workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    disabled={!catalog.ready}
                    onClick={() =>
                      run(() => {
                        catalog.switchWorkspace(workspace.id);
                        onWorkspace();
                      })
                    }
                  >
                    <WorkspaceLogo workspace={workspace} size="sm" />
                    <span className="legacy-workspace-initial">
                      {workspace.name.slice(0, 1).toUpperCase()}
                    </span>
                    <span>
                      <strong>{workspace.name}</strong>
                      <small>
                        {workspace.id === catalog.workspace.id
                          ? "Current workspace"
                          : "Open workspace"}
                      </small>
                    </span>
                    {workspace.id === catalog.workspace.id && (
                      <Check size={17} />
                    )}
                  </button>
                ))}
              </div>
              <Input
                label="Workspace code"
                value={catalog.workspace.inviteCode}
                readOnly
                onFocus={(event) => event.target.select()}
              />
              <button
                className="button button-small"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      catalog.workspace.inviteCode,
                    );
                    setCopied(true);
                  } catch {
                    setError("Select and copy the workspace code above.");
                  }
                }}
              >
                <Copy size={14} />
                {copied ? "Copied" : "Copy code"}
              </button>
            </>
          )}
          {tab === "create" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  await catalog.createWorkspace(name);
                  onWorkspace();
                });
              }}
            >
              <Input
                label="Workspace name"
                autoFocus
                required
                maxLength={80}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Product studio"
              />
              <p className="catalog-note">
                Your workspace starts empty. Add your first project next.
              </p>
              <div className="dialog-actions">
                <button
                  className="button button-primary"
                  disabled={!catalog.ready || !name.trim()}
                >
                  <Plus size={15} />
                  Create workspace
                </button>
              </div>
            </form>
          )}
          {tab === "join" && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  await catalog.joinWorkspace(code);
                  onWorkspace();
                });
              }}
            >
              <Input
                label="Workspace code"
                autoFocus
                required
                value={code}
                maxLength={80}
                onChange={(event) => setCode(event.target.value)}
                placeholder="ORBIT-…"
                autoComplete="off"
              />
              <div className="dialog-actions">
                <button
                  className="button button-primary"
                  disabled={!catalog.ready || !code.trim()}
                >
                  <LogIn size={15} />
                  Join workspace
                </button>
              </div>
            </form>
          )}
          {tab === "manage" && catalog.workspace.id && (
            <>
              <section
                className="member-management"
                aria-labelledby="member-management-title"
              >
                <div className="member-management-heading">
                  <div>
                    <h3 id="member-management-title">
                      {t("workspace.workspaceMembers")}
                    </h3>
                    <p>
                      {catalog.members.length} member
                      {catalog.members.length === 1 ? "" : "s"} · changes stay
                      in this workspace
                    </p>
                  </div>
                  <span className="member-count-badge">
                    {catalog.members.length}
                  </span>
                </div>
                <div className="workspace-member-list">
                  {catalog.members.map((member) => (
                    <div className="workspace-member-row" key={member.id}>
                      <span
                        className={`member-color-dot member-color-${member.color}`}
                      >
                        {member.initials}
                      </span>
                      <span className="workspace-member-identity">
                        <strong>{member.name}</strong>
                        <small>
                          {member.email} · {member.team}
                        </small>
                      </span>
                      <Select
                        aria-label={`Role for ${member.name}`}
                        density="compact"
                        value={member.role}
                        disabled={member.role === "owner"}
                        onChange={(event) =>
                          run(() =>
                            catalog.updateMemberRole(
                              member.id,
                              event.target.value as "admin" | "member",
                            ),
                          )
                        }
                      >
                        <option value="owner">{t("workspace.owner")}</option>
                        <option value="admin">{t("workspace.admin")}</option>
                        <option value="member">{t("workspace.member")}</option>
                      </Select>
                      {member.role !== "owner" && (
                        <button
                          type="button"
                          className="member-remove-button"
                          aria-label={`Remove ${member.name}`}
                          onClick={() =>
                            setDeleting({
                              kind: "member",
                              id: member.id,
                              name: member.name,
                            })
                          }
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <form
                  className="member-add-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    run(() => {
                      catalog.addMember({
                        name: memberName,
                        email: memberEmail,
                        role: memberRole,
                        team: memberTeam,
                        color: memberColor,
                      });
                      setMemberName("");
                      setMemberEmail("");
                      setMemberTeam("General");
                    });
                  }}
                >
                  <h4>{t("workspace.addMember")}</h4>
                  <div className="member-add-grid">
                    <Input
                      label="Name"
                      value={memberName}
                      onChange={(event) => setMemberName(event.target.value)}
                      maxLength={80}
                      required
                      placeholder="Jamie Lee"
                    />
                    <Input
                      label="Email"
                      type="email"
                      value={memberEmail}
                      onChange={(event) => setMemberEmail(event.target.value)}
                      maxLength={160}
                      required
                      placeholder="jamie@studio.co"
                    />
                  </div>
                  <div className="member-add-grid">
                    <label className="form-label">
                      Role
                      <Select
                        value={memberRole}
                        onChange={(event) =>
                          setMemberRole(
                            event.target.value as "admin" | "member",
                          )
                        }
                      >
                        <option value="member">{t("workspace.member")}</option>
                        <option value="admin">{t("workspace.admin")}</option>
                      </Select>
                    </label>
                    <Input
                      label="Team"
                      value={memberTeam}
                      onChange={(event) => setMemberTeam(event.target.value)}
                      maxLength={60}
                      placeholder="Design"
                    />
                  </div>
                  <div className="member-add-actions">
                    <label className="form-label">
                      Avatar color
                      <Select
                        density="compact"
                        value={memberColor}
                        onChange={(event) => setMemberColor(event.target.value)}
                      >
                        <option value="purple">
                          {t("workspace.colors.purple")}
                        </option>
                        <option value="blue">
                          {t("workspace.colors.blue")}
                        </option>
                        <option value="pink">
                          {t("workspace.colors.pink")}
                        </option>
                        <option value="green">
                          {t("workspace.colors.green")}
                        </option>
                        <option value="peach">
                          {t("workspace.colors.peach")}
                        </option>
                      </Select>
                    </label>
                    <button
                      className="button button-primary"
                      disabled={
                        !catalog.ready ||
                        !memberName.trim() ||
                        !memberEmail.trim()
                      }
                    >
                      <Plus size={15} />
                      Add member
                    </button>
                  </div>
                </form>
              </section>
              <h3 className="catalog-manage-heading">
                Projects in {catalog.workspace.name}
              </h3>
              <div className="catalog-project-list">
                {catalog.projects.map((project) => (
                  <div key={project.id}>
                    <span className={`project-dot dot-${project.color}`} />
                    <span>
                      <strong>{project.name}</strong>
                      <small>
                        {
                          tasks.filter((task) => task.projectId === project.id)
                            .length
                        }{" "}
                        tasks
                      </small>
                    </span>
                    <button
                      type="button"
                      className="button delete-outline-button"
                      aria-label={`Delete project ${project.name}`}
                      onClick={() =>
                        setDeleting({
                          kind: "project",
                          id: project.id,
                          name: project.name,
                        })
                      }
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              {!catalog.projects.length && (
                <EmptyState
                  title="No projects yet"
                  description="Create a project to give your team a clear place to work."
                  action={
                    <button
                      type="button"
                      className="button button-primary"
                      onClick={() => setTab("create")}
                    >
                      Create project
                    </button>
                  }
                />
              )}
              <div className="catalog-danger-zone">
                <h3>{t("workspace.dangerZone")}</h3>
                <p>
                  Delete <strong>{catalog.workspace.name}</strong> and every
                  project inside it. You will need to confirm its exact name.
                </p>
                <button
                  type="button"
                  className="button delete-outline-button"
                  onClick={() =>
                    setDeleting({
                      kind: "workspace",
                      id: catalog.workspace.id,
                      name: catalog.workspace.name,
                    })
                  }
                >
                  <Trash2 size={15} />
                  Delete workspace
                </button>
              </div>
            </>
          )}
          {(error || catalog.error) && (
            <div className="catalog-error" role="alert">
              <span>{error || catalog.error}</span>
              {error && retryAction && (
                <button
                  type="button"
                  className="button button-small"
                  onClick={() => retryAction()}
                >
                  Retry
                </button>
              )}
            </div>
          )}
          <p className="catalog-note">
            Local workspace mode: codes open workspaces saved in this browser.
            Joining from another account or device requires a connected
            workspace service.
          </p>
        </>
      )}
    </Dialog>
  );
}
