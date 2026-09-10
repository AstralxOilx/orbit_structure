"use client";

import { useCallback, useMemo, useRef, useState, memo } from "react";
import { useTranslation } from "react-i18next";
import { StatusIcon } from "@/features/tasks/ui/status-icon";
import {
  DragDropProvider,
  DragOverlay,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/react";
import { useSortable, isSortable } from "@dnd-kit/react/sortable";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import {
  PointerSensor,
  PointerActivationConstraints,
  KeyboardSensor,
} from "@dnd-kit/dom";
import {
  defaultRangeExtractor,
  useVirtualizer,
  type Range,
} from "@tanstack/react-virtual";
import { GripVertical, MoreHorizontal, Plus } from "lucide-react";
import { TaskCard } from "./task-card";
import { EmptyState, Tooltip } from "@/shared/ui";
import {
  STATUSES,
  STATUS_META,
  type Task,
  type TaskStatus,
} from "../domain/task";
import { IconButton } from "@/shared/ui";
import { useRepository } from "@/features/workspace/provider";
import {
  taskStatusDescription,
  taskStatusLabel,
} from "@/shared/i18n/task-copy";

// Virtualizer owns DOM placement. Disable imperative optimistic DOM reparenting.
const sortablePlugins = [SortableKeyboardPlugin];
const sensors = [
  PointerSensor.configure({
    activationConstraints: (event) =>
      event.pointerType === "touch"
        ? [new PointerActivationConstraints.Delay({ value: 180, tolerance: 8 })]
        : [new PointerActivationConstraints.Distance({ value: 6 })],
  }),
  KeyboardSensor,
];

const SortableCard = memo(function SortableCard({
  task,
  index,
  onOpen,
}: {
  task: Task;
  index: number;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  const {
    ref: setNode,
    handleRef: setHandle,
    isDragSource,
  } = useSortable({
    plugins: sortablePlugins,
    id: task.id,
    index,
    group: task.status,
    type: "task",
    accept: "task",
    data: { status: task.status },
    transition: { duration: 200 },
  });
  return (
    <div
      ref={setNode}
      className={`sortable-card ${isDragSource ? "is-drag-source" : ""}`}
    >
      <Tooltip content={t("workspace.dragTask")}>
        <button
          type="button"
          ref={setHandle}
          className="drag-handle"
          aria-label={`Drag ${task.title}. Space to lift, arrow keys to move, Escape to cancel.`}
        >
          <GripVertical size={15} />
        </button>
      </Tooltip>
      <TaskCard id={task.id} onOpen={onOpen} />
    </div>
  );
});

function BoardColumn({
  status,
  tasks,
  activeId,
  onOpen,
  onAdd,
}: {
  status: TaskStatus;
  tasks: Task[];
  activeId: string | null;
  onOpen: (id: string) => void;
  onAdd: (status: TaskStatus) => void;
}) {
  "use no memo"; // TanStack Virtual owns mutable measurements; do not compiler-memoize them.
  const { t } = useTranslation();
  const scroller = useRef<HTMLDivElement>(null);
  const { ref: dropRef, isDropTarget } = useDroppable({
    id: `column:${status}`,
    accept: "task",
    data: { status },
  });
  const activeIndex = tasks.findIndex((task) => task.id === activeId);
  const rangeExtractor = useCallback(
    (range: Range) =>
      [
        ...new Set([
          ...defaultRangeExtractor(range),
          ...(activeIndex >= 0 ? [activeIndex] : []),
        ]),
      ].sort((a, b) => a - b),
    [activeIndex],
  );
  // Explicitly opted out of React Compiler above; measurement methods remain live.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    // Ref measurements can notify during React's commit phase. Let React batch
    // these updates instead of forcing a nested flushSync from the adapter.
    useFlushSync: false,
    count: tasks.length,
    getScrollElement: () => scroller.current,
    estimateSize: (index) =>
      tasks[index]?.cover ? 331 : tasks[index]?.subtasks.length ? 272 : 228,
    getItemKey: (index) => tasks[index].id,
    overscan: 5,
    rangeExtractor,
    initialRect: { width: 300, height: 750 },
  });
  return (
    <section
      className={`board-column ${isDropTarget ? "column-drop-target" : ""}`}
      aria-label={`${taskStatusLabel(t, status)}, ${tasks.length} ${t("workspace.tasks")}`}
    >
      <div className="column-heading">
        <span className="column-title">
          <StatusIcon status={status} />
          <h2>{taskStatusLabel(t, status)}</h2>
          <span className="column-count">{tasks.length}</span>
        </span>
        <span className="column-actions">
          <IconButton
            label={t("workspace.addTaskToStatus", {
              status: taskStatusLabel(t, status),
            })}
            onClick={() => onAdd(status)}
          >
            <Plus size={16} />
          </IconButton>
          <details className="column-menu">
            <summary
              aria-label={t("workspace.statusOptions", {
                status: taskStatusLabel(t, status),
              })}
            >
              <MoreHorizontal size={17} />
            </summary>
            <div className="task-menu-panel">
              <button
                onClick={(event) => {
                  onAdd(status);
                  event.currentTarget
                    .closest("details")
                    ?.removeAttribute("open");
                }}
              >
                {t("workspace.addTaskToColumn")}
              </button>
              <span>{taskStatusDescription(t, status)}</span>
            </div>
          </details>
        </span>
      </div>
      <div
        ref={(node) => {
          scroller.current = node;
          dropRef(node);
        }}
        className="column-scroll"
      >
        <div
          className="virtual-card-space"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((row) => (
            <div
              key={row.key}
              data-index={row.index}
              ref={virtualizer.measureElement}
              className="virtual-card"
              style={{ transform: `translateY(${row.start}px)` }}
            >
              <SortableCard
                task={tasks[row.index]}
                index={row.index}
                onOpen={onOpen}
              />
            </div>
          ))}
        </div>
        <button className="add-column-task" onClick={() => onAdd(status)}>
          <Plus size={15} /> {t("workspace.addTaskAction")}
        </button>
      </div>
    </section>
  );
}

