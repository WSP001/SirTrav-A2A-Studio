/**
 * CORRELATE - Trace Correlation Service
 * 
 * PURPOSE: Link all agent operations under a single correlation ID
 * 
 * INPUT: { projectId } or { correlationId }
 * OUTPUT: { correlationId, projectId, traces[], timeline }
 * 
 * Used by: Debugging, observability, audit trails
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface TraceEvent {
  agent: string;
  action: string;
  timestamp: string;
  duration_ms?: number;
  status: 'started' | 'completed' | 'failed';
  metadata?: Record<string, unknown>;
}

interface CorrelationData {
  correlationId: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'failed';
  traces: TraceEvent[];
}

interface CorrelateRequest {
  projectId?: string;
  correlationId?: string;
  action?: 'create' | 'get' | 'update' | 'list';
  trace?: TraceEvent;
}

// In-memory store (use Redis/DB in production)
const correlationStore: Map<string, CorrelationData> = new Map();
const projectToCorrelation: Map<string, string> = new Map();

/**
 * Generate a unique correlation ID
 */
function generateCorrelationId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `corr_${timestamp}_${random}`;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  try {
    // GET - Retrieve correlation by ID or projectId
    if (event.httpMethod === 'GET') {
      const correlationId = event.queryStringParameters?.correlationId;
      const projectId = event.queryStringParameters?.projectId;
      
      let data: CorrelationData | undefined;
      
      if (correlationId) {
        data = correlationStore.get(correlationId);
      } else if (projectId) {
        const corrId = projectToCorrelation.get(projectId);
        if (corrId) data = correlationStore.get(corrId);
      }
      
      if (!data) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Correlation not found' }),
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data),
      };
    }
    
    // POST - Create or update correlation
    if (event.httpMethod === 'POST') {
      const request: CorrelateRequest = JSON.parse(event.body || '{}');
      const action = request.action || 'create';
      
      if (action === 'create') {
        if (!request.projectId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'projectId is required for create' }),
          };
        }
        
        // Check if correlation already exists for this project
        const existingCorrId = projectToCorrelation.get(request.projectId);
        if (existingCorrId) {
          const existing = correlationStore.get(existingCorrId);
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              message: 'Correlation already exists',
              ...existing,
            }),
          };
        }
        
        // Create new correlation
        const correlationId = generateCorrelationId();
        const now = new Date().toISOString();
        
        const data: CorrelationData = {
          correlationId,
          projectId: request.projectId,
          createdAt: now,
          updatedAt: now,
          status: 'active',
          traces: [],
        };
        
        correlationStore.set(correlationId, data);
        projectToCorrelation.set(request.projectId, correlationId);
        
        console.log(`🔗 Created correlation: ${correlationId} for project ${request.projectId}`);
        
        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(data),
        };
      }
      
      if (action === 'update') {
        const correlationId = request.correlationId;
        if (!correlationId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'correlationId is required for update' }),
          };
        }
        
        const data = correlationStore.get(correlationId);
        if (!data) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Correlation not found' }),
          };
        }
        
        // Add trace event if provided
        if (request.trace) {
          request.trace.timestamp = request.trace.timestamp || new Date().toISOString();
          data.traces.push(request.trace);
          data.updatedAt = new Date().toISOString();
          
          // Update status if trace indicates completion or failure
          if (request.trace.agent === 'publisher' && request.trace.status === 'completed') {
            data.status = 'completed';
          } else if (request.trace.status === 'failed') {
            data.status = 'failed';
          }
          
          correlationStore.set(correlationId, data);
        }
        
        console.log(`🔗 Updated correlation: ${correlationId}`);
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(data),
        };
      }
      
      if (action === 'list') {
        const allCorrelations = Array.from(correlationStore.values())
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 50); // Limit to 50 most recent
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ correlations: allCorrelations }),
        };
      }
      
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid action' }),
      };
    }
    
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
    
  } catch (error) {
    console.error('❌ Correlate error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
    };
  }
};

export { handler };
