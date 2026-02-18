# 0005 -- Invoice Generation Script (CC-004)

## Priority: P2
## Status: DONE
## Assigned To: Claude Code (Backend)
## Completed: 2026-02-17

## Goal
Create standalone script that generates `.invoice.json` alongside rendered videos, tracking all API costs with 20% Commons Good markup.

## What Was Done
Created `scripts/generate-invoice.mjs`:
1. Accepts video path + optional API costs (inline JSON or file)
2. Generates `<video>.invoice.json` with full cost breakdown
3. Applies 20% Cost Plus markup per service
4. Includes line items, base cost, markup, total
5. `--demo` mode generates example invoice with all 5 pipeline services
6. Associates with projectId and runId for tracing

## Demo Output
```
=== Invoice Generated ===
  Video:      demo-video.mp4
  Project:    demo-project-001
  Run:        demo-run-001

  Cost Breakdown:
    openai_vision        $0.0250 + $0.0050 = $0.0300
    openai_gpt4          $0.0800 + $0.0160 = $0.0960
    elevenlabs_tts       $0.1000 + $0.0200 = $0.1200
    suno_music           $0.0500 + $0.0100 = $0.0600
    remotion_lambda      $0.0200 + $0.0040 = $0.0240
  ----------------------------------------
  Base Cost:          $0.2750
  Markup (20%):       $0.0550
  Total Due:          $0.3300
  Model:              Cost Plus 20% Justified
```

## Acceptance Criteria
- [x] `scripts/generate-invoice.mjs` exists
- [x] Takes video path as argument
- [x] Outputs `.invoice.json` alongside video
- [x] Applies 20% Cost Plus markup
- [x] Handles missing API costs gracefully
- [x] `just invoice-demo` works
