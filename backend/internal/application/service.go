package application

import "errors"

type Repository interface {
	ListWorkspaces(string) ([]Workspace, error)
	CreateWorkspace(CreateWorkspaceInput) (Workspace, error)
	JoinWorkspace(string, string) (Workspace, error)
	ListMembers(string) ([]Member, error)
	ListProjects(string) ([]Project, error)
	CreateProject(string, CreateProjectInput) (Project, error)
	ListTasks(string) ([]Task, error)
	CreateTask(string, CreateTaskInput) (Task, error)
}

type Service struct{ repo Repository }

func NewService(repo Repository) *Service { return &Service{repo: repo} }
func (s *Service) JoinWorkspace(code, userID string) (Workspace, error) {
	if code == "" || userID == "" {
		return Workspace{}, errors.New("workspace code and authenticated user are required")
	}
	return s.repo.JoinWorkspace(code, userID)
}
func (s *Service) ListMembers(workspaceID string) ([]Member, error) {
	return s.repo.ListMembers(workspaceID)
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
	return s.repo.CreateWorkspace(i)
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
func (s *Service) ListTasks(id string) ([]Task, error) { return s.repo.ListTasks(id) }
func (s *Service) CreateTask(id string, i CreateTaskInput) (Task, error) {
	if id == "" || i.Title == "" || i.Status == "" || i.Priority == "" {
		return Task{}, errors.New("project id, title, status and priority are required")
	}
	if !validTaskStatus(i.Status) {
		return Task{}, errors.New("status must be backlog, progress, review or done")
	}
	if !validTaskPriority(i.Priority) {
		return Task{}, errors.New("priority must be urgent, high, normal or low")
	}
	var err error
	i.Key, err = NewKey("ORB-")
	if err != nil {
		return Task{}, err
	}
	return s.repo.CreateTask(id, i)
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
