# 0009 -- Invoice Display Dashboard (CX-002)

## Priority: P2
## Status: BLOCKED
## Assigned To: Codex (Frontend)
## Blocked By: 0005 (invoice script must exist first)

## Goal
Display invoice data from pipeline results in a dashboard component.

## Deliverable
`src/components/InvoiceDashboard.tsx`

## Requirements
- Display: video path, size, base cost, markup, total
- Format currency to 4 decimal places
- Show Cost Plus 20% breakdown visually
- Download button for `.invoice.json`

## Acceptance Criteria
- [ ] Invoice data fetched and displayed
- [ ] Cost Plus 20% breakdown visible
- [ ] Download button for invoice JSON
- [ ] `npm run build` passes

## Dependencies
- 0005 (Invoice generation script)
