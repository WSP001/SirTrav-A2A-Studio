/**
 * PROGRESS TRACKING (Modern function)
 * - POST: log a progress event (persist to Blobs)
 * - GET : return JSON list of events
 * - GET with Accept:text/event-stream : SSE stream
 */
import { appendProgress, readProgress } from './lib/progress-store';

type ProgressStatus = 'started' | 'running' | 'completed' | 'failed';

interface ProgressEvent {
  projectId: string;
  runId?: string;
  agent: string;
  status: ProgressStatus;
  message: string;
  timestamp: string;
  progress: number; // 0-100
  metadata?: Record<string, unknown>;
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

async function readEvents(projectId: string, runId?: string): Promise<ProgressEvent[]> {
  return (await readProgress(projectId, runId)) as ProgressEvent[];
}

function formatSSE(events: ProgressEvent[], projectId: string) {
  let sse = `: SirTrav A2A Progress Stream\n`;
  sse += `event: connected\ndata: {"projectId":"${projectId}"}\n\n`;
  for (const evt of events) {
    sse += `event: progress\ndata: ${JSON.stringify(evt)}\n\n`;
  }
  const last = events[events.length - 1];
  if (last && (last.status === 'completed' || last.status === 'failed')) {
    sse += `event: complete\ndata: {"projectId":"${projectId}","status":"${last.status}"}\n\n`;
  }
  return sse;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  if (req.method === 'OPTIONS') return new Response('', { status: 200, headers: cors });

  if (req.method === 'GET') {
    const projectId = url.searchParams.get('projectId');
    const runId = url.searchParams.get('runId');

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'projectId required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const accept = req.headers.get('accept') || '';

    // ------------------------------------------------------------------------
    // SSE STREAMING MODE
    // ------------------------------------------------------------------------
    if (accept.includes('text/event-stream')) {
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          // Send initial connection event
          controller.enqueue(encoder.encode(`event: connected\ndata: {"projectId":"${projectId}"}\n\n`));

          const startTime = Date.now();
          let seenEvents = new Set<string>();

          // Loop constraint: Netlify Functions have 10-26s timeout. 
          // We'll run for ~20s then close gracefully to let client reconnect.
          while (Date.now() - startTime < 20000) {
            try {
              const events = await readEvents(projectId, runId || undefined);

              // Filter and verify we haven't sent this specific event content/timestamp before
              // (Simple dedup based on timestamp+agent+status)
              for (const evt of events) {
                const signature = `${evt.timestamp}-${evt.agent}-${evt.status}`;
                if (!seenEvents.has(signature)) {
                  const id = Date.now();
                  controller.enqueue(encoder.encode(`id: ${id}\n`));
                  controller.enqueue(encoder.encode(`event: progress\n`));
                  controller.enqueue(encoder.encode(`retry: 2000\n`));
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(evt)}\n\n`));
                  seenEvents.add(signature);

                  // If complete/failed, we can close the stream early
                  if (evt.status === 'completed' || evt.status === 'failed') {
                    controller.enqueue(encoder.encode(`event: complete\ndata: {"projectId":"${projectId}","status":"${evt.status}"}\n\n`));
                    controller.close();
                    return;
                  }
                }
              }

              // Heartbeat (comment) to keep connection alive
              controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));

              // Wait 2s before polling again
              await new Promise(r => setTimeout(r, 2000));

            } catch (err) {
              console.error('SSE polling error:', err);
              controller.enqueue(encoder.encode(`event: error\ndata: {"message":"polling_error"}\n\n`));
              controller.close();
              return;
            }
          }

          // Graceful close before timeout
          controller.close();
        }
      });

      return new Response(stream, {
        status: 200,
        headers: {
          ...cors,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform', // Ensure no buffering/compression
          'Connection': 'keep-alive',
        },
      });
    }

    // ------------------------------------------------------------------------
    // POLLING MODE (Legacy)
    // ------------------------------------------------------------------------
    const events = await readEvents(projectId, runId || undefined);
    return new Response(JSON.stringify({ projectId, runId, events, count: events.length }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as Partial<ProgressEvent>;
      if (!body.projectId || !body.agent) {
        return new Response(JSON.stringify({ error: 'projectId and agent are required' }), {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }
      const projectId = body.projectId;
      const runId = body.runId;
      const event: ProgressEvent = {
        projectId,
        runId,
        agent: body.agent,
        status: (body.status as ProgressStatus) || 'running',
        message: body.message || '',
        timestamp: body.timestamp || new Date().toISOString(),
        progress: typeof body.progress === 'number' ? body.progress : 0,
        metadata: body.metadata,
      };

      const trimmed = await appendProgress(projectId, runId, event);

      return new Response(
        JSON.stringify({ received: true, eventCount: trimmed.length, latest: event }),
        { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    } catch (e: any) {
      console.error('progress error', e);
      return new Response(JSON.stringify({ error: e?.message || 'unknown_error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
};
