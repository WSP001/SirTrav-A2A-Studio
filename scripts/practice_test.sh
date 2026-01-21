#!/usr/bin/env bash
set -euo pipefail

function heading() {
  printf '\n=== %s ===\n' "$1"
}

heading "Checking Node runtime"
node -e "const [major]=process.versions.node.split('.').map(Number); if(major<18){console.error('Node 18+ required.'); process.exit(1);} console.log('Node version OK:', process.version);"

heading "Running security preflight"
npm run preflight

heading "Running manifest smoke test"
npm run precommit:test

heading "Executing full manifest"
npm run run:manifest

heading "Simulating progress logging and evaluation feedback"
node <<'NODE'
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';

async function loadHandler(relativeTsPath) {
  const sourcePath = new URL(relativeTsPath, import.meta.url);
  const source = await fs.readFile(sourcePath, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    }
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText, 'utf8').toString('base64')}`;
  return import(moduleUrl);
}

const { handler: submitEvaluation } = await loadHandler('../netlify/functions/submit-evaluation.ts');
const { handler: progressHandler } = await loadHandler('../netlify/functions/progress.ts');

const originalCwd = process.cwd();
const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sirtrav-practice-'));
process.chdir(tmpDir);

async function testProgress() {
  await progressHandler({
    httpMethod: 'POST',
    headers: { 'x-correlation-id': 'practice-123' },
    body: JSON.stringify({ step: 'demo', status: 'start', meta: { note: 'practice run' } })
  }, {} as any);

  const getResult = await progressHandler({ httpMethod: 'GET', headers: {} } as any, {} as any);
  console.log('Progress SSE snapshot (first lines):');
  console.log(getResult.body.split('\n').slice(0, 4).join('\n'));
}

async function testEvaluation() {
  const tmpPath = path.join(os.tmpdir(), 'memory_index.json');
  await fs.writeFile(tmpPath, JSON.stringify({
    video_history: [],
    user_preferences: { positive_tags: [], negative_tags: [] }
  }, null, 2));

  const result = await submitEvaluation({
    httpMethod: 'POST',
    body: JSON.stringify({ projectId: 'practice-demo', rating: 'good', tags: ['energetic', 'family'] })
  }, {} as any);

  console.log('Submit-evaluation response:', result.statusCode, result.body);
  const stored = JSON.parse(await fs.readFile(tmpPath, 'utf8'));
  console.log('Stored memory snapshot:', stored);
}

await testProgress();
await testEvaluation();

process.chdir(originalCwd);
NODE

heading "Practice test complete"
