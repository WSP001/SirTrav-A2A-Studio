# Security & QA Checklist

Use this quick list before committing or promoting builds to ensure the public engine stays clean and compliant with the private vault separation.

## Core Rules
- **No secrets committed**: run `npm run preflight` or `npm run precommit:secrets` and block any detections.
- **No PII/private data in public artifacts**: never stage `intake/`, raw media, memory indices, secrets, or .env files.
- **Quality gates**: enforce LUFS/file-size/format validation where applicable; fail fast on clipping or oversize assets.
- **Storage permissions minimal**: public outputs should be read-only and signed URLs should expire within 24 hours.
- **Repository split**: keep raw data in **Sir-TRAV-scott** (private); only sanitized engine code and examples live in **SirTrav-A2A-Studio**.

## Files Requiring Security Review
Changes to these files or equivalents need explicit approval from the security team:
- `scripts/sanitized_export.sh`
- `.github/workflows/sanitized-export.yml`
- `netlify/functions/publish.ts`
- `pipelines/scripts/lufs_check.mjs`

> /cc @WSP001/security-team

## Test & Release Checklist
1. `npm ci` (or approved registry via `.npmrc`).
2. `npm run preflight` — secrets scan and quick hygiene checks.
3. `npm run test:runner` — manifest smoke run.
4. `npm run practice:test` — progress/feedback loop dry run.
5. `npm run verify:security` — start-pipeline auth handshake (Netlify Dev or deployed `URL`).
6. Curl probes (Netlify Dev): healthcheck, curate-media, submit-evaluation.
7. Verify storage uploads/downloads if publish is touched.

## Repo-Routing Checks
- Public repo (engine, UI, manifests, docs) **only**.
- Private vault (raw media, memory_index.json, embeddings, secrets) **only**.

Keep the two-terminal workflow: one shell per repo to avoid accidental cross-commits.
