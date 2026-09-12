package httpapi

import (
	"context"
	"encoding/json"
	"net/http"
	"orbit/backend/internal/application"
	"orbit/backend/internal/auth"
	"time"
)

type handlers struct {
	service *application.Service
	manager *auth.Manager
	broker  *eventBroker
}

func (h handlers) publish(workspaceID, eventType, entity, entityID, action string) {
	if h.broker != nil {
		h.broker.publish(workspaceEvent{Type: eventType, WorkspaceID: workspaceID, Entity: entity, EntityID: entityID, Action: action})
	}
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
func (h handlers) updateWorkspace(w http.ResponseWriter, r *http.Request) {
	if !h.canManageWorkspace(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace management access denied"})
		return
	}
	var i application.UpdateWorkspaceInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON"})
		return
	}
	x, err := h.service.UpdateWorkspace(r.PathValue("workspaceID"), i)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	h.publish(r.PathValue("workspaceID"), "workspace", "workspace", r.PathValue("workspaceID"), "updated")
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) deleteWorkspace(w http.ResponseWriter, r *http.Request) {
	if !h.canManageWorkspace(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace management access denied"})
		return
	}
	if err := h.service.DeleteWorkspace(r.PathValue("workspaceID")); err != nil {
		apiServerError(w)
		return
	}
	h.publish(r.PathValue("workspaceID"), "workspace", "workspace", r.PathValue("workspaceID"), "deleted")
	w.WriteHeader(http.StatusNoContent)
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
	h.publish(x.ID, "member", "member", u.ID, "created")
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
func (h handlers) addMember(w http.ResponseWriter, r *http.Request) {
	if !h.canManageWorkspace(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace member management access denied"})
		return
	}
	var i application.AddMemberInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}
	u, _ := auth.Current(r)
	x, err := h.service.AddMember(r.PathValue("workspaceID"), u.ID, i)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	h.publish(r.PathValue("workspaceID"), "member", "member", x.ID, "created")
	writeJSON(w, http.StatusCreated, x)
}
func (h handlers) updateMember(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	workspaceID, memberID := r.PathValue("workspaceID"), r.PathValue("memberID")
	canManage := h.manager.CanManageWorkspace(r.Context(), u.ID, workspaceID)
	if !h.manager.CanAccessWorkspace(r.Context(), u.ID, workspaceID) || (u.ID != memberID && !canManage) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace member access denied"})
		return
	}
	var i application.UpdateMemberInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}
	if !canManage {
		members, err := h.service.ListMembers(workspaceID)
		if err != nil {
			apiServerError(w)
			return
		}
		for _, member := range members {
			if member.ID == memberID {
				i.Role = member.Role
				break
			}
		}
	}
	x, err := h.service.UpdateMember(workspaceID, memberID, u.ID, i)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	h.publish(workspaceID, "member", "member", x.ID, "updated")
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) removeMember(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	workspaceID, memberID := r.PathValue("workspaceID"), r.PathValue("memberID")
	if !h.manager.CanAccessWorkspace(r.Context(), u.ID, workspaceID) || (u.ID != memberID && !h.manager.CanManageWorkspace(r.Context(), u.ID, workspaceID)) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace member access denied"})
		return
	}
	if err := h.service.RemoveMember(workspaceID, memberID, u.ID); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	h.publish(workspaceID, "member", "member", memberID, "deleted")
	w.WriteHeader(http.StatusNoContent)
}
func (h handlers) rotateInviteCode(w http.ResponseWriter, r *http.Request) {
	if !h.canManageWorkspace(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace management access denied"})
		return
	}
	u, _ := auth.Current(r)
	code, err := application.NewKey("ORBIT-")
	if err != nil {
		apiServerError(w)
		return
	}
	x, err := h.service.RotateWorkspaceInviteCode(r.PathValue("workspaceID"), u.ID, code)
	if err != nil {
		apiServerError(w)
		return
	}
	h.publish(r.PathValue("workspaceID"), "workspace", "workspace", r.PathValue("workspaceID"), "updated")
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
	h.publish(r.PathValue("workspaceID"), "project", "project", x.ID, "created")
	writeJSON(w, 201, x)
}
func (h handlers) updateProject(w http.ResponseWriter, r *http.Request) {
	if !h.canManageProject(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "project management access denied"})
		return
	}
	var i application.UpdateProjectInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON"})
		return
	}
	x, err := h.service.UpdateProject(r.PathValue("projectID"), i)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	if workspaceID, lookupErr := h.service.WorkspaceIDForProject(r.PathValue("projectID")); lookupErr == nil {
		h.publish(workspaceID, "project", "project", r.PathValue("projectID"), "updated")
	}
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) deleteProject(w http.ResponseWriter, r *http.Request) {
	if !h.canManageProject(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "project management access denied"})
		return
	}
	if err := h.service.DeleteProject(r.PathValue("projectID")); err != nil {
		apiServerError(w)
		return
	}
	if workspaceID, lookupErr := h.service.WorkspaceIDForProject(r.PathValue("projectID")); lookupErr == nil {
		h.publish(workspaceID, "project", "project", r.PathValue("projectID"), "deleted")
	}
	w.WriteHeader(http.StatusNoContent)
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
	u, _ := auth.Current(r)
	if !h.allowedProject(r) {
		writeJSON(w, 403, map[string]string{"error": "project access denied"})
		return
	}
	var i application.CreateTaskInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON"})
		return
	}
	x, err := h.service.CreateTask(r.PathValue("projectID"), u.ID, i)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	if workspaceID, lookupErr := h.service.WorkspaceIDForProject(r.PathValue("projectID")); lookupErr == nil {
		h.publish(workspaceID, "task", "task", x.ID, "created")
	}
	writeJSON(w, 201, x)
}
func (h handlers) updateTask(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	if !h.manager.CanAccessTask(r.Context(), u.ID, r.PathValue("taskID")) {
		writeJSON(w, 403, map[string]string{"error": "task access denied"})
		return
	}
	var i application.UpdateTaskInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON"})
		return
	}
	x, err := h.service.UpdateTask(r.PathValue("taskID"), u.ID, i)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	if workspaceID, lookupErr := h.service.WorkspaceIDForTask(r.PathValue("taskID")); lookupErr == nil {
		h.publish(workspaceID, "task", "task", x.ID, "updated")
	}
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) deleteTask(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	if !h.manager.CanAccessTask(r.Context(), u.ID, r.PathValue("taskID")) {
		writeJSON(w, 403, map[string]string{"error": "task access denied"})
		return
	}
	if err := h.service.DeleteTask(r.PathValue("taskID"), u.ID); err != nil {
		apiServerError(w)
		return
	}
	if workspaceID, lookupErr := h.service.WorkspaceIDForTask(r.PathValue("taskID")); lookupErr == nil {
		h.publish(workspaceID, "task", "task", r.PathValue("taskID"), "deleted")
	}
	w.WriteHeader(http.StatusNoContent)
}
func (h handlers) listTaskActivities(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	if !h.manager.CanAccessTask(r.Context(), u.ID, r.PathValue("taskID")) {
		writeJSON(w, 403, map[string]string{"error": "task access denied"})
		return
	}
	x, err := h.service.ListTaskActivities(r.PathValue("taskID"))
	if err != nil {
		apiServerError(w)
		return
	}
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) listTaskActivityLog(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	if !h.manager.CanAccessTask(r.Context(), u.ID, r.PathValue("taskID")) {
		writeJSON(w, 403, map[string]string{"error": "task access denied"})
		return
	}
	all := h.manager.CanViewAllActivity(r.Context(), u.ID, r.PathValue("taskID"))
	x, err := h.service.ListTaskActivityLog(r.PathValue("taskID"), u.ID, all)
	if err != nil {
		apiServerError(w)
		return
	}
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) listWorkspaceActivity(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	if !h.manager.CanAccessWorkspace(r.Context(), u.ID, r.PathValue("workspaceID")) {
		writeJSON(w, 403, map[string]string{"error": "workspace access denied"})
		return
	}
	all := h.manager.IsWorkspaceOwner(r.Context(), u.ID, r.PathValue("workspaceID"))
	x, err := h.service.ListWorkspaceActivity(r.PathValue("workspaceID"), u.ID, all)
	if err != nil {
		apiServerError(w)
		return
	}
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) listWorkspaceNotifications(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	workspaceID := r.PathValue("workspaceID")
	if !h.manager.CanAccessWorkspace(r.Context(), u.ID, workspaceID) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace access denied"})
		return
	}
	// Notifications are workspace-wide events. Activity-log visibility remains
	// separately controlled by the existing owner/member rules.
	x, err := h.service.ListWorkspaceNotifications(workspaceID, u.ID)
	if err != nil {
		apiServerError(w)
		return
	}
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) markWorkspaceNotificationsRead(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	workspaceID := r.PathValue("workspaceID")
	if !h.manager.CanAccessWorkspace(r.Context(), u.ID, workspaceID) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace access denied"})
		return
	}
	var input struct {
		ActivityIDs []string `json:"activityIds"`
	}
	if json.NewDecoder(r.Body).Decode(&input) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}
	if err := h.service.MarkWorkspaceNotificationsRead(workspaceID, u.ID, input.ActivityIDs); err != nil {
		apiServerError(w)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
func (h handlers) createTaskActivity(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	if !h.manager.CanAccessTask(r.Context(), u.ID, r.PathValue("taskID")) {
		writeJSON(w, 403, map[string]string{"error": "task access denied"})
		return
	}
	var i application.CreateTaskActivityInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON"})
		return
	}
	x, err := h.service.CreateTaskActivity(r.PathValue("taskID"), u.ID, i)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	if workspaceID, lookupErr := h.service.WorkspaceIDForTask(r.PathValue("taskID")); lookupErr == nil {
		h.publish(workspaceID, "task_activity", "task", r.PathValue("taskID"), i.Action)
	}
	writeJSON(w, http.StatusCreated, x)
}
func (h handlers) updateTaskActivity(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	if !h.manager.CanAccessTask(r.Context(), u.ID, r.PathValue("taskID")) {
		writeJSON(w, 403, map[string]string{"error": "task access denied"})
		return
	}
	var i application.UpdateTaskActivityInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON"})
		return
	}
	x, err := h.service.UpdateTaskActivity(r.PathValue("taskID"), r.PathValue("activityID"), u.ID, i)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	if workspaceID, lookupErr := h.service.WorkspaceIDForTask(r.PathValue("taskID")); lookupErr == nil {
		h.publish(workspaceID, "task_activity", "task", r.PathValue("taskID"), "updated")
	}
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) deleteTaskActivity(w http.ResponseWriter, r *http.Request) {
	u, _ := auth.Current(r)
	if !h.manager.CanAccessTask(r.Context(), u.ID, r.PathValue("taskID")) {
		writeJSON(w, 403, map[string]string{"error": "task access denied"})
		return
	}
	if err := h.service.DeleteTaskActivity(r.PathValue("taskID"), r.PathValue("activityID"), u.ID); err != nil {
		apiServerError(w)
		return
	}
	if workspaceID, lookupErr := h.service.WorkspaceIDForTask(r.PathValue("taskID")); lookupErr == nil {
		h.publish(workspaceID, "task_activity", "task", r.PathValue("taskID"), "deleted")
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h handlers) listDiscussion(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	r = r.WithContext(ctx)
	if !h.allowedWorkspace(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace access denied"})
		return
	}
	x, err := h.service.ListDiscussion(r.Context(), r.PathValue("workspaceID"))
	if err != nil {
		apiServerError(w)
		return
	}
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) createDiscussion(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	r = r.WithContext(ctx)
	if !h.allowedWorkspace(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace access denied"})
		return
	}
	u, _ := auth.Current(r)
	var i application.CreateDiscussionMessageInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}
	x, err := h.service.CreateDiscussion(r.Context(), r.PathValue("workspaceID"), u.ID, i)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	h.publish(r.PathValue("workspaceID"), "discussion", "message", x.ID, "created")
	writeJSON(w, http.StatusCreated, x)
}
func (h handlers) updateDiscussion(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	r = r.WithContext(ctx)
	if !h.allowedWorkspace(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace access denied"})
		return
	}
	u, _ := auth.Current(r)
	var i application.UpdateDiscussionMessageInput
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid JSON"})
		return
	}
	x, err := h.service.UpdateDiscussion(r.Context(), r.PathValue("workspaceID"), r.PathValue("messageID"), u.ID, i)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	h.publish(r.PathValue("workspaceID"), "discussion", "message", x.ID, "updated")
	writeJSON(w, http.StatusOK, x)
}
func (h handlers) deleteDiscussion(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
	defer cancel()
	r = r.WithContext(ctx)
	if !h.allowedWorkspace(r) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace access denied"})
		return
	}
	u, _ := auth.Current(r)
	if err := h.service.DeleteDiscussion(r.Context(), r.PathValue("workspaceID"), r.PathValue("messageID"), u.ID); err != nil {
		apiServerError(w)
		return
	}
	h.publish(r.PathValue("workspaceID"), "discussion", "message", r.PathValue("messageID"), "deleted")
	w.WriteHeader(http.StatusNoContent)
}
func (h handlers) allowedWorkspace(r *http.Request) bool {
	u, ok := auth.Current(r)
	return ok && h.manager.CanAccessWorkspace(r.Context(), u.ID, r.PathValue("workspaceID"))
}
func (h handlers) canManageWorkspace(r *http.Request) bool {
	u, ok := auth.Current(r)
	return ok && h.manager.CanManageWorkspace(r.Context(), u.ID, r.PathValue("workspaceID"))
}
func (h handlers) canManageProject(r *http.Request) bool {
	u, ok := auth.Current(r)
	return ok && h.manager.CanManageProject(r.Context(), u.ID, r.PathValue("projectID"))
}
func (h handlers) allowedProject(r *http.Request) bool {
	u, ok := auth.Current(r)
	return ok && h.manager.CanAccessProject(r.Context(), u.ID, r.PathValue("projectID"))
}
func apiServerError(w http.ResponseWriter) {
	writeJSON(w, 500, map[string]string{"error": "database operation failed"})
}
