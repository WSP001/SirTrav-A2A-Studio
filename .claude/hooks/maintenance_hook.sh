#!/bin/bash
# maintenance_hook.sh - Scheduled maintenance tasks
# Purpose: Clean up old artifacts, rotate logs, check system health

LOG_DIR=".claude/logs"
ARTIFACTS_DIR="artifacts"
LOCAL_BLOBS_DIR=".local-blobs"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "[MAINT] Maintenance started at $TIMESTAMP" >> "$LOG_DIR/maintenance.log"

# 1. Rotate logs older than 7 days
find "$LOG_DIR" -name "*.log" -mtime +7 -exec gzip {} \; 2>/dev/null
echo "[MAINT] Rotated old logs" >> "$LOG_DIR/maintenance.log"

# 2. Clean up local blob cache (dev mode)
if [ -d "$LOCAL_BLOBS_DIR" ]; then
    BLOB_COUNT=$(find "$LOCAL_BLOBS_DIR" -type f | wc -l)
    echo "[MAINT] Local blobs count: $BLOB_COUNT" >> "$LOG_DIR/maintenance.log"

    # Remove blobs older than 24 hours
    find "$LOCAL_BLOBS_DIR" -type f -mtime +1 -delete 2>/dev/null
    echo "[MAINT] Cleaned old local blobs" >> "$LOG_DIR/maintenance.log"
fi

# 3. Check disk space
DISK_USAGE=$(df -h . | tail -1 | awk '{print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -gt 90 ]; then
    echo "[MAINT] WARNING: Disk usage at $DISK_USAGE%" >> "$LOG_DIR/maintenance.log"
fi

# 4. Validate artifact schema files
for JSON_FILE in "$ARTIFACTS_DIR"/*.json; do
    if [ -f "$JSON_FILE" ]; then
        if ! python3 -m json.tool "$JSON_FILE" > /dev/null 2>&1; then
            if ! node -e "JSON.parse(require('fs').readFileSync('$JSON_FILE'))" 2>/dev/null; then
                echo "[MAINT] WARNING: Invalid JSON: $JSON_FILE" >> "$LOG_DIR/maintenance.log"
            fi
        fi
    fi
done

# 5. Git status check
if git status --porcelain | grep -q "^"; then
    UNCOMMITTED=$(git status --porcelain | wc -l)
    echo "[MAINT] Notice: $UNCOMMITTED uncommitted changes" >> "$LOG_DIR/maintenance.log"
fi

echo "[MAINT] Maintenance completed" >> "$LOG_DIR/maintenance.log"
exit 0
