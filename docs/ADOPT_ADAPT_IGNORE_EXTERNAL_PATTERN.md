# Adopt / Adapt / Ignore — External Pattern Audit
> Source: WSP2agent Netlify project deploy log (published 2026-02-20, main@3a7dc6b)
> Evaluated against: SirTrav A2A Studio (this repo)
> Maintained by: Claude Code (backend agent)
> Version: 1.0.0 — 2026-03-10

---

## SUMMARY VERDICT TABLE

| Pattern | Verdict | Risk | SirTrav Location |
|---------|---------|------|-----------------|
| Secret scanning in deploys | **ADOPT** | LOW | `just security-audit` (already exists) |
| Cache discipline / deterministic installs | **ADOPT** | LOW | `package-lock.json` + `NPM_FLAGS` (already exists) |
| No-op deploy awareness | **ADOPT** | LOW | `docs/DEPLOY_INTERPRETATION_GUIDE.md` |
| Split public landing from studio app | **ADAPT** | LOW | Phase 2 — `landing/` dir proposal only |
| Utility tools in a separate layer | **ADAPT** | LOW | Phase 2 — `tools/` dir proposal only |
| Fast deploy / static no-build for main app | **IGNORE** | N/A | SirTrav requires full Vite + Functions build |
| Python utility stack (selenium, pandas, etc.) | **IGNORE** | N/A | Wrong runtime, no proven SirTrav need |
| Netlify extensions (prerender, neon) | **IGNORE** | N/A | No current use case |
| Streamlit / reportlab / scraping stack | **IGNORE** | N/A | Out of scope for studio runtime |

---

## DETAILED AUDIT

---

### Pattern 1 — Secret Scanning in Deploys
**Observed in WSP2agent:** Netlify scans build output and repo code for secrets during each deploy.

**Verdict: ADOPT**
**Risk: LOW**

**Why it matters for SirTrav:**
SirTrav carries 10+ active secrets across providers (OpenAI, Gemini, ElevenLabs, Twitter/X ×4,
LinkedIn ×4, YouTube ×3, Netlify auth, future AWS/Remotion). Any accidental secret commit is
immediately a security incident.

**Current SirTrav state:** Already partially implemented.
```bash
just security-audit    # checks git history for secret patterns, verifies .env is not staged
just repo-hygiene      # blocks dist/, .env, agent-state.json from being staged
npm run verify:security  # tests API_SECRET handshake (401/202)
```

**Action:** Formalize `just security-audit` as a mandatory pre-deploy gate.
See `docs/RELEASE_DISCIPLINE_CHECKLIST.md` for the full gate sequence.

**Files affected:**
- `docs/RELEASE_DISCIPLINE_CHECKLIST.md` (new — documents the gate)
- `justfile` (no change needed — recipe already exists)

---

### Pattern 2 — Cache Discipline / Deterministic Installs
**Observed in WSP2agent:** Fast cache restores, reused dependency installs, no extra churn.

**Verdict: ADOPT**
**Risk: LOW**

**Why it matters for SirTrav:**
SirTrav has 2185+ packages (`npm audit` count). Flaky installs waste build minutes and can
introduce non-deterministic behavior (wrong package version during deploy).

**Current SirTrav state:** Already correct.
```toml
# netlify.toml
[build.environment]
  NPM_FLAGS = "--include=dev"   # deterministic dev dep inclusion
```
```json
# package.json
"build": "npx vite build"       # lockfile-driven, reproducible
```
`package-lock.json` is committed and tracked — Netlify uses it for deterministic installs.

**Action:** No code change needed. Document as a rule: **never `npm install` ad hoc packages
during deploy.** Use `package-lock.json` and keep it clean.

**Files affected:**
- `docs/RELEASE_DISCIPLINE_CHECKLIST.md` (new — captures the rule)

---

### Pattern 3 — No-Op Deploy Awareness
**Observed in WSP2agent:** Deploy log showed `0 new file(s) to upload`, `0 new function(s) to upload`.
This is a "no-op deploy" — no code changed, just env vars or redeploy triggered.

**Verdict: ADOPT**
**Risk: LOW**

**Why it matters for SirTrav:**
This is a common confusion point: "I deployed but nothing changed." The answer is always one of:
1. No new code → Netlify uploads nothing, uses CDN cache
2. Env vars changed → Redeploy needed to pick them up (functions re-execute with new env)
3. Build cache hit → Same output, no upload

**Current SirTrav state:** No documented guidance.

**Action:** Create `docs/DEPLOY_INTERPRETATION_GUIDE.md` — a short reference for interpreting
what deploy log states actually mean.

**Files affected:**
- `docs/DEPLOY_INTERPRETATION_GUIDE.md` (new)

---

### Pattern 4 — Split Public Landing from Studio App
**Observed in WSP2agent:** Separate publish path (`landing/`), build command `echo 'Static site - no build needed'`.

**Verdict: ADAPT (Plan only — Phase 2)**
**Risk: LOW when done in a separate directory**

