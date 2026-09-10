# Frontend implementation

This document describes the runnable implementation; the [architecture specification](unified-workspace-frontend-spec.md) remains the target contract for the complete enterprise system.

## Application boundaries

- `app/`: Next.js entry point, metadata, font loading and semantic theme variables.
- `features/workspace/`: application shell, project navigation, URL-backed views/filters, provider and client preferences.
- `features/tasks/domain/`: task schema, validation, pure filtering and sort rules.
- `features/tasks/model/`: normalized task repository, subscriptions, optimistic local persistence and filtering worker.
- `features/tasks/ui/`: virtualized board/list/timeline, create form and task drawer.
- `features/collaboration/`: Yjs description sessions and ephemeral cursor layer.
- `features/analytics/`: lazily loaded charts derived from the current task collection.
- `shared/`: reusable controls, native modal dialog, avatars, skeletons and visual styles.
- `tests/`: domain tests and browser interaction/accessibility tests.

## State and rendering

The scoped repository exposes stable snapshots through `useSyncExternalStore`. Cards subscribe to their own task; unrelated task records retain object identity. The workspace catalog owns locally persisted workspaces and projects; the three original projects seed Studio only. Zustand stores shell preferences only. Navigation, project, view, search and filters live in the URL. Yjs exclusively owns description text; task metadata does not independently overwrite that document.

Mutations publish immediately and then persist at a microtask boundary. A storage error rolls back only if the failed mutation is still the latest record, and the shell reports an unsaved state. Metadata uses whole-record last-writer-wins with timestamp and actor ordering. It is a local demo adapter, not the revisioned server protocol. The separate [optimistic reconciliation reference](reference/optimistic-task.ts) specifies handling for command acknowledgements, stale events and overlapping operations when that API is integrated.

Board columns measure variable-height rows. List and timeline virtualize fixed-height rows. The dragged source stays mounted. At 1,000 tasks, filtering moves to a module worker with incremental record updates and request IDs to discard stale responses. Heavy views, charts and the description editor are dynamically imported. Presence packets are capped, throttled and painted using `requestAnimationFrame` and DOM transforms outside React state.

The board uses current `@dnd-kit/react` APIs. Its sortable plugin list retains keyboard navigation but excludes imperative optimistic DOM sorting: TanStack Virtual owns row placement. A custom overlay and column highlighting provide feedback; the repository commits the drop. This avoids DOM reparenting competing with React's virtualized row tree. See the [dnd-kit external-state guide](https://dndkit.com/react/guides/sortable-state-management/) and [feedback guide](https://dndkit.com/react/guides/feedback/).

## Working interactions

- Create, edit, delete, assign and prioritize tasks; add tags, dates, checklist items and comments.
- Drag between columns, reorder in a column, and move via the task actions menu. Pointer, touch sensor and keyboard support are configured. `Space` lifts/drops, arrows choose a destination and `Escape` cancels.
- Board, list and timeline share the task repository and URL filters. List supports bulk actions. Timeline supports moving scheduled tasks by pointer or arrow keys, plus date-range navigation and zoom.
- Project dashboard, project switching, My tasks, team details, activity inbox and command search.
- Responsive sidebar, native modal focus containment, light/dark preference persistence, reduced-motion CSS, accessible names and skeleton/loading states.
- Same-origin tab synchronization for metadata, Yjs descriptions and task-anchored cursors. Static member avatars represent project membership; they do not claim remote online presence.

## Backend integration still required

### Workspace and project management (local frontend mode)

- Workspace switcher → Manage lists projects with Delete actions and a workspace Danger zone. Both use the shared `DeleteConfirmation`: exact case-sensitive name, explicit acknowledgement, disabled submit until both match, Cancel focus and a synchronous repeat-submit guard. The catalog rechecks the name against current persisted metadata before writing.
- Workspace switcher → Manage also lists members, adds members by name/email/team, changes Admin/Member roles, and removes non-owner members through the same exact-name confirmation. The owner is protected from downgrade/removal in local mode. Member records are workspace-scoped and update avatars, assignee selectors, Team and Share views.
- Project creation includes a visual icon category (Website, App, Game, Design, Marketing, Engineering or Other) alongside the existing color choice. The shared `ProjectIcon` mapping renders that choice in the sidebar, project header and overview cards, with a safe fallback for older or unknown icon values.
- Deletion commits a persistent scope tombstone. Projects and their tasks disappear from all current workspace views; deleted workspaces also invalidate their join codes. Seeded projects/workspace stay deleted after refresh. Storage events propagate deletion to other tabs, and task writes check scope deletion before persistence. Deleting the last workspace shows a create-workspace welcome screen.
- This is logical deletion with no restore UI, not secure erasure: existing local task/document bytes are retained under their old IDs, and server document deletion is outside this local adapter. Clearing all browser storage resets the demo, including its deletion markers. No tests or runtime checks were run for deletion, as requested earlier.

