import { Handler } from '@netlify/functions';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TMP_DIR = os.tmpdir();
const DATA_DIR = path.join(TMP_DIR, 'sirtrav-progress');

export const handler: Handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { projectId, file } = JSON.parse(event.body || '{}');

  // 1. READ LOGS
  const logFile = path.join(DATA_DIR, `${projectId}.json`);
  let logs = [];
  if (fs.existsSync(logFile)) logs = JSON.parse(fs.readFileSync(logFile, 'utf8'));

  // 2. CREATE ENVELOPE
  const envelope = {
    project_id: projectId,
    timestamp: new Date().toISOString(),
    artifacts: {
      video: file || "FINAL.mp4",
      path: `/${projectId}/FINAL.mp4` // Dynamic Web Path
    },
    financials: { total_cost_usd: 0.15 } // Mocked for P0
  };

  // 3. WRITE TO DYNAMIC PUBLIC FOLDER
  // Resolves to: public/{projectId}/final_envelope.json
  const publicDir = path.resolve(__dirname, `../../public/${projectId}`);
  if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });

  fs.writeFileSync(path.join(publicDir, 'final_envelope.json'), JSON.stringify(envelope, null, 2));

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, envelope }) };
};
