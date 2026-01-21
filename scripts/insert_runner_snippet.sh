#!/usr/bin/env bash
set -euo pipefail

TARGET="pipelines/run-manifest.mjs"
SNIP_MARKER="=== runner: require Node >= 18 and add progress helper ==="

if [ ! -f "$TARGET" ]; then
  echo "ERROR: $TARGET not found. Create the file or run from repo root."
  exit 2
fi

if grep -q "$SNIP_MARKER" "$TARGET"; then
  echo "Runner snippet already present in $TARGET"
  exit 0
fi

TMP=$(mktemp)
cat > "$TMP" <<'SNIP'
// === runner: require Node >= 18 and add progress helper ===
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error("Node 18+ required (global fetch).");
  process.exit(1);
}

async function postProgress(step, status, meta = {}) {
  if (!process.env.URL) return;
  try {
    await fetch(`${process.env.URL}/.netlify/functions/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': meta.correlationId || '',
      },
      body: JSON.stringify({ step, status, meta }),
    });
  } catch (e) {
    console.warn('postProgress failed:', e?.message || e);
  }
}
// === end runner snippet ===

SNIP

mv "$TARGET" "${TARGET}.bak"
cat "$TMP" "${TARGET}.bak" > "$TARGET"
rm "${TARGET}.bak" "$TMP"
chmod +x "$TARGET"
echo "Prepended runner snippet into $TARGET"
