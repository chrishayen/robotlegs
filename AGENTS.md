The project is a c4 diagram / spec driven development application. The user describes their project requirements and the application draws them on the appropriate level using tool calls. Each modification to the diagram is versioned, and the user can toggle versions and rollback if necessary. The user has buttons to navigate the four tiers of the c3 diagram.
This dev environment live refreshes when code is updated so there's never a need to kill processes and reload `wails dev`

design inspiration: ./design_inspiration/

## Command Server (UI Control)

The app exposes a HTTP command server on `localhost:9876` for programmatic UI control. Use these endpoints instead of ydotool or xdotool:

```bash
# Switch C4 level
# levels: system-landscape, system, container, component
curl "http://localhost:9876/switch?level=container"

# Send a chat message
curl "http://localhost:9876/send?message=I'm+building+a+web+app"

# Get window info (position, size)
curl "http://localhost:9876/info"

# Click at specific coordinates
curl -X POST -d '{"x":100,"y":200}' http://localhost:9876/click

# Focus chat input
curl "http://localhost:9876/focus"

# Toggle chat panel visibility
curl "http://localhost:9876/toggle"
```

**How it works**: The Go backend emits Wails runtime events that the frontend listens for via `window.runtime.EventsOn()`. This is more reliable than simulated mouse input on Wayland.

**Always wait 1-2 seconds after switching levels before taking a screenshot** to allow the transition to complete.

## Visual Verification

After making any UI or visual changes, always verify them visually:

1. Run `./scripts/screenshot.sh` to capture the current robotlegs window
2. Read the resulting PNG from `./screenshots/` with the `read` tool to inspect the result
3. Compare against the design reference if applicable

Use the screenshot skill to confirm all changes render as expected before considering a task complete.
