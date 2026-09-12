package postgres

import (
	"context"
	"database/sql"
	"orbit/backend/internal/application"
	"strings"
	"time"
)

type Repository struct{ db *sql.DB }

func recordActivityLog(tx *sql.Tx, taskID, actorID, action, detail string) error {
	_, err := tx.Exec(`INSERT INTO activity_logs(workspace_id,actor_id,entity_type,entity_id,entity_name,action,detail) SELECT p.workspace_id,$2,'task',t.id,t.title,$3,$4 FROM tasks t JOIN projects p ON p.id=t.project_id WHERE t.id=$1`, taskID, actorID, action, detail)
	return err
}

func recordWorkspaceActivityLog(tx *sql.Tx, workspaceID, actorID, entityType, entityID, entityName, action, detail string) error {
	_, err := tx.Exec(`INSERT INTO activity_logs(workspace_id,actor_id,entity_type,entity_id,entity_name,action,detail) VALUES($1,$2,$3,$4,$5,$6,$7)`, workspaceID, actorID, entityType, entityID, entityName, action, detail)
	return err
}

func recordWorkspaceActivityLogContext(ctx context.Context, tx *sql.Tx, workspaceID, actorID, entityType, entityID, entityName, action, detail string) error {
	_, err := tx.ExecContext(ctx, `INSERT INTO activity_logs(workspace_id,actor_id,entity_type,entity_id,entity_name,action,detail) VALUES($1,$2,$3,$4,$5,$6,$7)`, workspaceID, actorID, entityType, entityID, entityName, action, detail)
	return err
}

