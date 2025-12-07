/**
 * MCP - Model Context Protocol Gateway
 * 
 * PURPOSE: Secure gateway for external MCP tool calls
 * 
 * INPUT: { tool, params, token }
 * OUTPUT: { result } or { error }
 * 
 * Supported tools:
 * - pipeline.status: Get current pipeline status
 * - pipeline.trigger: Start a new video generation
 * - storage.list: List stored assets
 * - metrics.summary: Get evaluation summary
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface MCPRequest {
  tool: string;
  params?: Record<string, unknown>;
  token?: string;
}

interface MCPResponse {
  success: boolean;
  tool: string;
  result?: unknown;
  error?: string;
  timestamp: string;
}

/**
 * Validate MCP token
 */
function validateToken(token?: string): boolean {
  const secretToken = process.env.MCP_SECRET_TOKEN;
  
  // If no secret configured, allow in development
  if (!secretToken) {
    console.log('⚠️ MCP_SECRET_TOKEN not set, allowing request');
    return true;
  }
  
  return token === secretToken;
}

/**
 * Handle pipeline.status tool
 */
async function handlePipelineStatus(params: Record<string, unknown>): Promise<unknown> {
  const projectId = params.projectId as string;
  
  if (!projectId) {
    return { status: 'idle', message: 'No active pipeline' };
  }
  
  // In production, would query actual pipeline state
  return {
    projectId,
    status: 'ready',
    agents: {
      director: 'ready',
      writer: 'ready',
      voice: 'ready',
      composer: 'ready',
      editor: 'ready',
      attribution: 'ready',
      publisher: 'ready',
    },
    lastRun: null,
  };
}

/**
 * Handle pipeline.trigger tool
 */
async function handlePipelineTrigger(params: Record<string, unknown>): Promise<unknown> {
  const projectId = params.projectId as string || `proj_${Date.now()}`;
  const prompt = params.prompt as string || '';
  
  // In production, would actually trigger the pipeline
  return {
    triggered: true,
    projectId,
    prompt: prompt.substring(0, 100),
    message: 'Pipeline queued for execution',
    estimatedDuration: '2-5 minutes',
  };
}

/**
 * Handle storage.list tool
 */
async function handleStorageList(params: Record<string, unknown>): Promise<unknown> {
  const prefix = params.prefix as string || '';
  const limit = (params.limit as number) || 20;
  
  // In production, would query actual storage
  return {
    prefix,
    items: [],
    count: 0,
    message: 'Storage listing requires deployment with Netlify Blobs',
  };
}

/**
 * Handle metrics.summary tool
 */
async function handleMetricsSummary(params: Record<string, unknown>): Promise<unknown> {
  // In production, would query actual metrics
  return {
    totalRuns: 0,
    successRate: 0,
    averageQuality: 0,
    message: 'Run some pipelines to generate metrics',
  };
}

/**
 * Tool registry
 */
const TOOLS: Record<string, (params: Record<string, unknown>) => Promise<unknown>> = {
  'pipeline.status': handlePipelineStatus,
  'pipeline.trigger': handlePipelineTrigger,
  'storage.list': handleStorageList,
  'metrics.summary': handleMetricsSummary,
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-MCP-Token',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  // GET - List available tools
  if (event.httpMethod === 'GET') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        name: 'SirTrav A2A Studio MCP Gateway',
        version: '2.0.0',
        tools: Object.keys(TOOLS).map(name => ({
          name,
          description: `Execute ${name} operation`,
        })),
      }),
    };
  }
  
  // POST - Execute tool
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const request: MCPRequest = JSON.parse(event.body || '{}');
    
    // Validate token
    const token = request.token || event.headers['x-mcp-token'];
    if (!validateToken(token)) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Invalid or missing MCP token',
          timestamp: new Date().toISOString(),
        }),
      };
    }
    
    // Validate tool
    if (!request.tool) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: 'Tool name is required',
          availableTools: Object.keys(TOOLS),
          timestamp: new Date().toISOString(),
        }),
      };
    }
    
    const toolHandler = TOOLS[request.tool];
    if (!toolHandler) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ 
          success: false,
          error: `Unknown tool: ${request.tool}`,
          availableTools: Object.keys(TOOLS),
          timestamp: new Date().toISOString(),
        }),
      };
    }
    
    // Execute tool
    console.log(`🔧 MCP: Executing ${request.tool}`);
    const result = await toolHandler(request.params || {});
    
    const response: MCPResponse = {
      success: true,
      tool: request.tool,
      result,
      timestamp: new Date().toISOString(),
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ MCP error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};

export { handler };
