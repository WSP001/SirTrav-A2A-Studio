#!/usr/bin/env node
// === runner: require Node >= 18 and add progress helper ===
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error('Node 18+ required (global fetch).');
  process.exit(1);
}

async function postProgress(step, status, meta = {}) {
  if (!process.env.URL) return;
  try {
    await fetch(`${process.env.URL}/.netlify/functions/progress`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-correlation-id': meta.correlationId || '',
      },
      body: JSON.stringify({ step, status, meta }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('postProgress failed:', message);
  }
}
// === end runner snippet ===

import fs from 'node:fs';
import path from 'node:path';

const manifestPath = process.argv[2] || path.resolve('pipelines/a2a_manifest.yml');

function parseScalar(value) {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;
  if (/^-?\d+(?:\.\d+)?$/.test(value)) {
    return Number(value);
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
    return value.slice(1, -1);
  }
  return value;
}

function nextMeaningfulLine(lines, start) {
  for (let i = start + 1; i < lines.length; i += 1) {
    const candidate = lines[i];
    if (!candidate.trim() || candidate.trim().startsWith('#')) {
      continue;
    }
    return candidate;
  }
  return null;
}

function parseYaml(text) {
  const lines = text.replace(/\r/g, '').split('\n');
  const stack = [{ indent: -1, value: {} }];

  const splitLine = (line) => {
    const indent = line.length - line.trimStart().length;
    return { indent, content: line.trim() };
  };

  const setArrayContainer = (parent, key, indent) => {
    parent[key] = [];
    stack.push({ indent, value: parent[key] });
  };

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    if (!rawLine.trim() || rawLine.trim().startsWith('#')) {
      continue;
    }

    const { indent, content } = splitLine(rawLine);

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].value;

    if (content.startsWith('- ')) {
      if (!Array.isArray(parent)) {
        throw new Error(`YAML structure error near line ${index + 1}: unexpected list item.`);
      }

      const itemContent = content.slice(2).trim();
      if (!itemContent) {
        const obj = {};
        parent.push(obj);
        stack.push({ indent, value: obj });
        continue;
      }

      if (itemContent.includes(':')) {
        const colonIndex = itemContent.indexOf(':');
        const key = itemContent.slice(0, colonIndex).trim();
        const rest = itemContent.slice(colonIndex + 1).trim();
        const obj = {};
        parent.push(obj);
        if (rest) {
          obj[key] = parseScalar(rest);
        } else {
          obj[key] = {};
          stack.push({ indent: indent + 2, value: obj[key] });
        }
        stack.push({ indent, value: obj });
      } else {
        parent.push(parseScalar(itemContent));
      }
      continue;
    }

    const colonIndex = content.indexOf(':');
    if (colonIndex === -1) {
      throw new Error(`Unsupported YAML content near line ${index + 1}: ${content}`);
    }

    const key = content.slice(0, colonIndex).trim();
    const remainder = content.slice(colonIndex + 1).trim();

    if (!remainder) {
      const nextLine = nextMeaningfulLine(lines, index);
      if (nextLine) {
        const { indent: nextIndent, content: nextContent } = splitLine(nextLine);
        if (nextIndent > indent && nextContent.startsWith('- ')) {
          setArrayContainer(parent, key, indent);
          continue;
        }
        if (nextIndent > indent) {
          parent[key] = {};
          stack.push({ indent, value: parent[key] });
          continue;
        }
      }
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
    } else {
      parent[key] = parseScalar(remainder);
    }
  }

  return stack[0].value;
}

const manifestContent = fs.readFileSync(manifestPath, 'utf8');
const manifest = parseYaml(manifestContent);

async function run() {
  const projectId = manifest?.project?.id ?? 'unknown';
  console.log(`Loaded manifest for project ${projectId}`);
  await postProgress('manifest', 'loaded', { projectId });

  const steps = Array.isArray(manifest?.steps) ? manifest.steps : [];
  for (const step of steps) {
    const stepName = step?.name ?? 'unnamed';
    console.log(`→ Step: ${stepName}`);
    await postProgress(stepName, 'start', { step });
    try {
      await postProgress(stepName, 'ok', { step });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`✖ Step failed: ${stepName}`, message);
      await postProgress(stepName, 'error', { step, error: message });
      throw error;
    }
  }

  console.log('Stub runner complete.');
  await postProgress('manifest', 'ok', { projectId, steps: steps.length });
}

run().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Runner failed:', message);
  postProgress('manifest', 'error', { error: message }).catch(() => {});
  process.exit(1);
});
