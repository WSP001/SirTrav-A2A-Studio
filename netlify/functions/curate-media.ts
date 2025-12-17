import { Handler } from '@netlify/functions';
import fs from 'fs';
import path from 'path';

export const handler: Handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };
  const { projectId } = JSON.parse(event.body || '{}');

  // 1. DEFINE THE VAULT PATH (Local Dev Only)
  // In Prod, this would need S3 or Git LFS. For Local P0, we read the disk.
  const VAULT_PATH = "C:\\Users\\Roberto002\\Documents\\GitHub\\Sir-TRAV-scott\\content\\intake\\demo";

  try {
    // 2. SCAN THE VAULT
    let files: string[] = [];
    if (fs.existsSync(VAULT_PATH)) {
      files = fs.readdirSync(VAULT_PATH).filter(f => !f.startsWith('.'));
    } else {
      console.warn(`Vault path not found: ${VAULT_PATH}`);
    }

    // 3. CURATE (Simple Logic: Take top 5)
    const curated = files.slice(0, 5).map(f => ({
      file: f,
      type: f.endsWith('mp4') ? 'video' : 'image',
      score: 0.9
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        curated: {
          vaultPrefix: VAULT_PATH,
          media_sequence: curated,
          strategy: { rules: ['Scan Local Vault'], notes: `Found ${files.length} assets` }
        }
      })
    };
  } catch (error: any) {
    return { statusCode: 500, headers, body: JSON.stringify({ ok: false, error: error.message }) };
  }
};
