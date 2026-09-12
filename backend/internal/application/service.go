package application

import (
	"context"
	"errors"
	"strings"
)

type Repository interface {
	ListWorkspaces(string) ([]Workspace, error)
	CreateWorkspace(CreateWorkspaceInput) (Workspace, error)
	UpdateWorkspace(string, UpdateWorkspaceInput) (Workspace, error)
	DeleteWorkspace(string) error
	JoinWorkspace(string, string) (Workspace, error)
	ListMembers(string) ([]Member, error)
	AddMember(string, string, AddMemberInput) (Member, error)
	UpdateMember(string, string, string, UpdateMemberInput) (Member, error)
	RemoveMember(string, string, string) error
	RotateWorkspaceInviteCode(string, string, string) (Workspace, error)
	ListProjects(string) ([]Project, error)
	CreateProject(string, CreateProjectInput) (Project, error)
	UpdateProject(string, UpdateProjectInput) (Project, error)
	DeleteProject(string) error
	ListTasks(string) ([]Task, error)
	CreateTask(string, string, CreateTaskInput) (Task, error)
	UpdateTask(string, string, UpdateTaskInput) (Task, error)
	DeleteTask(string, string) error
	ListTaskActivities(string) ([]TaskActivity, error)
	ListTaskActivityLog(string, string, bool) ([]TaskActivity, error)
	ListWorkspaceActivity(string, string, bool) ([]WorkspaceActivity, error)
	CreateTaskActivity(string, string, CreateTaskActivityInput) (TaskActivity, error)
	UpdateTaskActivity(string, string, UpdateTaskActivityInput) (TaskActivity, error)
	DeleteTaskActivity(string, string) error
	ListDiscussion(context.Context, string) ([]DiscussionMessage, error)
	CreateDiscussion(context.Context, string, string, CreateDiscussionMessageInput) (DiscussionMessage, error)
	UpdateDiscussion(context.Context, string, string, string, UpdateDiscussionMessageInput) (DiscussionMessage, error)
	DeleteDiscussion(context.Context, string, string, string) error
	ListWorkspaceNotifications(string, string) ([]WorkspaceActivity, error)
	MarkWorkspaceNotificationsRead(string, string, []string) error
	WorkspaceIDForProject(string) (string, error)
	WorkspaceIDForTask(string) (string, error)
}

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }
func (s *Service) JoinWorkspace(code, userID string) (Workspace, error) {
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "" || userID == "" {
		return Workspace{}, errors.New("workspace code and authenticated user are required")
	}
	return s.repo.JoinWorkspace(code, userID)
}
func (s *Service) ListMembers(workspaceID string) ([]Member, error) {
	return s.repo.ListMembers(workspaceID)
}

