package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"time"
	"orbit/backend/internal/application"
	"orbit/backend/internal/infrastructure/postgres"
)

func NewRouter(databases ...*sql.DB) http.Handler {
	var db *sql.DB
	if len(databases) > 0 {
		db = databases[0]
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", home(db))
	mux.HandleFunc("GET /healthz", health)
	mux.HandleFunc("GET /readyz", ready(db))
	if db != nil {
		h := handlers{service: application.NewService(postgres.NewRepository(db))}
		mux.HandleFunc("GET /api/workspaces", h.listWorkspaces)
		mux.HandleFunc("POST /api/workspaces", h.createWorkspace)
		mux.HandleFunc("GET /api/workspaces/{workspaceID}/projects", h.listProjects)
		mux.HandleFunc("POST /api/workspaces/{workspaceID}/projects", h.createProject)
		mux.HandleFunc("GET /api/projects/{projectID}/tasks", h.listTasks)
		mux.HandleFunc("POST /api/projects/{projectID}/tasks", h.createTask)
	}
	return requestLog(mux)
}

type workspaceResponse struct {
	ID          string `json:"id"`
	Key         string `json:"key"`
	Name        string `json:"name"`
	InviteCode  string `json:"inviteCode"`
	OwnerID     string `json:"ownerId"`
	CreatedAt   string `json:"createdAt"`
}

type projectResponse struct {
	ID          string  `json:"id"`
	Key         string  `json:"key"`
	WorkspaceID string  `json:"workspaceId"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Color       string  `json:"color"`
	Icon        string  `json:"icon"`
	DueOn       *string `json:"dueOn,omitempty"`
}

type taskResponse struct {
	ID          string  `json:"id"`
	Key         string  `json:"key"`
	ProjectID   string  `json:"projectId"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	Priority    string  `json:"priority"`
	AssigneeID  *string `json:"assigneeId,omitempty"`
	StartOn     *string `json:"startOn,omitempty"`
	DueOn       *string `json:"dueOn,omitempty"`
	Rank        string  `json:"rank"`
	Revision    int64   `json:"revision"`
	UpdatedAt   string  `json:"updatedAt"`
}

type createWorkspaceRequest struct {
	Key        string `json:"key"`
	Name       string `json:"name"`
	InviteCode string `json:"inviteCode"`
	OwnerID    string `json:"ownerId"`
}

type createProjectRequest struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`
	DueOn       string `json:"dueOn"`
}

type createTaskRequest struct {
	Key         string `json:"key"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
	AssigneeID  string `json:"assigneeId"`
	StartOn     string `json:"startOn"`
	DueOn       string `json:"dueOn"`
	Rank        float64 `json:"rank"`
}

func listWorkspaces(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.QueryContext(r.Context(), `SELECT id, workspace_key, name, invite_code, owner_id, created_at FROM workspaces WHERE deleted_at IS NULL ORDER BY created_at, name`)
		if err != nil { serverError(w, err); return }
		defer rows.Close()
		items := []workspaceResponse{}
		for rows.Next() {
			var item workspaceResponse
			if err := rows.Scan(&item.ID, &item.Key, &item.Name, &item.InviteCode, &item.OwnerID, &item.CreatedAt); err != nil { serverError(w, err); return }
			items = append(items, item)
		}
		if err := rows.Err(); err != nil { serverError(w, err); return }
		writeJSON(w, http.StatusOK, items)
	}
}

func createWorkspace(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input createWorkspaceRequest
		if err := decodeJSON(r, &input); err != nil || input.Key == "" || input.Name == "" || input.InviteCode == "" || input.OwnerID == "" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "key, name, inviteCode and ownerId are required"}); return
		}
		tx, err := db.BeginTx(r.Context(), nil)
		if err != nil { serverError(w, err); return }
		defer tx.Rollback()
		var item workspaceResponse
		err = tx.QueryRowContext(r.Context(), `INSERT INTO workspaces (workspace_key, name, invite_code, owner_id) VALUES ($1, $2, $3, $4) RETURNING id, workspace_key, name, invite_code, owner_id, created_at`, input.Key, input.Name, input.InviteCode, input.OwnerID).Scan(&item.ID, &item.Key, &item.Name, &item.InviteCode, &item.OwnerID, &item.CreatedAt)
		if err != nil { conflictOrServerError(w, err); return }
		if err := tx.Commit(); err != nil { serverError(w, err); return }
		writeJSON(w, http.StatusCreated, item)
	}
}

