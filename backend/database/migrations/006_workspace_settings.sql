-- Persist the workspace mark shown by Workspace settings.
CREATE TABLE IF NOT EXISTS workspace_settings (
    workspace_id UUID PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
    logo TEXT NOT NULL DEFAULT 'initials' CHECK (logo IN ('initials', 'orbit', 'spark', 'layers', 'rocket')),
    initials TEXT NOT NULL DEFAULT 'WS' CHECK (initials ~ '^[A-Za-z]{1,3}$'),
    color TEXT NOT NULL DEFAULT 'purple' CHECK (color IN ('purple', 'blue', 'peach', 'green')),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO workspace_settings (workspace_id, initials)
SELECT id, coalesce(nullif(upper(left(regexp_replace(name, '[^A-Za-z]', '', 'g'), 3)), ''), 'WS')
FROM workspaces
WHERE deleted_at IS NULL
ON CONFLICT (workspace_id) DO NOTHING;

UPDATE workspace_settings
SET initials = 'WS'
WHERE initials = '';
