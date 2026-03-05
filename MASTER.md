# MASTER.md — SirTrav A2A Studio Build Plan

**Version:** 3.4.0  
**Last Updated:** 2026-03-04  
**Signed by:** Windsurf/Cascade (Acting Master, WSP001)  
**Status:** M8 FROZEN at `0d220f72` — Next: M9 (Remotion E2E) + M10 (X + YouTube)

This document is the central planning and coordination guide for building the SirTrav A2A Studio: a D2A (Doc-to-Agent) automated video production platform for the Commons Good.

## Mission Statement

Build a production-ready, user-friendly video automation platform where users click a single **Click2Kick button** to trigger automated cinematic video production through sequential AI agent orchestration.

**Core principle:** "Build the memory before the masterpiece."  
**Operating law:** No Fake Success — `success: true` only with real confirmation.

---

## 📊 v3.4.0 Status Table (March 4, 2026)

> Driven by `/.netlify/functions/control-plane` — not hand-written.

| System | Status | Proof |
|--------|--------|-------|
| **7-Agent Pipeline** | ✅ Wired | 7/7 agent files, 10/10 cycle gates GREEN |
| **Storage** | ✅/🟡 Netlify Blobs | Durable in cloud; local FS fallback; local timeouts → degraded |
| **Learning Loop** | ✅ Closed | 👍/👎 → memory_index.json → Director reads |
| **Vision AI** | ✅ Ready | OpenAI vision when key present; Gemini Flash for narration |
| **Progress Tracking** | ✅ Ready | SSE + Blobs + 3s timeout wrapper (<10s) |
| **Voice Agent** | 🟡 Ready | Requires `ELEVENLABS_API_KEY` |
| **Composer Agent** | 🟡 Ready | Requires `SUNO_API_KEY` |
| **Editor Agent** | 🟡 Graceful Degradation | Remotion Lambda wired; returns placeholder when AWS keys missing (CC-019). **M9 blocker: HO-007** |
| **X/Twitter** | ✅ Verified Live | Past tweet IDs on record |
| **LinkedIn** | ✅ Verified Live | `urn:li:ugcPost:7431201708828946432` |
| **YouTube** | 🟡 Keys Present | No Fake Success: url only from real publish (see policy below) |
| **Instagram / TikTok** | ⏸️ Parked | Not in M10 scope — X + YouTube only for now |
| **Control Plane** | ✅ M7 Live | `/.netlify/functions/control-plane` — 33/33 verifier checks |
| **Build** | ✅ Passes | Vite v7.3, 1351 modules, 2.1s |
| **Sanity Test** | ✅ 33/0/12 | 33 pass, 0 fail, 12 degraded (all optional) |
| **Repo Hygiene** | ✅ Clean | 1 branch (main), dist untracked, local configs ignored |

### 🎬 YouTube Link Policy (No Fake Success)

- Gemini may generate titles, descriptions, tags — but **MUST NOT** output a YouTube URL
- Only `publish-youtube.ts` (live mode) can set `youtubeUrl` after a real upload
- Dry-run returns `{ success: false, mode: "dry-run", url: null }`
- Disabled returns `{ success: false, disabled: true, url: null }`
- Verified by `just control-plane-verify` assertion: `youtube_link_policy.currentUrl === null`

---

## ✅ Completed Milestones (Since v2.0.1)

### M0: Social Platform Integration ✅ DONE
**Was:** "Fix X keys, Add LinkedIn" — **Result:** Both verified live.
- X/Twitter: live posts confirmed (tweet IDs on record)
- LinkedIn: live post `urn:li:ugcPost:7431201708828946432`
- OAuth callback function (`auth-linkedin-callback.ts`) built
- LinkedIn secrets rotated after exposure
- All dry-run + live test recipes in justfile

### M0.5: Blank Page Fix ✅ DONE (not in original plan)
- Root cause: `vite.config.js` outDir was `landing/` instead of `dist/`
- Netlify Dashboard overrode build command to "no build"
- Fixed: outDir → `dist/`, publish → `dist/`, build → `npm ci && npm run build`
- Created `NETLIFY_BUILD_RULES.md` guardrails

### M0.6: No Fake Success Enforcement ✅ DONE (not in original plan)
- All 5 publishers return `{ success: false, disabled: true }` when keys absent
- Payload validation added (validateXPayload, validateLinkedInPayload, etc.)
- `just no-fake-success-check` gate: 8/8 checks PASS