func NewRepository(db *sql.DB) *Repository { return &Repository{db: db} }
func (r *Repository) ListWorkspaces(userID string) ([]application.Workspace, error) {
	rows, err := r.db.Query(`SELECT w.id, w.workspace_key, w.name, w.invite_code, w.owner_id, w.created_at, COALESCE(s.logo,'initials'), COALESCE(s.initials,'WS'), COALESCE(s.color,'purple') FROM workspaces w JOIN workspace_members wm ON wm.workspace_id=w.id LEFT JOIN workspace_settings s ON s.workspace_id=w.id WHERE wm.user_id=$1 AND w.deleted_at IS NULL ORDER BY w.created_at, w.name`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []application.Workspace{}
	for rows.Next() {
		var x application.Workspace
		if err := rows.Scan(&x.ID, &x.Key, &x.Name, &x.InviteCode, &x.OwnerID, &x.CreatedAt, &x.Logo, &x.Initials, &x.Color); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}
func (r *Repository) CreateWorkspace(i application.CreateWorkspaceInput) (application.Workspace, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return application.Workspace{}, err
	}
	defer tx.Rollback()
	var x application.Workspace
	err = tx.QueryRow(`INSERT INTO workspaces(workspace_key,name,invite_code,owner_id) VALUES($1,$2,$3,$4) RETURNING id,workspace_key,name,invite_code,owner_id,created_at`, i.Key, i.Name, i.InviteCode, i.OwnerID).Scan(&x.ID, &x.Key, &x.Name, &x.InviteCode, &x.OwnerID, &x.CreatedAt)
	if err != nil {
		return x, err
	}
	if _, err = tx.Exec(`INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'owner')`, x.ID, i.OwnerID); err != nil {
		return x, err
	}
	x.Logo, x.Initials, x.Color = "initials", initialsForWorkspace(x.Name), "purple"
	if _, err = tx.Exec(`INSERT INTO workspace_settings(workspace_id,logo,initials,color) VALUES($1,$2,$3,$4)`, x.ID, x.Logo, x.Initials, x.Color); err != nil {
		return x, err
	}
	return x, tx.Commit()
}
func (r *Repository) JoinWorkspace(code, userID string) (application.Workspace, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return application.Workspace{}, err
	}
	defer tx.Rollback()
	var x application.Workspace
	err = tx.QueryRow(`SELECT w.id,w.workspace_key,w.name,w.invite_code,w.owner_id,w.created_at,COALESCE(s.logo,'initials'),COALESCE(s.initials,'WS'),COALESCE(s.color,'purple') FROM workspaces w LEFT JOIN workspace_settings s ON s.workspace_id=w.id WHERE lower(w.invite_code)=lower($1) AND w.deleted_at IS NULL`, code).Scan(&x.ID, &x.Key, &x.Name, &x.InviteCode, &x.OwnerID, &x.CreatedAt, &x.Logo, &x.Initials, &x.Color)
	if err != nil {
		return x, err
	}
	if _, err = tx.Exec(`INSERT INTO workspace_members(workspace_id,user_id,role) VALUES($1,$2,'member') ON CONFLICT (workspace_id,user_id) DO NOTHING`, x.ID, userID); err != nil {
		return x, err
	}
	return x, tx.Commit()
}
func (r *Repository) UpdateWorkspace(id string, i application.UpdateWorkspaceInput) (application.Workspace, error) {
	var x application.Workspace
	err := r.db.QueryRow(`UPDATE workspaces SET name=$2 WHERE id=$1 AND deleted_at IS NULL RETURNING id,workspace_key,name,invite_code,owner_id,created_at`, id, i.Name).Scan(&x.ID, &x.Key, &x.Name, &x.InviteCode, &x.OwnerID, &x.CreatedAt)
	if err != nil {
		return x, err
	}
	err = r.db.QueryRow(`INSERT INTO workspace_settings(workspace_id,logo,initials,color) VALUES($1,$2,$3,$4) ON CONFLICT (workspace_id) DO UPDATE SET logo=EXCLUDED.logo,initials=EXCLUDED.initials,color=EXCLUDED.color,updated_at=now() RETURNING logo,initials,color`, id, i.Logo, i.Initials, i.Color).Scan(&x.Logo, &x.Initials, &x.Color)
	return x, err
}
func (r *Repository) DeleteWorkspace(id string) error {
	_, err := r.db.Exec(`UPDATE workspaces SET deleted_at=COALESCE(deleted_at,now()) WHERE id=$1 AND deleted_at IS NULL`, id)
	return err
}
func initialsForWorkspace(name string) string {
	out := ""
	for _, part := range strings.Fields(name) {
		out += string([]rune(part)[0])
		if len(out) == 3 {
			break
		}
	}
	if out == "" {
		return "WS"
	}
	return strings.ToUpper(out)
}
func (r *Repository) ListMembers(workspaceID string) ([]application.Member, error) {
	rows, err := r.db.Query(`SELECT u.id, wm.workspace_id, u.name, u.email, wm.role, u.initials, u.color, wm.team FROM workspace_members wm JOIN users u ON u.id=wm.user_id WHERE wm.workspace_id=$1 ORDER BY wm.joined_at,u.name`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []application.Member{}
	for rows.Next() {
		var member application.Member
		if err := rows.Scan(&member.ID, &member.WorkspaceID, &member.Name, &member.Email, &member.Role, &member.Initials, &member.Color, &member.Team); err != nil {
			return nil, err
		}
		out = append(out, member)
	}
	return out, rows.Err()
}

func (r *Repository) AddMember(workspaceID, actorID string, i application.AddMemberInput) (application.Member, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return application.Member{}, err
	}
	defer tx.Rollback()
	var member application.Member
	var userID string
	if err := tx.QueryRow(`SELECT id FROM users WHERE lower(email)=lower($1)`, i.Email).Scan(&userID); err != nil {
		return member, err
	}
	err = tx.QueryRow(`INSERT INTO workspace_members(workspace_id,user_id,role,team) VALUES($1,$2,$3,$4) RETURNING workspace_id,role,team`, workspaceID, userID, i.Role, i.Team).Scan(&member.WorkspaceID, &member.Role, &member.Team)
	if err != nil {
		return member, err
	}
	if err := tx.QueryRow(`SELECT id,name,email,initials,color FROM users WHERE id=$1`, userID).Scan(&member.ID, &member.Name, &member.Email, &member.Initials, &member.Color); err != nil {
		return member, err
	}
	if err := recordWorkspaceActivityLog(tx, workspaceID, actorID, "member", userID, member.Name, "created", "Workspace member"); err != nil {
		return member, err
	}
	if err := tx.Commit(); err != nil {
		return member, err
	}
	return member, nil
}