func (s *Service) AddMember(workspaceID, actorID string, i AddMemberInput) (Member, error) {
	if workspaceID == "" || actorID == "" || !strings.Contains(i.Email, "@") {
		return Member{}, errors.New("workspace and valid member email are required")
	}
	if i.Role == "" {
		i.Role = "member"
	}
	if i.Role != "admin" && i.Role != "member" {
		return Member{}, errors.New("new members can only be admin or member")
	}
	i.Email = strings.ToLower(strings.TrimSpace(i.Email))
	i.Team = strings.TrimSpace(i.Team)
	if i.Team == "" {
		i.Team = "General"
	}
	if len(i.Team) > 60 {
		return Member{}, errors.New("team must be at most 60 characters")
	}
	return s.repo.AddMember(workspaceID, actorID, i)
}
func (s *Service) UpdateMember(workspaceID, memberID, actorID string, i UpdateMemberInput) (Member, error) {
	if workspaceID == "" || memberID == "" || actorID == "" || strings.TrimSpace(i.Name) == "" || !strings.Contains(i.Email, "@") {
		return Member{}, errors.New("workspace, member, name and valid email are required")
	}
	if i.Role != "owner" && i.Role != "admin" && i.Role != "member" {
		return Member{}, errors.New("invalid member role")
	}
	i.Name = strings.TrimSpace(i.Name)
	i.Email = strings.ToLower(strings.TrimSpace(i.Email))
	i.Team = strings.TrimSpace(i.Team)
	if len(i.Name) > 80 || len(i.Email) > 160 {
		return Member{}, errors.New("member profile is too long")
	}
	if len(i.Team) > 60 {
		return Member{}, errors.New("team must be at most 60 characters")
	}
	if i.Team == "" {
		i.Team = "General"
	}
	return s.repo.UpdateMember(workspaceID, memberID, actorID, i)
}
func (s *Service) RemoveMember(workspaceID, memberID, actorID string) error {
	if workspaceID == "" || memberID == "" || actorID == "" {
		return errors.New("workspace, member and actor are required")
	}
	return s.repo.RemoveMember(workspaceID, memberID, actorID)
}
func (s *Service) RotateWorkspaceInviteCode(workspaceID, actorID, code string) (Workspace, error) {
	if workspaceID == "" || actorID == "" {
		return Workspace{}, errors.New("workspace and actor are required")
	}
	code = strings.ToUpper(strings.TrimSpace(code))
	if code == "" {
		return Workspace{}, errors.New("invite code is required")
	}
	return s.repo.RotateWorkspaceInviteCode(workspaceID, actorID, code)
}
func (s *Service) ListWorkspaces(userID string) ([]Workspace, error) {
	return s.repo.ListWorkspaces(userID)
}
func (s *Service) CreateWorkspace(i CreateWorkspaceInput) (Workspace, error) {
	if i.Name == "" || i.OwnerID == "" {
		return Workspace{}, errors.New("name and authenticated owner are required")
	}
	var err error
	i.Key, err = NewKey("WS-")
	if err != nil {
		return Workspace{}, err
	}
	i.InviteCode, err = NewKey("ORBIT-")
	if err != nil {
		return Workspace{}, err
	}
	i.InviteCode = strings.ToUpper(i.InviteCode)
	return s.repo.CreateWorkspace(i)
}
func (s *Service) UpdateWorkspace(id string, i UpdateWorkspaceInput) (Workspace, error) {
	if id == "" || i.Name == "" {
		return Workspace{}, errors.New("workspace id and name are required")
	}
	if len(i.Name) > 80 {
		return Workspace{}, errors.New("workspace name must be at most 80 characters")
	}
	if len(i.Initials) < 1 || len(i.Initials) > 3 || !lettersOnly(i.Initials) {
		return Workspace{}, errors.New("initials must contain 1 to 3 letters")
	}
	if !validWorkspaceLogo(i.Logo) {
		return Workspace{}, errors.New("invalid workspace logo")
	}
	if !validWorkspaceColor(i.Color) {
		return Workspace{}, errors.New("invalid workspace color")
	}
	return s.repo.UpdateWorkspace(id, i)
}
func (s *Service) DeleteWorkspace(id string) error {
	if id == "" {
		return errors.New("workspace id is required")
	}
	return s.repo.DeleteWorkspace(id)
}
func lettersOnly(value string) bool {
	for _, r := range value {
		if (r < 'A' || r > 'Z') && (r < 'a' || r > 'z') {
			return false
		}
	}
	return true
}
func validWorkspaceLogo(value string) bool {
	switch value {
	case "initials", "orbit", "spark", "layers", "rocket":
		return true
	}
	return false
}
func validWorkspaceColor(value string) bool {
	switch value {
	case "purple", "blue", "peach", "green":
		return true
	}
	return false
}
func (s *Service) ListProjects(id string) ([]Project, error) { return s.repo.ListProjects(id) }
func (s *Service) CreateProject(id string, i CreateProjectInput) (Project, error) {
	if id == "" || i.Name == "" {
		return Project{}, errors.New("workspace id and name are required")
	}
	var err error
	i.Key, err = NewKey("PRJ-")
	if err != nil {
		return Project{}, err
	}
	return s.repo.CreateProject(id, i)
}
func (s *Service) UpdateProject(id string, i UpdateProjectInput) (Project, error) {
	if id == "" || strings.TrimSpace(i.Name) == "" {
		return Project{}, errors.New("project id and name are required")
	}
	if len(strings.TrimSpace(i.Name)) > 100 {
		return Project{}, errors.New("project name must be at most 100 characters")
	}
	if len(i.Description) > 500 {
		return Project{}, errors.New("project description must be at most 500 characters")
	}
	if !validWorkspaceColor(i.Color) {
		return Project{}, errors.New("invalid project color")
	}
	if !validProjectIcon(i.Icon) {
		return Project{}, errors.New("invalid project icon")
	}
	if i.DueOn != "" && !dateOnly(i.DueOn) {
		return Project{}, errors.New("dueOn must use YYYY-MM-DD format")
	}
	i.Name, i.Description = strings.TrimSpace(i.Name), strings.TrimSpace(i.Description)
	return s.repo.UpdateProject(id, i)
}
func (s *Service) DeleteProject(id string) error {
	if id == "" {
		return errors.New("project id is required")
	}
	return s.repo.DeleteProject(id)
}
func validProjectIcon(value string) bool {
	switch value {
	case "website", "mobile", "system", "design", "marketing", "code", "other":
		return true
	}
	return false
}
func dateOnly(value string) bool {
	if len(value) != 10 {
		return false
	}
	for index, r := range value {
		if index == 4 || index == 7 {
			if r != '-' {
				return false
			}
			continue
		}
		if r < '0' || r > '9' {
			return false
		}
	}
	return true
}
func (s *Service) ListTasks(id string) ([]Task, error) { return s.repo.ListTasks(id) }
func (s *Service) CreateTask(id, actorID string, i CreateTaskInput) (Task, error) {
	if id == "" || actorID == "" || i.Title == "" || i.Status == "" || i.Priority == "" {
		return Task{}, errors.New("project id, title, status and priority are required")
	}
	if !validTaskStatus(i.Status) {
		return Task{}, errors.New("status must be backlog, progress, review or done")
	}
	if !validTaskPriority(i.Priority) {
		return Task{}, errors.New("priority must be urgent, high, normal or low")
	}
	if i.StartOn != "" && !dateOnly(i.StartOn) {
		return Task{}, errors.New("startOn must use YYYY-MM-DD format")
	}
	if i.DueOn != "" && !dateOnly(i.DueOn) {
		return Task{}, errors.New("dueOn must use YYYY-MM-DD format")
	}
	if len(i.Description) > 10000 {
		return Task{}, errors.New("description must be at most 10000 characters")
	}
	var err error
	i.Key, err = NewKey("ORB-")
	if err != nil {
		return Task{}, err
	}
	return s.repo.CreateTask(id, actorID, i)
}
func (s *Service) UpdateTask(id, actorID string, i UpdateTaskInput) (Task, error) {
	if id == "" || actorID == "" || strings.TrimSpace(i.Title) == "" {
		return Task{}, errors.New("task id, actor and title are required")
	}
	if !validTaskStatus(i.Status) {
		return Task{}, errors.New("status must be backlog, progress, review or done")
	}
	if !validTaskPriority(i.Priority) {
		return Task{}, errors.New("priority must be urgent, high, normal or low")
	}
	if i.StartOn != "" && !dateOnly(i.StartOn) {
		return Task{}, errors.New("startOn must use YYYY-MM-DD format")
	}
	if i.DueOn != "" && !dateOnly(i.DueOn) {
		return Task{}, errors.New("dueOn must use YYYY-MM-DD format")
	}
	if len(i.Description) > 10000 {
		return Task{}, errors.New("description must be at most 10000 characters")
	}
	i.Title, i.Description = strings.TrimSpace(i.Title), strings.TrimSpace(i.Description)
	return s.repo.UpdateTask(id, actorID, i)
}
func (s *Service) DeleteTask(id, actorID string) error {
	if id == "" || actorID == "" {
		return errors.New("task id and actor are required")
	}
	return s.repo.DeleteTask(id, actorID)
}
func (s *Service) ListTaskActivities(id string) ([]TaskActivity, error) {
	if id == "" {
		return nil, errors.New("task id is required")
	}
	return s.repo.ListTaskActivities(id)
}
func (s *Service) ListTaskActivityLog(id, viewerID string, all bool) ([]TaskActivity, error) {
	if id == "" || viewerID == "" {
		return nil, errors.New("task and viewer are required")
	}
	return s.repo.ListTaskActivityLog(id, viewerID, all)
}
func (s *Service) ListWorkspaceActivity(id, viewerID string, all bool) ([]WorkspaceActivity, error) {
	if id == "" || viewerID == "" {
		return nil, errors.New("workspace and viewer are required")
	}
	return s.repo.ListWorkspaceActivity(id, viewerID, all)
}
func (s *Service) ListWorkspaceNotifications(id, viewerID string) ([]WorkspaceActivity, error) {
	if id == "" || viewerID == "" {
		return nil, errors.New("workspace and viewer are required")
	}
	return s.repo.ListWorkspaceNotifications(id, viewerID)
}
func (s *Service) MarkWorkspaceNotificationsRead(id, viewerID string, activityIDs []string) error {
	if id == "" || viewerID == "" {
		return errors.New("workspace and viewer are required")
	}
	return s.repo.MarkWorkspaceNotificationsRead(id, viewerID, activityIDs)
}
func (s *Service) CreateTaskActivity(taskID, actorID string, i CreateTaskActivityInput) (TaskActivity, error) {
	if taskID == "" || actorID == "" {
		return TaskActivity{}, errors.New("task and actor are required")
	}
	if !validActivityAction(i.Action) {
		return TaskActivity{}, errors.New("invalid activity action")
	}
	if strings.TrimSpace(i.Detail) == "" {
		return TaskActivity{}, errors.New("activity detail is required")
	}
	if len(i.Detail) > 2000 {
		return TaskActivity{}, errors.New("activity detail must be at most 2000 characters")
	}
	i.Detail = strings.TrimSpace(i.Detail)
	return s.repo.CreateTaskActivity(taskID, actorID, i)
}
func (s *Service) UpdateTaskActivity(id, actorID string, i UpdateTaskActivityInput) (TaskActivity, error) {
	if id == "" || actorID == "" {
		return TaskActivity{}, errors.New("activity and actor are required")
	}
	if strings.TrimSpace(i.Detail) == "" {
		return TaskActivity{}, errors.New("activity detail is required")
	}
	if len(i.Detail) > 2000 {
		return TaskActivity{}, errors.New("activity detail must be at most 2000 characters")
	}
	i.Detail = strings.TrimSpace(i.Detail)
	return s.repo.UpdateTaskActivity(id, actorID, i)
}
func (s *Service) DeleteTaskActivity(id, actorID string) error {
	if id == "" || actorID == "" {
		return errors.New("activity and actor are required")
	}
	return s.repo.DeleteTaskActivity(id, actorID)
}
func (s *Service) ListDiscussion(ctx context.Context, workspaceID string) ([]DiscussionMessage, error) {
	if workspaceID == "" {
		return nil, errors.New("workspace id is required")
	}
	return s.repo.ListDiscussion(ctx, workspaceID)
}
func (s *Service) CreateDiscussion(ctx context.Context, workspaceID, actorID string, i CreateDiscussionMessageInput) (DiscussionMessage, error) {
	if workspaceID == "" || actorID == "" {
		return DiscussionMessage{}, errors.New("workspace and actor are required")
	}
	i.Body = strings.TrimSpace(i.Body)
	if i.Body == "" {
		return DiscussionMessage{}, errors.New("message body is required")
	}
	if len(i.Body) > 2000 {
		return DiscussionMessage{}, errors.New("message body must be at most 2000 characters")
	}
	return s.repo.CreateDiscussion(ctx, workspaceID, actorID, i)
}
func (s *Service) UpdateDiscussion(ctx context.Context, workspaceID, messageID, actorID string, i UpdateDiscussionMessageInput) (DiscussionMessage, error) {
	if workspaceID == "" || messageID == "" || actorID == "" {
		return DiscussionMessage{}, errors.New("workspace, message and actor are required")
	}
	i.Body = strings.TrimSpace(i.Body)
	if i.Body == "" {
		return DiscussionMessage{}, errors.New("message body is required")
	}
	if len(i.Body) > 2000 {
		return DiscussionMessage{}, errors.New("message body must be at most 2000 characters")
	}
	return s.repo.UpdateDiscussion(ctx, workspaceID, messageID, actorID, i)
}
func (s *Service) DeleteDiscussion(ctx context.Context, workspaceID, messageID, actorID string) error {
	if workspaceID == "" || messageID == "" || actorID == "" {
		return errors.New("workspace, message and actor are required")
	}
	return s.repo.DeleteDiscussion(ctx, workspaceID, messageID, actorID)
}
func (s *Service) WorkspaceIDForProject(id string) (string, error) {
	return s.repo.WorkspaceIDForProject(id)
}
func (s *Service) WorkspaceIDForTask(id string) (string, error) { return s.repo.WorkspaceIDForTask(id) }
func validActivityAction(value string) bool {
	switch value {
	case "created", "updated", "moved", "deleted", "comment":
		return true
	default:
		return false
	}
}

func validTaskStatus(status string) bool {
	switch status {
	case "backlog", "progress", "review", "done":
		return true
	default:
		return false
	}
}

func validTaskPriority(priority string) bool {
	switch priority {
	case "urgent", "high", "normal", "low":
		return true
	default:
		return false
	}
}
