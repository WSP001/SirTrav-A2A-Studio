#!/usr/bin/env bash
set -euo pipefail
# Runner smoke test

echo "Checking Node version..."
node -e "const [major]=process.versions.node.split('.').map(Number); if(major<18){console.error('Node 18+ required'); process.exit(2)} console.log('Node OK', process.versions.node)"

if [ ! -f "pipelines/a2a_manifest.yml" ]; then
  echo "ERROR: pipelines/a2a_manifest.yml not found"
  exit 2
fi

node pipelines/run-manifest.mjs

echo "Runner smoke OK"
