"use client";

import { Select } from "@/shared/ui/select";

import {
  useId,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent,
} from "react";
import { useTranslation } from "react-i18next";
import { MemberAvatar as Avatar } from "@/features/workspace/ui/member-avatar";
import { StatusIcon } from "@/features/tasks/ui/status-icon";
import { defaultRangeExtractor, useVirtualizer } from "@tanstack/react-virtual";
import { ChevronLeft, ChevronRight, CalendarDays, Link2 } from "lucide-react";
import { EmptyState, IconButton, Tooltip } from "@/shared/ui";
import { STATUS_META, type Task } from "../domain/task";
import { useRepository } from "@/features/workspace/provider";
import { TimelineDependencies } from "./timeline-dependencies";

const DAY = 86_400_000;
const dateFromDay = (day: number) =>
  new Date(day * DAY).toISOString().slice(0, 10);
const toDay = (date: string) =>
  Math.floor(Date.parse(`${date}T12:00:00Z`) / DAY);

type DragMode = "move" | "start" | "end";
type TimelineDrag = {
  id: string;
  mode: DragMode;
  initialX: number;
  initialScroll: number;
  delta: number;
  pointerId: number;
  start: number;
  end: number;
  originalStart: string;
  originalEnd: string;
};
function interval(task: Task, drag: TimelineDrag | null) {
  const first = toDay(task.startOn || task.dueOn);
  const last = Math.max(first, toDay(task.dueOn));
  if (!drag || drag.id !== task.id) return { first, last };
  return {
    first:
      drag.mode === "end"
        ? drag.start
        : Math.min(
            drag.start + drag.delta,
            drag.mode === "start" ? drag.end : Infinity,
          ),
    last:
      drag.mode === "start"
        ? drag.end
        : Math.max(
            drag.end + drag.delta,
            drag.mode === "end" ? drag.start : -Infinity,
          ),
  };
}

