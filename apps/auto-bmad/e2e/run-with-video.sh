#!/bin/bash
# E2E Test Runner with Video Recording
# Records screen while running Playwright E2E tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"
VIDEO_DIR="$SCRIPT_DIR/videos"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
TEST_PATTERN="${1:-p0-critical-flows}"
VIDEO_FILE="$VIDEO_DIR/${TEST_PATTERN}-${TIMESTAMP}.mp4"

mkdir -p "$VIDEO_DIR"

echo "=========================================="
echo "  E2E Test Runner with Video Recording"
echo "=========================================="
echo "Test pattern: $TEST_PATTERN"
echo "Video output: $VIDEO_FILE"
echo ""

# Set DISPLAY if not set
if [ -z "$DISPLAY" ]; then
    export DISPLAY=:0
fi

# Get screen resolution
SCREEN_RES=$(xdpyinfo 2>/dev/null | grep dimensions | awk '{print $2}' || echo "1920x1080")
echo "Screen: $SCREEN_RES"

# Start recording
echo "Starting screen recording..."
ffmpeg -y -f x11grab -video_size "$SCREEN_RES" -framerate 30 -i "$DISPLAY" \
    -c:v libx264 -preset ultrafast -crf 23 -pix_fmt yuv420p \
    "$VIDEO_FILE" 2>/dev/null &
FFMPEG_PID=$!
sleep 2

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping recording..."
    kill -INT $FFMPEG_PID 2>/dev/null || true
    wait $FFMPEG_PID 2>/dev/null || true
    if [ -f "$VIDEO_FILE" ]; then
        SIZE=$(du -h "$VIDEO_FILE" | cut -f1)
        echo "Video saved: $VIDEO_FILE ($SIZE)"
    fi
}
trap cleanup EXIT

# Run tests
echo ""
echo "Running tests..."
cd "$APP_DIR"
npx playwright test "$TEST_PATTERN" --config=e2e/playwright.config.ts --headed

echo ""
echo "Tests complete!"
