#!/bin/bash
# init_hook.sh - Executed when Claude Code session starts
# Purpose: Set up environment and verify prerequisites

LOG_DIR=".claude/logs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$LOG_DIR"

echo "======================================" >> "$LOG_DIR/session.log"
echo "[INIT] Session started at $TIMESTAMP" >> "$LOG_DIR/session.log"
echo "[INIT] Working directory: $(pwd)" >> "$LOG_DIR/session.log"
echo "[INIT] Node version: $(node --version 2>/dev/null || echo 'not found')" >> "$LOG_DIR/session.log"
echo "[INIT] Git branch: $(git branch --show-current 2>/dev/null || echo 'not a repo')" >> "$LOG_DIR/session.log"

# Check required env vars
REQUIRED_VARS=("OPENAI_API_KEY" "ELEVENLABS_API_KEY")
MISSING=0

for VAR in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!VAR}" ]; then
        echo "[INIT] WARNING: Missing env var: $VAR" >> "$LOG_DIR/session.log"
        MISSING=$((MISSING + 1))
    fi
done

if [ $MISSING -gt 0 ]; then
    echo "[INIT] $MISSING required env vars missing - dev mode only" >> "$LOG_DIR/session.log"
fi

# Verify critical files exist
CRITICAL_FILES=(
    "netlify/functions/start-pipeline.ts"
    "netlify/functions/run-pipeline-background.ts"
    "scripts/verify-golden-path.mjs"
)

for FILE in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$FILE" ]; then
        echo "[INIT] CRITICAL: Missing file: $FILE" >> "$LOG_DIR/session.log"
    fi
done

echo "[INIT] Initialization complete" >> "$LOG_DIR/session.log"
exit 0
