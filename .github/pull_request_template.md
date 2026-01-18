# SirTrav PR Safety Check
*Please confirm the following before requesting a review. This keeps our public/private split secure and our pipeline consistent.*

## 1. The Shared QA Gate (Local Checks)
- [ ] **Preflight Passed:** I ran the safety + secrets scan (and `npm run lint`).
- [ ] **Runner Smoke Test:** Validated the code runs locally without immediate crashing.
- [ ] **Practice Test:** Ran the end-to-end stub flow (as per `docs/TESTING.md`).

## 2. Roadmap & Routing Alignment
- [ ] **No Conflict:** This change does not contradict `docs/PROJECT_GAPS.md` (specifically public/private split or storage constraints).
- [ ] **Correct Repo:**
    - *Public:* Code, UI, Manifests, Docs
    - *Private:* Raw media, memory logs, secrets
- [ ] **Manifest Flow:** Confirmed pipeline steps are wired in the correct order.

## 3. Security & "Definition of Done"
- [ ] **No secrets committed** (`npm run precommit:secrets` or equivalent)
- [ ] **No PII/private data** exposed in public artifacts
- [ ] **Quality gates enforced** (LUFS, file size, format validation)
- [ ] **Storage permissions minimal** (read-only public access where appropriate)
- [ ] **Signed URL expiry reasonable** (≤ 24 hours)
- [ ] **Definition of Done:** If this is a top-priority task (SSE, Storage, Attribution), I have met the explicit criteria in the project gaps doc.

## Changes Summary

<!-- Describe what this PR changes and why -->

## Testing

- [ ] **Local testing** completed (`npm run preflight`)
- [ ] **Quality gate tests** pass (if applicable)
- [ ] **Storage upload/download** tested (if applicable)

## Security Review Required?

Changes to these files **require security team approval**:

- `scripts/sanitized_export.sh`
- `.github/workflows/sanitized-export.yml`
- `netlify/functions/publish.ts`
- `pipelines/scripts/lufs_check.mjs`

/cc @WSP001/security-team

---
*By submitting this PR, I certify that I have followed the SirTrav consistency path.*
