package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// CommandServer provides an HTTP endpoint for external control of the app UI.
// Listens on a configurable port (default 9876) and forwards commands to Wails runtime events.
type CommandServer struct {
	app   *App
	port  int
	mu    sync.Mutex
	ready bool
}

// NewCommandServer creates a new command server
func NewCommandServer(app *App, port int) *CommandServer {
	return &CommandServer{app: app, port: port}
}

// Start begins listening for HTTP commands
func (cs *CommandServer) Start() {
	go func() {
		mux := http.NewServeMux()
		mux.HandleFunc("/switch", cs.handleSwitch)
		mux.HandleFunc("/send", cs.handleSendChat)
		mux.HandleFunc("/focus", cs.handleFocusChat)
		mux.HandleFunc("/toggle", cs.handleToggleChat)
		mux.HandleFunc("/info", cs.handleInfo)
		mux.HandleFunc("/click", cs.handleClick)

		addr := fmt.Sprintf(":%d", cs.port)
		cs.mu.Lock()
		cs.ready = true
		cs.mu.Unlock()

		if err := http.ListenAndServe(addr, mux); err != nil {
			fmt.Printf("CommandServer error: %v\n", err)
		}
	}()
}

// IsReady returns whether the server is ready to accept commands
func (cs *CommandServer) IsReady() bool {
	cs.mu.Lock()
	defer cs.mu.Unlock()
	return cs.ready
}

func (cs *CommandServer) handleSwitch(w http.ResponseWriter, r *http.Request) {
	level := r.URL.Query().Get("level")
	if level == "" {
		http.Error(w, "missing 'level' query param", http.StatusBadRequest)
		return
	}
	runtime.EventsEmit(cs.app.ctx, "ui.switchLevel", map[string]interface{}{"level": level})
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "ok")
}

func (cs *CommandServer) handleSendChat(w http.ResponseWriter, r *http.Request) {
	msg := r.URL.Query().Get("message")
	if msg == "" {
		http.Error(w, "missing 'message' query param", http.StatusBadRequest)
		return
	}
	runtime.EventsEmit(cs.app.ctx, "ui.sendChat", map[string]interface{}{"message": msg})
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "ok")
}

func (cs *CommandServer) handleFocusChat(w http.ResponseWriter, r *http.Request) {
	runtime.EventsEmit(cs.app.ctx, "ui.focusChat", map[string]interface{}{})
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "ok")
}

func (cs *CommandServer) handleToggleChat(w http.ResponseWriter, r *http.Request) {
	runtime.EventsEmit(cs.app.ctx, "ui.toggleChat", map[string]interface{}{})
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "ok")
}

func (cs *CommandServer) handleInfo(w http.ResponseWriter, r *http.Request) {
	x, y := runtime.WindowGetPosition(cs.app.ctx)
	width, height := runtime.WindowGetSize(cs.app.ctx)
	info := map[string]interface{}{
		"x": x, "y": y, "width": width, "height": height,
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(info)
}

func (cs *CommandServer) handleClick(w http.ResponseWriter, r *http.Request) {
	var body struct {
		X int `json:"x"`
		Y int `json:"y"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}
	runtime.EventsEmit(cs.app.ctx, "mouse.click", map[string]interface{}{"x": body.X, "y": body.Y})
	w.WriteHeader(http.StatusOK)
	fmt.Fprint(w, "ok")
}