**Why it might matter for SirTrav:**
A lightweight public-facing surface for SirTrav would be useful for:
- Marketing page (what the system does)
- Public proof receipts (LinkedIn dry-run verified, pipeline operational)
- YouTube showcase (what the pipeline produces)
- Operator docs for external collaborators

**What NOT to do:** Do not replace the main app with this. SirTrav studio requires:
- React/Vite build (`npm run build`)
- Netlify Functions (7-agent pipeline)
- Progress tracking (SSE)
- Diagnostics dashboard

**Proposed structure (Phase 2 only — do not implement now):**
```
SirTrav A2A Studio
├── src/                    ← Studio app (unchanged)
├── netlify/functions/      ← Pipeline backend (unchanged)
├── landing/                ← NEW: public-facing lightweight site
│   ├── index.html          ←   marketing / proof showcase
│   └── docs/               ←   public operator docs
└── tools/                  ← NEW: content mining, ETL, ideation helpers
```

**Action:** No implementation now. Captured as a future proposal.
If Scott approves Phase 2, a new ticket should scope the `landing/` directory and a
separate Netlify site config for it.

---

### Pattern 5 — Utility Tools in a Separate Layer
**Observed in WSP2agent:** Python/Streamlit tools for scraping, reporting, ETL live alongside the app.

**Verdict: ADAPT (Concept only — applies to SirTrav with Node.js)**
**Risk: LOW if kept separate**

**Why it matters for SirTrav:**
SirTrav has content mining needs that are NOT part of the runtime app:
- Google Drive analysis (intake for worldseafood@gmail.com footage)
- YouTube ideation ETL (concept YAML generation)
- Report generation (proof receipts, metrics exports)
- KPI dashboards

These should NOT be in `netlify/functions/` (the production pipeline).

**Proposed structure (Phase 2 only):**
```
tools/
├── intake/        ← Google Drive / OneDrive content ETL scripts
├── ideation/      ← YouTube concept YAML generator
├── reports/       ← KPI dashboards, metrics exports
└── analytics/     ← Channel performance analysis
```
All Node.js (not Python), keeping runtime deps separate from app deps.

**Action:** No implementation now. Document as Phase 2 intent.

---

### Pattern 6 — Static No-Build for Main App
**Observed in WSP2agent:** `echo 'Static site - no build needed'` as build command.

**Verdict: IGNORE**
**Risk: N/A**

**Why:**
SirTrav requires:
```toml
[build]
  command = "npm run build"    # ← Vite + TypeScript compilation required
  publish = "dist"
  functions = "netlify/functions"  # ← 7-agent Lambda pipeline required
```
Replacing this with a no-build command would break the entire studio. This pattern only fits
a separate public/docs site, not the main app.

---

### Pattern 7 — Python Utility Stack
**Observed in WSP2agent:** `selenium`, `streamlit`, `serpapi`, `pandas`, `reportlab`,
`google-api-python-client`, `openpyxl`, etc.

**Verdict: IGNORE**
**Risk: N/A**

**Why:**
SirTrav is a Node.js/TypeScript project. Its pipeline runs on Netlify Functions (Node runtime).
Adding a Python stack would:
- Introduce a second runtime to maintain
- Duplicate capabilities already available in Node.js
- Increase build complexity with no proven benefit

If a Python tool is specifically needed for a workflow, it should live in a completely
separate repo/project, not in SirTrav's dependency tree.

---

### Pattern 8 — Netlify Extensions (Prerender, Neon DB)
**Observed in WSP2agent:** Netlify extensions referenced in deploy logs.

**Verdict: IGNORE**
**Risk: N/A**

**Why:**
- **Prerender:** SirTrav is a private studio app, not a public SEO-crawled site. Prerendering
  adds no value for an authenticated pipeline dashboard.
- **Neon DB:** SirTrav uses Netlify Blobs for ephemeral run state, not a relational database.
  No current use case for Neon.

Adopt only when there is a concrete, proven need. Don't add extensions because another
project uses them.

---

## WHAT DOES NOT EXIST YET (Gaps to close)

| Gap | Priority | Who | How |
|-----|----------|-----|-----|
| No formal release discipline doc | HIGH | Claude Code | `docs/RELEASE_DISCIPLINE_CHECKLIST.md` |
| No deploy interpretation guide | MEDIUM | Claude Code | `docs/DEPLOY_INTERPRETATION_GUIDE.md` |
| No `landing/` public surface | LOW | Phase 2 | Requires new Netlify site config |
| No `tools/` content mining layer | LOW | Phase 2 | Separate tooling project |
| OneDrive ETL not automated | LOW | Future | Manual upload still required |

---

## ONE-LINE SUMMARY

> Adopt secret scanning discipline and no-op deploy awareness.
> Adapt the public/private separation concept into a Phase 2 plan.
> Ignore the static-site architecture, Python stack, and unused extensions.
> SirTrav already has all the gates — document them, don't rebuild them.
