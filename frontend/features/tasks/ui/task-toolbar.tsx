"use client";

import { Select } from "@/shared/ui/select";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  ArrowDownUp,
  ChevronDown,
  Columns3,
  Search,
  Save,
  Settings2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { IconButton, Input } from "@/shared/ui";
import { TAG_COLORS } from "@/features/workspace/data";
import { useMembers } from "@/features/workspace/catalog";
import type { TaskFilters } from "../domain/task";

export function TaskToolbar({
  filters,
  query,
  count,
  setLocation,
  onDisplay,
}: {
  filters: TaskFilters;
  query: string;
  count: number;
  setLocation: (
    changes: Record<string, string | null>,
    replace?: boolean,
  ) => void;
  onDisplay: () => void;
}) {
  const { t } = useTranslation();
  const MEMBERS = useMembers();
  type SavedFilter = {
    id: string;
    name: string;
    values: Record<string, string | null>;
  };
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [filterName, setFilterName] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("orbit.task.saved-filters.v1") ?? "[]",
      );
      if (Array.isArray(saved)) queueMicrotask(() => setSavedFilters(saved));
    } catch {
      queueMicrotask(() => setSavedFilters([]));
    }
  }, []);
  const filterRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      const filter = filterRef.current;
      if (filter?.open && !filter.contains(event.target as Node)) {
        filter.open = false;
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);
  const filterCount =
    Number(filters.priority !== "all") +
    Number(filters.assigneeId !== "all") +
    Number(filters.tag !== "all") +
    Number(filters.due !== "all");
  return (
    <>
      <div className="task-toolbar">
        <div className="task-toolbar-left">
          <div className="task-search">
            <Input
              label=""
              aria-label={t("search.tasks")}
              icon={<Search size={15} />}
              className="task-search-input"
              placeholder={t("search.tasks")}
              value={query}
              onChange={(event) => setLocation({ q: event.target.value }, true)}
            />
            {query && (
              <button
                aria-label={t("workspace.clearFilters")}
                onClick={() => setLocation({ q: null }, true)}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <span className="toolbar-divider" />
          <details ref={filterRef} className="filter-popover">
            <summary
              className={`toolbar-button ${filterCount ? "is-filtered" : ""}`}
            >
              <SlidersHorizontal size={14} />
              {t("workspace.filter")}
              {filterCount > 0 && <b>{filterCount}</b>}
              <ChevronDown size={12} />
            </summary>
            <div className="filter-panel">
              <div className="filter-panel-heading">
                <strong>{t("workspace.makeSpace")}</strong>
                <button
                  onClick={() =>
                    setLocation({
                      priority: null,
                      assignee: null,
                      tag: null,
                      due: null,
                    })
                  }
                >
                  {t("workspace.reset")}
                </button>
              </div>
              <label>
                {t("workspace.priority")}
                <Select
                  density="compact"
                  value={filters.priority}
                  onChange={(event) =>
                    setLocation({ priority: event.target.value })
                  }
                >
                  <option value="all">{t("workspace.allPriorities")}</option>
                  <option value="urgent">{t("workspace.urgent")}</option>
                  <option value="high">{t("workspace.high")}</option>
                  <option value="normal">{t("workspace.medium")}</option>
                  <option value="low">{t("workspace.low")}</option>
                </Select>
              </label>
              <label>
                {t("workspace.assignee")}
                <Select
                  density="compact"
                  value={filters.assigneeId}
                  onChange={(event) =>
                    setLocation({ assignee: event.target.value })
                  }
                >
                  <option value="all">{t("workspace.everyone")}</option>
                  {MEMBERS.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                {t("workspace.tag")}
                <Select
                  density="compact"
                  value={filters.tag}
                  onChange={(event) => setLocation({ tag: event.target.value })}
                >
                  <option value="all">{t("workspace.allTags")}</option>
                  {Object.keys(TAG_COLORS).map((tag) => (
                    <option key={tag}>{tag}</option>
                  ))}
                </Select>
              </label>
              <label>
                {t("workspace.dueDate")}
                <Select
                  density="compact"
                  value={filters.due}
                  onChange={(event) => setLocation({ due: event.target.value })}
                >
                  <option value="all">{t("workspace.anyTime")}</option>
                  <option value="week">{t("workspace.nextSevenDays")}</option>
                  <option value="overdue">{t("workspace.overdue")}</option>
                </Select>
              </label>
              <div className="saved-filters">
                <span className="saved-filters-label">
                  {t("workspace.savedFilters")}
                </span>
                {savedFilters.map((saved) => (
                  <button
                    type="button"
                    className="saved-filter-item"
                    key={saved.id}
                    onClick={() => setLocation(saved.values, true)}
                  >
                    <span>{saved.name}</span>
                    <small>{t("workspace.load")}</small>
                  </button>
                ))}
                <div className="save-filter-row">
                  <Input
                    label=""
                    aria-label={t("workspace.savedFilterName")}
                    className="saved-filter-input"
                    placeholder={t("workspace.nameThisFilter")}
                    value={filterName}
                    maxLength={40}
                    onChange={(event) => setFilterName(event.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!filterName.trim()}
                    onClick={() => {
                      const next = [
                        ...savedFilters.filter(
                          (saved) => saved.name !== filterName.trim(),
                        ),
                        {
                          id: crypto.randomUUID(),
                          name: filterName.trim(),
                          values: {
                            q: query || null,
                            priority:
                              filters.priority === "all"
                                ? null
                                : filters.priority,
                            assignee:
                              filters.assigneeId === "all"
                                ? null
                                : filters.assigneeId,
                            tag: filters.tag === "all" ? null : filters.tag,
                            due: filters.due === "all" ? null : filters.due,
                            hideDone: filters.hideDone ? "1" : null,
                            sort:
                              filters.sort === "manual" ? null : filters.sort,
                          },
                        },
                      ];
                      setSavedFilters(next);
                      localStorage.setItem(
                        "orbit.task.saved-filters.v1",
                        JSON.stringify(next),
                      );
                      setFilterName("");
                    }}
                  >
                    <Save size={13} /> {t("workspace.save")}
                  </button>
                </div>
              </div>
            </div>
          </details>
          <label className="toolbar-button sort-control">
            <ArrowDownUp size={14} />
            <Select
              density="compact"
              variant="subtle"
              aria-label={t("workspace.sort")}
              value={filters.sort}
              onChange={(event) => setLocation({ sort: event.target.value })}
            >
              <option value="manual">{t("workspace.sort")}</option>
              <option value="priority">{t("workspace.priority")}</option>
              <option value="due">{t("workspace.dueDate")}</option>
            </Select>
            <ChevronDown size={12} />
          </label>
          <span className="toolbar-group-label">
            <Columns3 size={14} />
            {t("workspace.status")}
          </span>
        </div>
        <div className="task-toolbar-right">
          <span className="task-total">
            {t("workspace.tasksCount", { count })}
          </span>
          <span className="toolbar-divider" />
          <label className="hide-done-toggle">
            <input
              type="checkbox"
              checked={filters.hideDone}
              onChange={(event) =>
                setLocation({ hideDone: event.target.checked ? "1" : null })
              }
            />
            <span className="switch-track">
              <i />
            </span>
            <span>{t("workspace.hideDone")}</span>
          </label>
          <IconButton label={t("workspace.displayOptions")} onClick={onDisplay}>
            <Settings2 size={16} />
          </IconButton>
        </div>
      </div>
      {filterCount > 0 && (
        <div className="active-filters">
          <span>{t("workspace.filteredBy")}</span>
          {filters.priority !== "all" && (
            <button onClick={() => setLocation({ priority: null })}>
              {filters.priority} priority <X size={11} />
            </button>
          )}
          {filters.assigneeId !== "all" && (
            <button onClick={() => setLocation({ assignee: null })}>
              {MEMBERS.find((member) => member.id === filters.assigneeId)
                ?.name ?? t("workspace.unassigned")}
              <X size={11} />
            </button>
          )}
          {filters.tag !== "all" && (
            <button onClick={() => setLocation({ tag: null })}>
              {filters.tag}
              <X size={11} />
            </button>
          )}
          {filters.due !== "all" && (
            <button onClick={() => setLocation({ due: null })}>
              {filters.due === "week"
                ? t("workspace.nextSevenDays")
                : t("workspace.overdue")}
              <X size={11} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
