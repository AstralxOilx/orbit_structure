"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link2, X } from "lucide-react";
import { Dialog, IconButton, Select } from "@/shared/ui";
import { useRepository, useTasks } from "@/features/workspace/provider";

export function TimelineDependencies({
  taskId,
  onClose,
}: {
  taskId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const tasks = useTasks();
  const repository = useRepository();
  const task = tasks.find((item) => item.id === taskId);
  const [selected, setSelected] = useState("");
  const [error, setError] = useState<string | null>(null);
  const dependencies = task?.dependsOn ?? [];
  const candidates = tasks.filter(
    (item) =>
      item.projectId === task?.projectId &&
      item.id !== taskId &&
      !dependencies.includes(item.id),
  );
  return (
    <Dialog title={t("workspace.taskDependencies")} onClose={onClose}>
      {task ? (
        <>
          <p className="dialog-description">
            {t("workspace.dependencyDescription")}
          </p>
          <ul className="timeline-dependency-list">
            {dependencies.map((id) => {
              const dependency = tasks.find((item) => item.id === id);
              const conflict =
                dependency?.dueOn &&
                task.startOn &&
                dependency.dueOn >= task.startOn;
              return (
                <li key={id}>
                  <Link2 size={15} aria-hidden />
                  <span>
                    {dependency?.title ?? t("workspace.unavailableTask")}
                    <small>
                      {dependency
                        ? `${dependency.id} · ${dependency.dueOn || t("workspace.notScheduled")}`
                        : id}
                      {conflict ? ` · ${t("workspace.datesOverlap")}` : ""}
                    </small>
                  </span>
                  <IconButton
                    label={`Remove dependency ${dependency?.title ?? id}`}
                    onClick={() =>
                      setError(
                        repository.setDependencies(
                          taskId,
                          dependencies.filter((value) => value !== id),
                        ),
                      )
                    }
                  >
                    <X size={15} />
                  </IconButton>
                </li>
              );
            })}
          </ul>
          {!dependencies.length && (
            <p className="timeline-dependency-empty">
              {t("workspace.noPrerequisites")}
            </p>
          )}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!selected) return;
              const result = repository.setDependencies(taskId, [
                ...dependencies,
                selected,
              ]);
              setError(result);
              if (!result) setSelected("");
            }}
          >
            <label className="form-label">
              {t("workspace.prerequisite")}
              <Select
                value={selected}
                onChange={(event) => {
                  setSelected(event.target.value);
                  setError(null);
                }}
                disabled={!candidates.length}
              >
                <option value="">
                  {candidates.length
                    ? t("workspace.chooseTask")
                    : t("workspace.noTasksAvailable")}
                </option>
                {candidates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.id} · {item.title}
                  </option>
                ))}
              </Select>
            </label>
            {error && (
              <p className="timeline-dependency-error" role="alert">
                {error}
              </p>
            )}
            <p className="timeline-dependency-note">
              {t("workspace.dependencyNote")}
            </p>
            <div className="dialog-actions">
              <button type="button" className="button" onClick={onClose}>
                {t("workspace.done")}
              </button>
              <button className="button button-primary" disabled={!selected}>
                {t("workspace.addLink")}
              </button>
            </div>
          </form>
        </>
      ) : (
        <p className="dialog-description">{t("workspace.taskUnavailable")}</p>
      )}
    </Dialog>
  );
}