func listProjects(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.QueryContext(r.Context(), `SELECT id, project_key, workspace_id, name, description, color, icon, to_char(due_on, 'YYYY-MM-DD') FROM projects WHERE workspace_id = $1 AND deleted_at IS NULL ORDER BY created_at, name`, r.PathValue("workspaceID"))
		if err != nil { serverError(w, err); return }
		defer rows.Close()
		items := []projectResponse{}
		for rows.Next() {
			var item projectResponse; var due sql.NullString
			if err := rows.Scan(&item.ID, &item.Key, &item.WorkspaceID, &item.Name, &item.Description, &item.Color, &item.Icon, &due); err != nil { serverError(w, err); return }
			if due.Valid { item.DueOn = &due.String }; items = append(items, item)
		}
		if err := rows.Err(); err != nil { serverError(w, err); return }; writeJSON(w, http.StatusOK, items)
	}
}

func createProject(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input createProjectRequest
		if err := decodeJSON(r, &input); err != nil || input.Key == "" || input.Name == "" { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "key and name are required"}); return }
		var item projectResponse; workspaceID := r.PathValue("workspaceID")
		err := db.QueryRowContext(r.Context(), `INSERT INTO projects (project_key, workspace_id, name, description, color, icon, due_on) VALUES ($1, $2, $3, $4, COALESCE(NULLIF($5, ''), 'purple'), COALESCE(NULLIF($6, ''), 'other'), NULLIF($7, '')::date) RETURNING id, project_key, workspace_id, name, description, color, icon, to_char(due_on, 'YYYY-MM-DD')`, input.Key, workspaceID, input.Name, input.Description, input.Color, input.Icon, input.DueOn).Scan(&item.ID, &item.Key, &item.WorkspaceID, &item.Name, &item.Description, &item.Color, &item.Icon, nullableString(&item.DueOn))
		if err != nil { conflictOrServerError(w, err); return }; writeJSON(w, http.StatusCreated, item)
	}
}

func listTasks(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		rows, err := db.QueryContext(r.Context(), `SELECT id, task_key, project_id, title, description, status, priority, assignee_id, to_char(start_on, 'YYYY-MM-DD'), to_char(due_on, 'YYYY-MM-DD'), rank::text, revision, updated_at FROM tasks WHERE project_id = $1 AND deleted_at IS NULL ORDER BY rank, title`, r.PathValue("projectID"))
		if err != nil { serverError(w, err); return }; defer rows.Close()
		items := []taskResponse{}
		for rows.Next() { var item taskResponse; var assignee, start, due sql.NullString; if err := rows.Scan(&item.ID, &item.Key, &item.ProjectID, &item.Title, &item.Description, &item.Status, &item.Priority, &assignee, &start, &due, &item.Rank, &item.Revision, &item.UpdatedAt); err != nil { serverError(w, err); return }; if assignee.Valid { item.AssigneeID = &assignee.String }; if start.Valid { item.StartOn = &start.String }; if due.Valid { item.DueOn = &due.String }; items = append(items, item) }
		if err := rows.Err(); err != nil { serverError(w, err); return }; writeJSON(w, http.StatusOK, items)
	}
}

