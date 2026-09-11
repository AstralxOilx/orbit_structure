"use client";

import { Select } from "@/shared/ui/select";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import { StatusIcon } from "@/features/tasks/ui/status-icon";
import {
  ArrowUpRight,
  CheckCheck,
  FolderKanban,
  MessageSquare,
  Layers3,
  Orbit,
  Rocket,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react";
import {
  Dialog,
  EmptyState,
  Input,
  LanguageSwitcher,
  OrbitMark,
} from "@/shared/ui";
import { useMembers } from "@/features/workspace/catalog";
import { useCatalog, type WorkspaceColor, type WorkspaceLogo } from "./catalog";
import { WorkspaceLogo as WorkspaceLogoView } from "./ui/workspace-logo";
import { ProjectIcon } from "./ui/project-icon";
import { ThemeSelect } from "@/shared/theme/theme-select";
import type { WorkspaceModal } from "./sidebar";
import type { Task } from "../tasks/domain/task";
import {
  backupToJson,
  createBackup,
  downloadFile,
  restoreBackup,
  tasksToCsv,
  type WorkspaceBackup,
} from "./backup";
import { parseWorkspaceBackup } from "@/lib/schemas/workspace-backup.schema";
import type { WorkspacePreferences } from "./preferences";
import { readRecent, type RecentItem } from "./recent";

export function WorkspaceModals({
  modal,
  close,
  projectId,
  tasks,
  memberId,
  onOpen,
  onProject,
  onMember,
  notify,
  density,
  setDensity,
  preferences,
  onPreferencesChange,
  onCommand,
}: {
  modal: WorkspaceModal;
  close: () => void;
  projectId: string;
  tasks: readonly Task[];
  memberId: string;
  onOpen: (id: string) => void;
  onProject: (id: string) => void;
  onMember: (id: string) => void;
  notify: (message: string) => void;
  density: string;
  setDensity: (value: string) => void;
  preferences: WorkspacePreferences;
  onPreferencesChange: (value: WorkspacePreferences) => void;
  onCommand: (command: string) => void;
}) {
  const { t } = useTranslation();
  const MEMBERS = useMembers();
  const [query, setQuery] = useState("");
  const {
    projects: PROJECTS,
    workspace,
    updateWorkspace,
    updateProject,
    updateMemberProfile,
  } = useCatalog();
  const project = PROJECTS.find((item) => item.id === projectId);
  const [settingsName, setSettingsName] = useState(workspace.name);
  const [settingsInitials, setSettingsInitials] = useState(workspace.initials);
  const [settingsLogo, setSettingsLogo] = useState<WorkspaceLogo>(
    workspace.logo,
  );
  const [settingsColor, setSettingsColor] = useState<WorkspaceColor>(
    workspace.color,
  );
  const [settingsError, setSettingsError] = useState("");
  const [projectName, setProjectName] = useState(project?.name ?? "");
  const [projectDescription, setProjectDescription] = useState(
    project?.description ?? "",
  );
  const [projectIcon, setProjectIcon] = useState(project?.icon ?? "other");
  const [projectColor, setProjectColor] = useState(project?.color ?? "purple");
  const [projectDue, setProjectDue] = useState(project?.due ?? "");
  const [projectError, setProjectError] = useState("");
  const profile =
    MEMBERS.find((member) => member.id === memberId) ?? MEMBERS[0];
  const [profileName, setProfileName] = useState(profile?.name ?? "");
  const [profileEmail, setProfileEmail] = useState(profile?.email ?? "");
  const [profileRole, setProfileRole] = useState(profile?.role ?? "member");
  const [profileTeam, setProfileTeam] = useState(profile?.team ?? "");
  const [profileColor, setProfileColor] = useState(profile?.color ?? "purple");
  const [profileError, setProfileError] = useState("");
  const [profileSection, setProfileSection] = useState<
    "profile" | "account" | "preferences" | "security"
  >("profile");
  const [backupFile, setBackupFile] = useState<WorkspaceBackup | null>(null);
  const [backupError, setBackupError] = useState("");
  const appearance = <ThemeSelect className="form-label" />;
  const projectDirty =
    Boolean(project) &&
    [
      projectName,
      projectDescription,
      projectIcon,
      projectColor,
      projectDue,
    ].some(
      (value, index) =>
        value !==
        [
          project?.name,
          project?.description,
          project?.icon,
          project?.color,
          project?.due,
        ][index],
    );
  const profileDirty =
    Boolean(profile) &&
    [profileName, profileEmail, profileRole, profileTeam, profileColor].some(
      (value, index) =>
        value !==
        [
          profile?.name,
          profile?.email,
          profile?.role,
          profile?.team,
          profile?.color,
        ][index],
    );
  const workspaceDirty = [
    settingsName,
    settingsInitials,
    settingsLogo,
    settingsColor,
  ].some(
    (value, index) =>
      value !==
      [workspace.name, workspace.initials, workspace.logo, workspace.color][
        index
      ],
  );
  const confirmDiscard = (dirty: boolean) =>
    !dirty || window.confirm(t("workspace.discardChanges"));
  if (modal === "backup")
    return (
      <Dialog title={t("workspace.backupTransfer")} onClose={close}>
        <div className="backup-intro">
          <h3>{t("workspace.keepCopy")}</h3>
          <p>{t("workspace.exportDescription")}</p>
        </div>
        <div className="backup-actions">
          <button
            type="button"
            className="button button-primary"
            onClick={() =>
              downloadFile(
                `${workspace.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-backup.json`,
                backupToJson(createBackup(workspace, PROJECTS, MEMBERS, tasks)),
                "application/json",
              )
            }
          >
            {t("workspace.exportJson")}
          </button>
          <button
            type="button"
            className="button"
            onClick={() =>
              downloadFile(
                `${workspace.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-tasks.csv`,
                tasksToCsv(tasks),
                "text/csv;charset=utf-8",
              )
            }
          >
            {t("workspace.exportTasksCsv")}
          </button>
        </div>
        <label className="backup-dropzone">
          <strong>{t("workspace.restoreJson")}</strong>
          <span>{t("workspace.chooseBackup")}</span>
          <input
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              file.text().then((text) => {
                try {
                  const parsed = parseWorkspaceBackup(
                    JSON.parse(text),
                  ) as unknown as WorkspaceBackup;
                  setBackupFile(parsed);
                  setBackupError("");
                } catch (error) {
                  setBackupFile(null);
                  setBackupError(
                    error instanceof Error
                      ? error.message
                      : t("workspace.backupReadError"),
                  );
                }
              });
            }}
          />
        </label>
        {backupFile && (
          <div className="backup-preview">
            <strong>{backupFile.workspace.name}</strong>
            <span>
              {t("workspace.projectsCount", {
                count: backupFile.projects.length,
              })}{" "}
              ·{" "}
              {t("workspace.tasksCountLabel", {
                count: backupFile.tasks.length,
              })}{" "}
              ·{" "}
              {t("workspace.membersCount", {
                count: backupFile.members.length,
              })}
            </span>
            <button
              type="button"
              className="button button-danger"
              onClick={() => {
                if (!window.confirm(t("workspace.restoreConfirm"))) return;
                restoreBackup(backupFile);
                window.location.reload();
              }}
            >
              {t("workspace.restoreBackup")}
            </button>
          </div>
        )}
        {backupError && <p className="catalog-error">{backupError}</p>}
      </Dialog>
    );
  if (modal === "search") {
    const term = query.trim().toLowerCase();
    const results = tasks
      .filter((task) =>
        `${task.title} ${task.id} ${task.description}`
          .toLowerCase()
          .includes(term),
      )
      .slice(0, 12);
    const projectResults = PROJECTS.filter((item) =>
      `${item.name} ${item.description}`.toLowerCase().includes(term),
    ).slice(0, 6);
    const memberResults = MEMBERS.filter((item) =>
      `${item.name} ${item.email} ${item.team}`.toLowerCase().includes(term),
    ).slice(0, 6);
    const discussionResults = (() => {
      try {
        const stored = JSON.parse(
          localStorage.getItem(
            `orbit.workspace.discussion.v1.${workspace.id}`,
          ) ?? "[]",
        );
        return Array.isArray(stored)
          ? stored
              .filter((item) => `${item.body}`.toLowerCase().includes(term))
              .slice(0, 6)
          : [];
      } catch {
        return [];
      }
    })();
    const totalResults =
      results.length +
      projectResults.length +
      memberResults.length +
      discussionResults.length;
    const recentItems: RecentItem[] = !query ? readRecent(workspace.id) : [];
    const commands = [
      [
        "new-task",
        t("workspace.createNewTask"),
        t("workspace.addTaskCurrentProject"),
      ],
      [
        "new-project",
        t("workspace.createNewProject"),
        t("workspace.startNewProject"),
      ],
      [
        "discussion",
        t("workspace.openDiscussion"),
        t("workspace.talkWithTeam"),
      ],
      [
        "activity",
        t("workspace.openActivityLog"),
        t("workspace.reviewChanges"),
      ],
    ] as const;
    return (
      <Dialog
        title={t("workspace.findNextFocus")}
        onClose={close}
        className="search-dialog"
      >
        <div className="command-search">
          <Search size={20} />
          <Input
            label=""
            autoFocus
            placeholder={t("workspace.searchWorkspace")}
            aria-label={t("workspace.searchWorkspace")}
            className="command-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>{t("workspace.escape")}</kbd>
        </div>
        <div className="command-results">
          <span className="command-section-label">
            {query?.startsWith(">")
              ? t("workspace.commands")
              : query
                ? t("workspace.searchResults", { count: totalResults })
                : recentItems.length
                  ? t("workspace.recentItems")
                  : t("workspace.yourTasks")}
          </span>
          {query.startsWith(">") &&
            commands
              .filter((command) =>
                command[1]
                  .toLowerCase()
                  .includes(query.slice(1).trim().toLowerCase()),
              )
              .map(([id, label, detail]) => (
                <button
                  key={id}
                  onClick={() => {
                    close();
                    onCommand(id);
                  }}
                >
                  <Sparkles size={16} />
                  <span>
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </span>
                  <kbd>↵</kbd>
                </button>
              ))}
          {!query &&
            recentItems.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => {
                  close();
                  if (item.type === "task") onOpen(item.id);
                  else onProject(item.id);
                }}
              >
                <ArrowUpRight size={16} />
                <span>
                  <strong>{item.name}</strong>
                  <small>
                    {item.type === "task"
                      ? t("workspace.recentTask")
                      : t("workspace.recentProject")}
                  </small>
                </span>
              </button>
            ))}
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
          {query && projectResults.length > 0 && (
            <span className="command-section-label">
              <FolderKanban size={12} /> {t("workspace.projectsLabel")}
            </span>
          )}
          {projectResults.map((item) => (
            <button
              key={`project-${item.id}`}
              onClick={() => {
                close();
                onProject(item.id);
              }}
            >
              <FolderKanban size={16} />
              <span>
                <strong>{item.name}</strong>
                <small>{item.description}</small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
          {query && memberResults.length > 0 && (
            <span className="command-section-label">
              <UsersRound size={12} /> {t("workspace.members")}
            </span>
          )}
          {memberResults.map((item) => (
            <button
              key={`member-${item.id}`}
              className="command-member-result"
              onClick={() => {
                close();
                onMember(item.id);
              }}
            >
              <span className="command-member-avatar">
                <Avatar id={item.id} size="xs" />
              </span>
              <span>
                <strong>{item.name}</strong>
                <small>
                  {item.role} · {item.team}
                </small>
              </span>
              <ArrowUpRight size={15} />
            </button>
          ))}
          {query && discussionResults.length > 0 && (
            <span className="command-section-label">
              <MessageSquare size={12} /> {t("workspace.discussionLabel")}
            </span>
          )}
          {discussionResults.map(
            (item: { id: string; body: string; createdAt: number }) => (
              <button key={`discussion-${item.id}`} onClick={close}>
                <MessageSquare size={16} />
                <span>
                  <strong>{item.body}</strong>
                  <small>{t("workspace.discussionLabel")}</small>
                </span>
                <ArrowUpRight size={15} />
              </button>
            ),
          )}
          {!totalResults && !query.startsWith(">") && (
            <EmptyState
              title={
                query ? t("workspace.noResults") : t("workspace.startSearching")
              }
              description={
                query
                  ? t("workspace.tryDifferentKeyword")
                  : t("workspace.searchAllEntities")
              }
              action={
                query ? (
                  <button className="button" onClick={() => setQuery("")}>
                    {t("workspace.clearSearch")}
                  </button>
                ) : undefined
              }
            />
          )}
        </div>
        <div className="command-footer">
          <span>
            <kbd>Tab</kbd> {t("workspace.tabToNavigate")}
          </span>
          <span>
            <kbd>↵</kbd> {t("workspace.openAction")}
          </span>
        </div>
      </Dialog>
    );
  }
  if (modal === "share")
    return (
      <Dialog title={t("workspace.goodWorkTogether")} onClose={close}>
        <p className="dialog-description">
          {t("workspace.workspaceCodeFor")} {workspace.name}.{" "}
          {t("workspace.useCodeJoin")}
        </p>
        <div className="share-link">
          <span>{workspace.inviteCode}</span>
          <button
            className="button button-primary button-small"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(workspace.inviteCode);
                notify(t("workspace.copiedWorkspaceCode"));
              } catch {
                notify(t("workspace.clipboardError"));
              }
            }}
          >
            {t("workspace.copyCode")}
          </button>
        </div>
        <h3 className="share-members-heading">
          {t("workspace.workspaceTeam")} <span>{MEMBERS.length}</span>
        </h3>
        {MEMBERS.map((member) => (
          <div className="share-member" key={member.id}>
            <Avatar id={member.id} />
            <span>
              <strong>{member.name}</strong>
              <small>{member.email}</small>
            </span>
            <span>
              {member.role === "owner"
                ? t("workspace.ownerRole")
                : t("workspace.memberRole")}
            </span>
          </div>
        ))}
        <p className="local-sharing-note">{t("workspace.sharingNote")}</p>
      </Dialog>
    );
  if (modal === "display")
    return (
      <Dialog title={t("workspace.makeSpaceYours")} onClose={close}>
        <p className="dialog-description">{t("workspace.comfortableView")}</p>
        <label className="form-label">
          {t("workspace.density")}
          <Select
            value={density}
            onChange={(event) => setDensity(event.target.value)}
          >
            <option value="comfortable">
              {t("workspace.comfortableDensityLong")}
            </option>
            <option value="compact">{t("workspace.compactDensity")}</option>
          </Select>
        </label>
        <label className="form-label">
          {t("workspace.layout")}
          <Select
            value={preferences.layout}
            onChange={(event) =>
              onPreferencesChange({
                ...preferences,
                layout: event.target.value as WorkspacePreferences["layout"],
              })
            }
          >
            <option value="balanced">{t("workspace.balancedDensity")}</option>
            <option value="focus">{t("workspace.focusDensity")}</option>
          </Select>
        </label>
        <label className="form-label">
          {t("workspace.defaultProjectView")}
          <Select
            value={preferences.defaultView}
            onChange={(event) =>
              onPreferencesChange({
                ...preferences,
                defaultView: event.target
                  .value as WorkspacePreferences["defaultView"],
              })
            }
          >
            <option value="board">{t("workspace.board")}</option>
            <option value="list">{t("workspace.list")}</option>
            <option value="timeline">{t("workspace.timeline")}</option>
          </Select>
        </label>
        <div className="form-label">
          <span>{t("workspace.languageLabel")}</span>
          <LanguageSwitcher
            value={preferences.language}
            onChange={(language) =>
              onPreferencesChange({ ...preferences, language })
            }
          />
        </div>
        <label className="form-label">
          {t("workspace.dateFormat")}
          <Select
            value={preferences.dateFormat}
            onChange={(event) =>
              onPreferencesChange({
                ...preferences,
                dateFormat: event.target
                  .value as WorkspacePreferences["dateFormat"],
              })
            }
          >
            <option value="locale">{t("workspace.localFormat")}</option>
            <option value="iso">{t("workspace.isoFormat")}</option>
          </Select>
        </label>
        <fieldset className="preference-checks">
          <legend>{t("workspace.notificationsSettings")}</legend>
          {(["activity", "comments", "deadlines"] as const).map((item) => (
            <label key={item}>
              <input
                type="checkbox"
                checked={preferences.notifications[item]}
                onChange={(event) =>
                  onPreferencesChange({
                    ...preferences,
                    notifications: {
                      ...preferences.notifications,
                      [item]: event.target.checked,
                    },
                  })
                }
              />{" "}
              {item === "activity"
                ? t("workspace.workspaceActivity")
                : item === "comments"
                  ? t("workspace.taskComments")
                  : t("workspace.upcomingDeadlines")}
            </label>
          ))}
        </fieldset>
        {appearance}
        <div className="dialog-actions">
          <button className="button button-primary" onClick={close}>
            {t("workspace.doneAction")}
          </button>
        </div>
      </Dialog>
    );
  if (modal === "help")
    return (
      <Dialog title={t("workspace.shortcutsTitle")} onClose={close}>
        <p className="dialog-description">
          {t("workspace.shortcutsDescription")}
        </p>
        {[
          [t("workspace.shortcutSearch"), "⌘ / Ctrl + K"],
          [t("workspace.shortcutCreateTask"), "N"],
          [t("workspace.shortcutShowHelp"), "?"],
          [t("workspace.shortcutClose"), "Esc"],
          [t("workspace.shortcutLift"), "Space"],
          [t("workspace.shortcutMove"), "Arrow keys"],
        ].map(([label, key]) => (
          <div key={key} className="shortcut-row">
            <span>{label}</span>
            <kbd>{key}</kbd>
          </div>
        ))}
        <p className="local-sharing-note">{t("workspace.openTaskHelp")}</p>
      </Dialog>
    );
  if (modal === "project-settings" && project)
    return (
      <Dialog
        title={t("workspace.projectSettings")}
        onClose={close}
        onRequestClose={() => confirmDiscard(projectDirty)}
      >
        <div className="project-settings-heading">
          <span className={`catalog-project-icon project-icon-${projectColor}`}>
            <ProjectIcon project={{ icon: projectIcon }} size={25} />
          </span>
          <div>
            <h3>{t("workspace.editProjectDetails")}</h3>
            <p>{t("workspace.projectSchedule")}</p>
          </div>
        </div>
        <form
          className="workspace-settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              updateProject(project.id, {
                name: projectName,
                description: projectDescription,
                icon: projectIcon,
                color: projectColor,
                due: projectDue,
              });
              close();
            } catch (error) {
              setProjectError(
                error instanceof Error
                  ? error.message
                  : t("workspace.saveProjectError"),
              );
            }
          }}
        >
          <Input
            label={t("workspace.projectName")}
            value={projectName}
            maxLength={100}
            onChange={(event) => setProjectName(event.target.value)}
            autoFocus
          />
          <label className="form-label">
            {t("workspace.projectDescription")}
            <textarea
              value={projectDescription}
              maxLength={500}
              rows={3}
              onChange={(event) => setProjectDescription(event.target.value)}
            />
          </label>
          <Input
            label={t("workspace.dueDate")}
            value={projectDue}
            placeholder={t("workspace.projectDuePlaceholder")}
            onChange={(event) => setProjectDue(event.target.value)}
          />
          <div className="form-label">
            {t("workspace.projectIcon")}
            <div className="workspace-mark-options project-icon-options">
              {(
                [
                  "website",
                  "mobile",
                  "system",
                  "design",
                  "marketing",
                  "code",
                  "other",
                ] as const
              ).map((icon) => (
                <button
                  type="button"
                  key={icon}
                  className={projectIcon === icon ? "selected" : ""}
                  aria-label={`${icon} icon`}
                  aria-pressed={projectIcon === icon}
                  onClick={() => setProjectIcon(icon)}
                >
                  <ProjectIcon project={{ icon }} size={17} />
                </button>
              ))}
            </div>
          </div>
          <div className="form-label">
            {t("workspace.projectIconColor")}
            <div
              className="workspace-color-options"
              role="radiogroup"
              aria-label={t("workspace.projectColor")}
            >
              {(["purple", "blue", "peach", "green"] as const).map((color) => (
                <button
                  type="button"
                  key={color}
                  className={`workspace-color-choice workspace-logo-${color} ${projectColor === color ? "selected" : ""}`}
                  aria-label={`${color} color`}
                  aria-pressed={projectColor === color}
                  onClick={() => setProjectColor(color)}
                />
              ))}
            </div>
          </div>
          {projectError && <p className="catalog-error">{projectError}</p>}
          <div className="dialog-actions">
            <button type="button" className="button" onClick={close}>
              {t("workspace.cancel")}
            </button>
            <button type="submit" className="button button-primary">
              {t("workspace.saveChanges")}
            </button>
          </div>
        </form>
      </Dialog>
    );
  if (modal === "profile-settings" && profile)
    return (
      <Dialog
        title={t("workspace.profileSettings")}
        className="profile-settings-dialog"
        onClose={close}
        onRequestClose={() => confirmDiscard(profileDirty)}
      >
        <div className="profile-settings-heading">
          <Avatar id={profile.id} size="lg" />
          <div>
            <h3>{t("workspace.personalProfile")}</h3>
            <p>{t("workspace.fullIdentity")}</p>
          </div>
        </div>
        <div className="profile-settings-layout">
          <nav className="profile-settings-nav" aria-label="Profile settings">
            {(
              [
                ["profile", "Profile"],
                ["account", "Account"],
                ["preferences", "Preferences"],
                ["security", "Security"],
              ] as const
            ).map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={profileSection === value ? "active" : ""}
                onClick={() => setProfileSection(value)}
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="profile-settings-content">
            {profileSection === "profile" ? (
              <form
          className="workspace-settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              updateMemberProfile(profile.id, {
                name: profileName,
                email: profileEmail,
                role: profileRole as "owner" | "admin" | "member",
                team: profileTeam,
                color: profileColor,
              });
              close();
            } catch (error) {
              setProfileError(
                error instanceof Error
                  ? error.message
                  : t("workspace.saveProfileError"),
              );
            }
          }}
        >
          <Input
            label={t("auth.fullName")}
            value={profileName}
            maxLength={80}
            onChange={(event) => setProfileName(event.target.value)}
            autoFocus
          />
          <Input
            label={t("auth.email")}
            type="email"
            value={profileEmail}
            onChange={(event) => setProfileEmail(event.target.value)}
          />
          <div className="form-grid">
            <label className="form-label">
              {t("workspace.role")}
              <Select
                aria-label={t("workspace.role")}
                value={profileRole}
                onChange={(event) =>
                  setProfileRole(event.target.value as typeof profileRole)
                }
              >
                <option value="owner">{t("workspace.owner")}</option>
                <option value="admin">{t("workspace.admin")}</option>
                <option value="member">{t("workspace.member")}</option>
              </Select>
            </label>
            <Input
              label={t("workspace.team")}
              value={profileTeam}
              maxLength={60}
              onChange={(event) => setProfileTeam(event.target.value)}
            />
          </div>
          <div className="form-label">
            {t("workspace.avatarColor")}
            <div
              className="workspace-color-options"
              role="radiogroup"
              aria-label={t("workspace.avatarColor")}
            >
              {(["purple", "blue", "peach", "green", "pink"] as const).map(
                (color) => (
                  <button
                    type="button"
                    key={color}
                    className={`workspace-color-choice profile-color-${color} ${profileColor === color ? "selected" : ""}`}
                    aria-label={`${color} avatar color`}
                    aria-pressed={profileColor === color}
                    onClick={() => setProfileColor(color)}
                  />
                ),
              )}
            </div>
          </div>
          {profileError && <p className="catalog-error">{profileError}</p>}
          <div className="dialog-actions">
            <button type="button" className="button" onClick={close}>
              {t("workspace.cancel")}
            </button>
            <button type="submit" className="button button-primary">
              {t("workspace.saveProfile")}
            </button>
          </div>
              </form>
            ) : profileSection === "account" ? (
          <section className="profile-settings-section">
            <h3>Account</h3>
            <p>Manage the identity connected to your Orbit account.</p>
            <div className="profile-settings-card">
              <span>Email address</span>
              <strong>{profileEmail || "—"}</strong>
            </div>
            <div className="profile-settings-card">
              <span>Account role</span>
              <strong>{profileRole}</strong>
            </div>
          </section>
        ) : profileSection === "preferences" ? (
          <section className="profile-settings-section">
            <h3>Preferences</h3>
            <p>Personalize how Orbit looks and feels for you.</p>
            <div className="profile-settings-card">
              <span>Appearance</span>
              <strong>Use the theme control in the sidebar</strong>
            </div>
            <div className="profile-settings-card">
              <span>Language</span>
              <strong>Change language from Workspace settings</strong>
            </div>
          </section>
        ) : (
          <section className="profile-settings-section">
            <h3>Security</h3>
            <p>
              Your password and active sessions are managed securely by the
              backend.
            </p>
            <div className="profile-settings-card">
              <span>Session</span>
              <strong>HttpOnly session cookie enabled</strong>
            </div>
          </section>
        )}
          </div>
        </div>
      </Dialog>
    );
  if (modal === "settings")
    return (
      <Dialog
        title={t("workspace.workspaceSettings")}
        onClose={close}
        onRequestClose={() => confirmDiscard(workspaceDirty)}
      >
        <div className="settings-brand">
          <WorkspaceLogoView workspace={workspace} size="lg" />
          <div>
            <h3>{t("workspace.makeWorkspaceYours")}</h3>
            <p>{t("workspace.recognizeSpace")}</p>
          </div>
        </div>
        <form
          className="workspace-settings-form"
          onSubmit={(event) => {
            event.preventDefault();
            try {
              updateWorkspace({
                name: settingsName,
                initials: settingsInitials,
                logo: settingsLogo,
                color: settingsColor,
              });
              close();
            } catch (error) {
              setSettingsError(
                error instanceof Error
                  ? error.message
                  : t("workspace.saveWorkspaceError"),
              );
            }
          }}
        >
          <Input
            label={t("workspace.workspaceName")}
            value={settingsName}
            maxLength={80}
            onChange={(event) => setSettingsName(event.target.value)}
            autoFocus
          />
          <div className="form-label">
            {t("workspace.workspaceMark")}
            <div
              className="workspace-mark-options"
              role="radiogroup"
              aria-label={t("workspace.workspaceMark")}
            >
              {(
                [
                  ["initials", t("workspace.initials"), null],
                  ["orbit", t("workspace.logoOrbit"), Orbit],
                  ["spark", t("workspace.logoSpark"), Sparkles],
                  ["layers", t("workspace.logoLayers"), Layers3],
                  ["rocket", t("workspace.logoRocket"), Rocket],
                ] as const
              ).map(([value, label, Icon]) => (
                <button
                  type="button"
                  key={value}
                  className={settingsLogo === value ? "selected" : ""}
                  aria-pressed={settingsLogo === value}
                  onClick={() => setSettingsLogo(value)}
                >
                  {Icon ? (
                    <Icon size={17} />
                  ) : (
                    <span>{settingsInitials || "AB"}</span>
                  )}
                  <small>{label}</small>
                </button>
              ))}
            </div>
          </div>
          {settingsLogo === "initials" && (
            <label className="form-label">
              {t("workspace.initials")}
              <Input
                label=""
                value={settingsInitials}
                maxLength={3}
                onChange={(event) =>
                  setSettingsInitials(
                    event.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase(),
                  )
                }
                placeholder={t("workspace.initialsPlaceholder")}
              />
              <span className="field-hint">{t("workspace.useLetters")}</span>
            </label>
          )}
          <div className="form-label">
            {t("workspace.color")}
            <div
              className="workspace-color-options"
              role="radiogroup"
              aria-label={t("workspace.color")}
            >
              {(["purple", "blue", "peach", "green"] as const).map((color) => (
                <button
                  type="button"
                  key={color}
                  className={`workspace-color-choice workspace-logo-${color} ${settingsColor === color ? "selected" : ""}`}
                  aria-label={`${color} color`}
                  aria-pressed={settingsColor === color}
                  onClick={() => setSettingsColor(color)}
                />
              ))}
            </div>
          </div>
          {settingsError && <p className="catalog-error">{settingsError}</p>}
          <div className="dialog-actions">
            <button type="button" className="button" onClick={close}>
              {t("workspace.cancel")}
            </button>
            <button type="submit" className="button button-primary">
              {t("workspace.saveChanges")}
            </button>
          </div>
        </form>
        {appearance}
        <div className="workspace-storage-info">
          <CheckCheck size={18} />
          <div>
            <strong>{t("workspace.savedOnDevice")}</strong>
            <p>{t("workspace.persistedChanges")}</p>
          </div>
        </div>
      </Dialog>
    );
  if (modal === "member") {
    const member = MEMBERS.find((value) => value.id === memberId)!;
    const assignments = tasks.filter((task) => task.assigneeId === member.id);
    return (
      <Dialog title={t("workspace.teamMember")} onClose={close}>
        <div className="member-profile">
          <Avatar id={member.id} size="lg" />
          <h2>{member.name}</h2>
          <p>
            {member.role} · {member.team}
          </p>
          <span>{member.email}</span>
        </div>
        <h3 className="share-members-heading">
          {t("workspace.assignedTasks")} <span>{assignments.length}</span>
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
