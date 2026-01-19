#!/bin/bash
# post_plan_hook.sh - Executed after Claude Code generates a plan
# Purpose: Validate plan structure and log for audit trail

PLAN_FILE="$1"
LOG_DIR=".claude/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$LOG_DIR"

echo "[POST_PLAN] Hook triggered at $TIMESTAMP" >> "$LOG_DIR/hooks.log"

# Validate plan file exists
if [ ! -f "$PLAN_FILE" ]; then
    echo "[POST_PLAN] WARNING: Plan file not found: $PLAN_FILE" >> "$LOG_DIR/hooks.log"
    exit 0
fi

# Archive plan for audit
cp "$PLAN_FILE" "$LOG_DIR/plan_$TIMESTAMP.md"

# Check for required sections
if ! grep -q "## Implementation" "$PLAN_FILE"; then
    echo "[POST_PLAN] WARNING: Plan missing Implementation section" >> "$LOG_DIR/hooks.log"
fi

if ! grep -q "## Testing" "$PLAN_FILE"; then
    echo "[POST_PLAN] WARNING: Plan missing Testing section" >> "$LOG_DIR/hooks.log"
fi

echo "[POST_PLAN] Plan validated and archived" >> "$LOG_DIR/hooks.log"
exit 0
