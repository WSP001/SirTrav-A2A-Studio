# PR Split Plan — `claude/trusting-hamilton`

## Goal
De-risk merge of PR #10 by splitting into four focused PRs with explicit ownership and acceptance gates.

Source PR: https://github.com/WSP001/SirTrav-A2A-Studio/pull/10

## Slice A — UI Critical (Codex #2)
- **Owner:** Codex #2
- **Candidate commits:**
  - `1a57275a` feat(ui): social publish wiring + copy link + live docs/vault links
  - Follow-up commit in this branch: invoice-driven metrics, publish status badges, week utility refactor
- **Files (expected):** `src/App.jsx`, `src/utils/date.js`
- **Gate:** `npm run build` + manual publish-button payload smoke check

## Slice B — Governance
- **Owner:** Windsurf Master
- **Candidate commit:**
  - `8935004b` chore(governance): ticket-status + pre-merge guard discipline
- **Files (expected):** `justfile`, governance docs touched by that commit
- **Gate:** `just ticket-status` and `just pre-merge-guard`

## Slice C — Team Docs
- **Owner:** Windsurf + Program Ops
- **Candidate commits:**
  - `850fdbaf` docs: handoff bundle + governance rationale + worktree flow + X test plan + merge checklist
  - `7be9a533` docs: team knowledge base + hard lines + GSD/PAUL playbook + snapshot
  - `1b8997fc` docs(tasks): ledger gate task spec
- **Files (expected):** docs-only and task specs
- **Gate:** docs link/consistency check + no code diffs

## Slice D — Infra/Devkit
- **Owner:** Windsurf Master
- **Candidate commit:**
  - `e6088a1d` feat(windsurf): WM-012 DevKit + Path Guard + Machine Health
- **Files (expected):** `devkit-spinup.ps1`, `scripts/verify-devkit.mjs`, `scripts/check-machine-health.mjs`, `scripts/fix-recursive-nest.mjs`, related justfile/package scripts
- **Gate:** `just devkit-quick` + `just machine-health`

## Recommended Sequencing
1. Merge Slice A (customer-visible fix lane)
2. Merge Slice B (governance safety rail)
3. Merge Slice C (documentation consolidation)
4. Merge Slice D (infrastructure support)

## Operational Rules
- No mega-PR updates against #10 once slicing starts.
- Each slice branch must contain only relevant files.
- Branch truth format in all updates: `branch + SHA + PR URL`.
- Security updates tracked independently under `SEC-001`.
