/**
 * PROGRESS TRACKING - Pipeline Progress Events
 * Receives and stores progress events from all agents
 * 
 * INPUT: { projectId, agent, status, message, progress, metadata }
 * OUTPUT: { received: true, events: [...] }
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

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  // GET - Retrieve progress for a project
  if (event.httpMethod === 'GET') {
    const projectId = event.queryStringParameters?.projectId;
    
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId query parameter required' }),
      };
    }
    
    const events = progressStore.get(projectId) || [];
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ projectId, events }),
    };
  }
  
  // POST - Log a progress event
  if (event.httpMethod === 'POST') {
    try {
      const progressEvent: ProgressEvent = JSON.parse(event.body || '{}');
      
      if (!progressEvent.projectId || !progressEvent.agent) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'projectId and agent are required' }),
        };
      }
      
      // Add timestamp if not provided
      progressEvent.timestamp = progressEvent.timestamp || new Date().toISOString();
      
      // Store event
      const events = progressStore.get(progressEvent.projectId) || [];
      events.push(progressEvent);
      progressStore.set(progressEvent.projectId, events);
      
      console.log(`📊 Progress: [${progressEvent.agent}] ${progressEvent.status} - ${progressEvent.message}`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          received: true, 
          eventCount: events.length,
          latest: progressEvent 
        }),
      };
      
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: error instanceof Error ? error.message : 'Unknown error' 
        }),
      };
    }
  }
  
  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};

export { handler };
