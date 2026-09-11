package httpapi

import (
	"database/sql"
	"net/http"
	"orbit/backend/internal/application"
	"orbit/backend/internal/auth"
	"orbit/backend/internal/infrastructure/postgres"

	"github.com/gin-gonic/gin"
)

// NewRouter wires the HTTP layer. Business logic stays in application and
// database access stays in infrastructure/postgres.
func NewRouter(databases ...*sql.DB) http.Handler {
	var db *sql.DB
	if len(databases) > 0 {
		db = databases[0]
	}

	r := gin.New()
	r.Use(gin.Recovery(), cors())
	r.GET("/", gin.WrapH(home(db)))
	r.GET("/healthz", gin.WrapH(http.HandlerFunc(health)))
	r.GET("/readyz", gin.WrapH(ready(db)))

	if db == nil {
		return r
	}

	manager := auth.NewManager(db)
	authAPI := authHandlers{manager: manager}
	r.POST("/api/auth/register", gin.WrapH(http.HandlerFunc(authAPI.register)))
	r.POST("/api/auth/login", gin.WrapH(http.HandlerFunc(authAPI.login)))
	r.GET("/api/auth/me", gin.WrapH(manager.Require(http.HandlerFunc(authAPI.me))))
	r.POST("/api/auth/logout", gin.WrapH(http.HandlerFunc(authAPI.logout)))

	api := handlers{
		service: application.NewService(postgres.NewRepository(db)),
		manager: manager,
	}
	protected := manager.Require
	r.GET("/api/workspaces", gin.WrapH(protected(http.HandlerFunc(api.listWorkspaces))))
	r.POST("/api/workspaces", gin.WrapH(protected(http.HandlerFunc(api.createWorkspace))))
	r.POST("/api/workspaces/join", gin.WrapH(protected(http.HandlerFunc(api.joinWorkspace))))
	r.GET("/api/workspaces/:workspaceID/members", withPathValues(protected(http.HandlerFunc(api.listMembers)), "workspaceID"))
	r.GET("/api/workspaces/:workspaceID/projects", withPathValues(protected(http.HandlerFunc(api.listProjects)), "workspaceID"))
	r.POST("/api/workspaces/:workspaceID/projects", withPathValues(protected(http.HandlerFunc(api.createProject)), "workspaceID"))
	r.GET("/api/projects/:projectID/tasks", withPathValues(protected(http.HandlerFunc(api.listTasks)), "projectID"))
	r.POST("/api/projects/:projectID/tasks", withPathValues(protected(http.HandlerFunc(api.createTask)), "projectID"))

	return r
}

func withPathValues(handler http.Handler, names ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		r := c.Request.Clone(c.Request.Context())
		for _, name := range names {
			r.SetPathValue(name, c.Param(name))
		}
		handler.ServeHTTP(c.Writer, r)
	}
}

func cors() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "http://localhost:3000")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if c.Request.Method == http.MethodOptions {
			c.Status(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
