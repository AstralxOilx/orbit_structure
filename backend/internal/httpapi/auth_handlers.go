package httpapi

import (
	"encoding/json"
	"net/http"
	"orbit/backend/internal/auth"
)

type authHandlers struct{ manager *auth.Manager }
type credentials struct {
	Name       string `json:"name"`
	Email      string `json:"email"`
	Password   string `json:"password"`
	Identifier string `json:"identifier"`
	RememberMe bool   `json:"rememberMe"`
}

func (h authHandlers) register(w http.ResponseWriter, r *http.Request) {
	var i credentials
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON"})
		return
	}
	u, t, err := h.manager.Register(r.Context(), i.Name, i.Email, i.Password)
	if err != nil {
		writeJSON(w, 400, map[string]string{"error": err.Error()})
		return
	}
	setSession(w, t, false)
	writeJSON(w, 201, u)
}
func (h authHandlers) login(w http.ResponseWriter, r *http.Request) {
	var i credentials
	if json.NewDecoder(r.Body).Decode(&i) != nil {
		writeJSON(w, 400, map[string]string{"error": "invalid JSON"})
		return
	}
	identifier := i.Identifier
	if identifier == "" {
		identifier = i.Email
	}
	u, t, err := h.manager.Login(r.Context(), identifier, i.Password)
	if err != nil {
		writeJSON(w, 401, map[string]string{"error": "invalid credentials"})
		return
	}
	setSession(w, t, i.RememberMe)
	writeJSON(w, 200, u)
}
func (h authHandlers) me(w http.ResponseWriter, r *http.Request) {
	u, ok := auth.Current(r)
	if !ok {
		writeJSON(w, 401, map[string]string{"error": "authentication required"})
		return
	}
	writeJSON(w, 200, u)
}
func (h authHandlers) logout(w http.ResponseWriter, r *http.Request) {
	h.manager.LogoutRequest(r.Context(), r)
	http.SetCookie(w, &http.Cookie{Name: "orbit_session", Value: "", Path: "/", MaxAge: -1, HttpOnly: true})
	writeJSON(w, 200, map[string]string{"status": "signed_out"})
}
func setSession(w http.ResponseWriter, token string, remember bool) {
	cookie := &http.Cookie{Name: "orbit_session", Value: token, Path: "/", HttpOnly: true, SameSite: http.SameSiteLaxMode}
	if remember {
		cookie.MaxAge = 7 * 24 * 60 * 60
	}
	http.SetCookie(w, cookie)
}
