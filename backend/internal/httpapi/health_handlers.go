package httpapi

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

func home(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		databaseState := "Not connected"
		databaseClass := "offline"
		if db != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
			err := db.PingContext(ctx)
			cancel()
			if err == nil {
				databaseState = "Connected"
				databaseClass = "online"
			}
		}
		page := strings.NewReplacer(
			"{{DB_CLASS}}", databaseClass,
			"{{DB_STATUS}}", databaseState,
		).Replace(homePage)
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(page))
	}
}

func health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func ready(db *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if db == nil || db.PingContext(r.Context()) != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "not_ready"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ready"})
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

const homePage = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orbit API Â· Command center</title><style>body{font:16px system-ui;max-width:760px;margin:12vh auto;padding:24px;background:#0b1020;color:#f4f7ff}a{color:#6fe7e0}.status{color:#6fe7e0}.offline{color:#ff9d9d}</style></head><body><h1>Orbit API</h1><p>Orbit API Â· Command center</p><p>Command center is online.</p><p class="status {{DB_CLASS}}">PostgreSQL: {{DB_STATUS}}</p><p><a href="/healthz">Health</a> · <a href="/readyz">Readiness</a></p></body></html>`
