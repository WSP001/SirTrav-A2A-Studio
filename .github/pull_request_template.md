## Security Checklist

- [ ] **No secrets committed** (`npm run precommit:secrets` or equivalent)
- [ ] **No PII/private data** exposed in public artifacts
- [ ] **Quality gates enforced** (LUFS, file size, format validation)
- [ ] **Storage permissions minimal** (read-only public access where appropriate)
- [ ] **Signed URL expiry reasonable** (≤ 24 hours)

## Changes Summary

<!-- Describe what this PR changes and why -->

## Testing

- [ ] **Local testing** completed
- [ ] **Quality gate tests** pass (if applicable)
- [ ] **Storage upload/download** tested (if applicable)

## Security Review Required?

Changes to these files **require security team approval**:

- `scripts/sanitized_export.sh`
- `.github/workflows/sanitized-export.yml`
- `netlify/functions/publish.ts`
- `pipelines/scripts/lufs_check.mjs`

/cc @WSP001/security-team
