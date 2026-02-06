# NETLIFY BUILD RULES — SirTrav A2A Studio
> **Owner:** Roberto002 (WSP001)  
> **Last Updated:** 2026-02-06 (v2 — Windsurf Master verified)  
> **Enforcement:** ALL agents and humans MUST follow these rules. No exceptions.

---

## 1. One True Source of Truth

| Field | Value |
|-------|-------|
| **GitHub Repo** | https://github.com/WSP001/SirTrav-A2A-Studio |
| **Local Working Copy** | `C:\Users\Roberto002\Documents\GitHub\SirTrav-A2A-Studio\` |
| **Netlify Site** | https://sirtrav-a2a-studio.netlify.app |

Other copies (OneDrive, Google Drive, WSP001 mirror) are **backups only** and must **never** be edited directly.

---

## 0. Who May Touch Build Settings

- **Only:** Netlify Platform Engineer, Release Manager, or Roberto002 (WSP001).
- **No agent** (Codex, Claude, Antigravity, X Agent) may change Netlify UI build settings without a ticket.
- Build config lives in `netlify.toml` and `vite.config.js`. Netlify UI **must mirror** these values.

---

## 2. Netlify Build Settings (AUTHORITATIVE)

These are the **only** correct settings. Any deviation causes a blank page.

### netlify.toml (repo)
```toml
[build]
  command = "npm install --include=dev && npm run build"
  publish = "dist"
  functions = "netlify/functions"
```

### Netlify Dashboard (must match)
| Setting | Correct Value |
|---------|---------------|
| **Build command** | `npm install --include=dev && npm run build` |
| **Publish directory** | `dist` |
| **Production branch** | `main` |

### Vite Config (must match)
```js
build: {
  outDir: "dist",
}
```

### FORBIDDEN Settings
| Setting | Forbidden Value | Why |
|---------|----------------|-----|
| Build command | `echo 'Static site - no build needed'` | Serves stale committed assets |
| Build command | `npm ci && npm run build` | `npm ci` fails on Netlify when lockfile drifts — use `npm install` |
| Publish directory | `landing` | Dual-source deploy causes stale index.html |
| outDir | `"landing"` | Must match publish directory = `dist` |

**No agent or human may change these settings without an explicit ticket and review.**

---

## 3. How to Config netlify.toml for React Vite SPA Routing

```toml
[build]
  command = "npm install --include=dev && npm run build"
  publish = "dist"
  functions = "netlify/functions"

[build.environment]
  NODE_VERSION = "22"

# SPA fallback — ALL routes serve index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Also place a `public/_redirects` file (copied to `dist/` at build time):
```
/.netlify/*  /.netlify/:splat  200
/*           /index.html       200
```

**Why both?** The `_redirects` file takes precedence over `netlify.toml` redirects. Having both ensures SPA routing works regardless of dashboard overrides.

---

## 4. What Directory to Publish for Vite Build on Netlify

| Config File | Setting | Value |
|-------------|---------|-------|
| `vite.config.js` | `build.outDir` | `"dist"` |
| `netlify.toml` | `publish` | `"dist"` |
| Netlify Dashboard | Publish directory | `dist` |

**All three MUST agree.** If they don't, you get a blank page.

The `dist/` folder is gitignored (as it should be). Netlify builds it fresh on every deploy. Never commit build output to git.

---

## 4b. Storage Mode

- **Production target:** Netlify Blobs via `NETLIFY_BLOBS_CONTEXT` (auto-injected).
- **Fallback (Lambda only):** `/tmp` (never `/var/task` — it is read-only on Lambda).
- Every function should log one line: `storage_mode=blobs|tmp` (for debugging, no secrets).

---

## 5. Fix MIME Type Error / Module Script for Netlify Deploy

### Symptom
```
Failed to load module script: Expected a JavaScript module script
but the server responded with a MIME type of "text/html"
```

### Cause
The JS file URL returns `index.html` instead of the actual JS file. This happens when:
- Publish directory is wrong (serving old/missing assets)
- SPA redirect catches asset requests (missing `/.netlify/*` passthrough)
- Build output doesn't match what `index.html` references

