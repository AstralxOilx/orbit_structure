package auth

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const sessionCookie = "orbit_session"

type User struct {
	ID       string `json:"id"`
	Key      string `json:"key"`
	Email    string `json:"email"`
	Name     string `json:"name"`
	Initials string `json:"initials"`
	Color    string `json:"color"`
}
type Manager struct{ db *sql.DB }

func NewManager(db *sql.DB) *Manager { return &Manager{db: db} }

func (m *Manager) Register(ctx context.Context, name, email, password string) (User, string, error) {
	if len(name) < 1 || len(name) > 80 || !strings.Contains(email, "@") || len(password) < 8 {
		return User{}, "", errors.New("name, valid email and password of at least 8 characters are required")
	}
	hash, err := hashPassword(password)
	if err != nil {
		return User{}, "", err
	}
	key := strings.ToLower(strings.Split(email, "@")[0])
	initials := initialsFor(name)
	var u User
	err = m.db.QueryRowContext(ctx, `INSERT INTO users (user_key,email,name,initials,password_hash) VALUES ($1,$2,$3,$4,$5) RETURNING id,user_key,email,name,initials,color`, key, strings.ToLower(strings.TrimSpace(email)), strings.TrimSpace(name), initials, hash).Scan(&u.ID, &u.Key, &u.Email, &u.Name, &u.Initials, &u.Color)
	if err != nil {
		return User{}, "", err
	}
	token, err := m.createSession(ctx, u.ID)
	return u, token, err
}
func (m *Manager) Login(ctx context.Context, identifier, password string) (User, string, error) {
	var u User
	var stored string
	err := m.db.QueryRowContext(ctx, `SELECT id,user_key,email,name,initials,color,password_hash FROM users WHERE lower(email)=lower($1) OR user_key=$1`, identifier).Scan(&u.ID, &u.Key, &u.Email, &u.Name, &u.Initials, &u.Color, &stored)
	if err != nil || !verifyPassword(stored, password) {
		return User{}, "", errors.New("invalid credentials")
	}
	token, err := m.createSession(ctx, u.ID)
	return u, token, err
}
func (m *Manager) Me(r *http.Request) (User, bool) {
	token := SessionToken(r)
	if token == "" {
		return User{}, false
	}
	var u User
	err := m.db.QueryRowContext(r.Context(), `SELECT u.id,u.user_key,u.email,u.name,u.initials,u.color FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now()`, tokenHash(token)).Scan(&u.ID, &u.Key, &u.Email, &u.Name, &u.Initials, &u.Color)
	return u, err == nil
}

// SessionTokens returns the session cookie presented by the request.
func SessionTokens(r *http.Request) []string {
	tokens := []string{}
	if c, err := r.Cookie(sessionCookie); err == nil && c.Value != "" {
		tokens = append(tokens, c.Value)
	}
	return tokens
}

func SessionToken(r *http.Request) string {
	tokens := SessionTokens(r)
	if len(tokens) == 0 {
		return ""
	}
	return tokens[0]
}

