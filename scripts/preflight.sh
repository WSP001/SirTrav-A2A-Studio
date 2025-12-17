#!/bin/bash

# SirTrav A2A Studio - Preflight Check
# Verifies environment integrity before pipeline execution

echo "🚀 Starting Preflight Checks..."

# 1. Check Node Version
NODE_VERSION=$(node -v)
echo "✅ Node.js: $NODE_VERSION"

# 2. Check Directory Structure
REQUIRED_DIRS=("pipelines" "netlify/functions" "src/components" "docs")
for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "✅ Directory found: $dir"
  else
    echo "❌ MISSING Directory: $dir"
    exit 1
  fi
done

# 3. Check Critical Files
REQUIRED_FILES=("pipelines/a2a_manifest.yml" "pipelines/run-manifest.mjs" "netlify.toml" "package.json")
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ File found: $file"
  else
    echo "❌ MISSING File: $file"
    exit 1
  fi
done

# 4. Check Private Vault Access (Optional but recommended)
# Adjust path as needed for your local setup
VAULT_PATH="../Sir-TRAV-scott"
if [ -d "$VAULT_PATH" ]; then
  echo "✅ Private Vault found: $VAULT_PATH"
else
  echo "⚠️  Private Vault NOT found at $VAULT_PATH (Ensure you have it checked out if running full pipeline)"
fi

echo "✨ Preflight Check Complete! System ready for takeoff."
exit 0
