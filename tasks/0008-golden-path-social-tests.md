# 0008 -- Golden Path Social Media Tests (AG-008)

## Priority: P1
## Status: ✅ DONE (2026-01-31)
## Assigned To: Antigravity (Testing)

## Goal
Extend golden path verification to include social media contract tests.

## Deliverables
1. Update `scripts/verify-golden-path.mjs` with social platform checks
2. Create `.github/workflows/social-media-tests.yml` CI workflow
3. Add No Fake Success assertion to all publisher tests

## Test Cases
- Each disabled publisher returns `{ success: false, disabled: true }`
- Each configured publisher returns real post ID
- Healthcheck accurately reflects platform status
- No `success: true` with `status: 'placeholder'` anywhere

## Acceptance Criteria
- [ ] `just golden-path-full` includes social checks
- [ ] CI workflow runs on PR
- [ ] No Fake Success assertion passes
- [ ] All 5 platforms tested (even if disabled)

## Dependencies
- 0003 (No Fake Success audit must be done first) - DONE

## References
- `scripts/verify-golden-path.mjs`
- `scripts/validate-social-contracts.mjs`