func createTask(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var input createTaskRequest
		if err := decodeJSON(r, &input); err != nil || input.Key == "" || input.Title == "" || input.Status == "" || input.Priority == "" { writeJSON(w, http.StatusBadRequest, map[string]string{"error": "key, title, status and priority are required"}); return }
		var item taskResponse; rank := input.Rank; if rank == 0 { rank = float64(time.Now().UnixNano()) }
		err := db.QueryRowContext(r.Context(), `INSERT INTO tasks (task_key, project_id, title, description, status, priority, assignee_id, start_on, due_on, rank) VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, '')::uuid, NULLIF($8, '')::date, NULLIF($9, '')::date, $10) RETURNING id, task_key, project_id, title, description, status, priority, assignee_id, to_char(start_on, 'YYYY-MM-DD'), to_char(due_on, 'YYYY-MM-DD'), rank::text, revision, updated_at`, input.Key, r.PathValue("projectID"), input.Title, input.Description, input.Status, input.Priority, input.AssigneeID, input.StartOn, input.DueOn, rank).Scan(&item.ID, &item.Key, &item.ProjectID, &item.Title, &item.Description, &item.Status, &item.Priority, nullableString(&item.AssigneeID), nullableString(&item.StartOn), nullableString(&item.DueOn), &item.Rank, &item.Revision, &item.UpdatedAt)
		if err != nil { conflictOrServerError(w, err); return }; writeJSON(w, http.StatusCreated, item)
	}
}

func decodeJSON(r *http.Request, target any) error { defer r.Body.Close(); return json.NewDecoder(r.Body).Decode(target) }
func nullableString(target **string) any { return target }
func serverError(w http.ResponseWriter, err error) { writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "database operation failed"}); _ = err }
func conflictOrServerError(w http.ResponseWriter, err error) { if errors.Is(err, sql.ErrNoRows) { writeJSON(w, http.StatusNotFound, map[string]string{"error": "related record not found"}); return }; if strings.Contains(err.Error(), "duplicate key") { writeJSON(w, http.StatusConflict, map[string]string{"error": "key already exists"}); return }; serverError(w, err) }

func home(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		databaseState := "Not connected"
		databaseClass := "offline"
		if db != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			err := db.PingContext(ctx)
			cancel()
			if err == nil {
				databaseState = "Connected"
				databaseClass = "online"
			}
		}

		page := strings.NewReplacer(
			"{{DB_CLASS}}", databaseClass,
			"{{DB_STATUS}}", databaseState,
		).Replace(homePage)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(page))
	}
}

func health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func ready(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if db == nil || db.PingContext(r.Context()) != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "not_ready"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func requestLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		next.ServeHTTP(w, r)
	})
}

