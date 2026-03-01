#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const outPath = process.argv[2] || path.join('out', 'sirtrav_env_snapshot.json');
const requiredNames = [
  'OPENAI_API_KEY',
  'GEMINI_API_KEY',
  'LINKEDIN_CLIENT_ID',
  'LINKEDIN_CLIENT_SECRET',
  'LINKEDIN_ACCESS_TOKEN',
  'LINKEDIN_PERSON_URN',
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET',
  'TWITTER_ACCESS_TOKEN',
  'TWITTER_ACCESS_SECRET',
];

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const map = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) map[key] = value;
  }
  return map;
}

async function localDevRunning() {
  try {
    const res = await fetch('http://localhost:8888/.netlify/functions/healthcheck');
    return res.ok;
  } catch {
    return false;
  }
}

const dotenv = parseEnvFile('.env');
const present = new Set();

for (const k of requiredNames) {
  const fromProcess = process.env[k];
  const fromDotEnv = dotenv[k];
  if ((fromProcess && String(fromProcess).trim()) || (fromDotEnv && String(fromDotEnv).trim())) {
    present.add(k);
  }
}

if (await localDevRunning()) {
  present.add('NETLIFY_DEV_RUNNING');
}

const payload = {
  generatedAt: new Date().toISOString(),
  present: Array.from(present).sort(),
};

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
console.log(`Masked snapshot written: ${outPath}`);
console.log(`Present keys: ${payload.present.length}`);
