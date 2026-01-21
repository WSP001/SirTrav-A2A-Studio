# Local Development & Offline-Friendly Setup

These steps help when your environment cannot reach the public npm registry or when installs are blocked.

## 1) Verify Node and npm

```bash
node -v   # expect >= 18
npm -v
```

## 2) Prefer deterministic installs

```bash
npm ci    # uses package-lock.json for reproducible installs
```

If the registry is blocked, try either:
- Pinning the problematic package to a version that exists on your allowed mirror, then rerun `npm ci`.
- Setting a private registry in `.npmrc`:

```bash
echo "registry=https://your-private-registry.example.com" > .npmrc
npm ci
```

## 3) Smoke-test the pipeline without extra deps

```bash
npm run precommit:test   # runs pipelines/run-manifest.mjs
./scripts/preflight.sh   # lightweight secret/structure check
```

These scripts avoid external services; they exercise the manifest runner and file layout only.

## 4) Run the dev stack (with Netlify CLI)

```bash
npm run dev  # starts Vite + Netlify Functions via Netlify Dev
```

If Netlify CLI is missing and you cannot install it, use `npx netlify-cli@latest dev` after pointing `.npmrc` at your mirror.

## 5) Probe functions locally

```bash
curl -X POST http://localhost:8888/.netlify/functions/curate-media \
  -H "Content-Type: application/json" \
  -d '{"projectId":"demo","media_root":"content/intake/demo"}'

curl -N http://localhost:8888/.netlify/functions/progress
```

## 6) Clear cached modules if you switch registries

```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm ci
```

## 7) Keep repos separate

- Public engine: `SirTrav-A2A-Studio` (this repo)
- Private vault: `Sir-TRAV-scott`

Never copy raw media from the private vault into the public repo.