- The sidebar workspace switcher opens Switch, Create and Join actions. Creating a workspace starts with no projects or tasks. Its local team uses the existing demo identity, Alex. Joining resolves a workspace code already stored on the same browser/origin; it is not account membership or a cross-device invitation.
- The plus beside Projects and the Overview Create project button create projects with a name, description, color and optional due date. Names must be nonempty and unique within a workspace. New projects appear in navigation, Analytics, task dialogs, search and Inbox labels.
- Workspace/project metadata uses one localStorage record per entity. Project additions propagate through storage events. Active workspace preference survives refresh; an open tab is not forced to switch when another tab changes workspace.
- Switching workspace remounts the task provider and clears the current task/filter navigation. New workspaces have separate task storage prefixes and BroadcastChannel names. Studio preserves its original storage keys and seeded records. This is local data separation, not a security or authorization boundary.
- Storage failures are shown in the creation/join dialogs. No tests or runtime checks were run for this addition, following the user's instruction. Real accounts, invite redemption, roles, server persistence and cross-device membership remain backend work.

There is no authentication, authorization, tenant isolation, HTTP task API or remote metadata service in this frontend delivery. Data is stored in the browser and can be lost if browser storage is cleared. Cross-device metadata, presence membership, invitations and durable server acknowledgement need backend services.

`NEXT_PUBLIC_YJS_WEBSOCKET_URL` optionally connects description documents to a compatible y-websocket service. The service must authorize each workspace/document, persist updates and seed initial documents. This client does not seed remote rooms itself. A connected socket is not a durable-save acknowledgement. This integration does not automatically synchronize task metadata or cursor presence across devices.

Dashboard charts display current task counts and due-date distribution, plus flow analytics from locally recorded status history. Older fixture activity has no historical timestamps and cannot be reconstructed. Team/priority/tag/date filters can be extended against server facets when connected. Horizontal range virtualization remains an extension to this initial timeline.

### Flow analytics (2026-09-10)

- Analytics includes Velocity, Cycle time and Bottlenecks, scoped by the existing project filter and a 4/8/12-week history window. Charts include definitions, sample counts, accessible data tables, themed tooltips and empty states. Animations are disabled.
- Task creation and status changes append optional `statusHistory` entries to the same local task record. Existing records remain compatible. Entries persist and roll back with their task. Planned start/due dates are never used as historical completion timestamps.
- Velocity counts distinct tasks reaching Done per Monday-based UTC week. Reopened tasks may count in another week. This is task throughput, not story-point velocity. Weeks before the earliest observed history are missing, not zero. The current and first observed weeks may be partial.
- Cycle time measures calendar days from the first observed In progress entry to Done within each completion cycle. Weekly and overall medians exclude cycles without a recorded start. Reopened work needs a new observed In progress entry for a new cycle sample.
- Bottlenecks compare median elapsed time for fully observed stage visits exiting within the selected window. Current open-task ages are displayed separately and are not mixed into completed-visit medians. Unknown start times are excluded, with coverage counts displayed.
- History follows the existing whole-record last-writer-wins local adapter; it is not a durable server audit log. Deleted tasks are outside the current task scope. Complete multi-user history, historical project membership and recovery after clearing browser storage still need backend integration.
- No tests or runtime checks were run for this addition, following the user's instruction.

### Timeline dependency and resize UI (2026-09-10)

- The chain button beside each task opens a prerequisite editor. Relationships use optional `dependsOn` task IDs, preserving compatibility with existing browser records. The local repository rejects self-links, cycles and new cross-project or unavailable references.
- Arrows connect scheduled tasks in the filtered timeline and follow the live date preview. Dashed warning lines indicate a dependent task starting on or before its prerequisite's inclusive due date. Hidden, deleted and unscheduled endpoints are not drawn. Links do not automatically reschedule tasks.
- Drag the left or right edge to resize the inclusive start/due range, with a one-day minimum. Drag the center to move the whole interval. Pointer edits preview locally and commit once on release; Escape, pointer cancellation and lost capture discard the preview. Concurrent date changes cancel the commit.
- Focus a bar or edge and use Left/Right for one day, or Shift + Left/Right for seven days. The active drag row remains mounted during vertical scrolling. Controls and dependency dialogs use the light/dark theme.
- No tests or runtime checks were run for this addition, as requested. Server-side dependency validation and atomic multi-user scheduling remain backend integration work.

## Validation and performance limits

Browser tests exercise creation, persistence, dragging, keyboard cancellation, cross-tab metadata and concurrent Yjs editing, theme persistence, mobile navigation, storage rollback and automated accessibility checks. A 2,000-task fixture verifies worker filtering and bounded mounted row counts across all three views. Domain and reconciliation tests cover filtering and concurrency rules.

These checks do not establish a 60 FPS guarantee or complete WCAG conformance. Profile production on target devices with realistic record sizes, network conditions and concurrent collaborators before setting performance acceptance results. Remote WebSocket integration and touch dragging still require integration/device testing.

### Verified on 2026-09-09

| Check | Result |
| --- | --- |
| Production build (including TypeScript) | Passed |
| ESLint | Passed, no warnings |
| Prettier check | Passed |
| Domain and optimistic reconciliation tests | 15 passed |
| Playwright against `next start`, Microsoft Edge | 14 passed |
| Automated WCAG A/AA checks | No violations in tested board light/dark, list, timeline, drawer and overview states |
| 2,000 additional tasks | Worker search passed; fewer than 100 board cards and 60 list/timeline rows mounted |

The browser test suite generates desktop, mobile, dashboard, detail and dark-theme screenshots in `artifacts/`.
