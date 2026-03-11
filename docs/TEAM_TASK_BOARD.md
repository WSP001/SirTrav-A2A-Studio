# TEAM TASK BOARD — Live Operating State

> **One-line command:** Review Codex #2 truthfully, freeze live fire, stay Gemini-first, merge only after PASS, then build the Producer Brief Box and prove YouTube dry-run.
>
> Updated: 2026-03-10
> Board owner: Human-Ops (Scott)

---

## LIVE FIRE FREEZE 🔴

```
RULE: No live social posting until harness review is complete.
- dry-run: ALLOWED
- live fire: REQUIRES explicit human approval of exact payload
- applies to: ALL agents, ALL platforms
```

**Proven live (before freeze):**

| Platform | Post ID | Status |
|----------|---------|--------|
| X/Twitter | `2031156358255394879` | ✅ Posted live |
| LinkedIn | `urn:li:ugcPost:7436922101518917632` | ✅ Posted live |
| YouTube | — | ⏳ Dry-run pending |

---

## MARK — Current State ✅

| Check | Status | Evidence |
|-------|--------|----------|
| Build passes | ✅ | 1357 modules, 2.89s, zero errors |
| 36 functions deployed | ✅ | Netlify deploy log confirms |
| Live fire frozen | ✅ | This board is the freeze order |
| AWS/Remotion deprioritized | ✅ | `remotion.configured: false` — deferred per HO-007 |
| Gemini-first path active | ✅ | `curate-media.ts` pivoted at `8a093590` |
| All 18 Netlify env vars set | ✅ | Scott confirmed via Dashboard |
| LinkedIn dry-run PASS | ✅ | `configured=true, validated=true` |
| X/Twitter dry-run PASS | ✅ | `configured=true, validated=true` |
| Lighthouse scores | ✅ | Perf:78 Access:84 BestPrac:100 SEO:83 |
| NoFakeSuccess violations fixed | ✅ | `8a093590` — real `existsSync()` checks |

---

## GET SET — Review In Progress

### 1. Codex #2 PR Review

```yaml
owner: Antigravity + Master
target: verify Codex #2 changes before anyone builds on them
verdict_options:
  PASS: merge
  HOLD: fix specific issues then re-review
  REJECT: do not merge, revert or replace with smaller ticket
```

**Review scope:**

| File | Lane | What to Check |
|------|------|---------------|
| `src/App.jsx` | Frontend | Metrics wiring honest, no fake "ready" |
| `src/components/PipelineProgress.tsx` | Frontend | SSE progress works, polling fallback works |
| `docs/CODEX2_RED_TO_GREEN_BOARD.md` | Ops | Exists, truthful, no phantom claims |
| `docs/CODEX1_TAKEOVER_PROTOCOL.md` | Ops | Exists, lane boundaries correct |
| `docs/MASTER_AUDIT_PRESERVATION_PLAN.md` | Ops | Exists, safety boundaries intact |

**Pass criteria:**

- [ ] `npm run build` passes
- [ ] Metrics UI is honest (no hardcoded values)
- [ ] SSE progress streaming still works
- [ ] Polling fallback still works
- [ ] Invoice completion renders real `totalDue`
- [ ] No fake "ready" language in UI
- [ ] No broken launch flow
- [ ] No frontend code touching backend functions

---

## GO — After Review

### If PASS → Execute this sequence:

```
1. Merge Codex #2 PR
   Owner: Master
   Command: gh pr merge <PR#> --squash

2. Assign CX-021 Producer Brief Box
   Owner: Codex #2
   What: Pre-kickoff steering UI — topic, tone, audience, platform,
         must-include, avoid, projected cost
   Why: "The missing thing is a chat box that lets you steer the run"

3. YouTube dry-run truth check
   Owner: Claude Code
   Checks:
   - does publisher validate honestly in dry-run?
   - does it return real expected response shape?
   - does it expose final artifact path honestly?
   - does it distinguish "prepared" from "published"?

4. LinkedIn milestone post (after freeze lifts)
   Owner: Human-Ops (Scott)
   Profile: linkedin.com/in/roberto-scott-echols001
   Content: Milestone announcement with YouTube link
   Rule: Human approves exact payload before fire
```

### If HOLD:

```
1. Codex fixes ONLY listed issues
2. Re-review same scope
3. Then merge
```

### If REJECT:

```
1. Do not stack more work on it
2. Revert or replace with smaller ticket
3. Reassess lane assignments
```

---

## AGENT LANES — Who Does What Next

### Claude Code (Backend Only)

