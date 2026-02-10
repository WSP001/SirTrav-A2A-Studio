# 🤖 AGENT EXECUTABLE INSTRUCTIONS
# ==========================================
# Copy/Paste these blocks to the respective agent instances.
# Derived from: plans/AGENT_ASSIGNMENTS.md & RC1 Verification Results
# ==========================================

# ------------------------------------------
# 🔧 INSTANCE 5: CLAUDE CODE (Backend Refinement)
# ------------------------------------------
# GOAL: Ensure Remotion Lambda dependencies are ready for real deployment.
# THE FALLBACK IS WORKING, but we need to confirm the path to "Real" rendering.

# 1. Check dependencies
cat package.json

# 2. If @remotion/lambda is missing (likely), note it for the RC1 report.
#    DO NOT install it yet if it breaks the precarious Netlify build size.
#    Just verify the logic in netlify/functions/render-dispatcher.ts

# 3. Verify the dispatcher code
view_file netlify/functions/render-dispatcher.ts

# 4. Confirmation Command (to mark task complete)
just task-done mg-001 "Claude-Backend"

# ------------------------------------------
# 🐦 INSTANCE 2: CLAUDE CODE (X/Twitter Auth)
# ------------------------------------------
# GOAL: Verify X/Twitter API keys (Human Task Support)

# 1. Run the verification script to give Scott the latest status
npm run x-dry-run

# 2. If it fails with 401, output the specific error for Scott.
#    (No code changes needed here, just verification)

# ------------------------------------------
# 🎨 INSTANCE 3: CODEX (Frontend Polish)
# ------------------------------------------
# GOAL: Fix UI overflow & Add Error Boundary

# 1. Create Error Boundary Component
write_to_file src/components/ErrorBoundary.jsx <<EOF
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a1a] text-white p-6">
          <div className="max-w-md w-full bg-white/5 border border-red-500/30 rounded-xl p-6 text-center">
            <h1 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h1>
            <p className="text-gray-400 text-sm mb-4">The application encountered a critical error.</p>
            <pre className="bg-black/30 p-3 rounded text-left text-xs text-red-300 overflow-auto max-h-32 mb-4">
              {this.state.error?.toString()}
            </pre>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
EOF

# 2. Wrap App in Error Boundary
# (Manually edit src/main.jsx or src/index.jsx to import and wrap <App />)

# 3. Verify CSS Overflow Fix
# (Antigravity already patched src/App.css, just verify visual results)

# ------------------------------------------
# 🦅 INSTANCE 4: ANTIGRAVITY (QA/Master) - COMPLETED
# ------------------------------------------
# STATUS: RC1 Verification Passed (Logic)
# ACTIONS TAKEN:
# - Wired render-dispatcher (Step 5)
# - Wired attribution (Step 6)
# - Verified Golden Path
#
# NEXT STEPS FOR TEAM:
# 1. Scott -> Fix Netlify Dashboard Build Settings (Critical)
# 2. Scott -> Fix X/Twitter Keys (Critical)
# 3. Codex -> Implement ErrorBoundary
# 4. ALL -> Run 'npm run test:full' for final green light.
