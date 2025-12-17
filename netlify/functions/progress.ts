import { Handler } from '@netlify/functions';
import fs from 'fs';
import path from 'path';
import os from 'os';

const TMP_DIR = os.tmpdir();
const DATA_DIR = path.join(TMP_DIR, 'sirtrav-progress');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

export const handler: Handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };

  if (event.httpMethod === 'POST') {
    const { projectId, step, status } = JSON.parse(event.body || '{}');
    const file = path.join(DATA_DIR, `${projectId}.json`);
    const entry = { timestamp: new Date().toISOString(), step, status };

    let data = [];
    if (fs.existsSync(file)) data = JSON.parse(fs.readFileSync(file, 'utf8'));
    data.push(entry);
    fs.writeFileSync(file, JSON.stringify(data));
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  if (event.httpMethod === 'GET') {
    const projectId = event.queryStringParameters?.projectId;
    if (!projectId) return { statusCode: 400, body: 'Missing projectId' };
    const file = path.join(DATA_DIR, `${projectId}.json`);
    const data = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : [];
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, events: data }) };
  }
  return { statusCode: 405, body: 'Method Not Allowed' };
};