### M0.7: Control Plane ✅ DONE (not in original plan)
- `master-cockpit.mjs`: split verdicts (cloudVerdict + localVerdict + combined)
- `just control-plane-gate`: branch-aware CI gate (strict on main, warn on feature)
- `just env-diff`: local vs cloud key parity comparison
- `just repo-hygiene`: blocks staging build output or local configs
- Sanity test mode-aware (`--mode cloud` / `--mode local`)
- OPENAI_API_KEY optional locally when GEMINI_API_KEY present

### M0.8: Repo Hygiene (CC-017) ✅ DONE
- 11 stale remote branches deleted (archived in `docs/BRANCH_ARCHIVE_CC017.md`)
- `.env.example` v3.0.0 with scope labels ([NETLIFY]/[LOCAL]/[AUTO])
- `npm audit fix`: 269 packages updated
- `.gitignore` updated: dist/, local configs, generated output ignored
- Only `origin/main` remains

---

## 🚀 ACTIVE MILESTONES

### M6: Local Dev Green Light ✅ DONE
**Target:** `just sanity-test-local` exits 0 with `netlify dev` running  
**KPI:** healthcheck ✅, progress POST ✅, gemini-test ✅ — **ALL MET (33 pass, 0 fail, 12 degraded)**

- [x] Fix healthcheck timeout (5s timeout wrapper around Blobs check)
- [x] Fix progress POST 500 (3s timeout wrapper in progress-store)
- [x] Relax OPENAI to optional locally when GEMINI present
- [x] Wire Gemini 2.5 Flash into Writer Agent (Flash First rule)
- [x] Fix curate-media v2 graceful degradation (not 500)
- [x] Fix .env duplicate GEMINI_API_KEY (invalid entry removed)
- [x] Verify `just sanity-test-local` exits 0 ✅ (commit `65c63649`)
- [x] Verify `just gemini-test` returns `generatedBy: "gemini"` with real scenes ✅

---

### M7: Control Plane + Diagnostics 📊
**Target:** `/control-plane` endpoint + `/diagnostics` UI route  
**KPI:** One URL shows cloud/local health at a glance  
**Owner:** Windsurf Master (endpoint + verifier) + Codex #2 (UI route)

