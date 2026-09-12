CREATE TABLE IF NOT EXISTS workspace_notification_reads (
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activity_id UUID NOT NULL REFERENCES activity_logs(id) ON DELETE CASCADE,
    read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, activity_id)
);

CREATE INDEX IF NOT EXISTS workspace_notification_reads_workspace_user_idx
    ON workspace_notification_reads(workspace_id, user_id);
