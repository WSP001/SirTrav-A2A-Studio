/**
 * PROGRESS TRACKING - Pipeline Progress Events with SSE
 * Receives and stores progress events from all agents
 * Supports Server-Sent Events for real-time updates
 * 
 * GET with Accept: text/event-stream → SSE stream
 * GET with Accept: application/json → JSON response
 * POST → Log progress event
 * 
 * INPUT: { projectId, agent, status, message, progress, metadata }
 * OUTPUT: SSE stream or { received: true, events: [...] }
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface ProgressEvent {
  projectId: string;
  agent: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  progress: number; // 0-100
  metadata?: Record<string, unknown>;
}

// In-memory store (use Redis/DB in production)
const progressStore: Map<string, ProgressEvent[]> = new Map();

// SSE subscribers (for real-time updates)
const subscribers: Map<string, Array<(event: ProgressEvent) => void>> = new Map();

/**
 * Notify all subscribers for a project
 */
function notifySubscribers(projectId: string, event: ProgressEvent): void {
  const subs = subscribers.get(projectId) || [];
  subs.forEach(callback => callback(event));
}

/**
 * Format event for SSE
 */
function formatSSE(event: ProgressEvent): string {
  return `event: progress\ndata: ${JSON.stringify(event)}\n\n`;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Accept',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  
  // GET - Retrieve progress (JSON or SSE)
  if (event.httpMethod === 'GET') {
    const projectId = event.queryStringParameters?.projectId;
    const acceptHeader = event.headers['accept'] || event.headers['Accept'] || '';
    const wantSSE = acceptHeader.includes('text/event-stream');
    
    if (!projectId) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'projectId query parameter required' }),
      };
    }
    
    // SSE Mode - Return current events as SSE stream
    if (wantSSE) {
      const events = progressStore.get(projectId) || [];
      
      // Build SSE response with all current events
      let sseBody = `: SirTrav A2A Progress Stream\n`;
      sseBody += `event: connected\ndata: {"projectId":"${projectId}"}\n\n`;
      
      for (const evt of events) {
        sseBody += formatSSE(evt);
      }
      
      // Check if pipeline is complete
      const lastEvent = events[events.length - 1];
      const isComplete = lastEvent && 
        (lastEvent.status === 'completed' || lastEvent.status === 'failed') &&
        lastEvent.agent === 'publisher';
      
      if (isComplete) {
        sseBody += `event: complete\ndata: {"projectId":"${projectId}","status":"${lastEvent.status}"}\n\n`;
      }
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: sseBody,
      };
    }
    
    // JSON Mode - Return events as JSON
    const events = progressStore.get(projectId) || [];
    
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, events, count: events.length }),
    };
  }
  
  // POST - Log a progress event
  if (event.httpMethod === 'POST') {
    const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
    
    try {
      const progressEvent: ProgressEvent = JSON.parse(event.body || '{}');
      
      if (!progressEvent.projectId || !progressEvent.agent) {
        return {
          statusCode: 400,
          headers: jsonHeaders,
          body: JSON.stringify({ error: 'projectId and agent are required' }),
        };
      }
      
      // Add timestamp if not provided
      progressEvent.timestamp = progressEvent.timestamp || new Date().toISOString();
      
      // Store event
      const events = progressStore.get(progressEvent.projectId) || [];
      events.push(progressEvent);
      progressStore.set(progressEvent.projectId, events);
      
      // Notify SSE subscribers
      notifySubscribers(progressEvent.projectId, progressEvent);
      
      console.log(`📊 Progress: [${progressEvent.agent}] ${progressEvent.status} - ${progressEvent.message}`);
      
      return {
        statusCode: 200,
        headers: jsonHeaders,
        body: JSON.stringify({ 
          received: true, 
          eventCount: events.length,
          latest: progressEvent 
        }),
      };
      
    } catch (error) {
      return {
        statusCode: 500,
        headers: jsonHeaders,
        body: JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }),
      };
    }
  }
  
  return {
    statusCode: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};

export { handler };
