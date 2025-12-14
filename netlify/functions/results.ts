/**
 * RESULTS ENDPOINT
 * GET /.netlify/functions/results?projectId=...&runId=...
 * Returns the artifact index stored in Blobs.
 */
import { getRunIndex } from './lib/runIndex';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

export default async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers });
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers });
  }

  const url = new URL(req.url);
  const projectId = url.searchParams.get('projectId');
  const runId = url.searchParams.get('runId');

  if (!projectId || !runId) {
    return new Response(JSON.stringify({ error: 'projectId and runId are required' }), {
      status: 400,
      headers,
    });
  }

  const index = await getRunIndex(projectId, runId);
  if (!index) {
    return new Response(JSON.stringify({ error: 'not_found', projectId, runId }), {
      status: 404,
      headers,
    });
  }

  return new Response(JSON.stringify(index), { status: 200, headers });
};
