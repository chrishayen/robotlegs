package main

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
)

// App struct
type App struct {
	ctx          context.Context
	sessionStart bool
	mu           sync.Mutex
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

// Chat sends a message to Claude via `claude -p` and returns the response.
// Subsequent messages use `-c` to resume the same session.
func (a *App) Chat(message string) string {
	a.mu.Lock()
	defer a.mu.Unlock()

	// Build command args
	args := []string{"-p", "--bare"}
	if !a.sessionStart {
		args = append(args, "-c") // resume session for subsequent messages
	}
	args = append(args, message)

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
			// Skip claude's internal log lines (start with timestamp or are empty)
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

// getProjectRoot returns the project root directory
func getProjectRoot() string {
	// Try to find the project root by looking for .env or go.mod
	cwd, err := os.Getwd()
	if err != nil {
		return "/"
	}
	return cwd
}
