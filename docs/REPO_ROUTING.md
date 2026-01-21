# Repo Routing Guide

This project uses two repositories that must remain strictly separated:

- **Public (SirTrav-A2A-Studio)** – engine code, manifests, docs, UI, and sanitized sample data only.
- **Private (Sir-TRAV-scott)** – raw intake media, generated artifacts, memory vault data, and any credentials or evaluation outputs that contain PII.

## What goes where
- **Public repo**
  - Netlify functions, pipeline scripts, React UI, manifest templates, schema docs.
  - Synthetic or sanitized samples (never raw captures).
  - CI workflows, security policies, testing/playbook docs.
- **Private repo**
  - `intake/**`, raw media drops, and per-run outputs prior to sanitization.
  - `memory_index.json` (real memory), embeddings, eval logs, and any secrets.
  - Sanitized-export automation to push safe aggregates into the public repo.

## Guardrails
- Never copy files directly from the private vault into this public repo without an explicit sanitize/export step.
- Do not commit `.env`, credentials, or raw media; the privacy scan CI will block these patterns.
- Use Git LFS for any large media that must be stored temporarily during development.

## Pre-commit checklist (public repo)
1. `npm run preflight` – secret scan + basic hygiene checks.
2. `npm run test:runner` – manifest smoke test.
3. `npm run practice:test` – progress + feedback loop exercise (no external credits).
4. Verify changes belong in the public repo (code/docs/sanitized samples only).

## Pre-commit checklist (private repo)
- Run equivalent secret scans and ensure no public-only files are introduced.
- Keep intake outputs and memory data confined; use a sanitized-export workflow to share safe artifacts.

Keeping the routing disciplined prevents accidental leaks and keeps the public build reproducible.
