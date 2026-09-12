CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    entity_name TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'moved', 'deleted', 'comment')),
    detail TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_logs_workspace_created_idx
    ON activity_logs(workspace_id, created_at DESC);

INSERT INTO activity_logs (workspace_id, actor_id, entity_type, entity_id, entity_name, action, detail, created_at)
SELECT p.workspace_id, a.actor_id, 'task', t.id, t.title, a.action, a.detail, a.created_at
FROM task_activities a
JOIN tasks t ON t.id = a.task_id
JOIN projects p ON p.id = t.project_id
WHERE a.deleted_at IS NULL;
