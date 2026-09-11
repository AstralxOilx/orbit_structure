package application

import "errors"

type Repository interface {
	ListWorkspaces() ([]Workspace, error); CreateWorkspace(CreateWorkspaceInput) (Workspace, error)
	ListProjects(string) ([]Project, error); CreateProject(string, CreateProjectInput) (Project, error)
	ListTasks(string) ([]Task, error); CreateTask(string, CreateTaskInput) (Task, error)
}
type Service struct { repo Repository }
func NewService(repo Repository) *Service { return &Service{repo: repo} }
func (s *Service) ListWorkspaces() ([]Workspace, error) { return s.repo.ListWorkspaces() }
func (s *Service) CreateWorkspace(i CreateWorkspaceInput) (Workspace, error) { if i.Key == "" || i.Name == "" || i.InviteCode == "" || i.OwnerID == "" { return Workspace{}, errors.New("key, name, inviteCode and ownerId are required") }; return s.repo.CreateWorkspace(i) }
func (s *Service) ListProjects(id string) ([]Project, error) { return s.repo.ListProjects(id) }
func (s *Service) CreateProject(id string, i CreateProjectInput) (Project, error) { if id == "" || i.Key == "" || i.Name == "" { return Project{}, errors.New("workspace id, key and name are required") }; return s.repo.CreateProject(id, i) }
func (s *Service) ListTasks(id string) ([]Task, error) { return s.repo.ListTasks(id) }
func (s *Service) CreateTask(id string, i CreateTaskInput) (Task, error) { if id == "" || i.Key == "" || i.Title == "" || i.Status == "" || i.Priority == "" { return Task{}, errors.New("project id, key, title, status and priority are required") }; return s.repo.CreateTask(id, i) }
