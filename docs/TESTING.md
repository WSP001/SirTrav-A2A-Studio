# SirTrav Testing Guide

This document outlines the testing workflow for the SirTrav A2A Studio project. Following these practices ensures **Enterprise Grade Quality Results** ready for production deployment.

## Quick Start: The Preflight Command

Run the following command to execute all quality gates at once:

```bash
npm run preflight
```

This runs:
1. **ESLint** - Code quality and style enforcement
2. **TypeScript** - Type checking
3. **Secrets Scan** - Ensures no credentials are committed

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run lint` | Run ESLint on all source files |
| `npm run lint:fix` | Auto-fix linting issues where possible |
| `npm run typecheck` | Run TypeScript compiler in check mode |
| `npm run preflight` | Run all quality gates (lint + typecheck + secrets) |
| `npm run precommit:secrets` | Check for exposed secrets |

## The Shared QA Gate

Before any PR submission, developers must complete these steps:

### Step 1: Run Preflight
```bash
npm run preflight
```

This command validates:
- No linting errors (based on `.eslintrc.json`)
- No TypeScript errors
- No secrets accidentally committed

### Step 2: Local Smoke Test
```bash
npm run dev
```

Verify the application loads without console errors.

### Step 3: End-to-End Flow Validation

For changes affecting the pipeline:
1. Test the SSE progress stream manually
2. Verify storage operations (upload/download)
3. Check attribution watermarking if applicable

## CI/CD Integration

In CI pipelines, we enforce strict mode:

```bash
npm run lint -- --max-warnings=0
```

This ensures code is pristine, not just "good enough."

## High-End Quality Practices

### 1. Git Hooks (Recommended)

Install Husky to auto-run preflight on commit:

```bash
npm install --save-dev husky
npx husky init
echo "npm run preflight" > .husky/pre-commit
```

### 2. Dependency Locking

Always commit `package-lock.json` to ensure consistent builds across all environments.

### 3. Zero Warnings Policy

In production builds, all warnings should be treated as errors:

```bash
npm run lint -- --max-warnings=0
```

## Security Testing Checklist

- [ ] No PII/secrets in code or logs
- [ ] Storage permissions are minimal
- [ ] Signed URLs have reasonable expiry (≤ 24 hours)
- [ ] Quality gates enforced (LUFS, file size, format)

---

*Following this testing workflow produces the type of high-end production quality ready for Enterprise Grade results we are expecting.*
