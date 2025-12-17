import { Handler } from '@netlify/functions';
import { spawn } from 'child_process';
import path from 'path';

export const handler: Handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { projectId } = JSON.parse(event.body || '{}');

  console.log(`[Real] Starting pipeline for ${projectId}`);

  // SPAWN REAL PIPELINE (No --mock flag)
  // Ensure we point to the correct manifest path relative to this function
  // Using process.cwd() is safer for Netlify Dev execution context
  const manifestPath = path.join(process.cwd(), 'pipelines', 'a2a_manifest.yml');
  const runnerPath = path.join(process.cwd(), 'pipelines', 'run-manifest.mjs');

  const child = spawn('node', [runnerPath, manifestPath, projectId], {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env } // Pass env vars (URL, API Keys)
  });

  child.unref();

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ ok: true, message: "Pipeline started (Real Mode)", projectId })
  };
};
