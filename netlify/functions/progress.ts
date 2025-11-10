import type { Handler, HandlerEvent } from '@netlify/functions';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';

/**
 * Progress Tracking Function with SSE Streaming
 * 
 * Fixed Issues:
 * 1. Uses /tmp for writable storage (not read-only repo directory)
 * 2. Implements proper SSE streaming with heartbeat
 * 3. Handles errors explicitly (no silent failures)
 */

type ProgressEvent = {
  timestamp: string;
  agent: 'director' | 'writer' | 'voice' | 'composer' | 'editor' | 'publisher' | 'system';
  status: 'started' | 'progress' | 'completed' | 'error';
  message: string;
  projectId: string;
  progress?: number; // 0-1
  metadata?: Record<string, unknown>;
};

type ProgressLog = {
  projectId: string;
  events: ProgressEvent[];
  lastUpdated: string;
};

// ✅ FIX #1: Use writable /tmp directory (NOT repo directory)
const getProgressFilePath = (projectId?: string): string => {
  const tmpDir = process.env.TMPDIR || '/tmp';
  const progressDir = join(tmpDir, 'sirtrav-progress');
  
  // Ensure directory exists
  if (!existsSync(progressDir)) {
    mkdirSync(progressDir, { recursive: true });
  }
  
  if (projectId) {
    return join(progressDir, `${projectId}.json`);
  }
  return join(progressDir, 'all-projects.json');
};

// Read progress log from /tmp
const readProgressLog = (projectId: string): ProgressLog => {
  const filePath = getProgressFilePath(projectId);
  
  if (!existsSync(filePath)) {
    return {
      projectId,
      events: [],
      lastUpdated: new Date().toISOString(),
    };
  }
  
  try {
    const content = readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Failed to read progress log for ${projectId}:`, error);
    return {
      projectId,
      events: [],
      lastUpdated: new Date().toISOString(),
    };
  }
};

// Write progress log to /tmp (with error handling)
const writeProgressLog = (log: ProgressLog): void => {
  const filePath = getProgressFilePath(log.projectId);
  
  try {
    // Ensure parent directory exists
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    log.lastUpdated = new Date().toISOString();
    writeFileSync(filePath, JSON.stringify(log, null, 2), 'utf-8');
    console.log(`✅ Progress logged to ${filePath}`);
  } catch (error) {
    // ✅ FIX #3: Make errors LOUD (don't swallow)
    console.error(`❌ Failed to write progress log for ${log.projectId}:`, error);
    throw new Error(`Progress write failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Append event to progress log
const appendProgressEvent = (event: ProgressEvent): void => {
  const log = readProgressLog(event.projectId);
  log.events.push(event);
  writeProgressLog(log);
};

// ✅ FIX #2: Proper SSE streaming implementation
export const handler: Handler = async (event: HandlerEvent) => {
  const { httpMethod, body, queryStringParameters } = event;
  const projectId = queryStringParameters?.projectId;

  // POST: Log a new progress event
  if (httpMethod === 'POST') {
    if (!body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Request body required' }),
      };
    }

    try {
      const eventData: ProgressEvent = JSON.parse(body);
      
      if (!eventData.projectId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'projectId required' }),
        };
      }

      // Add timestamp if not provided
      if (!eventData.timestamp) {
        eventData.timestamp = new Date().toISOString();
      }

      appendProgressEvent(eventData);

      return {
        statusCode: 200,
        body: JSON.stringify({
          ok: true,
          message: 'Progress event logged',
          event: eventData,
        }),
      };
    } catch (error) {
      console.error('Error logging progress:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: 'Failed to log progress',
          detail: error instanceof Error ? error.message : String(error),
        }),
      };
    }
  }

  // GET: Stream progress events via SSE
  if (httpMethod === 'GET') {
    if (!projectId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'projectId query parameter required' }),
      };
    }

    // For SSE streaming, we need to return a proper streaming response
    // Netlify Functions support Response objects with ReadableStream
    
    const encoder = new TextEncoder();
    let isClosed = false;
    
    const stream = new ReadableStream({
      async start(controller) {
        console.log(`🔄 SSE stream started for project: ${projectId}`);
        
        // Send initial events immediately
        try {
          const log = readProgressLog(projectId);
          
          // Send existing events
          for (const evt of log.events) {
            if (isClosed) break;
            const data = `data: ${JSON.stringify(evt)}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          console.error('Error sending initial events:', error);
        }

        // Set up heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          if (isClosed) {
            clearInterval(heartbeatInterval);
            return;
          }
          
          try {
            // SSE comment (keeps connection alive)
            controller.enqueue(encoder.encode(': heartbeat\n\n'));
          } catch (error) {
            console.error('Heartbeat error:', error);
            clearInterval(heartbeatInterval);
          }
        }, 30000); // 30 seconds

        // Poll for new events (in production, use pub/sub or WebSocket)
        const pollInterval = setInterval(() => {
          if (isClosed) {
            clearInterval(pollInterval);
            clearInterval(heartbeatInterval);
            return;
          }

          try {
            const log = readProgressLog(projectId);
            const latestEvent = log.events[log.events.length - 1];
            
            if (latestEvent) {
              const data = `data: ${JSON.stringify(latestEvent)}\n\n`;
              controller.enqueue(encoder.encode(data));
            }

            // Close stream if project completed
            if (latestEvent?.status === 'completed' || latestEvent?.status === 'error') {
              clearInterval(pollInterval);
              clearInterval(heartbeatInterval);
              controller.close();
              isClosed = true;
            }
          } catch (error) {
            console.error('Poll error:', error);
          }
        }, 2000); // Poll every 2 seconds

        // Cleanup on stream abort
        if (event.headers && event.headers['connection'] === 'close') {
          clearInterval(pollInterval);
          clearInterval(heartbeatInterval);
          controller.close();
          isClosed = true;
        }
      },
      
      cancel() {
        console.log(`🛑 SSE stream cancelled for project: ${projectId}`);
        isClosed = true;
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable nginx buffering
      },
    });
  }

  // Method not allowed
  return {
    statusCode: 405,
    headers: {
      Allow: 'GET, POST',
    },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};

export default handler;
