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

The scoped repository exposes stable snapshots through `useSyncExternalStore`. Cards subscribe to their own task; unrelated task records retain object identity. TanStack Query owns the project-query boundary, currently backed by fixtures. Zustand stores shell preferences only. Navigation, project, view, search and filters live in the URL. Yjs exclusively owns description text; task metadata does not independently overwrite that document.

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

There is no authentication, authorization, tenant isolation, HTTP task API or remote metadata service in this frontend delivery. Data is stored in the browser and can be lost if browser storage is cleared. Cross-device metadata, presence membership, invitations and durable server acknowledgement need backend services.

`NEXT_PUBLIC_YJS_WEBSOCKET_URL` optionally connects description documents to a compatible y-websocket service. The service must authorize each workspace/document, persist updates and seed initial documents. This client does not seed remote rooms itself. A connected socket is not a durable-save acknowledgement. This integration does not automatically synchronize task metadata or cursor presence across devices.

Dashboard charts display current task counts and due-date distribution. Velocity history, historical cycle time and bottleneck duration require event history that is not present in fixture data. Team/priority/tag/date filters can be extended against server facets when connected. Timeline dependency edges, duration resizing and horizontal range virtualization remain extensions to this initial timeline.

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
