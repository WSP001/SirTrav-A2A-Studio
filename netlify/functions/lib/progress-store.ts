import { getConfiguredBlobsStore } from './storage';

// IMPORTANT: Do NOT call getStore() at module load time!
// It must be called inside request handlers where Netlify context is available.
const getProgressStore = () => getConfiguredBlobsStore('sirtrav-progress');

const MAX_EVENTS = 200;

const keyFor = (projectId: string, runId?: string) =>
  `projects/${projectId}/runs/${runId || 'default'}/progress.json`;

export async function readProgress(projectId: string, runId?: string) {
  try {
    const store = getProgressStore();
    const data = await store.get(keyFor(projectId, runId), { type: 'json' });
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
    await store.set(keyFor(projectId, runId), JSON.stringify(trimmed), {
      metadata: { projectId, runId: runId || 'default', kind: 'progress' },
    });
    return trimmed;
  } catch (err: any) {
    console.warn(`[progress-store] appendProgress failed (${err?.message || 'unknown'}), returning entry only`);
    return [entry];
  }
}