- [x] Create `/.netlify/functions/control-plane` endpoint (returns truth JSON) ✅
- [x] YouTube Link Policy enforced: url only from real publish ✅
- [x] Create `scripts/verify-control-plane.mjs` — 33 assertions, all pass ✅
- [x] Add `just control-plane-verify` + `just control-plane-verify-cloud` recipes ✅
- [x] Create `/diagnostics` React route with tiles ✅ (Codex #2, CX-016, commit `21728664`):
  - CloudVerdict / LocalVerdict / Combined (from control-plane JSON)
  - 7-Agent pipeline wiring status grid
  - Service health tiles (storage, AI, progress, social)
  - Auto-refresh every 15s
- [x] Wire UI emblem to show combined verdict icon ✅ (SystemStatusEmblem → control-plane)

---

### M8: Platform Toggle UI 🎛️ ✅ DONE — FROZEN at `0d220f72`
**Target:** Users select which platforms to publish to  
**KPI:** Toggle component visible, respects healthcheck  
**Owner:** Codex #2 (UI, CX-017) + Claude Code (backend, CC-019)

> **⛔ M8 is CLOSED.** Nobody touches `PlatformToggle.tsx` or `ResultsPreview.tsx` without a bug ticket.  
> All new work is M9 (Remotion) or M10 (Engagement Loop), both blocked on real keys from Human-Ops.

**Backend (CC-019, commit `9f076332`) ✅:**
- [x] `publishTargets` array in start-pipeline.ts — selective platform publishing ✅
- [x] `publishTargets` threaded to run-pipeline-background.ts ✅
- [x] Editor graceful degradation: returns `status: 'degraded'` placeholder when Remotion keys missing ✅

**UI (CX-017, commit `16cf32c9`) ✅:**
- [x] Create `src/components/PlatformToggle.tsx` — 153-line reusable component ✅
- [x] Wire to `/healthcheck` + `/control-plane` for live platform status ✅
- [x] Disable unavailable platforms (greyed + tooltip + 🔒) ✅
- [x] Show cost estimate per platform (`PLATFORM_ESTIMATE_USD`) ✅
- [x] Add to `ResultsPreview.tsx` + `App.jsx` ✅

**Verification:** 33/33 sanity pass, `npm run build` clean (1357 modules), No Fake Success confirmed.

---

### M9: End-to-End Video Production 🎬
**Target:** Click2Kick produces a real video with all 7 agents  
**KPI:** One complete run from upload to published video  
**Owner:** Claude Code (backend E2E) + Windsurf Master (gates)  
**Blocked by:** HO-007 (Remotion AWS keys) + HO-006 (ElevenLabs key)

**Architecture already built:**

- `compile-video.ts` → `render-dispatcher.ts` → `lib/remotion-client.ts` → `@remotion/lambda/client`
- 4 compositions registered in `src/remotion/Root.tsx`: SirTrav-Main, IntroSlate, EmblemComposition, EmblemThumbnail
- CC-019 graceful degradation returns placeholder when keys missing
- Fallback mode simulates 30s render with progress polling

**Checklist:**

- [ ] **HO-007:** Set Remotion Lambda env vars in Netlify (`REMOTION_SERVE_URL`, `REMOTION_FUNCTION_NAME`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) — see `docs/ENV-REMOTION.md`
- [ ] **HO-006:** Add `ELEVENLABS_API_KEY` to Netlify (Voice agent goes real)
- [ ] Install `@remotion/lambda` package (currently dynamic-imported, graceful fallback)
- [ ] Test `render-dispatcher.ts` with IntroSlate composition
- [ ] E2E dry-run: `just m9-e2e` — readiness check + Remotion test
- [ ] Full pipeline live run with real user photos
- [ ] Antigravity verification: E2E passes + control-plane sees Remotion health as ok

---

### M10: Engagement Loop (X + YouTube Only) 🧠
**Target:** Social mentions feed back into Director memory  
**KPI:** X + YouTube engagement flowing into inbox.json  
**Scope decision:** Instagram + TikTok **PARKED** until keys and compliance are ready.

- [ ] Wire `check-x-engagement.ts` with valid X keys
- [ ] YouTube Analytics integration (views, comments, retention)
- [ ] Director Agent reads engagement inbox for content ideas
- [ ] **PARKED:** Instagram (Meta Business Manager) — revisit after M10 core
- [ ] **PARKED:** TikTok (Developer Portal) — revisit after M10 core

---

### 📋 Milestones Summary

| Milestone | Target | Status | KPI |
|-----------|--------|--------|-----|
| **M0: Social Platforms** | Dec 2025 | ✅ DONE | X + LinkedIn verified live |
| **M0.5: Blank Page Fix** | Feb 2026 | ✅ DONE | Site renders correctly |
| **M0.6: No Fake Success** | Feb 2026 | ✅ DONE | 8/8 NFS checks pass |
| **M0.7: Control Plane** | Feb 2026 | ✅ DONE | cloudVerdict=REAL, CI gate passes |
| **M0.8: Repo Hygiene** | Feb 2026 | ✅ DONE | 1 branch, dist untracked |
| **M6: Local Dev Green** | Mar 2026 | ✅ DONE | 33 pass, 0 fail, Gemini live |
| **M7: Control Plane** | Mar 2026 | ✅ DONE | Endpoint + verifier + /diagnostics UI live |
| **M8: Platform Toggle** | Mar 2026 | ✅ DONE `0d220f72` | Backend CC-019 + UI CX-017, frozen |
| **M9: E2E Video** | March 2026 | � Blocked (HO-007) | Architecture ready, needs AWS keys |
| **M10: Engagement Loop** | April 2026 | 📋 Scoped | X + YouTube only; Insta/TikTok parked |

---

## 🤖 Agent Team Directory

| Agent | Platform | Role | Last Task | Status |
|-------|----------|------|-----------|--------|
| **Windsurf/Cascade** | Windsurf IDE | Acting Master — orchestration, justfile, cockpit, gates | Control plane + local fixes | ✅ Active |
| **Claude Code** | Terminal | Backend fixes, Remotion E2E, repo hygiene | CC-019 backend (M8), next: M9 Remotion E2E | ✅ Active |
| **Codex #2** | CLI | UI wiring, /diagnostics panel, platform toggles | CX-017 PlatformToggle.tsx (merged `16cf32c9`) | ⏸️ Waiting for M9/M10 UI tickets |
| **Antigravity** | CI/Testing | 5-gate verification receipts, QA proofs | AG-014 signed, CX-016 fast-merge approved | ✅ Delivered |
| **GitHub Copilot** | VS Code | Inline autocomplete | Original pipeline scaffold | 💤 Passive |

### Agent Handoff Protocol
- Task cards live in `plans/HANDOFF_<AGENT>_<ID>.md`
- Agent logs completion in `plans/AGENT_ASSIGNMENTS.md`
- All agents read `AGENTS.md` before starting work
- runId threading: every call includes `{ projectId, runId }`

---

## 🛡️ Control Plane (DevOps Operating System)

### Truth Verdicts
```
truth.verdict      = REAL | CHECK_REQUIRED | DEGRADED | UNKNOWN
truth.cloudVerdict = REAL (deploy + healthcheck + gates)
truth.localVerdict = DEGRADED (OPENAI missing locally, netlify dev not always running)
```

### Gate Commands
```bash
just cockpit              # Full dashboard (human-readable)
just cockpit-json         # Machine-readable JSON
just control-plane-gate   # CI gate (strict on main, warn on feature)
just sanity-test          # 45-check pipeline test (cloud)
just sanity-test-local    # Same but against localhost:8888
just env-diff             # Local vs cloud key parity
just repo-hygiene         # Block staging build output or local configs
just cycle-status         # 10-point quality gates summary
just validate-env         # 28-key env audit with masked previews
```

### Core Principles
1. **No Fake Success** — `success: true` ONLY with real confirmation. Disabled → `{ disabled: true }`.
2. **Cost Plus Transparency** — All API costs in `lib/cost-manifest.ts`, 20% markup (Commons Good).
3. **Dry-Run First** — Every publisher has `--dry-run`. Test free before spending credits.
4. **Click2Kick** — Read before execute. Prereq check → verification → output.
5. **runId Threading** — Every agent call traced with `{ projectId, runId }`.

---

## 👤 Human-Ops Queue

| ID | Priority | Task | Status |
|----|----------|------|--------|
| HO-001 | ✅ Done | Rotate LinkedIn secrets | Rotated by Scott |
| HO-002 | 🟡 HIGH | Add GEMINI_API_KEY to local .env (use `just set-gemini-key`) | Pending — needs real AIza... key |
| HO-003 | 🟡 MEDIUM | Set LINEAR_API_KEY + enable Linear↔GitHub | Pending |
| HO-004 | 🟡 MEDIUM | Verify Netlify Dashboard build settings match `netlify.toml` | Pending |
| HO-005 | 🟢 LOW | Set NETLIFY_AUTH_TOKEN in GitHub Actions secrets (for CI) | When CI is set up |
| HO-006 | � HIGH | Add ELEVENLABS_API_KEY to Netlify (Voice agent) | **M9 blocker** — needed for real narration |
| HO-007 | � HIGH | Add Remotion Lambda AWS env vars (see `docs/ENV-REMOTION.md`) | **M9 blocker** — needed for real rendering |

---

## 🏗️ Architecture

| Layer | Description | Components |
|-------|-------------|------------|
| **UI** | React + Vite + Tailwind | `/src/components/`, `CreativeHub.tsx` |
| **Pipeline** | Netlify Functions + background orchestration | `/netlify/functions/`, `run-pipeline-background.ts` |
| **Storage** | Netlify Blobs (durable) + local FS fallback | `lib/storage.ts`, `lib/progress-store.ts` |
| **Memory** | EGO-Prompt learning from feedback | `memory_index.json`, `lib/memory.ts` |
| **Quality** | LUFS audio gates, cost manifest, quality gate | `lib/quality-gate.ts`, `lib/cost-manifest.ts` |
| **Observability** | OpenTelemetry tracing + SSE progress | `lib/tracing.ts`, `progress.ts` |
| **Rendering** | Remotion Lambda (replaces local FFmpeg) | `render-dispatcher.ts`, `lib/remotion-client.ts` |
| **Control Plane** | Split verdicts, CI gate, sanity test, cockpit | `scripts/master-cockpit.mjs`, `justfile` |
| **Ledger** | Token attribution per WSP ticket (NDJSON) | `lib/ledger.ts`, `artifacts/LEDGER.ndjson` |

---

## 📁 Project Structure

```
├── netlify/functions/          # 7 Agent serverless functions + infrastructure
│   ├── curate-media.ts         # Agent 1: Director (Vision AI)
│   ├── narrate-project.ts      # Agent 2: Writer (Flash First: Gemini → GPT-4 → templates)
│   ├── text-to-speech.ts       # Agent 3: Voice (ElevenLabs)
│   ├── generate-music.ts       # Agent 4: Composer (Suno)
│   ├── compile-video.ts        # Agent 5: Editor → render-dispatcher.ts
│   ├── generate-attribution.ts # Agent 6: Attribution
│   ├── publish.ts              # Agent 7: Publisher
│   ├── publish-x.ts            # X/Twitter publisher (No Fake Success)
│   ├── publish-linkedin.ts     # LinkedIn publisher (No Fake Success)
│   ├── publish-youtube.ts      # YouTube publisher (No Fake Success)
│   ├── healthcheck.ts          # System health (5s storage timeout)
│   ├── progress.ts             # SSE progress (Blobs + graceful fallback)
│   └── lib/                    # Shared: storage, ledger, cost-manifest, quality-gate
├── scripts/                    # CLI tools + test scripts
│   ├── master-cockpit.mjs      # System dashboard (split verdicts)
│   ├── sanity-test.mjs         # 45-check pipeline test (mode-aware)
│   ├── validate-env.mjs        # 28-key env audit
│   ├── cycle-check.mjs         # 10-point quality gates
│   ├── set-gemini-key.ps1      # Safe prompted key setter
│   └── test-*.mjs              # Publisher test scripts (dry-run + live)
├── artifacts/                  # Pipeline outputs + contracts
│   └── contracts/              # JSON schemas (job-packet, social-post, etc.)
├── src/components/             # React UI (Vite + Tailwind)
├── docs/                       # Team documentation
├── plans/                      # Agent task plans + handoffs
├── runbooks/                   # Operator evidence + SOPs
├── justfile                    # 60+ CLI recipes (the operating system)
├── MASTER.md                   # THIS FILE — the plan
├── AGENTS.md                   # Agent registry + team patterns
└── README.md                   # Public-facing project docs
```

---

## 📚 Reference Files

| File | Purpose |
|------|---------|
| `README.md` | Public-facing project docs + quick start |
| `AGENTS.md` | AI agent registry + team patterns |
| `DEVELOPER_GUIDE.md` | Setup, architecture, troubleshooting |
| `NETLIFY_BUILD_RULES.md` | Build configuration guardrails |
| `docs/TESTING.md` | Testing guide |
| `docs/LINKEDIN_SETUP.md` | LinkedIn OAuth setup |
| `docs/POSTMAN-POSTBOT.md` | Postman + Postbot SOP |
| `docs/BRANCH_ARCHIVE_CC017.md` | Archived branch metadata |
| `AGENT-OPS.md` | Per-agent CLI handoff + operating rules |
| `docs/ENV-REMOTION.md` | Human-Ops: Remotion Lambda key setup |
| `docs/AGENT-METRICS.md` | Agent teamwork quantification (Five Rings) |
| `plans/AGENT_ASSIGNMENTS.md` | Completed task log |
| `plans/HANDOFF_CLAUDECODE_M9.md` | M9 Claude Code brief (Remotion E2E) |
| `plans/HANDOFF_CLAUDECODE_CC-M9-CP.md` | CC-M9-CP: Add Remotion to control-plane |
| `plans/HANDOFF_CODEX2_CX-018.md` | CX-018: Render Pipeline UI in Diagnostics |
| `plans/HANDOFF_NETLIFY_AGENT.md` | Netlify Agent: deploy + cloud verification |
| `plans/HANDOFF_CLAUDECODE_CC-M9-METRICS.md` | CC-M9-METRICS: Real-time cost in SSE events |
| `plans/HANDOFF_CODEX2_CX-019.md` | CX-019: Wire metrics panel to pipeline cost |
| `.env.example` | v3.0.0 env template with scope labels |

---

## 📜 Version History

| Version | Date | Signed By | Summary |
|---------|------|-----------|---------|
| v1.0.0 | 2025-08 | Copilot | Original pipeline scaffold |
| v1.4.0 | 2025-10 | Copilot | Click2Kick UI + learning loop |
| v2.0.0 | 2025-12 | Copilot | 7 agents + Blobs + Vision AI |
| v2.0.1 | 2025-12-17 | Copilot | Blobs migration + smoke tests |
| v3.0.0 | 2026-02-28 | Windsurf/Cascade (Acting Master) | Control plane, split verdicts, repo hygiene, local fixes |
| v3.1.0 | 2026-03-02 | Windsurf/Cascade (Acting Master) | M7 backend: control-plane.ts + AG-014 receipt + YouTube policy |
| v3.2.0 | 2026-03-02 | Windsurf/Cascade + Codex #2 | M7 complete: /diagnostics UI + SystemStatusEmblem + fast merge |
| v3.3.0 | 2026-03-03 | Windsurf/Cascade + Codex #2 + Claude Code | M8 complete: PlatformToggle.tsx (CX-017) + CC-019 backend + frozen at `0d220f72` |
| v3.4.0 | 2026-03-04 | Windsurf/Cascade (Acting Master) | M8 FROZEN. M9/M10 prep: readiness checker, ENV-REMOTION.md, agent briefs, scope decisions |

---

*This file is the source of truth. Agents must read it before making changes.*

**For the Commons Good** 🎬
