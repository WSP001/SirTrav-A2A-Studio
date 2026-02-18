# Human Operator (Scott) — Environment + Keys

> **Name:** Scott
> **Role:** API Keys, Netlify Dashboard, X Developer Portal, Manual Verification
> **Not a code agent** — you set environment variables and verify browser behavior.

---

## Quick Start — LEAN PROTOCOL v3

```bash
just cycle-next                   # 50 tokens — "ALL PASS" or "Fix X"
just cycle-orient human           # 200 tokens — full ENV VAR checklist
```

### Your Archive Folder

Your Google Drive archive folder contains all refined lines,
old justfile versions, and agent session history.
See `REFINEMENT_ARCHIVE_INDEX.txt` for a full inventory.

---

## Your Tasks (Priority Order)

### ~~1. Fix X/Twitter Keys (P0)~~ DONE!

X/Twitter is LIVE. 3 verified tweets posted.
Cost: $0.001/tweet + 20% Commons Good = $0.0012/tweet.

### 2. Set Remotion Lambda ENV Vars (P1)

In Netlify Dashboard > Site settings > Environment variables:
```
REMOTION_FUNCTION_NAME=remotion-render-4-0-xxx
REMOTION_SERVE_URL=https://remotionlambda-xxx.s3.us-east-1.amazonaws.com/sites/xxx
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

### 3. Codex Trust (P2)

Edit `<USERPROFILE>\.codex\config.toml`:
```toml
[projects.'\\?\<USERPROFILE>\Documents\GitHub\SirTrav-A2A-Studio']
trust_level = "trusted"
```

### 4. Verify Browser

After env vars are set:
1. Open https://sirtrav-a2a-studio.netlify.app
2. Press F12, check console for errors
3. Click the Click2Kick button
4. Watch pipeline progress

---

## After ENV Vars Set

```bash
just cycle-all                         # Re-run all gates
just cycle-status                      # Check gate summary
just healthcheck                       # Verify live health
```
