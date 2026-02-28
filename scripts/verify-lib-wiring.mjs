#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function has(source, pattern) {
  return pattern.test(source);
}

function check(name, source, checks) {
  const failed = checks.filter((c) => !has(source, c.pattern));
  if (failed.length === 0) {
    console.log(`✅ ${name}`);
    return true;
  }
  console.log(`❌ ${name}`);
  failed.forEach((f) => console.log(`   - missing: ${f.label}`));
  return false;
}

const pipelinePath = join('netlify', 'functions', 'run-pipeline-background.ts');
const curatePath = join('netlify', 'functions', 'curate-media.ts');

const pipeline = readFileSync(pipelinePath, 'utf8');
const curate = readFileSync(curatePath, 'utf8');

const checks = [
  check('quality-gate is wired', pipeline, [
    { label: "import { inspectOutput } from './lib/quality-gate'", pattern: /import\s*\{\s*inspectOutput\s*\}\s*from\s*['"]\.\/lib\/quality-gate['"]/ },
    { label: 'inspectOutput(...) invocation', pattern: /\binspectOutput\s*\(/ },
  ]),
  check('publish (HMAC) is wired', pipeline, [
    { label: "import { publishVideo, flushCredentials } from './lib/publish'", pattern: /import\s*\{\s*publishVideo\s*,\s*flushCredentials\s*\}\s*from\s*['"]\.\/lib\/publish['"]/ },
    { label: 'publishVideo(...) invocation', pattern: /\bpublishVideo\s*\(/ },
    { label: 'flushCredentials() invocation', pattern: /\bflushCredentials\s*\(/ },
  ]),
  check('vision API is wired', curate, [
    { label: "import from './lib/vision'", pattern: /from\s*['"]\.\/lib\/vision['"]/ },
    { label: 'analyzeImage(...) or batchAnalyzeImages(...) invocation', pattern: /\b(analyzeImage|batchAnalyzeImages)\s*\(/ },
  ]),
];

const ok = checks.every(Boolean);
console.log(ok ? '\nPASS: wiring verified' : '\nFAIL: wiring gaps found');
process.exit(ok ? 0 : 1);

