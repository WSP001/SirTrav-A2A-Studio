# Local Development & Offline-Friendly Setup

> **Enterprise Standard:** This guide ensures reproducible development environments even when external registries are unreachable.

## 1) Verify Node and npm

Ensure you are running a supported LTS version of Node.js.

```bash
node -v   # expect >= 18.x
npm -v    # expect >= 9.x
```

## 2) Prefer Deterministic Installs

Use `npm ci` to install dependencies exactly as specified in `package-lock.json`. This prevents "it works on my machine" issues caused by floating versions.

```bash
npm ci
```

### 🛡️ Enterprise Resilience: Blocked Registries
If the public npm registry is blocked or slow, configure a private mirror or registry in your project-level `.npmrc`:

```bash
# Example: Pointing to a corporate Artifactory/Nexus
echo "registry=https://registry.your-company.com/api/npm/npm-virtual" > .npmrc
npm ci
```

## 3) Smoke-Test the Pipeline

Before running the full stack, verify the core orchestration logic and file structure using our lightweight preflight checks. These scripts avoid external API calls.

```bash
# 1. Run the manifest runner in dry-run/test mode
npm run precommit:test

# 2. Run the structural preflight check
./scripts/preflight.sh
```

## 4) Run the Dev Stack

Start the local development server. This spins up Vite for the frontend and Netlify Functions for the backend.

```bash
npm run dev
```

> **Note:** If you lack the global `netlify-cli`, use `npx`:
> `npx netlify-cli@latest dev`

## 5) Probe Functions Locally

Verify that your local functions are responding correctly before integrating with the UI.

**Test Director Agent (Curate Media):**
```bash
curl -X POST http://localhost:8888/.netlify/functions/curate-media \
  -H "Content-Type: application/json" \
  -d '{"projectId":"demo","vaultPrefix":"C:\\Users\\Roberto002\\Documents\\GitHub\\Sir-TRAV-scott\\content\\intake\\demo"}'
```

**Test Progress Stream:**
```bash
curl -N http://localhost:8888/.netlify/functions/progress?projectId=demo
```

## 6) Troubleshooting & Cache Clearing

If you switch registries or encounter strange dependency errors, perform a clean install:

```bash
# Windows (PowerShell)
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm cache clean --force
npm ci
```

## 7) Repository Separation (Security)

Strictly maintain the air-gap between the public engine and the private vault.

- **Public Engine:** `SirTrav-A2A-Studio` (Code, Logic, UI)
- **Private Vault:** `Sir-TRAV-scott` (Raw Media, Personal Memories, `memory_index.json`)

> ⚠️ **SECURITY WARNING:** Never copy raw media files from the private vault into the public repo. Use the `intake-upload` bridge or local file references only.
