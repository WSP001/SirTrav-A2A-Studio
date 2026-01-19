# KPIS.md
> Key Performance Indicators for SirTrav-A2A-Studio

## Overview

This document defines the success metrics for the video automation pipeline. KPIs are organized by category and include targets for RC1 and v1.0 releases.

---

## 1. Pipeline Reliability

### Golden Path Success Rate
**Definition**: Percentage of pipeline runs that complete successfully (status = `completed`)

| Metric | RC1 Target | v1.0 Target |
|--------|------------|-------------|
| Success Rate | 90% | 99% |
| Mean Time to Complete | < 5 min | < 3 min |
| Error Recovery Rate | 50% | 80% |

**Measurement**:
```typescript
const successRate = completedRuns / totalRuns * 100;
```

**Data Source**: Run Index (`status` field)

---

### Agent Reliability
**Definition**: Individual agent success rates

| Agent | RC1 Target | v1.0 Target |
|-------|------------|-------------|
| Director | 99% | 99.9% |
| Writer | 95% | 99% |
| Voice | 90% | 98% |
| Composer | 90% | 98% |
| Editor | 85% | 95% |
| Attribution | 99% | 99.9% |
| Publisher | 95% | 99% |

---

## 2. Performance

### Pipeline Latency
**Definition**: Time from request to completed video

| Stage | RC1 Target | v1.0 Target |
|-------|------------|-------------|
| Queue → Running | < 5s | < 2s |
| Director + Writer | < 30s | < 15s |
| Voice Generation | < 60s | < 30s |
| Composer (Images) | < 90s | < 45s |
| Editor (Video) | < 120s | < 60s |
| Attribution + Publish | < 30s | < 15s |
| **Total** | **< 5 min** | **< 3 min** |

**Measurement**:
```typescript
const latency = new Date(run.updatedAt) - new Date(run.createdAt);
```

---

### SSE Responsiveness
**Definition**: Time from agent status change to UI update

| Metric | RC1 Target | v1.0 Target |
|--------|------------|-------------|
| Progress Event Delay | < 2s | < 500ms |
| UI Update Lag | < 1s | < 200ms |
| Heartbeat Interval | 30s | 15s |

---

## 3. Cost Efficiency

### API Cost per Video
**Definition**: Average base cost (before markup) per completed video

| Service | RC1 Target | v1.0 Target |
|---------|------------|-------------|
| OpenAI (GPT-4) | < $0.50 | < $0.30 |
| ElevenLabs (TTS) | < $0.20 | < $0.15 |
| Suno (Music) | < $0.10 | < $0.05 |
| Image Generation | < $0.30 | < $0.20 |
| **Total Base Cost** | **< $1.10** | **< $0.70** |

**With 20% Markup**:
| Metric | RC1 | v1.0 |
|--------|-----|------|
| User Invoice | < $1.32 | < $0.84 |

**Measurement**: Cost Manifest (`subtotal` field)

---

### Cost per Failure
**Definition**: Wasted API spend on failed runs

| Metric | RC1 Target | v1.0 Target |
|--------|------------|-------------|
| Failed Run Cost | < $0.50 | < $0.20 |
| Failure Cost Ratio | < 10% | < 2% |

---

## 4. Quality

### Video Quality Metrics
**Definition**: Output quality indicators

| Metric | RC1 Target | v1.0 Target |
|--------|------------|-------------|
| Resolution | 720p | 1080p |
| Frame Rate | 24 fps | 30 fps |
| Audio Sync Drift | < 500ms | < 100ms |
| Script-to-Audio Match | 95% | 99% |

---

### Quality Gate Pass Rate
**Definition**: Percentage of outputs passing automated quality checks

| Check | RC1 Target | v1.0 Target |
|-------|------------|-------------|
| Script Length | 99% | 99.9% |
| Audio URL Valid | 95% | 99% |
| Video Generated | 90% | 98% |
| No API Errors in Output | 95% | 99.5% |

---

## 5. User Experience

### Dashboard Responsiveness
**Definition**: Frontend performance metrics

| Metric | RC1 Target | v1.0 Target |
|--------|------------|-------------|
| Initial Load Time | < 3s | < 1s |
| Progress Update Render | < 500ms | < 100ms |
| Video Preview Load | < 5s | < 2s |

---

### User Actions
**Definition**: Key user journey success rates

| Action | RC1 Target | v1.0 Target |
|--------|------------|-------------|
| Pipeline Start Success | 95% | 99% |
| Progress Visibility | 80% | 95% |
| Video Download Success | 90% | 99% |
| Invoice Display | 95% | 99.5% |

---

## 6. Security

### Authentication Metrics
**Definition**: Security verification success rates

| Metric | RC1 Target | v1.0 Target |
|--------|------------|-------------|
| Valid Token Accept Rate | 99.9% | 99.99% |
| Invalid Token Reject Rate | 100% | 100% |
| No Token Reject Rate | 100% | 100% |
| Credential Wipe Success | 100% | 100% |

---

## 7. Development Velocity

### Verification Script Health
**Definition**: CI/CD reliability metrics

| Script | RC1 Target | v1.0 Target |
|--------|------------|-------------|
| `verify-golden-path.mjs` | 100% pass | 100% pass |
| `verify-security.mjs` | 100% pass | 100% pass |
| Build Success Rate | 95% | 99% |

---

## Monitoring Dashboard

### Real-Time Metrics
```
┌──────────────────────────────────────────────────────┐
│  SirTrav Pipeline Health                              │
├──────────────────────────────────────────────────────┤
│  Success Rate (24h):  [████████████░░░░] 87%         │
│  Avg Latency:         3m 42s                         │
│  Active Runs:         3                              │
│  Failed (24h):        2                              │
├──────────────────────────────────────────────────────┤
│  Cost (24h)                                           │
│  Base:     $4.52                                      │
│  Revenue:  $5.42 (+20%)                              │
│  Margin:   $0.90                                      │
└──────────────────────────────────────────────────────┘
```

---

## KPI Review Schedule

| Review | Frequency | Owner |
|--------|-----------|-------|
| Daily Health Check | Daily | Automated |
| Cost Analysis | Weekly | Developer |
| Quality Audit | Bi-weekly | QA |
| Full KPI Review | Monthly | Team |

---

## Related Documentation
- [RC1_CHECKLIST.md](RC1_CHECKLIST.md) - Release readiness
- [STATUS_RUN_INDEX.md](STATUS_RUN_INDEX.md) - Pipeline state tracking
- [MCP_CONFIG.md](MCP_CONFIG.md) - Service integration
