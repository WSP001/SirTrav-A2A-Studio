import type { Handler } from './types';
import fs from 'node:fs';
import path from 'node:path';

const DATA_FILE = path.join(process.env.TMPDIR || '/tmp', 'sirtrav-progress.json');

function readEvents(): any[] {
  try {
    if (!fs.existsSync(DATA_FILE)) return [];
    const json = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(json?.events) ? json.events : [];
  } catch (err) {
    console.warn('progress: failed to read events', err);
    return [];
  }
}

function appendEvent(evt: any) {
  try {
    const current = readEvents();
    current.push({ ...evt, ts: new Date().toISOString() });
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ events: current }, null, 2));
  } catch (err) {
    console.error('progress: failed to write event', err);
  }
}

export const handler: Handler = async (event) => {
  const method = (event as any).httpMethod || 'GET';

  if (method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type,x-correlation-id'
      },
      body: ''
    };
  }

  if (method === 'POST') {
    const cid = event.headers?.['x-correlation-id'] || '';
    const body = event.body ? JSON.parse(event.body) : {};
    appendEvent({ cid, ...body });
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ ok: true })
    };
  }

  const headers = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*'
  } as Record<string, string>;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // send recent history first
      for (const evt of readEvents().slice(-50)) {
        controller.enqueue(encoder.encode(`event: progress\ndata: ${JSON.stringify(evt)}\n\n`));
      }

      // heartbeats to keep the connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
      }, 30000);

      // watch for new writes while the stream is open
      let watcher: fs.FSWatcher | null = null;
      try {
        watcher = fs.watch(DATA_FILE, { persistent: false }, () => {
          const latest = readEvents().slice(-1);
          for (const evt of latest) {
            controller.enqueue(encoder.encode(`event: progress\ndata: ${JSON.stringify(evt)}\n\n`));
          }
        });
      } catch (err) {
        console.warn('progress: watcher unavailable', err);
      }

      const close = () => {
        clearInterval(heartbeat);
        if (watcher) watcher.close();
        controller.close();
      };

      // Netlify will abort the request when the client disconnects; use abort signal when available
      (event as any)?.rawUrl; // noop to avoid unused warning
      // We cannot access an AbortSignal from Netlify events, so rely on platform to close.
      // Provide a max duration safeguard.
      setTimeout(close, 5 * 60 * 1000);
    }
  });

  return new Response(stream, { headers, status: 200 });
};

export default handler;
