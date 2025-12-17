import { getStore } from '@netlify/blobs';

const store = getStore('sirtrav-progress');
const MAX_EVENTS = 200;

const keyFor = (projectId: string, runId?: string) =>
  `projects/${projectId}/runs/${runId || 'default'}/progress.json`;

export async function readProgress(projectId: string, runId?: string) {
  const data = await store.get(keyFor(projectId, runId), { type: 'json' });
  return Array.isArray(data) ? data : [];
}

export async function appendProgress(projectId: string, runId: string | undefined, entry: unknown) {
  const events = await readProgress(projectId, runId);
  events.push(entry);
  const trimmed = events.slice(-MAX_EVENTS);
  await store.set(keyFor(projectId, runId), JSON.stringify(trimmed), {
    metadata: { projectId, runId: runId || 'default', kind: 'progress' },
  });
  return trimmed;
}