export default function BoardView({
  tasks,
  onOpen,
  onAdd,
  manual = true,
  onManualReorder,
  crossProject = false,
  hasTasks = tasks.length > 0,
  onClearFilters,
}: {
  tasks: Task[];
  onOpen: (id: string) => void;
  onAdd: (status: TaskStatus) => void;
  manual?: boolean;
  onManualReorder?: () => void;
  crossProject?: boolean;
  hasTasks?: boolean;
  onClearFilters?: () => void;
}) {
  const { t } = useTranslation();
  const repository = useRepository();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const groups = useMemo(
    () =>
      Object.fromEntries(
        STATUSES.map((status) => [
          status,
          tasks.filter((task) => task.status === status),
        ]),
      ) as Record<TaskStatus, Task[]>,
    [tasks],
  );
  const onDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    if (event.canceled) {
      setAnnouncement("Move canceled");
      return;
    }
    const { source, target } = event.operation;
    if (!source || !target) return;
    const targetStatus = target.data.status as TaskStatus;
    const nextStatus = targetStatus;
    if (!STATUSES.includes(nextStatus)) return;
    const sameColumn = source.data.status === nextStatus;
    if (source.id === target.id) return;
    if (!manual && sameColumn) onManualReorder?.();
    const movingDown =
      isSortable(source) &&
      isSortable(target) &&
      source.initialGroup === target.group &&
      source.initialIndex < target.index;
    repository.move(
      String(source.id),
      nextStatus,
      isSortable(target) && (manual || sameColumn)
        ? String(target.id)
        : undefined,
      movingDown ? "after" : "before",
      crossProject ? "workspace" : "project",
    );
    setAnnouncement(
      t("workspace.taskMovedToStatus", {
        title: repository.getTask(String(source.id))?.title,
        status: taskStatusLabel(t, nextStatus),
      }),
    );
  };
  if (!tasks.length)
    return (
      <div className="board-canvas board-empty">
        <EmptyState
          title={hasTasks ? "No matching tasks" : "No tasks yet"}
          description={
            hasTasks
              ? t("workspace.changeSearchFilters")
              : t("workspace.firstTaskDescription")
          }
          action={
            hasTasks ? (
              <button className="button" onClick={onClearFilters}>
                {t("workspace.clearFilters")}
              </button>
            ) : (
              <button
                className="button button-primary"
                onClick={() => onAdd("backlog")}
              >
                <Plus size={16} /> {t("workspace.addFirstTask")}
              </button>
            )
          }
        />
      </div>
    );
  return (
    <DragDropProvider
      sensors={sensors}
      onDragStart={(event) => {
        setActiveId(String(event.operation.source?.id));
      }}
      onDragEnd={onDragEnd}
    >
      <div className="board-canvas">
        {STATUSES.map((status) => (
          <BoardColumn
            key={status}
            status={status}
            tasks={groups[status]}
            activeId={activeId}
            onOpen={onOpen}
            onAdd={onAdd}
          />
        ))}
      </div>
      <DragOverlay dropAnimation={{ duration: 200 }}>
        {(source) => (
          <div className="drag-overlay">
            <TaskCard id={String(source.id)} onOpen={onOpen} overlay />
          </div>
        )}
      </DragOverlay>
      <span className="sr-only" role="status" aria-live="polite">
        {announcement}
      </span>
    </DragDropProvider>
  );
}
