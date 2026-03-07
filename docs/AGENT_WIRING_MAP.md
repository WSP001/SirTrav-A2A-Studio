# Agent Wiring Map — SirTrav A2A Studio

> Visual map of who talks to who, wire-to-wire.
> Updated: 2026-03-06 by Windsurf/Cascade (Acting Master)

---

## The Three Wires

```
┌─────────────────────────────────────────────────────────────────┐
│                     STARTING WIRE                               │
│                                                                 │
│  Agent enters repo → reads CLAUDE.md / AGENTS.md                │
│  ↓                                                              │
│  Learns: 5 Laws, allowed zone, forbidden zone, commands         │
│  ↓                                                              │
│  Runs: just cockpit  (sees reality)                             │
│  Runs: just orient-<agent>-m9  (gets current context)           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MIDDLE WIRE                                 │
│                                                                 │
│  Agent reads plans/HANDOFF_<AGENT>_<TICKET>.md                  │
│  ↓                                                              │
│  Exact file paths, exact requirements, exact constraints        │
│  ↓                                                              │
│  Agent works in worktree (Claude Code) or feature branch        │
│  ↓                                                              │
│  READ BEFORE WRITE: cat the file before editing                 │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ENDING WIRE                                 │
│                                                                 │
│  npm run build           → must be 0 errors                     │
│  just sanity-test-local  → must be 0 fails                      │
│  just control-plane-gate → must PASS                            │
│  ↓                                                              │
│  git commit -m "feat(m9): <what> [TICKET-ID]"                   │
│  git push                                                       │
│  ↓                                                              │
│  Report to Master → Master merges → AGENT-OPS.md updated        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Agent Domain Map

```
┌──────────────────────────────────────────────────────────────────┐
│                    REPO: c:\WSP001\SirTrav-A2A-Studio            │
│                                                                  │
│  ┌─────────────────┐     ┌──────────────────┐                    │
│  │  CLAUDE CODE    │     │  CODEX #2        │                    │
│  │  (Backend)      │     │  (Frontend)      │                    │
│  │                 │     │                  │                    │
│  │  netlify/       │     │  src/components/ │                    │
│  │   functions/    │     │  src/pages/      │                    │
│  │   lib/          │     │                  │                    │
│  │  scripts/       │     │  ⛔ No backend   │                    │
│  │                 │     │                  │                    │
│  │  ⛔ No src/     │     │                  │                    │
│  └────────┬────────┘     └────────┬─────────┘                    │
│           │                       │                              │
│           ▼                       ▼                              │
│  ┌─────────────────────────────────────────────┐                 │
│  │  WINDSURF/CASCADE (Acting Master)           │                 │
│  │                                             │                 │
│  │  MASTER.md, AGENT-OPS.md, CLAUDE.md         │                 │
│  │  justfile, plans/, docs/                    │                 │
│  │  Orchestration, gates, milestones           │                 │
│  │  Merges branches → main                     │                 │
│  └──────────────────┬──────────────────────────┘                 │
│                     │                                            │
│                     ▼                                            │
│  ┌─────────────────────────────────────────────┐                 │
│  │  ANTIGRAVITY (QA / Verifier)                │                 │
│  │                                             │                 │
│  │  npm run build                              │                 │
│  │  just sanity-test-local                     │                 │
│  │  just control-plane-gate                    │                 │
│  │  just m9-e2e                                │                 │
│  │                                             │                 │
│  │  ⛔ No product code. Verify only.           │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
│  ┌─────────────────────────────────────────────┐                 │
│  │  HUMAN-OPS (Scott / Roberto002)             │                 │
│  │                                             │                 │
│  │  Netlify Dashboard: env vars, deploy        │                 │
│  │  API keys, credentials, secrets             │                 │
│  │  Linear: project management                 │                 │
│  │                                             │                 │
│  │  ⛔ No code changes via dashboard.          │                 │
│  └─────────────────────────────────────────────┘                 │
│                                                                  │
│  ┌─────────────────────────────────────────────┐                 │
│  │  NETLIFY AGENT (Deploy & Cloud Ops)         │                 │
│  │                                             │                 │
│  │  just deploy-preview → just deploy          │                 │
│  │  just healthcheck-cloud                     │                 │
│  │  just control-plane-verify-cloud            │                 │
│  │                                             │                 │
│  │  ⛔ No code changes. Deploy + verify only.  │                 │
│  └─────────────────────────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────┘
```

---

## Pipeline Data Flow (7 Agents)

```
User uploads photos + clicks "Launch"
          │
          ▼
