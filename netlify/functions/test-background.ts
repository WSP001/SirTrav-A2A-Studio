/**
 * test-background — Minimal background function to test if Netlify
 * background functions execute at all on this site.
 * 
 * POST /.netlify/functions/test-background
 * Body: { "projectId": "test", "runId": "test-123" }
 * 
 * If working: writes a progress event to the blob store.
 * If broken: returns 202 but nothing happens (same as run-pipeline-background).
 */
import type { Handler } from '@netlify/functions';
import { appendProgress } from './lib/progress-store';

export const handler: Handler = async (event) => {
  console.log('[test-background] Handler invoked at', new Date().toISOString());

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const projectId = body.projectId || 'bg-test';
    const runId = body.runId || `bg-${Date.now()}`;

    console.log(`[test-background] Writing progress for ${projectId}/${runId}`);

    await appendProgress(projectId, runId, {
      projectId,
      runId,
      agent: 'test-background',
      status: 'completed',
      message: `Background function executed successfully at ${new Date().toISOString()}`,
      timestamp: new Date().toISOString(),
      progress: 100,
    });

    console.log('[test-background] Progress written successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, projectId, runId, executed: true }),
    };
  } catch (err) {
    console.error('[test-background] Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
    };
  }
};
