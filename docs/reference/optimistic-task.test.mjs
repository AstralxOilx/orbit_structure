import assert from "node:assert/strict";
import test from "node:test";
import {
  createTaskEntry,
  enqueueEdit,
  reconcileTask,
  rejectEdit,
  visibleTask,
} from "./optimistic-task.ts";

const snapshot = (revision, changes = {}) => ({
  id: "task-1",
  revision,
  value: { title: "Initial", priority: "normal", dueOn: null, ...changes },
});
const rename = (commandId, title) => ({
  commandId,
  edit: { kind: "rename", title },
});

test("rejecting an earlier edit preserves a later edit to the same field", () => {
  let state = createTaskEntry(snapshot(1));
  state = enqueueEdit(state, rename("first", "First"));
  state = enqueueEdit(state, rename("second", "Second"));
  state = rejectEdit(state, "first");
  assert.equal(visibleTask(state).title, "Second");
  assert.deepEqual(state.pending.map((item) => item.commandId), ["second"]);
});

test("rejecting a newer edit reveals the earlier pending intent", () => {
  let state = createTaskEntry(snapshot(1));
  state = enqueueEdit(state, rename("first", "First"));
  state = enqueueEdit(state, rename("second", "Second"));
  assert.equal(visibleTask(rejectEdit(state, "second")).title, "First");
});

test("a remote update survives rollback of a local operation", () => {
  let state = enqueueEdit(createTaskEntry(snapshot(1)), rename("local", "Local"));
  state = reconcileTask(state, snapshot(2, { priority: "urgent" }));
  assert.deepEqual(visibleTask(state), {
    title: "Local", priority: "urgent", dueOn: null,
  });
  state = rejectEdit(state, "local");
  assert.equal(visibleTask(state).priority, "urgent");
  assert.equal(visibleTask(state).title, "Initial");
});

test("an older HTTP acknowledgement settles its command without regressing data", () => {
  let state = enqueueEdit(createTaskEntry(snapshot(1)), rename("local", "Local"));
  state = reconcileTask(state, snapshot(3, { title: "Newer remote title" }));
  state = reconcileTask(state, snapshot(2, { title: "Local" }), "local");
  assert.equal(state.base.revision, 3);
  assert.equal(visibleTask(state).title, "Newer remote title");
  assert.equal(state.pending.length, 0);
});

test("a WebSocket acknowledgement followed by HTTP is idempotent", () => {
  let state = enqueueEdit(createTaskEntry(snapshot(1)), rename("local", "Local"));
  state = reconcileTask(state, snapshot(2, { title: "Local" }), "local");
  assert.strictEqual(
    reconcileTask(state, snapshot(2, { title: "Local" }), "local"),
    state,
  );
});

test("an acknowledgement preserves later queued intents", () => {
  let state = createTaskEntry(snapshot(1));
  state = enqueueEdit(state, rename("first", "First"));
  state = enqueueEdit(state, rename("second", "Second"));
  state = reconcileTask(state, snapshot(2, { title: "First" }), "first");
  assert.equal(visibleTask(state).title, "Second");
  assert.equal(state.pending.length, 1);
});

test("deletion cannot be undone by an optimistic edit or a stale snapshot", () => {
  let state = enqueueEdit(createTaskEntry(snapshot(1)), rename("local", "Local"));
  state = reconcileTask(state, { id: "task-1", revision: 3, value: null });
  state = reconcileTask(state, snapshot(2));
  assert.equal(visibleTask(state), null);
  assert.throws(() => enqueueEdit(state, rename("new", "New")), /deleted/);
});

test("a definitive rejection can atomically ingest the server's latest version", () => {
  let state = enqueueEdit(createTaskEntry(snapshot(1)), rename("local", "Local"));
  state = rejectEdit(state, "local", snapshot(4, { title: "Server" }));
  assert.equal(visibleTask(state).title, "Server");
  assert.equal(state.base.revision, 4);
});

test("unknown settlement and older snapshots preserve the entry identity", () => {
  const state = createTaskEntry(snapshot(3));
  assert.strictEqual(rejectEdit(state, "unknown"), state);
  assert.strictEqual(reconcileTask(state, snapshot(2)), state);
  assert.strictEqual(visibleTask(state), state.base.value);
});

test("cross-task messages and duplicate local command IDs fail explicitly", () => {
  const state = enqueueEdit(createTaskEntry(snapshot(1)), rename("one", "One"));
  assert.throws(
    () => reconcileTask(state, { ...snapshot(2), id: "task-2" }),
    /different task/,
  );
  assert.throws(() => enqueueEdit(state, rename("one", "Other")), /commandId/);
});

test("reconciliation does not mutate its previous input", () => {
  const initial = createTaskEntry(snapshot(1));
  Object.freeze(initial.base.value);
  Object.freeze(initial.base);
  Object.freeze(initial.pending);
  Object.freeze(initial);
  const pending = enqueueEdit(initial, rename("one", "One"));
  const next = reconcileTask(pending, snapshot(2, { priority: "high" }));
  assert.equal(visibleTask(next).title, "One");
  assert.equal(visibleTask(initial).title, "Initial");
  assert.equal(initial.pending.length, 0);
});
