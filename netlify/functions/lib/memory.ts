// Memory read/write utilities
import fs from 'fs/promises';
import path from 'path';

const MEMORY_PATH = process.env.VAULT_PATH + '/memory_index.json';

export async function readMemory() {
  const data = await fs.readFile(MEMORY_PATH, 'utf-8');
  return JSON.parse(data);
}

export async function writeMemory(memory) {
  await fs.writeFile(MEMORY_PATH, JSON.stringify(memory, null, 2));
}
