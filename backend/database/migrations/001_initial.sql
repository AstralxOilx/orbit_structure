-- Orbit initial relational model.
-- Run with a migration tool; do not execute this file on every application start.
-- UUIDs are internal primary keys. The *_key columns preserve the stable
-- identifiers currently used by the frontend (studio, website, ORB-101, ...).


CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_key TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    initials TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'blue',
    password_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    invite_code TEXT NOT NULL UNIQUE,
    owner_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE workspace_members (
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    user_id UUID NOT NULL REFERENCES users(id),
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    team TEXT NOT NULL DEFAULT '',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_key TEXT NOT NULL UNIQUE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id),
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    color TEXT NOT NULL DEFAULT 'purple',
    icon TEXT NOT NULL DEFAULT 'other',
    due_on DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_key TEXT NOT NULL UNIQUE,
    project_id UUID NOT NULL REFERENCES projects(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK (status IN ('backlog', 'progress', 'review', 'done')),
    priority TEXT NOT NULL CHECK (priority IN ('urgent', 'high', 'normal', 'low')),
    assignee_id UUID REFERENCES users(id),
    start_on DATE,
    due_on DATE,
    rank NUMERIC NOT NULL,
    revision BIGINT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX tasks_project_status_rank_idx ON tasks(project_id, status, rank);
CREATE INDEX projects_workspace_idx ON projects(workspace_id, deleted_at);
CREATE INDEX members_workspace_idx ON workspace_members(workspace_id, user_id);