func (r *Repository) UpdateMember(workspaceID, memberID, actorID string, i application.UpdateMemberInput) (application.Member, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return application.Member{}, err
	}
	defer tx.Rollback()
	var member application.Member
	initials := initialsForWorkspace(i.Name)
	if err := tx.QueryRow(`UPDATE users SET name=$2,email=$3,initials=$4,color=$5 WHERE id=$1 RETURNING id,name,email,initials,color`, memberID, i.Name, i.Email, initials, i.Color).Scan(&member.ID, &member.Name, &member.Email, &member.Initials, &member.Color); err != nil {
		return member, err
	}
	if err := tx.QueryRow(`UPDATE workspace_members SET role=$3,team=$4 WHERE workspace_id=$1 AND user_id=$2 AND ((role='owner' AND $3='owner') OR (role<>'owner' AND $3<>'owner')) RETURNING workspace_id,role,team`, workspaceID, memberID, i.Role, i.Team).Scan(&member.WorkspaceID, &member.Role, &member.Team); err != nil {
		return member, err
	}
	if err := recordWorkspaceActivityLog(tx, workspaceID, actorID, "member", memberID, member.Name, "updated", "Workspace member"); err != nil {
		return member, err
	}
	if err := tx.Commit(); err != nil {
		return member, err
	}
	return member, nil
}

