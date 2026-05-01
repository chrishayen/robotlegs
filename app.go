package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx          context.Context
	sessionStart bool
	mu           sync.Mutex
}

// DiagramNode represents a node on a C4 canvas
type DiagramNode struct {
	ID        string `json:"id"`
	X         int    `json:"x"`
	Y         int    `json:"y"`
	Title     string `json:"title"`
	DotColor  string `json:"dotColor"`
	Type      string `json:"type"`
	Tech      string `json:"tech"`
	Description string `json:"description"`
	Inputs    []Port `json:"inputs,omitempty"`
	Outputs   []Port `json:"outputs,omitempty"`
}

// Port represents an input/output port on a node
type Port struct {
	Name string `json:"name"`
	Color string `json:"color"`
}

// Connection represents a link between two nodes
type Connection struct {
	ID         string `json:"id"`
	FromNode   string `json:"fromNode"`
	FromPort   string `json:"fromPort"`
	ToNode     string `json:"toNode"`
	ToPort     string `json:"toPort"`
	Label      string `json:"label,omitempty"`
	Color      string `json:"color,omitempty"`
}

// DiagramUpdate contains structured diagram changes
type DiagramUpdate struct {
	Level      string          `json:"level"`
	Nodes      []DiagramNode   `json:"nodes,omitempty"`
	Connections []Connection   `json:"connections,omitempty"`
	Text       string          `json:"text,omitempty"`
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.sessionStart = true
}

// Chat sends a message to Claude via `claude -p` and returns both text and diagram updates.
// The system prompt instructs Claude to output structured JSON for diagram changes.
func (a *App) Chat(message string) string {
	a.mu.Lock()
	defer a.mu.Unlock()

	systemPrompt := buildSystemPrompt()
	fullPrompt := systemPrompt + "\n\nUser: " + message

	// Build command args
	args := []string{"-p", "--bare"}
	if !a.sessionStart {
		args = append(args, "-c") // resume session for subsequent messages
	}
	args = append(args, fullPrompt)

	// Build env: inherit current env + overlay .env vars
	env := os.Environ()

	// Load .env file from project root
	envPath := filepath.Join(getProjectRoot(), ".env")
	if envData, err := os.ReadFile(envPath); err == nil {
		for _, line := range strings.Split(string(envData), "\n") {
			line = strings.TrimSpace(line)
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) == 2 {
				env = append(env, fmt.Sprintf("%s=%s", strings.TrimSpace(parts[0]), strings.TrimSpace(parts[1])))
			}
		}
	}

	cmd := exec.CommandContext(a.ctx, "claude", args...)
	cmd.Env = env
	cmd.Dir = getProjectRoot()

	// Capture stdout and stderr
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Sprintf("Error: could not create stdout pipe: %v", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Sprintf("Error: could not create stderr pipe: %v", err)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Sprintf("Error: could not start claude: %v", err)
	}

	// Read stdout (response) and stderr (logs/warnings) concurrently
	var responseBuilder strings.Builder
	var stderrBuilder strings.Builder

	done := make(chan struct{})

	go func() {
		scanner := bufio.NewScanner(stdout)
		for scanner.Scan() {
			line := scanner.Text()
			// Skip claude's internal log lines
			if line != "" && !strings.HasPrefix(line, "[") && !strings.HasPrefix(line, "⠋") && !strings.HasPrefix(line, "⠙") && !strings.HasPrefix(line, "⠹") && !strings.HasPrefix(line, "⠸") {
				responseBuilder.WriteString(line + "\n")
			}
		}
		close(done)
	}()

	go func() {
		scanner := bufio.NewScanner(stderr)
		for scanner.Scan() {
			stderrBuilder.WriteString(scanner.Text() + "\n")
		}
	}()

	// Wait for command to finish
	err = cmd.Wait()

	// Get the response
	response := strings.TrimSpace(responseBuilder.String())

	// If we got an error and no useful response, return the error
	if err != nil && response == "" {
		stderrMsg := strings.TrimSpace(stderrBuilder.String())
		if stderrMsg != "" {
			return fmt.Sprintf("Error: %s", stderrMsg)
		}
		return fmt.Sprintf("Error: %v", err)
	}

	// Mark that session has started so future messages use -c
	a.sessionStart = false

	return response
}

