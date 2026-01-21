#!/usr/bin/env bash
set -euo pipefail

banner() {
  printf "\n==== %s ====\n" "$1"
}

# Node guard
banner "Node runtime"
node -e "const [major]=process.versions.node.split('.').map(Number); if(major<18){console.error('Node 18+ required'); process.exit(1)} console.log('Node OK', process.versions.node)"

run_step() {
  local label="$1"; shift
  banner "$label"
  if "$@"; then
    echo "✅ ${label}"
  else
    echo "❌ ${label} failed"
    return 1
  fi
}

run_step "Security preflight" bash ./scripts/preflight.sh
run_step "Manifest smoke (test_runner.sh)" bash ./scripts/test_runner.sh
run_step "Practice pipeline" bash ./scripts/practice_test.sh

echo "\nAll flywheel checks completed."
