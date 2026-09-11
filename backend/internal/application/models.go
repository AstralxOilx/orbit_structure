package application

type Workspace struct {
	ID string `json:"id"`; Key string `json:"key"`; Name string `json:"name"`; InviteCode string `json:"inviteCode"`; OwnerID string `json:"ownerId"`; CreatedAt string `json:"createdAt"`
}
type Project struct {
	ID string `json:"id"`; Key string `json:"key"`; WorkspaceID string `json:"workspaceId"`; Name string `json:"name"`; Description string `json:"description"`; Color string `json:"color"`; Icon string `json:"icon"`; DueOn *string `json:"dueOn,omitempty"`
}
type Task struct {
	ID string `json:"id"`; Key string `json:"key"`; ProjectID string `json:"projectId"`; Title string `json:"title"`; Description string `json:"description"`; Status string `json:"status"`; Priority string `json:"priority"`; AssigneeID *string `json:"assigneeId,omitempty"`; StartOn *string `json:"startOn,omitempty"`; DueOn *string `json:"dueOn,omitempty"`; Rank string `json:"rank"`; Revision int64 `json:"revision"`; UpdatedAt string `json:"updatedAt"`
}
type CreateWorkspaceInput struct { Key string `json:"key"`; Name string `json:"name"`; InviteCode string `json:"inviteCode"`; OwnerID string `json:"ownerId"` }
type CreateProjectInput struct { Key string `json:"key"`; Name string `json:"name"`; Description string `json:"description"`; Color string `json:"color"`; Icon string `json:"icon"`; DueOn string `json:"dueOn"` }
type CreateTaskInput struct { Key string `json:"key"`; Title string `json:"title"`; Description string `json:"description"`; Status string `json:"status"`; Priority string `json:"priority"`; AssigneeID string `json:"assigneeId"`; StartOn string `json:"startOn"`; DueOn string `json:"dueOn"`; Rank float64 `json:"rank"` }
