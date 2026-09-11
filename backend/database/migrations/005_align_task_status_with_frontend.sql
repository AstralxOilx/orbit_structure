-- Keep task values aligned with frontend/features/tasks/domain/task.ts.
-- Run this once for databases that already existed before this migration.

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_priority_check;

ALTER TABLE tasks
    ADD CONSTRAINT tasks_status_check
    CHECK (status IN ('backlog', 'progress', 'review', 'done'));

ALTER TABLE tasks
    ADD CONSTRAINT tasks_priority_check
    CHECK (priority IN ('urgent', 'high', 'normal', 'low'));
