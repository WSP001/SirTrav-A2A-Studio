# Branch Archive — CC-017 Repo Hygiene

**Archived by:** Claude Code
**Date:** 2026-02-28
**Reason:** Stale branches cleaned per CC-017 assignment. All unique content documented below before deletion.

---

## Fully Merged (ahead: 0) — Safe Delete, No Unique Content

| Branch | Last Commit | Author | Date |
|--------|-------------|--------|------|
| `dependabot/npm_and_yarn/npm_and_yarn-4846e4b898` | `c241f95` chore(deps): bump npm_and_yarn group | dependabot | 2026-02-12 |
| `feature/WSP-6-ledger-gate` | `f3c2db5` feat(backend): CLD-BE-OPS-002 Ledger Gate | Roberto@WSP | 2026-02-23 |
| `feature/WSP-7-persona-vault-restore` | `3a6e69d` docs: ARCHITECTURE.md definitive system architecture | Roberto@WSP | 2026-02-24 |
| `thirsty-davinci` | `d21d401` fix: npm install --include=dev for vite in prod | Roberto@WSP | 2026-02-02 |

---

## Branches With Unique (Unmerged) Commits — Archived Content

### claude/trusting-hamilton (20 unique commits)
**Notable content:** Full team knowledge base, hard lines, GSD/PAUL playbook, governance rationale, worktree flow, X test plan, DevKit spinup, Council Flash, cycle gate v3, PR review fixes, Click2Kick backend spec. This was the main development branch for WSP-7 through WSP-16.

Key commits:
- `104a303` feat(program): completion artifacts and UI follow-up hardening
- `1a57275` feat(ui): wire social publish actions, copy link, live docs/vault links
- `7be9a53` docs: team knowledge base + hard lines + GSD/PAUL playbook + system snapshot
- `850fdba` docs: HANDOFF bundle + governance rationale + worktree flow + X test plan
- `8935004` chore(governance): enforce Linear ticket alignment + pre-merge guard discipline
- `e6088a1` feat(windsurf): WM-012 DevKit Spinup + Path Guard + Machine Health + Emergency Fixer
- `5b133a4` feat(windsurf): WM-010 Council Flash v1.5.0 refinement
- `d60e36a` feat(infra): Cycle gate system v3 + agent skill docs + lean protocol

### copilot/scaffold-d2a-video-pipeline (12 unique commits)
**Notable content:** Original pipeline scaffolding — MASTER plan, 7 agent functions, Creative Hub UI, manifest executor, progress tracking with SSE. This is the OG pipeline architecture.

Key commits:
- `2f97a5b` docs: MASTER plan, developer guide, pipeline infrastructure
- `deecf2d` feat: attribution/evaluation functions + wire CreativeHub to start-pipeline
- `4af0a99` feat(agents): add 7th Attribution Agent + User Feedback Loop
- `b82fcc8` feat(progress): create progress tracking function with SSE streaming
- `6c1a513` feat(manifest): manifest executor + dev infrastructure

### feat/progress-blobs (11 unique commits)
**Notable content:** Creative Brief + User Preferences onboarding, real agent pipeline (no mocks), Click2Kick demo with real test video, LinkedIn publishing, blob store helper.

Key commits:
- `fadc0e4` feat: Creative Brief + User Preferences onboarding
- `9bf80ac` feat: Connect frontend to REAL backend pipeline v2.0.0
- `9b047e0` feat: REAL agent pipeline - no more mocks
- `1993ad8` fix: CORS + real 10MB test video for Click2Kick demo
- `a8e17cb` feat: getConfiguredBlobsStore helper for Netlify Blobs credentials

### claude/eloquent-boyd (4 unique commits)
**Notable content:** DevKit spin-up suite, AgentSkillRouter, social index sync, quality-gates healthcheck fix.

Key commits:
- `2f94a21` feat(devkit+router): DevKit spin-up suite + AgentSkillRouter worktree layer
- `6d37c3d` docs(ops): sync social index and assignments summary
- `c5040e0` ci: retrigger quality-gates with --skip-healthcheck fix

### claude/merge-main-progress-blobs-Noplt (4 unique commits)
**Notable content:** Enterprise PR checklist, ESLint enforcement, Golden Path refinements, blob wiring for local dev.

Key commits:
- `7009747` chore: remove node_modules from git tracking
- `88c1a6d` feat: Enterprise Grade PR checklist + ESLint enforcement
- `0f60731` feat: Enterprise Golden Path refinements + test scripts
- `b82fcc8` fix(blobs): wire NETLIFY_SITE_ID/TOKEN for local dev

### claude/add-upload-intake-function-p5Z23 (2 unique commits)
**Notable content:** Real file upload with Netlify Blobs context, Production Pipeline v3.0 with real agent execution.

Key commits:
- `151bac6` fix: Netlify Blobs context + real file upload
- `6144d0e` feat: Production Pipeline v3.0 - Real Agent Execution (No Mocks)

### codex/classify-repository-contents-and-enforce-policy (1 unique commit)
- `7bba57c` Wire launchpad kickoff and polish intake UI

### codex/fix-ui-issues-in-agent-cards (1 unique commit)
- `99b0d5f` fix(ui): remove duplicate pipelineMode key

---

## Retrieval Instructions

If any branch content is needed after deletion, use the commit SHAs above:
```bash
# View a specific commit
git show 104a303

# Cherry-pick a commit onto current branch
git cherry-pick 104a303

# Create a branch from an old commit (if still in reflog/remote cache)
git checkout -b recovery/branch-name COMMIT_SHA
```

Note: Remote branches are pruned but commit objects remain in GitHub's reflog for ~90 days.

---

*For the Commons Good*
