"use client";

import { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Avatar, IconButton, StatusIcon } from "@/shared/ui";
import { STATUS_META, type Task } from "../domain/task";
import { useRepository } from "@/features/workspace/provider";

const DAY = 86_400_000;
const dateFromDay = (day: number) =>
  new Date(day * DAY).toISOString().slice(0, 10);
const toDay = (date: string) =>
  Math.floor(Date.parse(`${date}T12:00:00Z`) / DAY);

export default function TimelineView({
  tasks,
  onOpen,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
}) {
  "use no memo"; // Virtualizer methods read live measurements.
  const repository = useRepository();
  const [start, setStart] = useState(toDay("2026-09-07"));
  const [zoom, setZoom] = useState(42);
  const [drag, setDrag] = useState<{
    id: string;
    initialX: number;
    delta: number;
    pointerId: number;
  } | null>(null);
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
    initialRect: { width: 1100, height: 700 },
  });
  const today = toDay(new Date().toISOString().slice(0, 10));
  return (
    <div className="timeline-view">
      <div className="timeline-toolbar">
        <span>
          <CalendarDays size={16} />
          <strong>
            {new Intl.DateTimeFormat("en", {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            }).format(new Date(start * DAY))}
          </strong>
        </span>
        <div>
          <IconButton
            label="Previous two weeks"
            onClick={() => setStart(start - 14)}
          >
            <ChevronLeft size={16} />
          </IconButton>
          <button
            className="button button-small"
            onClick={() => setStart(today - 3)}
          >
            Today
          </button>
          <IconButton
            label="Next two weeks"
            onClick={() => setStart(start + 14)}
          >
            <ChevronRight size={16} />
          </IconButton>
          <select
            aria-label="Timeline zoom"
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          >
            <option value={42}>Weeks</option>
            <option value={70}>Days</option>
          </select>
        </div>
      </div>
      <p className="timeline-hint">
        Your project, from the big picture to the little details. Drag a task to
        reschedule it.
      </p>
      <div className="timeline-scroll" ref={scroller}>
        <div
          className="timeline-inner"
          style={{ width: 260 + days.length * zoom }}
        >
          <div className="timeline-head">
            <span className="timeline-name-head">
              Task name <span>{tasks.length}</span>
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
            style={{ height: virtualizer.getTotalSize(), position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((row) => {
              const task = tasks[row.index];
              const left = (toDay(task.startOn || task.dueOn) - start) * zoom;
              const width =
                (toDay(task.dueOn) - toDay(task.startOn || task.dueOn) + 1) *
                zoom;
              const offset = drag?.id === task.id ? drag.delta * zoom : 0;
              return (
                <div
                  className="timeline-row"
                  key={task.id}
                  style={{
                    height: row.size,
                    transform: `translateY(${row.start}px)`,
                  }}
                >
                  <button
                    className="timeline-task-label"
                    onClick={() => onOpen(task.id)}
                  >
                    <StatusIcon status={task.status} />
                    <span>{task.title}</span>
                    <Avatar id={task.assigneeId} size="xs" />
                  </button>
                  <div
                    className="timeline-track"
                    style={{ backgroundSize: `${zoom}px 100%` }}
                  >
                    {task.dueOn && (
                      <button
                        className={`timeline-bar bar-${STATUS_META[task.status].color}`}
                        style={{
                          left: left + offset,
                          width: Math.max(zoom, width),
                          touchAction: "pan-y",
                        }}
                        aria-label={`Reschedule ${task.title}. Use left or right arrow to move by one day.`}
                        onPointerDown={(event) => {
                          if (event.button !== 0) return;
                          event.currentTarget.setPointerCapture(
                            event.pointerId,
                          );
                          setDrag({
                            id: task.id,
                            initialX: event.clientX,
                            delta: 0,
                            pointerId: event.pointerId,
                          });
                        }}
                        onPointerMove={(event) => {
                          if (drag?.id === task.id)
                            setDrag({
                              ...drag,
                              delta: Math.round(
                                (event.clientX - drag.initialX) / zoom,
                              ),
                            });
                        }}
                        onPointerUp={() => {
                          if (drag?.id !== task.id) return;
                          if (drag.delta)
                            repository.update(task.id, {
                              startOn: dateFromDay(
                                toDay(task.startOn || task.dueOn) + drag.delta,
                              ),
                              dueOn: dateFromDay(
                                toDay(task.dueOn) + drag.delta,
                              ),
                            });
                          else onOpen(task.id);
                          setDrag(null);
                        }}
                        onPointerCancel={() => setDrag(null)}
                        onKeyDown={(event) => {
                          if (event.key === "Escape") setDrag(null);
                          if (
                            event.key === "ArrowLeft" ||
                            event.key === "ArrowRight"
                          ) {
                            event.preventDefault();
                            const delta = event.key === "ArrowLeft" ? -1 : 1;
                            repository.update(task.id, {
                              startOn: dateFromDay(
                                toDay(task.startOn || task.dueOn) + delta,
                              ),
                              dueOn: dateFromDay(toDay(task.dueOn) + delta),
                            });
                          }
                        }}
                      >
                        <span>{task.title}</span>
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
      </div>
      <div className="timeline-legend">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <span key={key}>
            <i className={`legend-dot status-bg-${meta.color}`} />
            {meta.label}
          </span>
        ))}
      </div>
    </div>
  );
}
