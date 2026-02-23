# Dev Machine Optimization (Windows / Ryzen AI 9 HX 370)

Purpose: keep local builds and agent loops responsive under sustained Node/Vite/Netlify workloads.

## Flow Mode (Team Default)

Use one of these as your first command each session:

1. `just flow` (local lane)
2. `just flow-cloud` (cloud lane)

What `flow` does:

1. Runs `just machine-gate`
2. Runs `just preflight`
3. Shows a safe next-step menu
4. Starts local dev server

What `flow-cloud` does:

1. Runs `just machine-gate`
2. Runs `just preflight`
3. Runs `just ops-spine-cloud`
4. Prints cloud truth summary

## Golden Rule: One Loop

Run one heavy workflow at a time:

1. `just machine-gate`
2. If gate passes, run the next heavy command (`just dev`, `npm run build`, `just rc1-verify`, etc.)
3. If gate fails, close top RAM hogs first, then re-run `just machine-gate`

## Health Gate Commands

- `just machine-health`
  - Informational check with CPU, memory, and top 5 RAM-consuming processes.
- `just machine-gate`
  - Same check, but exits non-zero when machine is overloaded (`ThrottlingRequired`).
- `just recover-ram`
  - Safe recovery helper that prints top memory consumers and next manual actions.

Target headroom:

- Free memory target: `> 6.0GB`
- CPU caution: `> 85%`

## What To Close First

When the script reports `Top Memory Consumers`, close these first if they are not required:

1. Browser tabs/windows (Chrome/Edge)
2. Teams/Zoom/Discord during heavy build loops
3. Extra IDE windows or terminals running watchers
4. Unused Docker containers

## Windows Defender Exclusions (Manual)

Add repo and tool cache paths as Defender exclusions:

1. Open `Windows Security` -> `Virus & threat protection`.
2. Open `Manage settings` under Virus & threat protection settings.
3. Open `Exclusions` -> `Add or remove exclusions`.
4. Add folder exclusions:
   - `C:\WSP001\SirTrav-A2A-Studio`
   - `%USERPROFILE%\.npm`
   - `%LOCALAPPDATA%\npm-cache`
   - `%USERPROFILE%\.netlify`
   - `%TEMP%`

Notes:

- Do not exclude broad system locations.
- Keep exclusions scoped to build tooling and this workspace.

## Windows Search Indexing Exclusions (Manual)

Reduce indexer contention on build artifacts:

1. Open `Indexing Options`.
2. Click `Modify`.
3. Uncheck build-heavy folders:
   - `C:\WSP001\SirTrav-A2A-Studio\dist`
   - `C:\WSP001\SirTrav-A2A-Studio\node_modules`
   - `C:\WSP001\SirTrav-A2A-Studio\artifacts`
   - `C:\WSP001\SirTrav-A2A-Studio\.netlify`

## Team Policy

- Before long test/build runs, execute `just machine-gate`.
- If status is `DevCaution`, continue only one heavy task at a time.
- If status is `ThrottlingRequired`, stop and recover headroom before continuing.
- Paste gate output into tickets when reporting local performance issues.
- Every health run appends one record to `artifacts/metrics/machine_health.ndjson`.
