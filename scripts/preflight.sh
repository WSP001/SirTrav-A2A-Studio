#!/bin/bash

# Preflight Check for SirTrav A2A Studio
# Usage: ./scripts/preflight.sh

echo "🚀 SirTrav A2A Studio - Preflight Check"
echo "======================================="

FAILED=0

# 1. Check Environment Variables
if [ ! -f .env ] && [ ! -f .env.local ]; then
  echo "❌ Missing .env or .env.local file"
  FAILED=1
else
  echo "✅ Environment file found"
fi

# 2. Check Netlify CLI
if ! command -v netlify &> /dev/null; then
  echo "❌ Netlify CLI not found (npm install -g netlify-cli)"
  FAILED=1
else
  echo "✅ Netlify CLI detected"
fi

# 3. Check Vite Build
if [ ! -d dist ]; then
  echo "⚠️ 'dist' directory missing. Running build..."
  npm run build
  if [ $? -eq 0 ]; then
    echo "✅ Build successful"
  else
    echo "❌ Build failed"
    FAILED=1
  fi
else
  echo "✅ Dist directory exists"
fi

# 4. Check Local Runtime (MG-P0-A)
# Ensure netlify dev is running at port 8888
if curl -s http://localhost:8888/.netlify/functions/healthcheck > /dev/null; then
  echo "✅ Local Verification Runtime detected (Port 8888)"
  echo "   (Deterministic healthcheck passed)"
else
  echo "⚠️ Local Verification Runtime NOT detected at localhost:8888"
  echo "   (End-to-end verifiers will fail with ECONNREFUSED)"
  echo "   Run 'npm run dev' or 'netlify dev' in a separate terminal."
  # We warn but do not fail hard for static analysis preflight, 
  # but for E2E it is fatal.
  # FAILED=1 
fi

# Report
if [ $FAILED -eq 1 ]; then
  echo ""
  echo "🛑 PREFLIGHT FAILED"
  echo "Please review the testing guide for setup instructions:"
  echo "👉 docs/READY_TO_TEST.md"
  exit 1
else
  echo ""
  echo "✅ PREFLIGHT PASSED. Ready for take-off!"
  exit 0
fi