### Fix Checklist
1. Verify `publish = "dist"` in `netlify.toml`
2. Verify `outDir: "dist"` in `vite.config.js`
3. Verify `_redirects` has `/.netlify/*` passthrough BEFORE the `/*` catch-all
4. Run `npm run build` locally and confirm `dist/assets/` contains `.js` and `.css` files
5. Confirm Netlify Dashboard publish directory matches

---

## 6. Check Netlify Deploy Logs for React Blank Page

### Step-by-step
1. Go to https://app.netlify.com/projects/sirtrav-a2a-studio/deploys
2. Click the latest deploy
3. Check the **Deploy log** for:
   - Build command: `npm install --include=dev && npm run build` (NOT `echo 'Static site...'`)
   - `Publish directory: dist` (NOT `landing`)
   - `✓ built in X.XXs` from Vite
   - `dist/index.html` in the output
   - `dist/assets/index-*.js` files listed
4. If deploy says "ready" but site is blank, check **Functions log** separately

### Red Flags in Deploy Logs
| Log Message | Problem | Fix |
|------------|---------|-----|
| `echo 'Static site - no build needed'` | Dashboard override | Fix dashboard build command |
| `Custom publish path detected` | Dashboard overriding netlify.toml | Fix dashboard publish dir |
| `no such file or directory` | Build output missing | Check outDir matches publish |
| `Module "fs" has been externalized` | Server code in browser bundle | Remove Node-only imports from client |

---

## 7. Common Console Errors and How to Fix

### Error: Blank page, no console errors
| Cause | Fix |
|-------|-----|
| Wrong publish directory | Set `publish = "dist"` |
| Stale `index.html` referencing old hashes | Clear cache and redeploy |
| Dashboard build command override | Remove `echo 'Static site...'` |

### Error: `Uncaught SyntaxError: Unexpected token '<'`
**Meaning:** Browser expected JS but got HTML (the SPA redirect returned `index.html` for an asset URL).
| Fix | How |
|-----|-----|
| Check asset files exist in deploy | Verify build output in deploy log |
| Check publish directory | Must be `dist` |

### Error: `process is not defined`
**Meaning:** Node.js built-in leaking into browser bundle.
| Fix | How |
|-----|-----|
| Remove `@remotion/cli` from `manualChunks` | It's a Node CLI tool, not browser code |
| Guard server imports | Use `if (typeof window === 'undefined')` |
| Move to Netlify Functions | Server-only code belongs in `netlify/functions/` |

### Error: `Failed to load module script` (MIME type)
See Section 5 above.

### Error: `404` on `/assets/index-*.js`
**Meaning:** The hashed filename in `index.html` doesn't match any file in the deploy.
| Cause | Fix |
|-------|-----|
| Stale committed `index.html` | Never commit build output; let Netlify build fresh |
| Build didn't run | Check build command in dashboard |

### Error: `CORS` or `Mixed Content`
| Fix | How |
|-----|-----|
| Ensure HTTPS everywhere | Netlify provides SSL by default |
| Check API URLs | Use relative paths (`/.netlify/functions/`) not absolute |

---

## 8. Project Boundary Rules

| Project | Repo | Netlify Site | Local Path |
|---------|------|-------------|------------|
| **SirTrav A2A Studio** | WSP001/SirTrav-A2A-Studio | sirtrav-a2a-studio.netlify.app | `Documents\GitHub\SirTrav-A2A-Studio` |
| **SirJames Adventures** | WSP001/SirJamesAdventures | (separate) | `Documents\GitHub\SirJamesAdventures` |
| **SeaTrace** | (separate repos) | (separate sites) | (separate paths) |

**Never cross-contaminate build settings, env vars, or Netlify configs between projects.**

---

## 9. Deploy Verification Checklist

After every deploy, confirm:

- [ ] `https://sirtrav-a2a-studio.netlify.app/` shows the app (not blank)
- [ ] DevTools Console: no red errors
- [ ] DevTools Network: `index-*.js` returns 200 with size > 40KB
- [ ] DevTools Network: `index-*.css` returns 200
- [ ] `/.netlify/functions/healthcheck` returns `"status": "ok"` or `"degraded"`

---

## 10. Emergency Rollback

If a deploy breaks the site:
1. Go to Netlify Dashboard → Deploys
2. Find the last working deploy
3. Click "Publish deploy" on that version
4. Fix the issue in a new commit
5. Redeploy from main

---

*Commons Good — Building tools that benefit the community.*
