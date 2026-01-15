import { runsStore } from './storage';

export type RunStatus = 'queued' | 'running' | 'complete' | 'failed';

export interface RunArtifacts {
  projectId: string;
  runId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt?: string;
  payloadKey?: string;
  narrationKey?: string;
  musicKey?: string;
  beatGridKey?: string;
  finalVideoKey?: string;
  exportBundleKey?: string;
  // Golden Path fields
  videoUrl?: string;
  creditsUrl?: string;
  pipelineMode?: string;
  dashboardUrl?: string;
  voice?: {
    voiceId?: string;
    modelId?: string;
    characters?: number;
    costCents?: number;
    placeholder?: boolean;
    store?: string;
  };
  music?: {
    mode?: string;
    bpm?: number;
    duration?: number;
    promptHash?: string;
    approvedBy?: string;
    licenseTier?: string;
    sunoId?: string | null;
    manualFile?: string;
    gridSource?: string;
    store?: string;
  };
  error?: string;
}

export const makeIndexKey = (projectId: string, runId: string) =>
  `projects/${projectId}/runs/${runId}/index.json`;

const mergeNested = (base: RunArtifacts, patch: Partial<RunArtifacts>): RunArtifacts => {
  const next: RunArtifacts = { ...base, ...patch };
  if (patch.voice) next.voice = { ...(base.voice || {}), ...patch.voice };
  if (patch.music) next.music = { ...(base.music || {}), ...patch.music };
  return next;
};

export async function getRunIndex(projectId: string, runId: string): Promise<RunArtifacts | null> {
  const store = runsStore();
  const existing = await store.get(makeIndexKey(projectId, runId), { type: 'json' }) as RunArtifacts | null;
  return existing || null;
}

export async function updateRunIndex(
  projectId: string,
  runId: string,
  patch: Partial<RunArtifacts>
): Promise<RunArtifacts> {
  const store = runsStore();
  const key = makeIndexKey(projectId, runId);
  const now = new Date().toISOString();
  const existing = (await store.get(key, { type: 'json' })) as RunArtifacts | null || {
    projectId,
    runId,
    status: 'running',
    createdAt: now,
  };
  const next = mergeNested(existing, { ...patch, updatedAt: now });

  await store.set(key, JSON.stringify(next), { metadata: { projectId, runId, status: next.status } });
  return next;
}
