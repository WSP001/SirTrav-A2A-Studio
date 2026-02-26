# SEC-001 ΓÇö npm Audit Remediation Plan

## Ticket
`SEC-001-npm-audit-fix`

## Objective
Reduce dependency vulnerabilities from baseline (`18`: 1 critical, 8 high, 3 moderate, 6 low) while preserving build and runtime stability.

## Scope
- Dependency-only remediation in dedicated PR lane.
- No feature/UI changes bundled into SEC-001.

## Baseline (2026-02-25)
- Critical: `fast-xml-parser` chain (via AWS SDK XML paths)
- High: AWS SDK transitive chain, `tar`, `minimatch`, `fastify`
- Moderate/Low: `netlify-cli`, `ajv`, `lodash`, `webpack`, `diff`, `qs`

## Severity Bands and Policy
1. **Critical / High**
- Must be addressed in immediate remediation phase.
- Block release if critical remains exploitable in shipping path.

2. **Moderate**
- Remediate in same sprint when fix is low risk.
- Otherwise allow temporary waiver with explicit expiry date.

3. **Low**
- Batch with regular maintenance unless exploited path is production-facing.

## Execution Phases
### Phase 1 ΓÇö Fast Patch (direct + safe updates)
- Update direct dependencies with `fixAvailable: true` where semver-compatible.
- Re-run:
  - `npm audit --json`
  - `npm run build`
  - smoke checks (`netlify dev`, pipeline start call, healthcheck call)

### Phase 2 ΓÇö Controlled Transitive Upgrades
- Target chains: Remotion, Netlify CLI, AWS SDK XML parser chain.
- Upgrade in small steps with regression checks after each group.
- Preserve lockfile integrity and document changed dependency trees.

## Required Evidence in PR
- Before/after vulnerability totals and breakdown by severity.
- Commands run + pass/fail output summary.
- Runtime smoke verification statement.
- Rollback plan (exact lockfile/package revert strategy).

## Acceptance Criteria
- Critical vulnerabilities reduced to 0, or explicit approved waiver documented.
- Total vulnerability count decreases from baseline 18.
- Build passes with no new runtime regressions.
- SEC-001 PR contains no non-security feature edits.
