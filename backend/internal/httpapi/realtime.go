package httpapi

import (
	"encoding/json"
	"net/http"
	"orbit/backend/internal/auth"
	"sync"
	"time"
)

type workspaceEvent struct {
	Type        string `json:"type"`
	WorkspaceID string `json:"workspaceId"`
	Entity      string `json:"entity,omitempty"`
	EntityID    string `json:"entityId,omitempty"`
	Action      string `json:"action,omitempty"`
	TaskID      string `json:"taskId,omitempty"`
}

type eventBroker struct {
	mu      sync.RWMutex
	nextID  int
	clients map[string]map[int]chan []byte
}

func newEventBroker() *eventBroker {
	return &eventBroker{clients: make(map[string]map[int]chan []byte)}
}

func (b *eventBroker) subscribe(workspaceID string) (chan []byte, func()) {
	b.mu.Lock()
	b.nextID++
	id := b.nextID
	channel := make(chan []byte, 32)
	if b.clients[workspaceID] == nil {
		b.clients[workspaceID] = make(map[int]chan []byte)
	}
	b.clients[workspaceID][id] = channel
	b.mu.Unlock()
	return channel, func() {
		b.mu.Lock()
		if clients := b.clients[workspaceID]; clients != nil {
			if current, ok := clients[id]; ok {
				delete(clients, id)
				close(current)
			}
			if len(clients) == 0 { delete(b.clients, workspaceID) }
		}
		b.mu.Unlock()
	}
}

func (b *eventBroker) publish(event workspaceEvent) {
	payload, err := json.Marshal(event)
	if err != nil { return }
	b.mu.RLock()
	defer b.mu.RUnlock()
	for _, channel := range b.clients[event.WorkspaceID] {
		select {
		case channel <- payload:
		default:
			// A slow browser should not block writes for other workspace members.
		}
	}
}

func (h handlers) streamWorkspaceEvents(w http.ResponseWriter, r *http.Request) {
	u, ok := auth.Current(r)
	if !ok || !h.manager.CanAccessWorkspace(r.Context(), u.ID, r.PathValue("workspaceID")) {
		writeJSON(w, http.StatusForbidden, map[string]string{"error": "workspace access denied"})
		return
	}
	workspaceID := r.PathValue("workspaceID")
	channel, unsubscribe := h.broker.subscribe(workspaceID)
	defer unsubscribe()
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	flusher, ok := w.(http.Flusher)
	if !ok { http.Error(w, "streaming unsupported", http.StatusInternalServerError); return }
	w.Write([]byte(": connected\n\n"))
	flusher.Flush()
	ticker := time.NewTicker(25 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-r.Context().Done(): return
		case payload, open := <-channel:
			if !open { return }
			w.Write([]byte("data: "))
			w.Write(payload)
			w.Write([]byte("\n\n"))
			flusher.Flush()
		case <-ticker.C:
			w.Write([]byte(": ping\n\n"))
			flusher.Flush()
		}
	}
}
