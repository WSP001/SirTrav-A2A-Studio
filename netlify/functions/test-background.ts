/**
 * test-background — Diagnostic: imports same modules as run-pipeline-background
 * to identify which import crashes in Netlify Lambda.
 */
import type { Handler } from '@netlify/functions';
import { appendProgress } from './lib/progress-store';

// These are the exact same imports as run-pipeline-background.ts
import { runsStore, artifactsStore, uploadsStore } from './lib/storage';
import { updateRunIndex } from './lib/runIndex';
import { ManifestGenerator } from './lib/cost-manifest';
import { inspectOutput } from './lib/quality-gate';
import { publishVideo, flushCredentials } from './lib/publish';
import { recordJobPacket } from './lib/vault-helpers';

export const handler: Handler = async (event) => {
  const results: Record<string, string> = {};
  const projectId = 'import-test';
  const runId = `diag-${Date.now()}`;

  try {
    // Test each import individually
    results['progress-store'] = typeof appendProgress === 'function' ? 'ok' : 'broken';
    results['storage-runsStore'] = typeof runsStore === 'function' ? 'ok' : 'broken';
    results['storage-artifactsStore'] = typeof artifactsStore === 'function' ? 'ok' : 'broken';
    results['storage-uploadsStore'] = typeof uploadsStore === 'function' ? 'ok' : 'broken';
    results['runIndex'] = typeof updateRunIndex === 'function' ? 'ok' : 'broken';
    results['cost-manifest'] = typeof ManifestGenerator === 'function' ? 'ok' : 'broken';
    results['quality-gate'] = typeof inspectOutput === 'function' ? 'ok' : 'broken';
    results['publish-publishVideo'] = typeof publishVideo === 'function' ? 'ok' : 'broken';
    results['publish-flushCredentials'] = typeof flushCredentials === 'function' ? 'ok' : 'broken';
    results['vault-helpers'] = typeof recordJobPacket === 'function' ? 'ok' : 'broken';

    // Try to actually call runsStore (the first thing the pipeline does)
    try {
      const store = runsStore();
      results['runsStore-call'] = store ? 'ok' : 'null';
    } catch (e) {
      results['runsStore-call'] = `error: ${e instanceof Error ? e.message : String(e)}`;
    }

    // Write diagnostic to progress store
    await appendProgress(projectId, runId, {
      projectId, runId,
      agent: 'test-background',
      status: 'completed',
      message: JSON.stringify(results),
      timestamp: new Date().toISOString(),
      progress: 100,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, results }),
    };
  } catch (err) {
    // If we crash, try to at least write the error
    try {
      await appendProgress(projectId, runId, {
        projectId, runId,
        agent: 'test-background',
        status: 'failed',
        message: `CRASH: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toISOString(),
        progress: 0,
      });
    } catch (_) { /* last resort failed */ }

    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
    };
  }
};