func (r *Repository) RemoveMember(workspaceID, memberID, actorID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var name string
	if err := tx.QueryRow(`SELECT u.name FROM workspace_members wm JOIN users u ON u.id=wm.user_id WHERE wm.workspace_id=$1 AND wm.user_id=$2 AND wm.role<>'owner'`, workspaceID, memberID).Scan(&name); err != nil {
		return err
	}
	if _, err := tx.Exec(`DELETE FROM workspace_members WHERE workspace_id=$1 AND user_id=$2 AND role<>'owner'`, workspaceID, memberID); err != nil {
		return err
	}
	if err := recordWorkspaceActivityLog(tx, workspaceID, actorID, "member", memberID, name, "deleted", "Workspace member"); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) RotateWorkspaceInviteCode(workspaceID, actorID, code string) (application.Workspace, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return application.Workspace{}, err
	}
	defer tx.Rollback()
	var x application.Workspace
	if err := tx.QueryRow(`UPDATE workspaces SET invite_code=$2 WHERE id=$1 AND deleted_at IS NULL RETURNING id,workspace_key,name,invite_code,owner_id,created_at`, workspaceID, code).Scan(&x.ID, &x.Key, &x.Name, &x.InviteCode, &x.OwnerID, &x.CreatedAt); err != nil {
		return x, err
	}
	if err := recordWorkspaceActivityLog(tx, workspaceID, actorID, "workspace", workspaceID, x.Name, "updated", "Invite code rotated"); err != nil {
		return x, err
	}
	if err := tx.Commit(); err != nil {
		return x, err
	}
	return x, nil
}
func (r *Repository) ListProjects(id string) ([]application.Project, error) {
	rows, err := r.db.Query(`SELECT id,project_key,workspace_id,name,description,color,icon,to_char(due_on,'YYYY-MM-DD') FROM projects WHERE workspace_id=$1 AND deleted_at IS NULL ORDER BY created_at,name`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []application.Project{}
	for rows.Next() {
		var x application.Project
		var due sql.NullString
		if err := rows.Scan(&x.ID, &x.Key, &x.WorkspaceID, &x.Name, &x.Description, &x.Color, &x.Icon, &due); err != nil {
			return nil, err
		}
		if due.Valid {
			x.DueOn = &due.String
		}
		out = append(out, x)
	}
	return out, rows.Err()
}
func (r *Repository) CreateProject(id string, i application.CreateProjectInput) (application.Project, error) {
	var x application.Project
	var due sql.NullString
	err := r.db.QueryRow(`INSERT INTO projects(project_key,workspace_id,name,description,color,icon,due_on) VALUES($1,$2,$3,$4,COALESCE(NULLIF($5,''),'purple'),COALESCE(NULLIF($6,''),'other'),NULLIF($7,'')::date) RETURNING id,project_key,workspace_id,name,description,color,icon,to_char(due_on,'YYYY-MM-DD')`, i.Key, id, i.Name, i.Description, i.Color, i.Icon, i.DueOn).Scan(&x.ID, &x.Key, &x.WorkspaceID, &x.Name, &x.Description, &x.Color, &x.Icon, &due)
	if due.Valid {
		x.DueOn = &due.String
	}
	return x, err
}
func (r *Repository) UpdateProject(id string, i application.UpdateProjectInput) (application.Project, error) {
	var x application.Project
	var due sql.NullString
	err := r.db.QueryRow(`UPDATE projects SET name=$2,description=$3,color=$4,icon=$5,due_on=NULLIF($6,'')::date WHERE id=$1 AND deleted_at IS NULL RETURNING id,project_key,workspace_id,name,description,color,icon,to_char(due_on,'YYYY-MM-DD')`, id, i.Name, i.Description, i.Color, i.Icon, i.DueOn).Scan(&x.ID, &x.Key, &x.WorkspaceID, &x.Name, &x.Description, &x.Color, &x.Icon, &due)
	if due.Valid {
		x.DueOn = &due.String
	}
	return x, err
}
func (r *Repository) DeleteProject(id string) error {
	_, err := r.db.Exec(`UPDATE projects SET deleted_at=COALESCE(deleted_at,now()) WHERE id=$1 AND deleted_at IS NULL`, id)
	return err
}
func (r *Repository) ListTasks(id string) ([]application.Task, error) {
	rows, err := r.db.Query(`SELECT id,task_key,project_id,title,description,status,priority,assignee_id,to_char(start_on,'YYYY-MM-DD'),to_char(due_on,'YYYY-MM-DD'),rank::text,revision,updated_at FROM tasks WHERE project_id=$1 AND deleted_at IS NULL ORDER BY rank,title`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []application.Task{}
	for rows.Next() {
		var x application.Task
		var a, s, d sql.NullString
		if err := rows.Scan(&x.ID, &x.Key, &x.ProjectID, &x.Title, &x.Description, &x.Status, &x.Priority, &a, &s, &d, &x.Rank, &x.Revision, &x.UpdatedAt); err != nil {
			return nil, err
		}
		if a.Valid {
			x.AssigneeID = &a.String
		}
		if s.Valid {
			x.StartOn = &s.String
		}
		if d.Valid {
			x.DueOn = &d.String
		}
		if err := r.loadTaskMetadata(&x); err != nil {
			return nil, err
		}
		out = append(out, x)
	}
	return out, rows.Err()
}
func (r *Repository) CreateTask(id, actorID string, i application.CreateTaskInput) (application.Task, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return application.Task{}, err
	}
	defer tx.Rollback()
	var x application.Task
	var a, s, d sql.NullString
	rank := i.Rank
	if rank == 0 {
		rank = float64(time.Now().UnixNano())
	}
	err = tx.QueryRow(`INSERT INTO tasks(task_key,project_id,title,description,status,priority,assignee_id,start_on,due_on,rank) VALUES($1,$2,$3,$4,$5,$6,NULLIF($7,'')::uuid,NULLIF($8,'')::date,NULLIF($9,'')::date,$10) RETURNING id,task_key,project_id,title,description,status,priority,assignee_id,to_char(start_on,'YYYY-MM-DD'),to_char(due_on,'YYYY-MM-DD'),rank::text,revision,updated_at`, i.Key, id, i.Title, i.Description, i.Status, i.Priority, i.AssigneeID, i.StartOn, i.DueOn, rank).Scan(&x.ID, &x.Key, &x.ProjectID, &x.Title, &x.Description, &x.Status, &x.Priority, &a, &s, &d, &x.Rank, &x.Revision, &x.UpdatedAt)
	if a.Valid {
		x.AssigneeID = &a.String
	}
	if s.Valid {
		x.StartOn = &s.String
	}
	if d.Valid {
		x.DueOn = &d.String
	}
	if err != nil {
		return x, err
	}
	if err := r.replaceTaskMetadata(tx, x.ID, id, i.Tags, i.Checklist); err != nil {
		return x, err
	}
	if _, err := tx.Exec(`INSERT INTO task_activities(task_id,actor_id,action,detail) VALUES($1,$2,'created',$3)`, x.ID, actorID, x.Title); err != nil {
		return x, err
	}
	if err := recordActivityLog(tx, x.ID, actorID, "created", x.Title); err != nil {
		return x, err
	}
	if err := tx.Commit(); err != nil {
		return x, err
	}
	_ = r.loadTaskMetadata(&x)
	return x, nil
}

func (r *Repository) UpdateTask(id, actorID string, i application.UpdateTaskInput) (application.Task, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return application.Task{}, err
	}
	defer tx.Rollback()
	var x application.Task
	var a, s, d sql.NullString
	var previousStatus string
	if err = tx.QueryRow(`SELECT status FROM tasks WHERE id=$1 AND deleted_at IS NULL`, id).Scan(&previousStatus); err != nil {
		return x, err
	}
	err = tx.QueryRow(`UPDATE tasks SET title=$2,description=$3,status=$4,priority=$5,assignee_id=NULLIF($6,'')::uuid,start_on=NULLIF($7,'')::date,due_on=NULLIF($8,'')::date,rank=CASE WHEN $9=0 THEN rank ELSE $9 END,revision=revision+1,updated_at=now() WHERE id=$1 AND deleted_at IS NULL RETURNING id,task_key,project_id,title,description,status,priority,assignee_id,to_char(start_on,'YYYY-MM-DD'),to_char(due_on,'YYYY-MM-DD'),rank::text,revision,updated_at`, id, i.Title, i.Description, i.Status, i.Priority, i.AssigneeID, i.StartOn, i.DueOn, i.Rank).Scan(&x.ID, &x.Key, &x.ProjectID, &x.Title, &x.Description, &x.Status, &x.Priority, &a, &s, &d, &x.Rank, &x.Revision, &x.UpdatedAt)
	if err != nil {
		return x, err
	}
	if err := r.replaceTaskMetadata(tx, x.ID, x.ProjectID, i.Tags, i.Checklist); err != nil {
		return x, err
	}
	action := "updated"
	detail := x.Title
	if previousStatus != x.Status {
		action, detail = "moved", previousStatus+" -> "+x.Status
	}
	if _, err := tx.Exec(`INSERT INTO task_activities(task_id,actor_id,action,detail) VALUES($1,$2,$3,$4)`, x.ID, actorID, action, detail); err != nil {
		return x, err
	}
	if err := recordActivityLog(tx, x.ID, actorID, action, detail); err != nil {
		return x, err
	}
	if err := tx.Commit(); err != nil {
		return x, err
	}
	if a.Valid {
		x.AssigneeID = &a.String
	}
	if s.Valid {
		x.StartOn = &s.String
	}
	if d.Valid {
		x.DueOn = &d.String
	}
	_ = r.loadTaskMetadata(&x)
	return x, nil
}

