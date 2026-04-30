#!/usr/bin/env bash
set -euo pipefail

APP_NAME="robotlegs"
SCREENSHOTS_DIR="$(cd "$(dirname "$0")/.." && pwd)/screenshots"
mkdir -p "$SCREENSHOTS_DIR"
OUTPUT_FILE="${1:-$SCREENSHOTS_DIR/robotlegs-$(date +%Y%m%d-%H%M%S).png}"

# Hyprland path
if command -v hyprctl &>/dev/null; then
    # Match by title being exactly the app name, or class starting with the app name
    WINDOW_JSON=$(hyprctl clients -j | jq --arg name "$APP_NAME" '
        [.[] | select(
            (.title == $name) or
            (.class | startswith($name))
        )] | first // empty
    ')

    if [ -z "$WINDOW_JSON" ]; then
        echo "Error: Could not find '${APP_NAME}' window in Hyprland." >&2
        exit 1
    fi

    X=$(echo "$WINDOW_JSON" | jq '.at[0]')
    Y=$(echo "$WINDOW_JSON" | jq '.at[1]')
    W=$(echo "$WINDOW_JSON" | jq '.size[0]')
    H=$(echo "$WINDOW_JSON" | jq '.size[1]')

    grim -g "${X},${Y} ${W}x${H}" "$OUTPUT_FILE"
    echo "Screenshot saved to: $OUTPUT_FILE"
    exit 0
fi

# X11 fallback
if command -v xdotool &>/dev/null && [ -n "${DISPLAY:-}" ]; then
    WINDOW_ID=""
    for search in "search --name ^${APP_NAME}$" "search --class ${APP_NAME}" "search --name ${APP_NAME}"; do
        WINDOW_ID=$(xdotool $search 2>/dev/null | head -n1 || true)
        if [ -n "$WINDOW_ID" ]; then
            break
        fi
    done

    if [ -z "$WINDOW_ID" ]; then
        echo "Error: Could not find a window for '${APP_NAME}'." >&2
        exit 1
    fi

    import -window "$WINDOW_ID" "$OUTPUT_FILE"
    echo "Screenshot saved to: $OUTPUT_FILE"
    exit 0
fi

echo "Error: No supported screenshot method found (requires grim+hyprctl on Wayland, or xdotool+import on X11)." >&2
exit 1
