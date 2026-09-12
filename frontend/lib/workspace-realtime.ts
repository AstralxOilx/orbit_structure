export type WorkspaceRealtimeEvent = {
  type:
    "workspace" | "project" | "task" | "discussion" | "task_activity" | string;
  workspaceId: string;
  entity?: string;
  entityId?: string;
  action?: string;
  taskId?: string;
};

const CONFIGURED_API_URL = process.env.NEXT_PUBLIC_API_URL;

function apiUrl() {
  if (CONFIGURED_API_URL) return CONFIGURED_API_URL;
  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:8080`;
  }
  return "http://localhost:8080";
}
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isRealtimeWorkspaceId(value: string) {
  return UUID_RE.test(value);
}

export function subscribeWorkspaceRealtime(
  workspaceId: string,
  onEvent: (event: WorkspaceRealtimeEvent) => void,
) {
  if (typeof window === "undefined" || !isRealtimeWorkspaceId(workspaceId)) {
    return () => undefined;
  }
  const source = new EventSource(
    `${apiUrl()}/api/workspaces/${encodeURIComponent(workspaceId)}/events`,
    { withCredentials: true },
  );
  source.onmessage = (message) => {
    try {
      const event = JSON.parse(message.data) as WorkspaceRealtimeEvent;
      if (event.workspaceId === workspaceId) onEvent(event);
    } catch {
      // Ignore malformed events and let EventSource reconnect normally.
    }
  };
  return () => source.close();
}
