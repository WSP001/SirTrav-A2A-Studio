# 0006 -- Agent Card Container CSS Overflow Fix (CX-003)

## Priority: P1
## Status: READY
## Assigned To: Codex (Frontend)

## Goal
Fix agent cards overflowing their CSS containers on the dashboard.

## Problem
Agent cards break out of parent bounds, causing horizontal scroll.

## Fix Pattern
```css
.agent-card {
  max-width: 100%;
  overflow: hidden;
  word-wrap: break-word;
}
.agent-card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
```

## Acceptance Criteria
- [ ] Cards contained within parent bounds
- [ ] No horizontal scroll on dashboard
- [ ] Responsive on mobile viewports
- [ ] `npm run build` passes

## Dependencies
None

## References
- `src/components/AgentCard.tsx` (or relevant component)
- `src/App.jsx`