func (r *Repository) DeleteTask(id, actorID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var title string
	if err := tx.QueryRow(`UPDATE tasks SET deleted_at=COALESCE(deleted_at,now()),revision=revision+1,updated_at=now() WHERE id=$1 AND deleted_at IS NULL RETURNING title`, id).Scan(&title); err != nil {
		return err
	}
	if _, err := tx.Exec(`INSERT INTO task_activities(task_id,actor_id,action,detail) VALUES($1,$2,'deleted',$3)`, id, actorID, title); err != nil {
		return err
	}
	if err := recordActivityLog(tx, id, actorID, "deleted", title); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) loadTaskMetadata(x *application.Task) error {
	x.Tags = []string{}
	rows, err := r.db.Query(`SELECT tg.name FROM tags tg JOIN task_tags tt ON tt.tag_id=tg.id WHERE tt.task_id=$1 ORDER BY tg.name`, x.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var tag string
		if err := rows.Scan(&tag); err != nil {
			return err
		}
		x.Tags = append(x.Tags, tag)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	x.Checklist = []application.ChecklistItem{}
	rows, err = r.db.Query(`SELECT id,title,done,position FROM checklist_items WHERE task_id=$1 ORDER BY position,id`, x.ID)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var item application.ChecklistItem
		if err := rows.Scan(&item.ID, &item.Title, &item.Done, &item.Position); err != nil {
			return err
		}
		x.Checklist = append(x.Checklist, item)
	}
	return rows.Err()
}