const homePage = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#0b1020">
  <title>Orbit API · Command center</title>
  <style>
    :root { color-scheme: dark; --bg:#080b16; --panel:rgba(18,25,46,.78); --line:rgba(157,173,229,.18); --ink:#f4f7ff; --muted:#a9b4d3; --violet:#9b8cff; --cyan:#6fe7e0; }
    * { box-sizing:border-box; }
    body { margin:0; min-height:100vh; color:var(--ink); background:radial-gradient(circle at 15% 0%, #26305c 0, transparent 36%), radial-gradient(circle at 90% 20%, #173d53 0, transparent 30%), var(--bg); font:15px/1.6 Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif; }
    a { color:inherit; text-decoration:none; }
    .shell { width:min(1120px, calc(100% - 40px)); margin:auto; }
    header { display:flex; justify-content:space-between; align-items:center; padding:28px 0; }
    .brand { display:flex; align-items:center; gap:12px; font-weight:750; letter-spacing:.02em; }
    .mark { width:38px; height:38px; display:grid; place-items:center; border:1px solid rgba(255,255,255,.22); border-radius:13px; background:linear-gradient(145deg,#a898ff,#5ce1da); color:#10152c; box-shadow:0 10px 30px rgba(111,231,224,.16); font-size:20px; }
    nav { display:flex; gap:8px; color:var(--muted); font-size:13px; }
    nav a { padding:7px 12px; border-radius:9px; } nav a:hover { background:rgba(255,255,255,.08); color:var(--ink); }
    .hero { padding:72px 0 58px; max-width:780px; }
    .eyebrow { display:inline-flex; align-items:center; gap:8px; border:1px solid rgba(111,231,224,.28); border-radius:999px; color:var(--cyan); padding:6px 12px; font-size:12px; font-weight:650; letter-spacing:.08em; text-transform:uppercase; background:rgba(111,231,224,.06); }
    .dot { width:7px; height:7px; border-radius:50%; background:var(--cyan); box-shadow:0 0 14px var(--cyan); }
    h1 { margin:22px 0 16px; font-size:clamp(42px,7vw,76px); line-height:1.02; letter-spacing:-.055em; max-width:760px; }
    h1 span { background:linear-gradient(110deg,#fff 15%,#b9b0ff 58%,#6fe7e0); -webkit-background-clip:text; background-clip:text; color:transparent; }
    .lead { max-width:620px; margin:0; color:var(--muted); font-size:18px; }
    .actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:30px; }
    .button { display:inline-flex; align-items:center; gap:9px; padding:11px 17px; border-radius:11px; font-weight:650; border:1px solid var(--line); background:rgba(255,255,255,.06); }
    .button.primary { border-color:transparent; color:#10152c; background:linear-gradient(100deg,#a898ff,#6fe7e0); }
    .button:hover { transform:translateY(-1px); filter:brightness(1.08); }
    .grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; padding-bottom:58px; }
    .card { padding:23px; border:1px solid var(--line); border-radius:18px; background:var(--panel); backdrop-filter:blur(18px); box-shadow:0 18px 60px rgba(0,0,0,.16); }
    .card h2 { margin:0 0 7px; font-size:16px; } .card p { margin:0; color:var(--muted); font-size:13px; }
    .icon { display:grid; place-items:center; width:35px; height:35px; margin-bottom:17px; border-radius:10px; color:var(--cyan); background:rgba(111,231,224,.1); font-size:18px; }
    .status { display:flex; align-items:center; gap:8px; color:var(--cyan); font-weight:650; font-size:13px; }
    .status.offline { color:#ff9d9d; } .status.offline .dot { background:#ff7777; box-shadow:0 0 14px #ff7777; }
    .endpoint { display:inline-flex; margin-top:14px; color:#c5caff; font:12px ui-monospace, SFMono-Regular, Consolas, monospace; }
    footer { display:flex; justify-content:space-between; gap:20px; padding:20px 0 30px; color:#7783a8; font-size:12px; border-top:1px solid var(--line); }
    @media (max-width:700px) { .shell { width:min(100% - 28px,1120px); } header { padding:18px 0; } nav a { padding:6px; } .hero { padding:58px 0 45px; } .grid { grid-template-columns:1fr; } footer { flex-direction:column; gap:4px; } }
  </style>
</head>
<body>
  <div class="shell">
    <header>
      <a class="brand" href="/"><span class="mark">✦</span><span>ORBIT <small style="color:#8792b6;font-weight:500">API</small></span></a>
      <nav><a href="/healthz">Health</a><a href="/readyz">Readiness</a></nav>
    </header>
    <main>
      <section class="hero">
        <div class="eyebrow"><span class="dot"></span> Systems online</div>
        <h1>Make work move <span>in orbit.</span></h1>
        <p class="lead">A calm, dependable command layer for workspaces, tasks, collaboration and everything your team needs to keep moving forward.</p>
        <div class="actions"><a class="button primary" href="/readyz">Check readiness <span>→</span></a><a class="button" href="/healthz">View health status</a></div>
      </section>
      <section class="grid" aria-label="Service overview">
        <article class="card"><div class="icon">◉</div><h2>API service</h2><p>Go HTTP service is accepting requests on the configured port.</p><span class="endpoint">GET /healthz</span></article>
        <article class="card"><div class="icon">⌁</div><h2>PostgreSQL</h2><div class="status {{DB_CLASS}}"><span class="dot"></span> {{DB_STATUS}}</div><p style="margin-top:7px">Live connection status, checked when this page loads.</p><span class="endpoint">GET /readyz</span></article>
        <article class="card"><div class="icon">✦</div><h2>Built for Orbit</h2><p>Structured to grow from a focused API into your team’s source of truth.</p><span class="endpoint">orbit/backend</span></article>
      </section>
    </main>
    <footer><span>Orbit API · Go + PostgreSQL</span><span>localhost:8080</span></footer>
  </div>
</body>
</html>`
