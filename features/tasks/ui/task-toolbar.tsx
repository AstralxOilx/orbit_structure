"use client";

import {
  ArrowDownUp,
  ChevronDown,
  Columns3,
  Search,
  Settings2,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { IconButton } from "@/shared/ui";
import { MEMBERS, TAG_COLORS } from "@/features/workspace/data";
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
            <Search size={15} />
            <input
              aria-label="Search tasks"
              placeholder="Search tasks…"
              value={query}
              onChange={(event) => setLocation({ q: event.target.value }, true)}
            />
            {query && (
              <button
                aria-label="Clear search"
                onClick={() => setLocation({ q: null }, true)}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <span className="toolbar-divider" />
          <details className="filter-popover">
            <summary
              className={`toolbar-button ${filterCount ? "is-filtered" : ""}`}
            >
              <SlidersHorizontal size={14} />
              Filter{filterCount > 0 && <b>{filterCount}</b>}
              <ChevronDown size={12} />
            </summary>
            <div className="filter-panel">
              <div className="filter-panel-heading">
                <strong>Make space for what matters</strong>
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
                  Reset
                </button>
              </div>
              <label>
                Priority
                <select
                  value={filters.priority}
                  onChange={(event) =>
                    setLocation({ priority: event.target.value })
                  }
                >
                  <option value="all">All priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="normal">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label>
                Assignee
                <select
                  value={filters.assigneeId}
                  onChange={(event) =>
                    setLocation({ assignee: event.target.value })
                  }
                >
                  <option value="all">Everyone</option>
                  {MEMBERS.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Tag
                <select
                  value={filters.tag}
                  onChange={(event) => setLocation({ tag: event.target.value })}
                >
                  <option value="all">All tags</option>
                  {Object.keys(TAG_COLORS).map((tag) => (
                    <option key={tag}>{tag}</option>
                  ))}
                </select>
              </label>
              <label>
                Due date
                <select
                  value={filters.due}
                  onChange={(event) => setLocation({ due: event.target.value })}
                >
                  <option value="all">Any time</option>
                  <option value="week">Next 7 days</option>
                  <option value="overdue">Overdue</option>
                </select>
              </label>
            </div>
          </details>
          <label className="toolbar-button sort-control">
            <ArrowDownUp size={14} />
            <select
              aria-label="Sort tasks"
              value={filters.sort}
              onChange={(event) => setLocation({ sort: event.target.value })}
            >
              <option value="manual">Sort</option>
              <option value="priority">Priority</option>
              <option value="due">Due date</option>
            </select>
            <ChevronDown size={12} />
          </label>
          <span className="toolbar-group-label">
            <Columns3 size={14} />
            Status
          </span>
        </div>
        <div className="task-toolbar-right">
          <span className="task-total">{count} tasks</span>
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
            <span>Hide done</span>
          </label>
          <IconButton label="Display options" onClick={onDisplay}>
            <Settings2 size={16} />
          </IconButton>
        </div>
      </div>
      {filterCount > 0 && (
        <div className="active-filters">
          <span>Filtered by</span>
          {filters.priority !== "all" && (
            <button onClick={() => setLocation({ priority: null })}>
              {filters.priority} priority <X size={11} />
            </button>
          )}
          {filters.assigneeId !== "all" && (
            <button onClick={() => setLocation({ assignee: null })}>
              {MEMBERS.find((member) => member.id === filters.assigneeId)
                ?.name ?? "Unassigned"}
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
              {filters.due === "week" ? "Next 7 days" : "Overdue"}
              <X size={11} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