┌─────────────────┐
│ start-pipeline   │──→ run-pipeline-background.ts (orchestrator)
└─────────────────┘              │
                                 │  const startTime = Date.now()
                                 │  const manifest = new ManifestGenerator()
                                 │
                    ┌────────────▼────────────┐
                    │  1. DIRECTOR            │  curate-media.ts
                    │     Vision AI analysis  │  → manifest.addEntry()
                    │     → updateRun()       │  → runningCost + elapsedMs
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  2. WRITER              │  narrate-project.ts
                    │     Gemini → GPT-4      │  → manifest.addEntry()
                    │     → updateRun()       │  → runningCost + elapsedMs
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  3+4. VOICE + COMPOSER  │  text-to-speech.ts
                    │     (parallel)          │  generate-music.ts
                    │     → updateRun()       │  → runningCost + elapsedMs
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  5. EDITOR              │  compile-video.ts
                    │     Remotion Lambda     │  → render-dispatcher.ts
                    │     → updateRun()       │  → runningCost + elapsedMs
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  6. ATTRIBUTION         │  generate-attribution.ts
                    │     Cost manifest       │  → manifest.addEntry()
                    │     → updateRun()       │  → runningCost + elapsedMs
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │  7. PUBLISHER           │  publish.ts
                    │     X / LinkedIn / YT   │  → publish-x.ts
                    │     (per publishTargets) │  → publish-linkedin.ts
                    │                         │  → publish-youtube.ts
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │  FINAL                  │
                    │  manifest.generate()    │  → Invoice + cost ledger
                    │  updateRun(completed)   │  → SSE: final runningCost
                    │  wipeCredentials()      │  → Security flush
                    └─────────────────────────┘
```

---

## SSE Progress Flow (CC-M9-METRICS)

```
run-pipeline-background.ts                    Browser (PipelineProgress.tsx)
         │                                              │
         │  updateRun({ runningCost, elapsedMs })       │
         │  → appendProgress()                          │
         │  → writes to Netlify Blobs                   │
         │                                              │
         │              GET /progress?runId=xxx          │
         │◄─────────────────────────────────────────────│
         │                                              │
         │  SSE event: { runningCost: 0.0234,           │
         │               elapsedMs: 12500,              │
         │               progress: 42,                  │
         │               message: "Writer completed" }  │
         │─────────────────────────────────────────────►│
         │                                              │
         │                              setMetrics({    │
         │                                cost: 0.0234, │
         │                                time: 12.5    │
         │                              })              │
         │                              (after CX-019)  │
```

---

## Ticket Flow

```
MASTER.md (milestones)
    │
    ▼
plans/HANDOFF_<AGENT>_<TICKET>.md  ← Master creates
    │
    ▼
Agent reads ticket, works in worktree/branch
    │
    ▼
Agent runs gates (build + sanity + control-plane)
    │
    ▼
Agent commits + pushes to branch
    │
    ▼
Master reviews diff, merges to main
    │
    ▼
AGENT-OPS.md updated with delivery proof
    │
    ▼
Next agent picks up their ticket
```

---

## Workspace Copies (Source of Truth)

```
c:\WSP001\SirTrav-A2A-Studio           ← WRITE (canonical)
    │
    │  git push origin main
    │
    ▼
github.com/WSP001/SirTrav-A2A-Studio   ← ORIGIN (single source)
    │
    │  git pull origin main
    │
    ▼
C:\Users\Roberto002\Documents\GitHub\  ← READ-ONLY (synced archive)
C:\Users\Roberto002\OneDrive\Sir James\← READ-ONLY (archive)
```

---

*This map reflects the actual wiring as of commit `6836785d` on main.*

**For the Commons Good** 🎬
