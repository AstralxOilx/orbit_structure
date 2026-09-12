package application

type Workspace struct {
	ID         string `json:"id"`
	Key        string `json:"key"`
	Name       string `json:"name"`
	InviteCode string `json:"inviteCode"`
	OwnerID    string `json:"ownerId"`
	CreatedAt  string `json:"createdAt"`
	Logo       string `json:"logo"`
	Initials   string `json:"initials"`
	Color      string `json:"color"`
}
type Member struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspaceId"`
	Name        string `json:"name"`
	Email       string `json:"email"`
	Role        string `json:"role"`
	Initials    string `json:"initials"`
	Color       string `json:"color"`
	Team        string `json:"team"`
}
type AddMemberInput struct {
	Email string `json:"email"`
	Role  string `json:"role"`
	Team  string `json:"team"`
}
type UpdateMemberInput struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Team  string `json:"team"`
	Color string `json:"color"`
}
type Project struct {
	ID          string  `json:"id"`
	Key         string  `json:"key"`
	WorkspaceID string  `json:"workspaceId"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Color       string  `json:"color"`
	Icon        string  `json:"icon"`
	DueOn       *string `json:"dueOn,omitempty"`
}
type Task struct {
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
	Tags        []string `json:"tags"`
	Checklist   []ChecklistItem `json:"checklist"`
}
type ChecklistItem struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Done     bool   `json:"done"`
	Position int    `json:"position"`
}
type CreateWorkspaceInput struct {
	Key        string `json:"key"`
	Name       string `json:"name"`
	InviteCode string `json:"inviteCode"`
	OwnerID    string `json:"ownerId"`
}
type UpdateWorkspaceInput struct {
	Name     string `json:"name"`
	Logo     string `json:"logo"`
	Initials string `json:"initials"`
	Color    string `json:"color"`
}
type CreateProjectInput struct {
	Key         string `json:"key"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`
	DueOn       string `json:"dueOn"`
}
type UpdateProjectInput struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Color       string `json:"color"`
	Icon        string `json:"icon"`
	DueOn       string `json:"dueOn"`
}
type CreateTaskInput struct {
	Key         string  `json:"key"`
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	Priority    string  `json:"priority"`
	AssigneeID  string  `json:"assigneeId"`
	StartOn     string  `json:"startOn"`
	DueOn       string  `json:"dueOn"`
	Rank        float64 `json:"rank"`
	Tags        []string `json:"tags"`
	Checklist   []ChecklistItemInput `json:"checklist"`
}
type UpdateTaskInput struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Priority    string `json:"priority"`
	AssigneeID  string `json:"assigneeId"`
	StartOn     string `json:"startOn"`
	DueOn       string `json:"dueOn"`
	Rank        float64 `json:"rank"`
	Tags        []string `json:"tags"`
	Checklist   []ChecklistItemInput `json:"checklist"`
}
type ChecklistItemInput struct {
	Title    string `json:"title"`
	Done     bool   `json:"done"`
	Position int    `json:"position"`
}
type TaskActivity struct {
	ID        string `json:"id"`
	TaskID    string `json:"taskId"`
	ActorID   string `json:"actorId"`
	ActorName string `json:"actorName"`
	Action    string `json:"action"`
	Detail    string `json:"detail"`
	CreatedAt string `json:"createdAt"`
	UpdatedAt string `json:"updatedAt"`
}
type WorkspaceActivity struct {
	ID string `json:"id"`
	WorkspaceID string `json:"workspaceId"`
	ActorID string `json:"actorId"`
	ActorName string `json:"actorName"`
	EntityType string `json:"entityType"`
	EntityID string `json:"entityId"`
	EntityName string `json:"entityName"`
	Action string `json:"action"`
	Detail string `json:"detail"`
	CreatedAt string `json:"createdAt"`
	Read bool `json:"read,omitempty"`
}
type DiscussionMessage struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspaceId"`
	AuthorID    string `json:"authorId"`
	AuthorName  string `json:"authorName"`
	Body        string `json:"body"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}
type CreateTaskActivityInput struct {
	Action string `json:"action"`
	Detail string `json:"detail"`
}
type UpdateTaskActivityInput struct {
	Detail string `json:"detail"`
}
type CreateDiscussionMessageInput struct {
	Body string `json:"body"`
}
type UpdateDiscussionMessageInput struct {
	Body string `json:"body"`
}
