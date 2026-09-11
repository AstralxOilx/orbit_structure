-- Demo dataset for an existing user.
-- Safe to run repeatedly: stable keys prevent duplicate records.
-- Target user: 21dabd1c-302b-4289-aabf-57abd53b8823

DO $$
DECLARE
    owner_id UUID := '21dabd1c-302b-4289-aabf-57abd53b8823';
    v_workspace_id UUID;
    v_project_id UUID;
    member_id UUID;
    workspace_index INT;
    project_index INT;
    task_index INT;
    workspace_name TEXT;
    project_name TEXT;
    task_status TEXT;
    task_priority TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = owner_id) THEN
        RAISE EXCEPTION 'Target user % does not exist', owner_id;
    END IF;

    -- Test collaborators. They are regular members and do not have login
    -- credentials; this keeps the dataset useful for assignment and reporting.
    INSERT INTO users (id, user_key, email, name, initials, color)
    VALUES
        ('a1000000-0000-4000-8000-000000000001', 'maya-chen', 'maya.chen@orbit.demo', 'Maya Chen', 'MC', 'purple'),
        ('a1000000-0000-4000-8000-000000000002', 'noah-wilson', 'noah.wilson@orbit.demo', 'Noah Wilson', 'NW', 'blue'),
        ('a1000000-0000-4000-8000-000000000003', 'sofia-patel', 'sofia.patel@orbit.demo', 'Sofia Patel', 'SP', 'peach'),
        ('a1000000-0000-4000-8000-000000000004', 'liam-park', 'liam.park@orbit.demo', 'Liam Park', 'LP', 'green')
    ON CONFLICT (id) DO NOTHING;

    FOR workspace_index IN 1..3 LOOP
        workspace_name := CASE workspace_index
            WHEN 1 THEN 'Studio Operations'
            WHEN 2 THEN 'Product Launch 2026'
            ELSE 'Growth Experiments'
        END;

        INSERT INTO workspaces (workspace_key, name, invite_code, owner_id)
        VALUES (
            format('demo-workspace-%s', workspace_index),
            workspace_name,
            format('ORBIT-DEMO-%s', workspace_index),
            owner_id
        )
        ON CONFLICT (workspace_key) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_workspace_id;

        INSERT INTO workspace_members (workspace_id, user_id, role, team)
        VALUES
            (v_workspace_id, owner_id, 'owner', 'Leadership'),
            (v_workspace_id, 'a1000000-0000-4000-8000-000000000001', 'admin', 'Design'),
            (v_workspace_id, 'a1000000-0000-4000-8000-000000000002', 'member', 'Engineering'),
            (v_workspace_id, 'a1000000-0000-4000-8000-000000000003', 'member', 'Marketing'),
            (v_workspace_id, 'a1000000-0000-4000-8000-000000000004', 'member', 'Product')
        ON CONFLICT (workspace_id, user_id) DO NOTHING;

        FOR project_index IN 1..4 LOOP
            project_name := CASE project_index
                WHEN 1 THEN 'Website redesign'
                WHEN 2 THEN 'Mobile experience'
                WHEN 3 THEN 'Customer research'
                ELSE 'Internal improvements'
            END;

            INSERT INTO projects (project_key, workspace_id, name, description, color, icon, due_on)
            VALUES (
                format('demo-project-%s-%s', workspace_index, project_index),
                v_workspace_id,
                format('%s · %s', project_name, workspace_name),
                format('Long-running project history for %s. Includes planning, delivery and review work.', workspace_name),
                CASE project_index % 4 WHEN 0 THEN 'green' WHEN 1 THEN 'purple' WHEN 2 THEN 'blue' ELSE 'peach' END,
                CASE project_index % 4 WHEN 0 THEN 'system' WHEN 1 THEN 'website' WHEN 2 THEN 'mobile' ELSE 'palette' END,
                CURRENT_DATE + (project_index * 21) + (workspace_index * 7)
            )
            ON CONFLICT (project_key) DO UPDATE SET name = EXCLUDED.name
            RETURNING id INTO v_project_id;

            FOR task_index IN 1..18 LOOP
                task_status := CASE task_index % 4
                    WHEN 0 THEN 'backlog'
                    WHEN 1 THEN 'progress'
                    WHEN 2 THEN 'review'
                    ELSE 'done'
                END;
                task_priority := CASE task_index % 4
                    WHEN 0 THEN 'normal'
                    WHEN 1 THEN 'high'
                    WHEN 2 THEN 'low'
                    ELSE 'urgent'
                END;
                member_id := CASE task_index % 5
                    WHEN 0 THEN owner_id
                    WHEN 1 THEN 'a1000000-0000-4000-8000-000000000001'
                    WHEN 2 THEN 'a1000000-0000-4000-8000-000000000002'
                    WHEN 3 THEN 'a1000000-0000-4000-8000-000000000003'
                    ELSE 'a1000000-0000-4000-8000-000000000004'
                END;

                INSERT INTO tasks (
                    task_key, project_id, title, description, status, priority,
                    assignee_id, start_on, due_on, rank
                )
                VALUES (
                    format('demo-task-%s-%s-%s', workspace_index, project_index, task_index),
                    v_project_id,
                    format('%s task %02s', project_name, task_index),
                    format('Historical task %s from a long-running %s project. Review context, update status and leave the next step clear.', task_index, workspace_name),
                    task_status,
                    task_priority,
                    member_id,
                    CURRENT_DATE - (90 - task_index * 3),
                    CURRENT_DATE + (task_index - 9),
                    task_index * 1024
                )
                ON CONFLICT (task_key) DO NOTHING;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;
