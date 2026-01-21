#!/usr/bin/env bash
set -euo pipefail

if command -v rg >/dev/null 2>&1; then
  rg -n --hidden --no-ignore -e 'sk_[A-Za-z0-9]+' -g '!node_modules' || true
else
  grep -RIn --exclude-dir=node_modules -E 'sk_[A-Za-z0-9]+' . || true
fi

echo "If any secrets printed above, remove them and use env vars."