export default function TimelineView({
  tasks,
  onOpen,
  hasTasks = tasks.length > 0,
  onClearFilters,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
  hasTasks?: boolean;
  onClearFilters?: () => void;
}) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === "th" ? "th-TH" : "en-US";
  ("use no memo"); // Virtualizer methods read live measurements.
  const repository = useRepository();
  const [start, setStart] = useState(toDay("2026-09-07"));
  const [zoom, setZoom] = useState(42);
  const [drag, setDrag] = useState<TimelineDrag | null>(null);
  const dragRef = useRef<TimelineDrag | null>(null);
  const [dependencyTask, setDependencyTask] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const markerId = useId().replace(/:/g, "");
  const scroller = useRef<HTMLDivElement>(null);
  const days = useMemo(
    () => Array.from({ length: 28 }, (_, i) => start + i),
    [start],
  );
  // Explicitly opted out of React Compiler above; measurement methods remain live.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: tasks.length,
    getScrollElement: () => scroller.current,
    estimateSize: () => 62,
    overscan: 6,
    getItemKey: (index) => tasks[index].id,
    rangeExtractor: (range) => {
      const rows = defaultRangeExtractor(range);
      const active = drag ? tasks.findIndex((task) => task.id === drag.id) : -1;
      return active >= 0
        ? [...new Set([...rows, active])].sort((a, b) => a - b)
        : rows;
    },
    initialRect: { width: 1100, height: 700 },
  });
  const today = toDay(new Date().toISOString().slice(0, 10));
  const visibleRows = virtualizer.getVirtualItems();
  const taskIndex = useMemo(
    () => new Map(tasks.map((task, index) => [task.id, { task, index }])),
    [tasks],
  );
  const cancelDrag = () => {
    dragRef.current = null;
    setDrag(null);
  };
  const beginDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    task: Task,
    mode: DragMode,
  ) => {
    if (event.button !== 0 || dragRef.current) return;
    const { first, last } = interval(task, null);
    const next = {
      id: task.id,
      mode,
      initialX: event.clientX,
      initialScroll: scroller.current?.scrollLeft ?? 0,
      delta: 0,
      pointerId: event.pointerId,
      start: first,
      end: last,
      originalStart: task.startOn,
      originalEnd: task.dueOn,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = next;
    setDrag(next);
  };
  const moveDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const next = {
      ...active,
      delta: Math.round(
        (event.clientX -
          active.initialX +
          (scroller.current?.scrollLeft ?? 0) -
          active.initialScroll) /
          zoom,
      ),
    };
    dragRef.current = next;
    setDrag(next);
  };
  const commitRange = (task: Task, first: number, last: number) => {
    const startOn = dateFromDay(first);
    const dueOn = dateFromDay(last);
    repository.update(task.id, { startOn, dueOn });
    setAnnouncement(
      `${task.title}: ${startOn} to ${dueOn}, ${last - first + 1} days.`,
    );
  };
  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>, task: Task) => {
    moveDrag(event);
    const active = dragRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const latest = repository.getTask(task.id);
    if (
      latest &&
      !latest.deleted &&
      latest.startOn === active.originalStart &&
      latest.dueOn === active.originalEnd
    ) {
      const { first, last } = interval(task, active);
      if (first !== active.start || last !== active.end)
        commitRange(task, first, last);
      else if (
        active.mode === "move" &&
        Math.abs(event.clientX - active.initialX) < 4
      )
        onOpen(task.id);
    } else {
      setAnnouncement(t("workspace.datesChangedElsewhere"));
    }
    cancelDrag();
  };
  const barControls = (task: Task, mode: DragMode) => ({
    onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) =>
      beginDrag(event, task, mode),
    onPointerMove: moveDrag,
    onPointerUp: (event: ReactPointerEvent<HTMLButtonElement>) =>
      endDrag(event, task),
    onPointerCancel: cancelDrag,
    onLostPointerCapture: cancelDrag,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
      if (event.key === "Escape") {
        cancelDrag();
        event.preventDefault();
        return;
      }
      if (dragRef.current || !["ArrowLeft", "ArrowRight"].includes(event.key))
        return;
      event.preventDefault();
      const delta =
        (event.key === "ArrowLeft" ? -1 : 1) * (event.shiftKey ? 7 : 1);
      const { first, last } = interval(task, null);
      commitRange(
        task,
        mode === "end"
          ? first
          : Math.min(first + delta, mode === "start" ? last : Infinity),
        mode === "start"
          ? last
          : Math.max(last + delta, mode === "end" ? first : -Infinity),
      );
    },
  });
  return (
    <div className="timeline-view">
      <div className="timeline-toolbar">
        <span>
          <CalendarDays size={16} />
          <strong>
            {new Intl.DateTimeFormat(locale, {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(start * DAY))}
          </strong>
        </span>
        <div>
          <IconButton
            label={t("workspace.previousTwoWeeks")}
            onClick={() => setStart(start - 14)}
          >
            <ChevronLeft size={16} />
          </IconButton>
          <button
            className="button button-small"
            onClick={() => setStart(today - 3)}
          >
            {t("workspace.today")}
          </button>
          <IconButton
            label={t("workspace.nextTwoWeeks")}
            onClick={() => setStart(start + 14)}
          >
            <ChevronRight size={16} />
          </IconButton>
          <Select
            density="compact"
            aria-label={t("workspace.timelineZoom")}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          >
            <option value={42}>{t("workspace.weeks")}</option>
            <option value={70}>{t("workspace.days")}</option>
          </Select>
        </div>
      </div>
      <p className="timeline-hint">{t("workspace.timelineHint")}</p>
      <div
        className={`timeline-scroll ${!tasks.length ? "timeline-empty" : ""}`}
        ref={scroller}
      >
        {!tasks.length && (
          <EmptyState
            title={
              hasTasks
                ? t("workspace.noMatchingTasks")
                : t("workspace.noTasksToSchedule")
            }
            description={
              hasTasks
                ? t("workspace.tryChangeSearchFilters")
                : t("workspace.addTasksWithDates")
            }
            action={
              hasTasks ? (
                <button className="button" onClick={onClearFilters}>
                  {t("workspace.clearFilters")}
                </button>
              ) : undefined
            }
          />
        )}
        {!!tasks.length && (
          <div
            className="timeline-inner"
            style={{ width: 260 + days.length * zoom }}
          >
            <div className="timeline-head">
              <span className="timeline-name-head">
                {t("workspace.taskName")} <span>{tasks.length}</span>
              </span>
              <div className="timeline-days">
                {days.map((day) => {
                  const date = new Date(day * DAY);
                  return (
                    <span
                      key={day}
                      style={{ width: zoom }}
                      className={`${date.getUTCDay() === 0 || date.getUTCDay() === 6 ? "weekend" : ""} ${day === today ? "today" : ""}`}
                    >
                      <small>
                        {["S", "M", "T", "W", "T", "F", "S"][date.getUTCDay()]}
                      </small>
                      <b>{date.getUTCDate()}</b>
                    </span>
                  );
                })}
              </div>
            </div>
            <div
              style={{
                height: virtualizer.getTotalSize(),
                position: "relative",
              }}
            >
              <svg
                className="timeline-dependency-edges"
                width={days.length * zoom}
                height={virtualizer.getTotalSize()}
                aria-hidden="true"
              >
                <defs>
                  <marker
                    id={markerId}
                    markerWidth="7"
                    markerHeight="7"
                    refX="6"
                    refY="3.5"
                    orient="auto"
                  >
                    <path d="M 0 0 L 7 3.5 L 0 7 Z" fill="context-stroke" />
                  </marker>
                </defs>
                {tasks.flatMap((target, targetIndex) =>
                  (target.dependsOn ?? []).map((sourceId) => {
                    const source = taskIndex.get(sourceId);
                    if (
                      !source ||
                      !source.task.dueOn ||
                      !target.dueOn ||
                      source.task.projectId !== target.projectId
                    )
                      return null;
                    const minRow = Math.min(source.index, targetIndex);
                    const maxRow = Math.max(source.index, targetIndex);
                    if (
                      !visibleRows.length ||
                      maxRow < visibleRows[0].index ||
                      minRow > visibleRows[visibleRows.length - 1].index
                    )
                      return null;
                    const from = interval(source.task, drag);
                    const to = interval(target, drag);
                    if (
                      ![from.first, from.last, to.first, to.last].every(
                        Number.isFinite,
                      )
                    )
                      return null;
                    const x1 = (from.last - start + 1) * zoom;
                    const x2 = (to.first - start) * zoom;
                    const y1 = source.index * 62 + 31;
                    const y2 = targetIndex * 62 + 31;
                    const path =
                      x2 > x1 + 24
                        ? `M ${x1} ${y1} H ${(x1 + x2) / 2} V ${y2} H ${x2 - 3}`
                        : `M ${x1} ${y1} H ${x1 + 12} V ${y1 + 24} H ${x2 - 12} V ${y2} H ${x2 - 3}`;
                    return (
                      <path
                        key={`${sourceId}-${target.id}`}
                        d={path}
                        className={
                          to.first <= from.last ? "is-conflicting" : ""
                        }
                        markerEnd={`url(#${markerId})`}
                      />
                    );
                  }),
                )}
              </svg>
              {visibleRows.map((row) => {
                const task = tasks[row.index];
                const { first, last } = interval(task, drag);
                const left = (first - start) * zoom;
                const width = (last - first + 1) * zoom;
                return (
                  <div
                    className="timeline-row"
                    key={task.id}
                    style={{
                      height: row.size,
                      transform: `translateY(${row.start}px)`,
                    }}
                  >
                    <div className="timeline-task-label">
                      <button
                        className="timeline-task-open"
                        onClick={() => onOpen(task.id)}
                      >
                        <StatusIcon status={task.status} />
                        <span>{task.title}</span>
                      </button>
                      <Avatar id={task.assigneeId} size="xs" />
                      <Tooltip
                        content={t("workspace.manageDependencies")}
                        asChild
                      >
                        <button
                          className={`timeline-link-button ${task.dependsOn?.length ? "has-links" : ""}`}
                          aria-label={`Dependencies for ${task.title}${task.dependsOn?.length ? `, ${task.dependsOn.length} prerequisites` : ""}`}
                          onClick={() => setDependencyTask(task.id)}
                        >
                          <Link2 size={14} />
                          {!!task.dependsOn?.length && (
                            <small>{task.dependsOn.length}</small>
                          )}
                        </button>
                      </Tooltip>
                    </div>
                    <div
                      className="timeline-track"
                      style={{ backgroundSize: `${zoom}px 100%` }}
                    >
                      {task.dueOn &&
                        Number.isFinite(first) &&
                        Number.isFinite(last) && (
                          <div
                            className={`timeline-bar timeline-editable-bar bar-${STATUS_META[task.status].color} ${drag?.id === task.id ? "is-dragging" : ""}`}
                            style={{ left, width: Math.max(zoom, width) }}
                          >
                            <button
                              className="timeline-resize-handle resize-start"
                              aria-label={`Resize start of ${task.title}. ${dateFromDay(first)}. Use left or right arrow to change by one day.`}
                              title={`Start: ${dateFromDay(first)} — drag to resize`}
                              {...barControls(task, "start")}
                            />
                            <button
                              className="timeline-bar-move"
                              aria-label={`Reschedule ${task.title}. ${dateFromDay(first)} to ${dateFromDay(last)}. Use left or right arrow to move by one day.`}
                              title={`${task.title} · ${dateFromDay(first)} → ${dateFromDay(last)} · ${last - first + 1} days`}
                              {...barControls(task, "move")}
                              onClick={(event) => {
                                if (event.detail === 0) onOpen(task.id);
                              }}
                              onDoubleClick={() => onOpen(task.id)}
                            >
                              <span>{task.title}</span>
                            </button>
                            <button
                              className="timeline-resize-handle resize-end"
                              aria-label={`Resize end of ${task.title}. ${dateFromDay(last)}. Use left or right arrow to change by one day.`}
                              title={`End: ${dateFromDay(last)} — drag to resize`}
                              {...barControls(task, "end")}
                            />
                          </div>
                        )}
                      {!task.dueOn && (
                        <button
                          className="timeline-unscheduled"
                          onClick={() => onOpen(task.id)}
                        >
                          {t("workspace.setDates")}
                        </button>
                      )}
                      {today >= start && today < start + 28 && (
                        <span
                          className="today-line"
                          style={{ left: (today - start) * zoom + zoom / 2 }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <div className="timeline-legend">
        <span>
          <Link2 size={13} /> {t("workspace.prerequisiteDependent")}
        </span>
        <span className="timeline-conflict-legend">
          {t("workspace.dashedOverlap")}
        </span>
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <span key={key}>
            <i className={`legend-dot status-bg-${meta.color}`} />
            {meta.label}
          </span>
        ))}
      </div>
      <p className="timeline-resize-feedback" role="status" aria-live="polite">
        {drag
          ? (() => {
              const task = tasks.find((item) => item.id === drag.id);
              if (!task) return "";
              const { first, last } = interval(task, drag);
              return `${task.title}: ${dateFromDay(first)} → ${dateFromDay(last)} · ${last - first + 1} days · Escape to cancel`;
            })()
          : announcement}
      </p>
      {dependencyTask && (
        <TimelineDependencies
          taskId={dependencyTask}
          onClose={() => setDependencyTask(null)}
        />
      )}
    </div>
  );
}
