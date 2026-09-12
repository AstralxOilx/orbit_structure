CREATE TABLE IF NOT EXISTS task_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    actor_id UUID NOT NULL REFERENCES users(id),
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'moved', 'deleted', 'comment')),
    detail TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS task_activities_task_created_idx
    ON task_activities(task_id, created_at DESC)
    WHERE deleted_at IS NULL;