// buildSystemPrompt creates the system prompt that instructs Claude to output
// structured diagram data alongside its text response.
func buildSystemPrompt() string {
	return `You are a C4 diagram assistant. When the user describes their application, you should:

1. Respond conversationally about their architecture
2. Output structured diagram data in a JSON block between <diagram> tags

The JSON structure:
{
  "level": "system-landscape|system|container|component",
  "nodes": [
    {
      "id": "unique-id",
      "x": 200,
      "y": 140,
      "title": "Node Name",
      "dotColor": "green|blue|yellow|purple|red|white",
      "type": "Software System|Database|API|Frontend|Backend|Service",
      "tech": "Technology used",
      "description": "Brief description",
      "inputs": [{"name": "HTTP", "color": "green"}],
      "outputs": [{"name": "REST", "color": "blue"}]
    }
  ],
  "connections": [
    {
      "id": "conn-1",
      "fromNode": "node-id-1",
      "fromPort": "port-name",
      "toNode": "node-id-2",
      "toPort": "port-name",
      "label": "communicates via",
      "color": "green"
    }
  ],
  "text": "Summary text for the chat response"
}

Rules:
- Choose the C4 level based on what the user describes:
  * system-landscape: multiple systems and their relationships
  * system: high-level system with external users
  * container: containers within a system (web app, API, database)
  * component: components within a container
- Position nodes logically (left-to-right flow, related items grouped)
- Use consistent spacing (200-300px between nodes)
- Include meaningful connections between nodes
- The "text" field should be a concise summary to display in chat
- Keep node titles short and descriptive
- Use dot colors semantically: green=primary, blue=secondary, yellow=external, purple=database, red=auth/security, white=generic`
}

// getProjectRoot returns the project root directory
func getProjectRoot() string {
	cwd, err := os.Getwd()
	if err != nil {
		return "/"
	}
	return cwd
}

// AddNode adds a node to the specified C4 level canvas
func (a *App) AddNode(level string, node DiagramNode) string {
	data, _ := json.Marshal(node)
	return string(data)
}

// AddConnection adds a connection between two nodes
func (a *App) AddConnection(level string, conn Connection) string {
	data, _ := json.Marshal(conn)
	return string(data)
}

// --- Mouse / UI Control Methods ---

// ClickAt emits an event to simulate a click at the given coordinates
func (a *App) ClickAt(x, y int) {
	runtime.EventsEmit(a.ctx, "mouse.click", map[string]interface{}{
		"x": x,
		"y": y,
	})
}

// MoveTo emits an event to move the virtual cursor
func (a *App) MoveTo(x, y int) {
	runtime.EventsEmit(a.ctx, "mouse.move", map[string]interface{}{
		"x": x,
		"y": y,
	})
}

// SwitchC4Level switches to the specified C4 level programmatically
func (a *App) SwitchC4Level(level string) {
	runtime.EventsEmit(a.ctx, "ui.switchLevel", map[string]interface{}{
		"level": level,
	})
}

// SendChatMessage sends a chat message programmatically
func (a *App) SendChatMessage(message string) {
	runtime.EventsEmit(a.ctx, "ui.sendChat", map[string]interface{}{
		"message": message,
	})
}

// FocusChat focuses the chat input
func (a *App) FocusChat() {
	runtime.EventsEmit(a.ctx, "ui.focusChat", map[string]interface{}{})
}

// ToggleChat toggles the chat panel visibility
func (a *App) ToggleChat() {
	runtime.EventsEmit(a.ctx, "ui.toggleChat", map[string]interface{}{})
}

// GetWindowInfo returns window position and size
func (a *App) GetWindowInfo() map[string]interface{} {
	x, y := runtime.WindowGetPosition(a.ctx)
	width, height := runtime.WindowGetSize(a.ctx)
	return map[string]interface{}{
		"x":      x,
		"y":      y,
		"width":  width,
		"height": height,
	}
}