```yaml
status: HOLDING — waiting for review verdict
ready_tasks:
  - verify YouTube dry-run path (item #6)
  - fix any backend contract bugs found by review
  - improve projected invoice / cost contract if frontend needs it
  - tighten NoFakeSuccess receipts
forbidden:
  - frontend code (React, JSX, CSS)
  - live fire posting (freeze active)
  - new features without ticket
```

### Codex #2 (Frontend Only)

```yaml
status: PR UNDER REVIEW
next_if_pass:
  ticket: CX-021
  name: "Producer Brief Box"
  scope:
    - pre-kickoff steering UI component
    - fields: topic, tone, audience, platform target, must-include, avoid
    - estimated cost hint display
    - projected public/private cost display
  why: "Most useful next UI feature — lets Scott steer the run"
forbidden:
  - backend functions
  - API key handling
  - live publisher calls
```

### Antigravity (Verifier)

```yaml
status: REVIEWING Codex #2 PR
tasks:
  - review App.jsx metrics wiring for honesty
  - review PipelineProgress.tsx SSE + polling
  - issue PASS / HOLD / REJECT verdict
  - post-merge: verify YouTube dry-run with Claude
forbidden:
  - writing product code
  - live fire posting (freeze active)
```

### Copilot (Frontend Tactical)

```yaml
status: LANE CLEAR — all work landed
delivered:
  - CX-019 metrics wiring (597294bf)
  - Ken Burns cinematic engine (597294bf)
  - .gitignore cleanup (ddb8e40b)
next: standby until CX-021 or new frontend ticket
```

### Human-Ops (Scott)

```yaml
status: STEERING
responsibilities:
  - approve/reject Codex PR verdict
  - approve exact payload before any live fire
  - LinkedIn milestone post (after freeze lifts)
  - YouTube channel content from worldseafood@gmail.com Drive
  - stay focused on ONE path (Gemini-first, not AWS)
self_note: "Who is blocking who is mostly me getting in the way"
```

---

## PRODUCTION PATH — Gemini-First

```yaml
active_path: Gemini-first
deprecated: AWS / Remotion (BYPASS — deferred per HO-007)

what_gemini_does_now:
  - content direction (Agent 1: curate-media.ts)
  - narration / scripting (Agent 2: narrate-project.ts, Flash First chain)
  - image / prompt generation (vision analysis)
  - proof-first short-form tests

what_is_NOT_blocked:
  - Writer agent (always succeeds via template fallback)
  - Voice agent (ElevenLabs keys configured)
  - Composer agent (Suno fallback works)
  - Attribution agent (always works)
  - Publisher agent (LinkedIn ✅, X/Twitter ✅, YouTube ⏳)

what_IS_blocked:
  - Full video render (Remotion — deferred, not a blocker tonight)
  - TikTok publisher (video_url mapping bug at line 175)
  - Instagram publisher (not yet wired)
```

---

## PROOF RECEIPTS

| Date | What | Result | Evidence |
|------|------|--------|----------|
| 2026-03-09 | LinkedIn dry-run | PASS | `configured=true, validated=true, dryRun=true` |
| 2026-03-09 | X/Twitter dry-run | PASS | `configured=true, validated=true, dryRun=true` |
| 2026-03-09 | X/Twitter LIVE | ✅ | tweetId `2031156358255394879` |
| 2026-03-09 | LinkedIn LIVE | ✅ | ugcPost `7436922101518917632` |
| 2026-03-09 | YouTube dry-run | ⏳ | Pending — Claude's next task |
| 2026-03-09 | Control plane health | YELLOW | `storage=ok, ai=available, publishers=3/3, remotion=disabled` |
| 2026-03-09 | Build | GREEN | 1357 modules, 0 errors, 2.89s |
| 2026-03-09 | Netlify deploy | GREEN | 36 functions, 50s build, Lighthouse scored |

---

## KNOWN BUGS (Backlog)

| Bug | File | Line | Owner | Priority |
|-----|------|------|-------|----------|
| TikTok `video_url` mapping | `publish-tiktok.ts` | 175 | Claude Code | LOW (TikTok deprioritized) |
| Hardcoded memory path | `narrate-project.ts` | — | Claude Code | MEDIUM |
| Hardcoded memory path | `generate-music.ts` | — | Claude Code | MEDIUM |
| 7 Dependabot alerts | `netlify-cli` subtree | — | Upstream | LOW (dev-only) |
| PWA score 20 | Lighthouse | — | Codex #2 | LOW |

---

*Board maintained by Claude Code. Updated after each team action.*
*For the Commons Good* 🎬
