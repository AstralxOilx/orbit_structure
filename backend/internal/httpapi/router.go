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
		broker:  newEventBroker(),
	}
	protected := manager.Require
	r.GET("/api/workspaces", gin.WrapH(protected(http.HandlerFunc(api.listWorkspaces))))
	r.POST("/api/workspaces", gin.WrapH(protected(http.HandlerFunc(api.createWorkspace))))
	r.POST("/api/workspaces/join", gin.WrapH(protected(http.HandlerFunc(api.joinWorkspace))))
	r.PATCH("/api/workspaces/:workspaceID", withPathValues(protected(http.HandlerFunc(api.updateWorkspace)), "workspaceID"))
	r.DELETE("/api/workspaces/:workspaceID", withPathValues(protected(http.HandlerFunc(api.deleteWorkspace)), "workspaceID"))
	r.GET("/api/workspaces/:workspaceID/members", withPathValues(protected(http.HandlerFunc(api.listMembers)), "workspaceID"))
	r.POST("/api/workspaces/:workspaceID/members", withPathValues(protected(http.HandlerFunc(api.addMember)), "workspaceID"))
	r.PATCH("/api/workspaces/:workspaceID/members/:memberID", withPathValues(protected(http.HandlerFunc(api.updateMember)), "workspaceID", "memberID"))
	r.DELETE("/api/workspaces/:workspaceID/members/:memberID", withPathValues(protected(http.HandlerFunc(api.removeMember)), "workspaceID", "memberID"))
	r.POST("/api/workspaces/:workspaceID/invite-code/rotate", withPathValues(protected(http.HandlerFunc(api.rotateInviteCode)), "workspaceID"))
	r.GET("/api/workspaces/:workspaceID/activity-log", withPathValues(protected(http.HandlerFunc(api.listWorkspaceActivity)), "workspaceID"))
	r.GET("/api/workspaces/:workspaceID/notifications", withPathValues(protected(http.HandlerFunc(api.listWorkspaceNotifications)), "workspaceID"))
	r.POST("/api/workspaces/:workspaceID/notifications/read", withPathValues(protected(http.HandlerFunc(api.markWorkspaceNotificationsRead)), "workspaceID"))
	r.GET("/api/workspaces/:workspaceID/events", withPathValues(protected(http.HandlerFunc(api.streamWorkspaceEvents)), "workspaceID"))
	r.GET("/api/workspaces/:workspaceID/discussion", withPathValues(protected(http.HandlerFunc(api.listDiscussion)), "workspaceID"))
	r.POST("/api/workspaces/:workspaceID/discussion", withPathValues(protected(http.HandlerFunc(api.createDiscussion)), "workspaceID"))
	r.PATCH("/api/workspaces/:workspaceID/discussion/:messageID", withPathValues(protected(http.HandlerFunc(api.updateDiscussion)), "workspaceID", "messageID"))
	r.DELETE("/api/workspaces/:workspaceID/discussion/:messageID", withPathValues(protected(http.HandlerFunc(api.deleteDiscussion)), "workspaceID", "messageID"))
	r.GET("/api/workspaces/:workspaceID/projects", withPathValues(protected(http.HandlerFunc(api.listProjects)), "workspaceID"))
	r.POST("/api/workspaces/:workspaceID/projects", withPathValues(protected(http.HandlerFunc(api.createProject)), "workspaceID"))
	r.PATCH("/api/projects/:projectID", withPathValues(protected(http.HandlerFunc(api.updateProject)), "projectID"))
	r.DELETE("/api/projects/:projectID", withPathValues(protected(http.HandlerFunc(api.deleteProject)), "projectID"))
	r.GET("/api/projects/:projectID/tasks", withPathValues(protected(http.HandlerFunc(api.listTasks)), "projectID"))
	r.POST("/api/projects/:projectID/tasks", withPathValues(protected(http.HandlerFunc(api.createTask)), "projectID"))
	r.PATCH("/api/tasks/:taskID", withPathValues(protected(http.HandlerFunc(api.updateTask)), "taskID"))
	r.DELETE("/api/tasks/:taskID", withPathValues(protected(http.HandlerFunc(api.deleteTask)), "taskID"))
	r.GET("/api/tasks/:taskID/activities", withPathValues(protected(http.HandlerFunc(api.listTaskActivities)), "taskID"))
	r.GET("/api/tasks/:taskID/activity-log", withPathValues(protected(http.HandlerFunc(api.listTaskActivityLog)), "taskID"))
	r.POST("/api/tasks/:taskID/activities", withPathValues(protected(http.HandlerFunc(api.createTaskActivity)), "taskID"))
	r.PATCH("/api/tasks/:taskID/activities/:activityID", withPathValues(protected(http.HandlerFunc(api.updateTaskActivity)), "taskID", "activityID"))
	r.DELETE("/api/tasks/:taskID/activities/:activityID", withPathValues(protected(http.HandlerFunc(api.deleteTaskActivity)), "taskID", "activityID"))

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
		origin := c.GetHeader("Origin")
		if origin == "http://localhost:3000" || origin == "http://127.0.0.1:3000" {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
		}
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
