# Orbit — Unified Workspace

A working Next.js frontend for projects, tasks and teams, with a virtualized Kanban board, list, timeline, dashboard and collaborative task descriptions.

## Run

Use Node.js 22.18+ (Node 25 was used for validation).

```sh
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000). The workspace starts with sample projects. Edits persist in this browser; open a second tab on the same origin to try live task and description synchronization.

```sh
npm run build
npm start
```

The build fetches Geist through `next/font/google`, so the build environment needs access to Google Fonts. Font files are served by the built application.

## Checks

```sh
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Start the app before running browser tests. Playwright defaults to installed Microsoft Edge. Set `PLAYWRIGHT_CHANNEL=chrome` to use installed Chrome and `PLAYWRIGHT_BASE_URL` to test another port or a production server. Browser screenshots are written to `artifacts/`; failure traces go to `test-results/`.

## Architecture and scope

- [Frontend architecture and UI/UX specification](docs/unified-workspace-frontend-spec.md)
- [Implementation boundaries, features and backend integration](docs/frontend-implementation.md)
- [Optimistic reconciliation reference](docs/reference/optimistic-task.ts)

The frontend uses React, TypeScript, TanStack Query/Virtual, Zustand, dnd-kit, Recharts and Yjs. Source is organized by feature under `features/`; shared tokens and UI live in `app/globals.css` and `shared/`.

The current adapter stores data locally and synchronizes between tabs. Authentication, remote task APIs, invitations, remote presence and historical analytics need backend integration. This is not a hosted multi-user service.

For an existing compatible Yjs service, copy `.env.example` to `.env.local`, configure `NEXT_PUBLIC_YJS_WEBSOCKET_URL`, and restart the app. This connects description documents only; the service must provide authorization, persistence and document initialization. Leave it unset for the local demo.
