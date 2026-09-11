package httpapi

import("encoding/json";"net/http";"orbit/backend/internal/application")
type handlers struct{ service *application.Service }
func (h handlers) listWorkspaces(w http.ResponseWriter,r *http.Request){x,err:=h.service.ListWorkspaces();if err!=nil{apiServerError(w);return};writeJSON(w,http.StatusOK,x)}
func (h handlers) createWorkspace(w http.ResponseWriter,r *http.Request){var i application.CreateWorkspaceInput;if json.NewDecoder(r.Body).Decode(&i)!=nil{writeJSON(w,400,map[string]string{"error":"invalid JSON"});return};x,err:=h.service.CreateWorkspace(i);if err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return};writeJSON(w,201,x)}
func(h handlers) listProjects(w http.ResponseWriter,r *http.Request){x,err:=h.service.ListProjects(r.PathValue("workspaceID"));if err!=nil{apiServerError(w);return};writeJSON(w,200,x)}
func(h handlers) createProject(w http.ResponseWriter,r *http.Request){var i application.CreateProjectInput;if json.NewDecoder(r.Body).Decode(&i)!=nil{writeJSON(w,400,map[string]string{"error":"invalid JSON"});return};x,err:=h.service.CreateProject(r.PathValue("workspaceID"),i);if err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return};writeJSON(w,201,x)}
func(h handlers) listTasks(w http.ResponseWriter,r *http.Request){x,err:=h.service.ListTasks(r.PathValue("projectID"));if err!=nil{apiServerError(w);return};writeJSON(w,200,x)}
func(h handlers) createTask(w http.ResponseWriter,r *http.Request){var i application.CreateTaskInput;if json.NewDecoder(r.Body).Decode(&i)!=nil{writeJSON(w,400,map[string]string{"error":"invalid JSON"});return};x,err:=h.service.CreateTask(r.PathValue("projectID"),i);if err!=nil{writeJSON(w,400,map[string]string{"error":err.Error()});return};writeJSON(w,201,x)}
func apiServerError(w http.ResponseWriter){writeJSON(w,500,map[string]string{"error":"database operation failed"})}
