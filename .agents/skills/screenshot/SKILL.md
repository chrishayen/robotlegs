---
name: screenshot
description: Takes a screenshot of the robotlegs application window using the project's screenshot.sh script. Use when you need to capture the current UI state, verify visual output, or document the application appearance.
---

# Screenshot Skill

Takes a screenshot of the running **robotlegs** application window.

## How It Works

The project includes a script at `./scripts/screenshot.sh` that captures the robotlegs window using either:
- **Hyprland (Wayland):** `grim` + `hyprctl` to find and capture the window by geometry
- **X11 fallback:** `xdotool` + `import` to find and capture the window by ID

## Usage

Run the script from the project root:

```bash
./scripts/screenshot.sh [output_file.png]
```

- If no output file is specified, it defaults to `./screenshots/robotlegs-YYYYMMDD-HHMMSS.png`.
- The script prints the path of the saved screenshot on success.

## When to Use

Use this skill when:
- The user asks to take a screenshot of the robotlegs app
- You need to inspect the current UI state visually
- You want to document or verify visual behavior
- Debugging layout or rendering issues

After running the script, read the resulting PNG file with the `read` tool to view the screenshot.
