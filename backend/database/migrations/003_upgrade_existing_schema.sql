-- Upgrade databases created before the UUID/public-key MVP schema.
-- Safe to run more than once.

ALTER TABLE users ADD COLUMN IF NOT EXISTS user_key TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS initials TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'blue';
UPDATE users
SET user_key = COALESCE(NULLIF(split_part(email, '@', 1), ''), 'user-' || id::text)
WHERE user_key IS NULL OR user_key = '';
CREATE UNIQUE INDEX IF NOT EXISTS users_user_key_idx ON users(user_key);
ALTER TABLE users ALTER COLUMN user_key SET NOT NULL;

ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS workspace_key TEXT;
UPDATE workspaces
SET workspace_key = 'workspace-' || id::text
WHERE workspace_key IS NULL OR workspace_key = '';
CREATE UNIQUE INDEX IF NOT EXISTS workspaces_workspace_key_idx ON workspaces(workspace_key);
ALTER TABLE workspaces ALTER COLUMN workspace_key SET NOT NULL;

ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_key TEXT;
UPDATE projects
SET project_key = 'project-' || id::text
WHERE project_key IS NULL OR project_key = '';
CREATE UNIQUE INDEX IF NOT EXISTS projects_project_key_idx ON projects(project_key);
ALTER TABLE projects ALTER COLUMN project_key SET NOT NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS task_key TEXT;
UPDATE tasks
SET task_key = 'task-' || id::text
WHERE task_key IS NULL OR task_key = '';
CREATE UNIQUE INDEX IF NOT EXISTS tasks_task_key_idx ON tasks(task_key);
ALTER TABLE tasks ALTER COLUMN task_key SET NOT NULL;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'tasks' AND column_name = 'description_preview'
    ) THEN
        EXECUTE 'UPDATE tasks SET description = description_preview WHERE description = '''' AND description_preview IS NOT NULL';
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS sessions_token_hash_idx ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
