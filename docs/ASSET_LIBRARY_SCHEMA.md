# ASSET LIBRARY SCHEMA — SirTrav A2A Studio

> Asset tracking schema for all produced content in the SirTrav production pipeline.
> Used by all agents to register, retrieve, and reference media assets.
>
> Version: 1.0.0
> Created: 2026-03-25 (Claude Code)

---

## PURPOSE

Every asset produced by SirTrav agents (video clips, images, audio, scripts, social posts) gets registered in this schema. This prevents duplicate production work, enables downstream agents to retrieve prior assets, and feeds the A2A manifest for orchestrated pipelines.

---

## ASSET RECORD SCHEMA

```typescript
interface AssetRecord {
  // ── Identity ────────────────────────────────────────────────
  asset_id:       string;   // Unique ID: e.g. "VID-20260325-001"
  asset_type:     AssetType;
  title:          string;   // Human-readable title
  description:    string;   // One-line description of content

  // ── Production Metadata ─────────────────────────────────────
  created_at:     string;   // ISO 8601 timestamp
  created_by:     AgentLane;
  source_manifest: string | null;  // Path to A2A manifest that produced this
  source_prompt:  string | null;   // Prompt or script used to generate

  // ── File Location ────────────────────────────────────────────
  storage_path:   string;   // Local path or cloud URI
  cdn_url:        string | null;   // Public CDN URL if deployed
  format:         string;   // "mp4", "png", "mp3", "md", "json"
  duration_sec:   number | null;   // Video/audio only
  resolution:     string | null;   // "1920x1080", "1080x1920" etc.

  // ── Status & Usage ───────────────────────────────────────────
  status:         AssetStatus;
  platform:       Platform[];      // Where this asset is intended/used
  post_ids:       string[];        // Social post IDs if published
  tags:           string[];        // Searchable tags

  // ── Versioning ───────────────────────────────────────────────
  version:        number;          // Increment on re-production
  supersedes:     string | null;   // asset_id of prior version
}
```

---

## ENUM DEFINITIONS

```typescript
type AssetType =
  | "video_clip"       // Raw Veo 2 / rendered Remotion clip
  | "video_reel"       // Final assembled reel / short
  | "image_frame"      // Gemini Imagen generated frame
  | "audio_track"      // Suno AI music track or Web Audio export
  | "script"           // Written narrative / voiceover script
  | "social_post"      // Finalized social media copy
  | "thumbnail"        // Platform thumbnail image
  | "manifest"         // A2A JSON manifest file
  | "knowledge_doc"    // Embedded knowledge base document
  | "report";          // Agent-generated report

type AgentLane =
  | "claude-code"      // Backend / edge functions / knowledge base
  | "codex-2"          // Frontend / UI / social copy generation
  | "antigravity"      // QA / validation / harness review
  | "acting-master"    // Orchestration / cross-lane coordination
  | "human-ops"        // Scott — human-produced or approved
  | "gemini-api"       // Direct Gemini API generation (no lane agent)
  | "veo2";            // Google Veo 2 video generation

type AssetStatus =
  | "draft"            // Generated but not reviewed
  | "review"           // Under agent or human review
  | "approved"         // Human-approved, ready for publish
  | "published"        // Live on platform
  | "archived"         // Superseded or deprecated
  | "rejected";        // Failed review, do not use

type Platform =
  | "youtube"
  | "tiktok"
  | "instagram"
  | "linkedin"
  | "x_twitter"
  | "netlify"          // CV site or SirTrav deployed asset
  | "internal";        // Not for external publish
```

---

## ASSET ID FORMAT

```
{TYPE_CODE}-{YYYYMMDD}-{SEQ}

Type codes:
  VID  = video_clip or video_reel
  IMG  = image_frame or thumbnail
  AUD  = audio_track
  SCR  = script
  SOC  = social_post
  MAN  = manifest
  DOC  = knowledge_doc
  RPT  = report

Examples:
  VID-20260325-001    First video produced March 25, 2026
  SOC-20260325-001    First social post copy produced March 25, 2026
  AUD-20260325-001    First audio track produced March 25, 2026
```

---

## ASSET REGISTRY — ACTIVE LIBRARY

> Agents: append to this table when producing new assets. Never delete rows — use `archived` or `rejected` status.

| Asset ID | Type | Title | Status | Platform | Created | Created By |
|----------|------|-------|--------|----------|---------|------------|
| DOC-20260323-001 | knowledge_doc | CHATBOT_KNOWLEDGE_BRIEF.md (full enrichment) | approved | netlify | 2026-03-23 | claude-code |
| VID-20260325-000 | video_reel | (placeholder — first reel pending Veo 2 dry-run) | draft | youtube | — | — |

---

## RETRIEVAL PATTERNS

### By Agent Lane
```bash
# Find all assets created by claude-code
grep "claude-code" ASSET_LIBRARY_SCHEMA.md
```

### By Platform
All assets marked `platform: ["youtube"]` that are `approved` are ready to publish.

### By Status
- **Before posting:** filter `status: approved` AND `platform` includes target
- **Before re-generating:** filter by `title` or `tags` to find existing versions
- **Supersede pattern:** set old record to `archived`, new record `supersedes: OLD_ID`

---

## INTEGRATION POINTS

| System | Role |
|--------|------|
| `A2A_MANIFEST_SCHEMA.md` | Manifests reference `asset_id` fields for produced clips |
| `chat.ts` (CV Edge Function) | `knowledge_doc` assets feed the `RSE_CV_DATA` embedded knowledge |
| `curate-media.ts` | Registers `image_frame` assets after Gemini Imagen generation |
| `STATUS_RUN_INDEX.md` | Production run logs link to `asset_id` references |
| `TEAM_TASK_BOARD_V2.md` | Tickets reference deliverable asset IDs on completion |

---

## NOTES FOR AGENTS

1. **Always check the registry before generating** — avoid duplicate production
2. **Register immediately on DRAFT** — don't wait for approval to log the record
3. **Never delete rows** — use `archived`/`rejected` status to retire assets
4. **Tag generously** — tags are how agents find related assets later
5. **Link source_manifest** — every A2A-produced asset must trace back to its manifest

---

*Schema v1.0.0 — Created by Claude Code — 2026-03-25*
*Companion documents: A2A_MANIFEST_SCHEMA.md, STATUS_RUN_INDEX.md, TEAM_TASK_BOARD_V2.md*
