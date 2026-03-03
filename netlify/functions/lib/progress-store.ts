import { getConfiguredBlobsStore } from './storage';

// IMPORTANT: Do NOT call getStore() at module load time!
// It must be called inside request handlers where Netlify context is available.
const getProgressStore = () => getConfiguredBlobsStore('sirtrav-progress');

const MAX_EVENTS = 200;
const BLOB_TIMEOUT_MS = 3000; // Must be < Netlify CLI's 10s lambda timeout

const keyFor = (projectId: string, runId?: string) =>
  `projects/${projectId}/runs/${runId || 'default'}/progress.json`;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function readProgress(projectId: string, runId?: string) {
  try {
    const store = getProgressStore();
    const data = await withTimeout(
      store.get(keyFor(projectId, runId), { type: 'json' }),
      BLOB_TIMEOUT_MS,
      'readProgress'
    );
    return Array.isArray(data) ? data : [];
  } catch (err: any) {
    console.warn(`[progress-store] readProgress failed (${err?.message || 'unknown'}), returning []`);
    return [];
  }
}

export async function appendProgress(projectId: string, runId: string | undefined, entry: unknown) {
  try {
    const store = getProgressStore();
    const events = await readProgress(projectId, runId);
    events.push(entry);
    const trimmed = events.slice(-MAX_EVENTS);
    await withTimeout(
      store.set(keyFor(projectId, runId), JSON.stringify(trimmed), {
        metadata: { projectId, runId: runId || 'default', kind: 'progress' },
      }),
      BLOB_TIMEOUT_MS,
      'appendProgress'
    );
    return trimmed;
  } catch (err: any) {
    console.warn(`[progress-store] appendProgress failed (${err?.message || 'unknown'}), returning entry only`);
    return [entry];
  }
}
