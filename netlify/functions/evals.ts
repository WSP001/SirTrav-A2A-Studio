/**
 * EVALS - Evaluation Metrics Service
 * 
 * PURPOSE: Track and report pipeline quality metrics
 * 
 * INPUT: { projectId, metrics } or GET for reports
 * OUTPUT: { report, averages, trends }
 * 
 * Metrics tracked:
 * - Relevance: How well does output match input intent
 * - Coherence: Is the narrative logical and flowing
 * - Quality: Technical quality of audio/video
 * - User satisfaction: Thumbs up/down ratings
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface EvalMetrics {
  projectId: string;
  timestamp: string;
  relevance: number;      // 0-1 score
  coherence: number;      // 0-1 score
  quality: number;        // 0-1 score
  userRating?: 'good' | 'bad' | null;
  duration_ms: number;
  agents: {
    director: { success: boolean; duration_ms: number };
    writer: { success: boolean; duration_ms: number };
    voice: { success: boolean; duration_ms: number };
    composer: { success: boolean; duration_ms: number };
    editor: { success: boolean; duration_ms: number };
    attribution: { success: boolean; duration_ms: number };
    publisher: { success: boolean; duration_ms: number };
  };
}

interface EvalReport {
  totalRuns: number;
  successRate: number;
  averages: {
    relevance: number;
    coherence: number;
    quality: number;
    duration_ms: number;
  };
  userSatisfaction: {
    good: number;
    bad: number;
    unrated: number;
  };
  agentPerformance: Record<string, { successRate: number; avgDuration: number }>;
  recentRuns: EvalMetrics[];
}

// In-memory store (use DB in production)
const evalStore: EvalMetrics[] = [];

/**
 * Calculate averages from metrics array
 */
function calculateAverages(metrics: EvalMetrics[]): EvalReport['averages'] {
  if (metrics.length === 0) {
    return { relevance: 0, coherence: 0, quality: 0, duration_ms: 0 };
  }
  
  const sum = metrics.reduce((acc, m) => ({
    relevance: acc.relevance + m.relevance,
    coherence: acc.coherence + m.coherence,
    quality: acc.quality + m.quality,
    duration_ms: acc.duration_ms + m.duration_ms,
  }), { relevance: 0, coherence: 0, quality: 0, duration_ms: 0 });
  
  return {
    relevance: sum.relevance / metrics.length,
    coherence: sum.coherence / metrics.length,
    quality: sum.quality / metrics.length,
    duration_ms: sum.duration_ms / metrics.length,
  };
}

/**
 * Calculate agent performance stats
 */
function calculateAgentPerformance(metrics: EvalMetrics[]): Record<string, { successRate: number; avgDuration: number }> {
  const agents = ['director', 'writer', 'voice', 'composer', 'editor', 'attribution', 'publisher'];
  const result: Record<string, { successRate: number; avgDuration: number }> = {};
  
  for (const agent of agents) {
    const agentMetrics = metrics.map(m => m.agents[agent as keyof typeof m.agents]).filter(Boolean);
    if (agentMetrics.length === 0) {
      result[agent] = { successRate: 0, avgDuration: 0 };
      continue;
    }
    
    const successCount = agentMetrics.filter(a => a.success).length;
    const totalDuration = agentMetrics.reduce((sum, a) => sum + a.duration_ms, 0);
    
    result[agent] = {
      successRate: successCount / agentMetrics.length,
      avgDuration: totalDuration / agentMetrics.length,
    };
  }
  
  return result;
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
  
  // GET - Retrieve evaluation report
  if (event.httpMethod === 'GET') {
    const projectId = event.queryStringParameters?.projectId;
    
    let metrics = evalStore;
    if (projectId) {
      metrics = evalStore.filter(m => m.projectId === projectId);
    }
    
    const successfulRuns = metrics.filter(m => 
      Object.values(m.agents).every(a => a.success)
    );
    
    const report: EvalReport = {
      totalRuns: metrics.length,
      successRate: metrics.length > 0 ? successfulRuns.length / metrics.length : 0,
      averages: calculateAverages(metrics),
      userSatisfaction: {
        good: metrics.filter(m => m.userRating === 'good').length,
        bad: metrics.filter(m => m.userRating === 'bad').length,
        unrated: metrics.filter(m => !m.userRating).length,
      },
      agentPerformance: calculateAgentPerformance(metrics),
      recentRuns: metrics.slice(-10).reverse(),
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(report),
    };
  }
  
  // POST - Submit new evaluation metrics
  if (event.httpMethod === 'POST') {
    try {
      const metrics: EvalMetrics = JSON.parse(event.body || '{}');
      
      if (!metrics.projectId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'projectId is required' }),
        };
      }
      
      // Set defaults
      metrics.timestamp = metrics.timestamp || new Date().toISOString();
      metrics.relevance = metrics.relevance ?? 0;
      metrics.coherence = metrics.coherence ?? 0;
      metrics.quality = metrics.quality ?? 0;
      metrics.duration_ms = metrics.duration_ms ?? 0;
      
      // Store metrics
      evalStore.push(metrics);
      
      // Keep only last 1000 entries
      if (evalStore.length > 1000) {
        evalStore.shift();
      }
      
      console.log(`📊 Eval recorded: ${metrics.projectId} - R:${metrics.relevance.toFixed(2)} C:${metrics.coherence.toFixed(2)} Q:${metrics.quality.toFixed(2)}`);
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify({ 
          received: true,
          projectId: metrics.projectId,
          timestamp: metrics.timestamp,
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
