# 0007 -- U2A Social Media Toggle Switches (CX-001)

## Priority: P1
## Status: READY
## Assigned To: Codex (Frontend)

## Goal
Create social media publisher toggle component showing real platform status from healthcheck.

## Deliverable
`src/components/SocialMediaPublisher.tsx`

## Requirements
- Toggle switch for each platform (YouTube, X, Instagram, TikTok, LinkedIn)
- Visual states: ON (green), PENDING (yellow), OFF (gray), MISSING (red)
- Fetch real status from `/api/healthcheck` on mount
- Disable toggle when platform returns `disabled: true`
- No hardcoded fake statuses

## Acceptance Criteria
- [ ] All 5 platforms displayed with correct status colors
- [ ] Toggle disabled when platform status is MISSING/disabled
- [ ] Healthcheck called on component mount
- [ ] No fake success in UI
- [ ] `npm run build` passes

## Dependencies
None (healthcheck already returns platform status)

## References
- `netlify/functions/healthcheck.ts` (backend)
- `docs/U2A_ARCHITECTURE.md`
