export const WORKSPACE_DELETED_PREFIX = "orbit.catalog.deleted-workspace.v1.";
export const PROJECT_DELETED_PREFIX = "orbit.catalog.deleted-project.v1.";

export function isScopeDeleted(workspaceId: string, projectId?: string) {
  return (
    localStorage.getItem(WORKSPACE_DELETED_PREFIX + workspaceId) !== null ||
    (projectId !== undefined &&
      localStorage.getItem(PROJECT_DELETED_PREFIX + projectId) !== null)
  );
}
