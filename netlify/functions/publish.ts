import type { Handler } from '@netlify/functions';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { createStorage } from './lib/storage';

type Artifact = {
  localPath: string;
  key?: string;
  type: 'video' | 'audio' | 'metadata';
};

type PublishPayload = {
  projectId: string;
  artifacts?: Artifact[];
  lufs_ok?: boolean;
  evals?: { ok?: boolean; reasons?: string[] };
  metadata?: Record<string, unknown>;
};

const DEFAULT_ARTIFACTS = (projectId: string): Artifact[] => [
  {
    localPath: path.join('tmp', projectId, `FINAL_RECAP_${projectId}.mp4`),
    type: 'video',
  },
  {
    localPath: path.join('tmp', projectId, 'master_audio.wav'),
    type: 'audio',
  },
  {
    localPath: path.join('tmp', projectId, 'project_summary.json'),
    type: 'metadata',
  },
];

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: JSON.stringify({ ok: false, error: 'method_not_allowed' }),
    };
  }

  let payload: PublishPayload;
  try {
    payload = event.body ? JSON.parse(event.body) : {};
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        ok: false,
        error: 'invalid_json',
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }

  const { projectId, artifacts, lufs_ok, evals, metadata = {} } = payload || {};

  if (!projectId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ ok: false, error: 'projectId_required' }),
    };
  }

  const qualityPassed =
    typeof lufs_ok === 'boolean' ? lufs_ok : evals?.ok === true;

  if (!qualityPassed) {
    return {
      statusCode: 422,
      body: JSON.stringify({
        ok: false,
        error: 'quality_gate_failed',
        reasons: evals?.reasons || ['LUFS check failed or missing'],
        hint:
          'Run lufs_check.mjs and pass { lufs_ok: true } or { evals: { ok: true } }',
      }),
    };
  }

  const discoveredArtifacts =
    artifacts && artifacts.length > 0
      ? artifacts
      : DEFAULT_ARTIFACTS(projectId).filter((item) => existsSync(item.localPath));

  if (discoveredArtifacts.length === 0) {
    return {
      statusCode: 404,
      body: JSON.stringify({
        ok: false,
        error: 'no_artifacts_found',
        projectId,
      }),
    };
  }

  const storage = createStorage();
  const results = [];

  for (const artifact of discoveredArtifacts) {
    const key =
      artifact.key ||
      path
        .join('projects', projectId, path.basename(artifact.localPath))
        .replace(/\\/g, '/');

    const additionalMetadata = {
      project_id: projectId,
      artifact_type: artifact.type,
      upload_source: 'publish_function',
      ...metadata,
    };

    if (artifact.type === 'metadata' && existsSync(artifact.localPath)) {
      try {
        const contents = JSON.parse(readFileSync(artifact.localPath, 'utf8'));
        additionalMetadata['metadata_snapshot'] = JSON.stringify(
          contents?.summary ?? contents,
        ).slice(0, 500);
      } catch (err) {
        // Ignore JSON parsing errors for metadata snapshot.
      }
    }

    const result = await storage.upload(
      artifact.localPath,
      key,
      Object.fromEntries(
        Object.entries(additionalMetadata).map(([k, v]) => [k, String(v)]),
      ),
    );

    results.push({ artifact, result });
  }

  const succeeded = results.filter((entry) => entry.result.ok);
  const failed = results.filter((entry) => !entry.result.ok);

  if (succeeded.length === 0) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: 'all_uploads_failed',
        failures: failed.map((entry) => ({
          localPath: entry.artifact.localPath,
          error: entry.result.error,
        })),
      }),
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: true,
      projectId,
      published: succeeded.map((entry) => ({
        type: entry.artifact.type,
        localPath: entry.artifact.localPath,
        publicUrl: entry.result.publicUrl,
        signedUrl: entry.result.signedUrl,
        expiresAt: entry.result.expiresAt,
        metadata: entry.result.metadata,
      })),
      summary: {
        total: results.length,
        success: succeeded.length,
        failed: failed.length,
      },
      quality_gate: {
        lufs_passed: qualityPassed,
        evals,
      },
    }),
  };
};

export { handler };
export default handler;
