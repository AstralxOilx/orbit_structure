package httpapi

import (
	"encoding/json"
	"net/http"
	"orbit/backend/internal/application"
	"orbit/backend/internal/auth"
)

type handlers struct {
	service *application.Service
	manager *auth.Manager
}

func (h handlers) listWorkspaces(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	x, err := h.service.ListWorkspaces(u.ID)
	if err != nil {
		apiServerError(w)
		return
	}
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) createWorkspace(w http.ResponseWriter, r *http.Request) {
	var i application.CreateWorkspaceInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON"})
		return
	}
	u, _ := auth.Current(r)
	i.OwnerID = u.ID
	x, err := h.service.CreateWorkspace(i)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 201, x)
}
func (h handlers) joinWorkspace(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Code string `json:"code"`
	}
	if json.NewDecoder(r.Body).Decode(&input) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}
	u, _ := auth.Current(r)
	x, err := h.service.JoinWorkspace(input.Code, u.ID)
	if err != nil {
		writeJSON(w, http.StatusNotFound, map[string]string{"error": "workspace code is invalid or expired"})
		return
	}
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) listMembers(w http.ResponseWriter, r *http.Request) {
	if !h.allowedWorkspace(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace access denied"})
		return
	}
	x, err := h.service.ListMembers(r.PathValue("workspaceID"))
	if err != nil {
		apiServerError(w)
		return
	}
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) listProjects(w http.ResponseWriter, r *http.Request) {
	if !h.allowedWorkspace(r) {
		writeJSON(w, 403, map[string]string{"error": "workspace access denied"})
		return
	}
	x, err := h.service.ListProjects(r.PathValue("workspaceID"))
	if err != nil {
		apiServerError(w)
		return
	}
	writeJSON(w, 200, x)
}
func (h handlers) createProject(w http.ResponseWriter, r *http.Request) {
	if !h.allowedWorkspace(r) {
		writeJSON(w, 403, map[string]string{"error": "workspace access denied"})
		return
	}
	var i application.CreateProjectInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON"})
		return
	}
	x, err := h.service.CreateProject(r.PathValue("workspaceID"), i)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 201, x)
}
func (h handlers) listTasks(w http.ResponseWriter, r *http.Request) {
	if !h.allowedProject(r) {
		writeJSON(w, 403, map[string]string{"error": "project access denied"})
		return
	}
	x, err := h.service.ListTasks(r.PathValue("projectID"))
	if err != nil {
		apiServerError(w)
		return
	}
	writeJSON(w, 200, x)
}
func (h handlers) createTask(w http.ResponseWriter, r *http.Request) {
	if !h.allowedProject(r) {
		writeJSON(w, 403, map[string]string{"error": "project access denied"})
		return
	}
	var i application.CreateTaskInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON"})
		return
	}
	x, err := h.service.CreateTask(r.PathValue("projectID"), i)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, 201, x)
}
func (h handlers) allowedWorkspace(r *http.Request) bool {
	u, ok := auth.Current(r)
	return ok && h.manager.CanAccessWorkspace(r.Context(), u.ID, r.PathValue("workspaceID"))
}
func (h handlers) allowedProject(r *http.Request) bool {
	u, ok := auth.Current(r)
	return ok && h.manager.CanAccessProject(r.Context(), u.ID, r.PathValue("projectID"))
}
func apiServerError(w http.ResponseWriter) {
	writeJSON(w, 500, map[string]string{"error": "database operation failed"})
}
