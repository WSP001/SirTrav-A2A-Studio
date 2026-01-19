# RC1_CHECKLIST.md
> Release Candidate 1 Readiness Checklist

## Overview

This checklist tracks readiness for the first production release of SirTrav-A2A-Studio. All items must be checked before RC1 tag.

---

## 1. Golden Path Verification

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| `verify-golden-path.mjs` passes end-to-end | :white_check_mark: | Automated | - |
| Pipeline returns `status: completed` | :white_check_mark: | Automated | - |
| Invoice included in response | :white_check_mark: | Automated | - |
| SSE progress events stream correctly | :construction: | Manual | - |
| All 7 agents execute in sequence | :white_check_mark: | Automated | - |

**Command**: `node scripts/verify-golden-path.mjs`

---

## 2. Security Handshake

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| `verify-security.mjs` all 3 tests pass | :white_check_mark: | Automated | - |
| No token = 401 response | :white_check_mark: | Automated | - |
| Invalid token = 401 response | :white_check_mark: | Automated | - |
| Valid token = 200 + pipeline starts | :white_check_mark: | Automated | - |
| `flushCredentials()` wipes keys post-pipeline | :construction: | Manual | - |

**Command**: `node scripts/verify-security.mjs`

---

## 3. Cost Plus Manifest

| Item | Status | Verified By | Date |
|------|--------|-------------|------|
| All agents report base costs | :white_check_mark: | Code review | - |
| 20% markup calculated correctly | :white_check_mark: | Unit test | - |
| Invoice included in final response | :white_check_mark: | Golden path | - |
| Invoice schema matches `Manifest` interface | :white_check_mark: | TypeScript | - |

**Verification**:
```bash
# Check invoice in response
curl -X POST http://localhost:8888/.netlify/functions/start-pipeline \
  -H "Authorization: Bearer demo" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test"}' | jq '.invoice'
```

---

## 4. Folder Structure

| Directory | Purpose | Status |
|-----------|---------|--------|
| `inputs/` | User upload staging | :white_check_mark: |
| `output/` | Final video artifacts | :white_check_mark: |
| `artifacts/` | Intermediate pipeline data | :white_check_mark: |
| `artifacts/audio/` | Voice/music files | :white_check_mark: |
| `plans/` | Claude Code plans | :white_check_mark: |
| `.claude/skills/` | Skill definitions | :white_check_mark: |
| `.claude/hooks/` | Automation hooks | :white_check_mark: |
| `mcp-servers/` | MCP server code | :white_check_mark: |
| `docs/skills/` | Skill documentation | :white_check_mark: |

---

## 5. Documentation

| Document | Location | Status |
|----------|----------|--------|
| SKILL_TEMPLATE.md | `docs/skills/` | :white_check_mark: |
| IMAGE_TO_VIDEO_SKILL.md | `docs/skills/` | :white_check_mark: |
| STATUS_RUN_INDEX.md | `docs/` | :white_check_mark: |
| MCP_CONFIG.md | `docs/` | :white_check_mark: |
| RC1_CHECKLIST.md | `docs/` | :white_check_mark: |
| KPIS.md | `docs/` | :white_check_mark: |

---

## 6. Code Quality

| Item | Status | Notes |
|------|--------|-------|
| TypeScript compiles without errors | :construction: | Run `npm run build` |
| ESLint passes | :construction: | Run `npm run lint` |
| No hardcoded credentials | :white_check_mark: | All via env vars |
| Status normalized (`completed` not `complete`) | :white_check_mark: | Fixed in all files |
| Error handling in all agents | :construction: | Review needed |

---

## 7. Testing

| Test Suite | Command | Status |
|------------|---------|--------|
| Golden Path E2E | `node scripts/verify-golden-path.mjs` | :white_check_mark: |
| Security E2E | `node scripts/verify-security.mjs` | :white_check_mark: |
| Unit Tests | `npm test` | :construction: |
| Integration Tests | `npm run test:integration` | :construction: |

---

## 8. Environment

| Variable | Required | Fallback |
|----------|----------|----------|
| `OPENAI_API_KEY` | Production | Placeholder mode |
| `ELEVENLABS_API_KEY` | Production | Placeholder mode |
| `SUNO_API_KEY` | Production | Stock music |
| `NETLIFY_AUTH_TOKEN` | Production | Local dev secret |
| `URL` | Production | `http://localhost:8888` |

---

## 9. Deployment

| Item | Status | Notes |
|------|--------|-------|
| Netlify CLI installed | :construction: | `npm i -g netlify-cli` |
| `netlify.toml` configured | :white_check_mark: | Check functions config |
| Environment variables set in Netlify UI | :construction: | - |
| Background function timeout adequate | :construction: | 15 min for video gen |
| Blob store provisioned | :construction: | - |

---

## 10. Monitoring

| Item | Status | Notes |
|------|--------|-------|
| Error logging to console | :white_check_mark: | All agents log errors |
| Progress events stream via SSE | :construction: | Test in UI |
| Cost tracking in manifest | :white_check_mark: | 20% markup applied |
| Run index persisted to blob store | :white_check_mark: | - |

---

## Pre-Release Actions

1. [ ] Run full Golden Path verification
2. [ ] Run security verification
3. [ ] Review all console warnings
4. [ ] Test with real API keys (not placeholder)
5. [ ] Test SSE progress in frontend
6. [ ] Verify invoice displays correctly
7. [ ] Check video plays in browser
8. [ ] Commit all changes
9. [ ] Tag as `v0.1.0-rc1`

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer | | | |
| QA | | | |
| Product | | | |

---

## Related Documentation
- [KPIS.md](KPIS.md) - Success metrics
- [STATUS_RUN_INDEX.md](STATUS_RUN_INDEX.md) - Pipeline state
- [MCP_CONFIG.md](MCP_CONFIG.md) - Service integration
