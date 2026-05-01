The project is a c4 diagram / spec driven development application. The user describes their project requirements and the application draws them on the appropriate level using tool calls. Each modification to the diagram is versioned, and the user can toggle versions and rollback if necessary. The user has buttons to navigate the four tiers of the c3 diagram.

design reference: 286b81136967201285e7ce1889cd0d04.png

## Visual Verification

After making any UI or visual changes, always verify them visually:

1. Run `./scripts/screenshot.sh` to capture the current robotlegs window
2. Read the resulting PNG from `./screenshots/` with the `read` tool to inspect the result
3. Compare against the design reference if applicable

Use the screenshot skill to confirm all changes render as expected before considering a task complete.
