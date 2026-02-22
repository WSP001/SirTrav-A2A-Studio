# Agent Ops Spine — Command Matrix & Skill Assignments

> **North Star:** One stable loop: Read → Assign → Verify → Record → Improve
> Only ONE ticket/owner per RED. Every ticket must include: command output + proof + cost.
> Last updated: 2026-02-22

---

## Quick Start (Any Agent)

```bash
just ops-spine-cloud    # Full dry-run verification (cloud)
just ops-spine          # Full dry-run verification (local)
just orient-<role>      # Agent-specific orientation
```

---

## The Only Allowed Command Spine

Run in this order. **If any step is RED, STOP and open ONE ticket.**

| Step | Command | What it checks | Fails → Owner |
|------|---------|----------------|---------------|
| 1 | `just preflight` | Node/npm/just versions, env sanity | HUMAN-OPS |
| 2 | `just healthcheck-cloud` | Deployed site responds, services report truth | HUMAN-OPS |
| 3 | `just x-dry` | X/Twitter contract shape valid | AG-QA |
| 4 | `just linkedin-dry` | LinkedIn contract shape valid | AG-QA |
| 5 | `just youtube-dry` | YouTube contract shape valid | AG-QA |
| 6 | `just golden-path` | End-to-end smoke (auto-detect) | CLD-BE |
| 7 | `just rc1-verify` | Full RC: wiring + NFS + golden-path + dry-runs | WM (Windsurf) |

**Composite commands (run the spine for you):**

| Command | What it runs | When to use |
|---------|-------------|-------------|
| `just ops-spine` | Steps 1-5 (local) | Before any PR |
| `just ops-spine-cloud` | Steps 1-5 (cloud) | After deploy |
| `just ops-release-pass` | Steps 1-7 (local) | Release candidate |
| `just ops-release-pass-cloud` | Steps 1-7 (cloud) | Production RC |
| `just council-flash-linkedin` | Healthcheck + truth-serum + LinkedIn live | LinkedIn proof |

---

## Roles: One Agent = One Skill

### HUMAN-OPS (Scott)

| Field | Value |
|-------|-------|
| **Scope** | Netlify Dashboard, OAuth, secrets, API key rotation |
| **Cannot delegate** | Secret creation, LinkedIn Dev Portal, Netlify env vars |
| **Runs** | `just healthcheck-cloud`, `just ops-spine-cloud`, dry-runs after key changes |
| **RED triggers** | Wrong build settings, auth keys mismatch, OAuth not completed, env vars empty |
| **GREEN proof** | Deployed site loads + `ops-spine-cloud` exits 0 |
| **Ticket prefix** | `HUMAN-OPS-###` |
| **Allowed edits** | `.env`, Netlify Dashboard only — no code files |

**LinkedIn token refresh (every ~60 days):**
1. Open `https://sirtrav-a2a-studio.netlify.app/auth/linkedin/callback`
2. Click Authorize → copy token + URN
3. Paste into Netlify env vars → redeploy
4. Run `just council-flash-linkedin`

---

### WM — Windsurf Master

| Field | Value |
|-------|-------|
| **Scope** | Infrastructure, build config, justfile, deploy pipeline |
| **Runs** | `just wiring-verify`, `just no-fake-success-check`, `just rc1-verify`, `just wm-011` |
| **RED triggers** | Build fails, wiring broken, deploy config wrong, double-install |
| **GREEN proof** | `just rc1-verify` exits 0, deploy < 3 min, cache < 200MB |
| **Ticket prefix** | `WM-###` |
| **Allowed edits** | `justfile`, `netlify.toml`, `vite.config.js`, `package.json`, `scripts/`, `docs/` |

---

### CDX-UI (Codex Frontend)

| Field | Value |
|-------|-------|
| **Scope** | UI behavior, UX, error boundaries, component rendering |
| **Runs** | `just preflight`, `just healthcheck`, `just cycle-gate design_tokens` |
| **RED triggers** | Blank screen, broken dropdowns, invoice overflow, feedback UI not posting |
| **GREEN proof** | UI loads with real bundles + error boundaries show handled errors |
| **Ticket prefix** | `CDX-UI-###` |
| **Allowed edits** | `src/`, `public/`, `src/components/`, `src/App.jsx`, `src/App.css` |

---

### CLD-BE (Claude Code Backend)

| Field | Value |
|-------|-------|
| **Scope** | Pipeline wiring, contracts, cost/quality gates, Netlify functions |
| **Runs** | `just cycle-all`, `just golden-path`, pipeline tests |
| **RED triggers** | Render dispatcher missing, attribution missing, cost manifest missing, fake success |
| **GREEN proof** | `just golden-path` exits 0 + cost manifest emitted + no fake-success |
| **Ticket prefix** | `CLD-BE-###` |
| **Allowed edits** | `netlify/functions/`, `scripts/`, `src/lib/` |

---

### AG-QA (Antigravity Verification)

| Field | Value |
|-------|-------|
| **Scope** | RC verification, contract correctness, dry-run truth |
| **Runs** | `just golden-path`, `just rc1-verify`, `just truth-serum`, `just x-dry`, `just linkedin-dry` |
| **RED triggers** | Missing keys cause FAIL instead of SKIP, flaky checks, non-repeatable pass |
| **GREEN proof** | RC output pasted + failures have repro steps + owner assigned |
| **Ticket prefix** | `AG-QA-###` |
| **Allowed edits** | `scripts/test-*.mjs`, `scripts/verify-*.mjs`, `SOCIAL_MEDIA_QA.md` |

---

## RED → GREEN Rules (No Token Burn)

1. **RED** = command failed OR returned fake success
2. **GREEN** = command output + proof attached in ticket
3. Only the ticket **owner** changes code/settings until GREEN
4. **Conductor** reruns spine from top (or last GREEN step) after fix

---

## Progressive Disclosure Protocol

```
1. Conductor posts status: "RED at step X: <command>"
2. Only the assigned owner speaks/acts
3. Owner posts: command → output → what changed → next command
4. Conductor reruns spine from last GREEN step
5. Repeat until all GREEN
```

---

## Ticket Template

```markdown
**Label:** HUMAN-OPS / WM / CDX-UI / CLD-BE / AG-QA
**Title:** <symptom> (step <N>: <command>)

**RED at:** `<command>`
**Expected:** <truthful behavior>
**Actual:** <error / bad output>
**Repro:** <exact steps>

**Estimate (hrs):**
**Actual (hrs):**
**Tool/API cost:** (if any)
**Invoice tag:** PUBLIC | PRIVATE
**Proof:** <url / artifact path / log snippet>
**Next command:** <next spine command>
```

---

## Current Social Publishing Status (2026-02-22)

| Platform | Status | Proof |
|----------|--------|-------|
| X/Twitter | ✅ WORKING | `truth-serum` → tweetId confirmed |
| LinkedIn | ✅ WORKING | `urn:li:ugcPost:7431201708828946432` |
| YouTube | ⏳ Keys needed | — |
| TikTok | ⏳ Keys needed | — |
| Instagram | ⏳ Keys needed | — |

---

*Commons Good: Building tools that benefit the community.*