func (r *Repository) replaceTaskMetadata(tx *sql.Tx, taskID, projectID string, tags []string, checklist []application.ChecklistItemInput) error {
	if _, err := tx.Exec(`DELETE FROM task_tags WHERE task_id=$1`, taskID); err != nil {
		return err
	}
	seen := map[string]bool{}
	for _, name := range tags {
		name = strings.TrimSpace(name)
		if name == "" || seen[name] {
			continue
		}
		seen[name] = true
		var tagID string
		if err := tx.QueryRow(`INSERT INTO tags(workspace_id,name) SELECT workspace_id,$2 FROM projects WHERE id=$1 ON CONFLICT(workspace_id,name) DO UPDATE SET name=EXCLUDED.name RETURNING id`, projectID, name).Scan(&tagID); err != nil {
			return err
		}
		if _, err := tx.Exec(`INSERT INTO task_tags(task_id,tag_id) VALUES($1,$2)`, taskID, tagID); err != nil {
			return err
		}
	}
	if _, err := tx.Exec(`DELETE FROM checklist_items WHERE task_id=$1`, taskID); err != nil {
		return err
	}
	for index, item := range checklist {
		if strings.TrimSpace(item.Title) == "" {
			continue
		}
		position := item.Position
		if position == 0 {
			position = index
		}
		if _, err := tx.Exec(`INSERT INTO checklist_items(task_id,title,done,position) VALUES($1,$2,$3,$4)`, taskID, strings.TrimSpace(item.Title), item.Done, position); err != nil {
			return err
		}
	}
	return nil
}