func (m *Manager) LogoutRequest(ctx context.Context, r *http.Request) {
	if user, ok := m.Me(r); ok {
		_, _ = m.db.ExecContext(ctx, `DELETE FROM sessions WHERE user_id=$1`, user.ID)
		return
	}
	for _, token := range SessionTokens(r) {
		m.Logout(ctx, token)
	}
}
func (m *Manager) Logout(ctx context.Context, token string) {
	_, _ = m.db.ExecContext(ctx, `DELETE FROM sessions WHERE token_hash=$1`, tokenHash(token))
}
func (m *Manager) Require(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, ok := m.Me(r)
		if !ok {
			writeError(w, http.StatusUnauthorized, "authentication required")
			return
		}
		next.ServeHTTP(w, r.WithContext(context.WithValue(r.Context(), userKey{}, u)))
	})
}
func Current(r *http.Request) (User, bool) {
	u, ok := r.Context().Value(userKey{}).(User)
	return u, ok
}
func (m *Manager) CanAccessWorkspace(ctx context.Context, userID, workspaceID string) bool {
	var ok bool
	err := m.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id WHERE wm.workspace_id=$1 AND wm.user_id=$2 AND w.deleted_at IS NULL)`, workspaceID, userID).Scan(&ok)
	return err == nil && ok
}
func (m *Manager) IsWorkspaceOwner(ctx context.Context, userID, workspaceID string) bool {
	var ok bool
	err := m.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM workspaces WHERE id=$1 AND owner_id=$2 AND deleted_at IS NULL)`, workspaceID, userID).Scan(&ok)
	return err == nil && ok
}
func (m *Manager) CanManageWorkspace(ctx context.Context, userID, workspaceID string) bool {
	var ok bool
	err := m.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id WHERE wm.workspace_id=$1 AND wm.user_id=$2 AND wm.role IN ('owner','admin') AND w.deleted_at IS NULL)`, workspaceID, userID).Scan(&ok)
	return err == nil && ok
}
func (m *Manager) CanManageProject(ctx context.Context, userID, projectID string) bool {
	var ok bool
	err := m.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id JOIN projects p ON p.workspace_id=w.id WHERE p.id=$1 AND wm.user_id=$2 AND wm.role IN ('owner','admin') AND w.deleted_at IS NULL AND p.deleted_at IS NULL)`, projectID, userID).Scan(&ok)
	return err == nil && ok
}
func (m *Manager) CanAccessProject(ctx context.Context, userID, projectID string) bool {
	var ok bool
	err := m.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id JOIN projects p ON p.workspace_id=wm.workspace_id WHERE p.id=$1 AND wm.user_id=$2 AND w.deleted_at IS NULL AND p.deleted_at IS NULL)`, projectID, userID).Scan(&ok)
	return err == nil && ok
}
func (m *Manager) CanAccessTask(ctx context.Context, userID, taskID string) bool {
	var ok bool
	err := m.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM workspace_members wm JOIN projects p ON p.workspace_id=wm.workspace_id JOIN tasks t ON t.project_id=p.id JOIN workspaces w ON w.id=p.workspace_id WHERE t.id=$1 AND wm.user_id=$2 AND t.deleted_at IS NULL AND p.deleted_at IS NULL AND w.deleted_at IS NULL)`, taskID, userID).Scan(&ok)
	return err == nil && ok
}
func (m *Manager) CanViewAllActivity(ctx context.Context, userID, taskID string) bool {
	var ok bool
	err := m.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM workspace_members wm JOIN projects p ON p.workspace_id=wm.workspace_id JOIN tasks t ON t.project_id=p.id JOIN workspaces w ON w.id=p.workspace_id WHERE t.id=$1 AND wm.user_id=$2 AND wm.role='owner' AND t.deleted_at IS NULL AND p.deleted_at IS NULL AND w.deleted_at IS NULL)`, taskID, userID).Scan(&ok)
	return err == nil && ok
}
func (m *Manager) createSession(ctx context.Context, userID string) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	token := base64.RawURLEncoding.EncodeToString(b)
	_, err := m.db.ExecContext(ctx, `INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,$3)`, userID, tokenHash(token), time.Now().Add(7*24*time.Hour))
	return token, err
}
func tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}
func hashPassword(password string) (string, error) {
	salt := make([]byte, 16)
	if _, err := rand.Read(salt); err != nil {
		return "", err
	}
	key := pbkdf2(password, salt, 120000, 32)
	return fmt.Sprintf("pbkdf2_sha256$120000$%s$%s", base64.RawStdEncoding.EncodeToString(salt), base64.RawStdEncoding.EncodeToString(key)), nil
}
func verifyPassword(encoded, password string) bool {
	p := strings.Split(encoded, "$")
	if len(p) != 4 || p[0] != "pbkdf2_sha256" {
		return false
	}
	salt, err := base64.RawStdEncoding.DecodeString(p[2])
	if err != nil {
		return false
	}
	want, err := base64.RawStdEncoding.DecodeString(p[3])
	if err != nil {
		return false
	}
	return hmac.Equal(want, pbkdf2(password, salt, 120000, len(want)))
}
func pbkdf2(password string, salt []byte, iterations, length int) []byte {
	out := make([]byte, 0, length)
	for block := 1; len(out) < length; block++ {
		mac := hmac.New(sha256.New, []byte(password))
		mac.Write(salt)
		mac.Write([]byte{byte(block >> 24), byte(block >> 16), byte(block >> 8), byte(block)})
		u := mac.Sum(nil)
		t := append([]byte(nil), u...)
		for i := 1; i < iterations; i++ {
			mac = hmac.New(sha256.New, []byte(password))
			mac.Write(u)
			u = mac.Sum(nil)
			for j := range t {
				t[j] ^= u[j]
			}
		}
		out = append(out, t...)
	}
	return out[:length]
}
func initialsFor(name string) string {
	parts := strings.Fields(name)
	out := ""
	for _, p := range parts {
		out += strings.ToUpper(p[:1])
		if len(out) == 3 {
			break
		}
	}
	return out
}
func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write([]byte(fmt.Sprintf(`{"error":%q}`, message)))
}

type userKey struct{}
