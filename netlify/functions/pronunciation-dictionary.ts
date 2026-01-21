import type { Handler } from './types';
import fs from 'node:fs/promises';
import path from 'node:path';

const DATA_FILE = path.join(process.cwd(), 'data', 'pronunciation-dictionary.json');
const COMMON_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

const loadDictionary = async () => {
  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8');
    return JSON.parse(raw) as unknown;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { version: '1.0.0', entries: [] };
    }
    throw error;
  }
};

export const handler: Handler = async (event) => {
  const method = (event.httpMethod ?? 'GET').toUpperCase();

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: COMMON_HEADERS,
      body: '',
    };
  }

  if (method !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...COMMON_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Method not allowed' }),
    };
  }

  try {
    const dictionary = await loadDictionary();

    return {
      statusCode: 200,
      headers: { ...COMMON_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, dictionary }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load dictionary';
    return {
      statusCode: 500,
      headers: { ...COMMON_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: message }),
    };
  }
};

export default handler;