func (r *Repository) ListTaskActivities(taskID string) ([]application.TaskActivity, error) {
	rows, err := r.db.Query(`SELECT a.id,a.task_id,a.actor_id,u.name,a.action,a.detail,a.created_at,a.updated_at FROM task_activities a JOIN users u ON u.id=a.actor_id WHERE a.task_id=$1 AND a.deleted_at IS NULL ORDER BY a.created_at DESC`, taskID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []application.TaskActivity{}
	for rows.Next() {
		var item application.TaskActivity
		if err := rows.Scan(&item.ID, &item.TaskID, &item.ActorID, &item.ActorName, &item.Action, &item.Detail, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) ListTaskActivityLog(taskID, viewerID string, all bool) ([]application.TaskActivity, error) {
	rows, err := r.db.Query(`SELECT a.id,a.task_id,a.actor_id,u.name,a.action,a.detail,a.created_at,a.updated_at FROM task_activities a JOIN users u ON u.id=a.actor_id WHERE a.task_id=$1 AND a.deleted_at IS NULL AND ($3 OR a.actor_id=$2) ORDER BY a.created_at DESC`, taskID, viewerID, all)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []application.TaskActivity{}
	for rows.Next() {
		var item application.TaskActivity
		if err := rows.Scan(&item.ID, &item.TaskID, &item.ActorID, &item.ActorName, &item.Action, &item.Detail, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) ListWorkspaceActivity(workspaceID, viewerID string, all bool) ([]application.WorkspaceActivity, error) {
	rows, err := r.db.Query(`SELECT a.id,a.workspace_id,a.actor_id,u.name,a.entity_type,a.entity_id,a.entity_name,a.action,a.detail,a.created_at FROM activity_logs a JOIN users u ON u.id=a.actor_id WHERE a.workspace_id=$1 AND ($3 OR a.actor_id=$2) ORDER BY a.created_at DESC`, workspaceID, viewerID, all)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []application.WorkspaceActivity{}
	for rows.Next() {
		var item application.WorkspaceActivity
		if err := rows.Scan(&item.ID, &item.WorkspaceID, &item.ActorID, &item.ActorName, &item.EntityType, &item.EntityID, &item.EntityName, &item.Action, &item.Detail, &item.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) ListWorkspaceNotifications(workspaceID, viewerID string) ([]application.WorkspaceActivity, error) {
	rows, err := r.db.Query(`SELECT a.id,a.workspace_id,a.actor_id,u.name,a.entity_type,a.entity_id,a.entity_name,a.action,a.detail,a.created_at,EXISTS(SELECT 1 FROM workspace_notification_reads nr WHERE nr.activity_id=a.id AND nr.user_id=$2) FROM activity_logs a JOIN users u ON u.id=a.actor_id WHERE a.workspace_id=$1 ORDER BY a.created_at DESC`, workspaceID, viewerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []application.WorkspaceActivity{}
	for rows.Next() {
		var item application.WorkspaceActivity
		if err := rows.Scan(&item.ID, &item.WorkspaceID, &item.ActorID, &item.ActorName, &item.EntityType, &item.EntityID, &item.EntityName, &item.Action, &item.Detail, &item.CreatedAt, &item.Read); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) MarkWorkspaceNotificationsRead(workspaceID, userID string, activityIDs []string) error {
	if len(activityIDs) == 0 {
		return nil
	}
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	for _, activityID := range activityIDs {
		if _, err := tx.Exec(`INSERT INTO workspace_notification_reads(workspace_id,user_id,activity_id) SELECT $1,$2,a.id FROM activity_logs a WHERE a.id=$3 AND a.workspace_id=$1 ON CONFLICT (user_id,activity_id) DO NOTHING`, workspaceID, userID, activityID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (r *Repository) CreateTaskActivity(taskID, actorID string, i application.CreateTaskActivityInput) (application.TaskActivity, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return application.TaskActivity{}, err
	}
	defer tx.Rollback()
	var item application.TaskActivity
	err = tx.QueryRow(`INSERT INTO task_activities(task_id,actor_id,action,detail) SELECT $1,$2,$3,$4 WHERE EXISTS (SELECT 1 FROM tasks WHERE id=$1 AND deleted_at IS NULL) RETURNING id,task_id,actor_id,(SELECT name FROM users WHERE id=actor_id),action,detail,created_at,updated_at`, taskID, actorID, i.Action, i.Detail).Scan(&item.ID, &item.TaskID, &item.ActorID, &item.ActorName, &item.Action, &item.Detail, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return item, err
	}
	if err := recordActivityLog(tx, taskID, actorID, i.Action, i.Detail); err != nil {
		return item, err
	}
	err = tx.Commit()
	return item, err
}

func (r *Repository) UpdateTaskActivity(taskID, id, actorID string, i application.UpdateTaskActivityInput) (application.TaskActivity, error) {
	tx, err := r.db.Begin()
	if err != nil {
		return application.TaskActivity{}, err
	}
	defer tx.Rollback()
	var item application.TaskActivity
	err = tx.QueryRow(`UPDATE task_activities SET detail=$4,updated_at=now() WHERE id=$1 AND task_id=$2 AND actor_id=$3 AND deleted_at IS NULL RETURNING id,task_id,actor_id,(SELECT name FROM users WHERE id=actor_id),action,detail,created_at,updated_at`, id, taskID, actorID, i.Detail).Scan(&item.ID, &item.TaskID, &item.ActorID, &item.ActorName, &item.Action, &item.Detail, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return item, err
	}
	if err := recordActivityLog(tx, item.TaskID, actorID, "updated", i.Detail); err != nil {
		return item, err
	}
	err = tx.Commit()
	return item, err
}

func (r *Repository) DeleteTaskActivity(taskID, id, actorID string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var activityTaskID, detail string
	if err := tx.QueryRow(`UPDATE task_activities SET deleted_at=now(),updated_at=now() WHERE id=$1 AND task_id=$2 AND actor_id=$3 AND deleted_at IS NULL RETURNING task_id,detail`, id, taskID, actorID).Scan(&activityTaskID, &detail); err != nil {
		return err
	}
	if err := recordActivityLog(tx, activityTaskID, actorID, "deleted", detail); err != nil {
		return err
	}
	return tx.Commit()
}

func (r *Repository) WorkspaceIDForProject(id string) (string, error) {
	var workspaceID string
	err := r.db.QueryRow(`SELECT workspace_id FROM projects WHERE id=$1`, id).Scan(&workspaceID)
	return workspaceID, err
}

func (r *Repository) WorkspaceIDForTask(id string) (string, error) {
	var workspaceID string
	err := r.db.QueryRow(`SELECT p.workspace_id FROM tasks t JOIN projects p ON p.id=t.project_id WHERE t.id=$1`, id).Scan(&workspaceID)
	return workspaceID, err
}

func (r *Repository) ListDiscussion(ctx context.Context, workspaceID string) ([]application.DiscussionMessage, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT m.id,m.workspace_id,m.author_id,u.name,m.body,m.created_at,m.updated_at FROM workspace_discussion_messages m JOIN users u ON u.id=m.author_id WHERE m.workspace_id=$1 AND m.deleted_at IS NULL ORDER BY m.created_at ASC`, workspaceID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []application.DiscussionMessage{}
	for rows.Next() {
		var item application.DiscussionMessage
		if err := rows.Scan(&item.ID, &item.WorkspaceID, &item.AuthorID, &item.AuthorName, &item.Body, &item.CreatedAt, &item.UpdatedAt); err != nil {
			return nil, err
		}
		out = append(out, item)
	}
	return out, rows.Err()
}

func (r *Repository) CreateDiscussion(ctx context.Context, workspaceID, actorID string, i application.CreateDiscussionMessageInput) (application.DiscussionMessage, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return application.DiscussionMessage{}, err
	}
	defer tx.Rollback()
	var item application.DiscussionMessage
	err = tx.QueryRowContext(ctx, `INSERT INTO workspace_discussion_messages(workspace_id,author_id,body) VALUES($1,$2,$3) RETURNING id,workspace_id,author_id,body,created_at,updated_at`, workspaceID, actorID, i.Body).Scan(&item.ID, &item.WorkspaceID, &item.AuthorID, &item.Body, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return item, err
	}
	if err := tx.QueryRowContext(ctx, `SELECT name FROM users WHERE id=$1`, actorID).Scan(&item.AuthorName); err != nil {
		return item, err
	}
	if err := recordWorkspaceActivityLogContext(ctx, tx, workspaceID, actorID, "message", item.ID, item.Body, "comment", "Workspace discussion"); err != nil {
		return item, err
	}
	if err := tx.Commit(); err != nil {
		return item, err
	}
	return item, nil
}

func (r *Repository) UpdateDiscussion(ctx context.Context, workspaceID, messageID, actorID string, i application.UpdateDiscussionMessageInput) (application.DiscussionMessage, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return application.DiscussionMessage{}, err
	}
	defer tx.Rollback()
	var item application.DiscussionMessage
	err = tx.QueryRowContext(ctx, `UPDATE workspace_discussion_messages SET body=$4,updated_at=now() WHERE id=$1 AND workspace_id=$2 AND author_id=$3 AND deleted_at IS NULL RETURNING id,workspace_id,author_id,body,created_at,updated_at`, messageID, workspaceID, actorID, i.Body).Scan(&item.ID, &item.WorkspaceID, &item.AuthorID, &item.Body, &item.CreatedAt, &item.UpdatedAt)
	if err != nil {
		return item, err
	}
	if err := tx.QueryRowContext(ctx, `SELECT name FROM users WHERE id=$1`, actorID).Scan(&item.AuthorName); err != nil {
		return item, err
	}
	if err := recordWorkspaceActivityLogContext(ctx, tx, workspaceID, actorID, "message", item.ID, item.Body, "updated", "Workspace discussion"); err != nil {
		return item, err
	}
	if err := tx.Commit(); err != nil {
		return item, err
	}
	return item, nil
}

func (r *Repository) DeleteDiscussion(ctx context.Context, workspaceID, messageID, actorID string) error {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var body string
	if err := tx.QueryRowContext(ctx, `UPDATE workspace_discussion_messages SET deleted_at=now(),updated_at=now() WHERE id=$1 AND workspace_id=$2 AND author_id=$3 AND deleted_at IS NULL RETURNING body`, messageID, workspaceID, actorID).Scan(&body); err != nil {
		return err
	}
	if err := recordWorkspaceActivityLogContext(ctx, tx, workspaceID, actorID, "message", messageID, body, "deleted", "Workspace discussion"); err != nil {
		return err
	}
	return tx.Commit()
}
