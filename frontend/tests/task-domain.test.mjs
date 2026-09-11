import test from "node:test";
import assert from "node:assert/strict";
import {
  filterTasks,
  DEFAULT_FILTERS,
  isTask,
} from "../features/tasks/domain/task.ts";
import { INITIAL_TASKS } from "../features/workspace/data.ts";

test("filters compose across tag, assignee, priority and project summaries", () => {
  const result = filterTasks(INITIAL_TASKS, {
    ...DEFAULT_FILTERS,
    tag: "Design",
    assigneeId: "alex",
    priority: "high",
  });
  assert.deepEqual(
    result.map((task) => task.id),
    ["ORB-104"],
  );
});
test("overdue filters exclude completed and undated tasks", () => {
  const tasks = [
    { ...INITIAL_TASKS[0], id: "overdue", dueOn: "2026-09-08" },
    {
      ...INITIAL_TASKS[0],
      id: "complete",
      dueOn: "2026-09-08",
      status: "done",
    },
    { ...INITIAL_TASKS[0], id: "undated", dueOn: "" },
    { ...INITIAL_TASKS[0], id: "today", dueOn: "2026-09-09" },
  ];
  assert.deepEqual(
    filterTasks(
      tasks,
      { ...DEFAULT_FILTERS, due: "overdue" },
      new Date(2026, 8, 9),
    ).map((task) => task.id),
    ["overdue"],
  );
});
test("date ordering puts undated tasks last and excludes tombstones", () => {
  const tasks = [
    { ...INITIAL_TASKS[0], id: "undated", dueOn: "" },
    { ...INITIAL_TASKS[0], id: "later", dueOn: "2026-09-20" },
    { ...INITIAL_TASKS[0], id: "early", dueOn: "2026-09-10" },
    { ...INITIAL_TASKS[0], id: "deleted", dueOn: "2026-09-01", deleted: true },
  ];
  assert.deepEqual(
    filterTasks(tasks, { ...DEFAULT_FILTERS, sort: "due" }).map(
      (task) => task.id,
    ),
    ["early", "later", "undated"],
  );
});
test("stored entity validation rejects malformed nested fields and nonfinite ranks", () => {
  assert.equal(isTask(INITIAL_TASKS[0]), true);
  assert.equal(isTask({ ...INITIAL_TASKS[0], subtasks: [null] }), false);
  assert.equal(
    isTask({ ...INITIAL_TASKS[0], comments: [{ body: 42 }] }),
    false,
  );
  assert.equal(isTask({ ...INITIAL_TASKS[0], rank: Infinity }), false);
});
