/**
 * DIRECTOR AGENT - Curate Media
 * Agent 1 of 7 in the D2A Pipeline
 * 
 * PURPOSE: Curates media from vault, learns from memory_index.json
 * 
 * INPUT: { projectId, vaultPrefix, maxAssets }
 * OUTPUT: { assets[], theme, mood, assetCount }
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// Memory index for EGO-Prompt learning
interface MemoryEntry {
  projectId: string;
  theme: string;
  mood: string;
  rating: number;
  timestamp: string;
}

interface CuratedAsset {
  id: string;
  path: string;
  type: 'image' | 'video' | 'audio';
  duration?: number;
  metadata: Record<string, unknown>;
}

interface CurateRequest {
  projectId: string;
  vaultPrefix: string;
  maxAssets?: number;
}

interface CurateResponse {
  success: boolean;
  projectId: string;
  assets: CuratedAsset[];
  theme: string;
  mood: string;
  assetCount: number;
  learnedFrom?: string[];
}

// Simulated memory index (would read from storage in production)
const MEMORY_INDEX: MemoryEntry[] = [
  { projectId: 'week42', theme: 'adventure', mood: 'exciting', rating: 4.5, timestamp: '2024-10-15' },
  { projectId: 'week43', theme: 'reflection', mood: 'calm', rating: 4.2, timestamp: '2024-10-22' },
];

/**
 * Learn from past successful projects (EGO-Prompt pattern)
 */
function learnFromHistory(memory: MemoryEntry[]): { preferredThemes: string[], preferredMoods: string[] } {
  const highRated = memory.filter(m => m.rating >= 4.0);
  
  return {
    preferredThemes: [...new Set(highRated.map(m => m.theme))],
    preferredMoods: [...new Set(highRated.map(m => m.mood))],
  };
}

/**
 * Generate curated assets (placeholder for real vault scanning)
 */
function generatePlaceholderAssets(projectId: string, maxAssets: number): CuratedAsset[] {
  const assets: CuratedAsset[] = [];
  const types: ('image' | 'video')[] = ['image', 'video', 'image', 'image'];
  
  for (let i = 0; i < Math.min(maxAssets, 8); i++) {
    assets.push({
      id: `asset-${projectId}-${i}`,
      path: `vault/${projectId}/media_${i}.${types[i % types.length] === 'video' ? 'mp4' : 'jpg'}`,
      type: types[i % types.length],
      duration: types[i % types.length] === 'video' ? 10 + Math.random() * 20 : undefined,
      metadata: {
        captured: new Date().toISOString(),
        quality: 'high',
        index: i
      }
    });
  }
  
  return assets;
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('🎬 DIRECTOR AGENT - Curate Media');
  
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const request: CurateRequest = JSON.parse(event.body || '{}');
    
    if (!request.projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId is required' }),
      };
    }
    
    // Learn from past projects (EGO-Prompt)
    const learned = learnFromHistory(MEMORY_INDEX);
    console.log(`📚 Learned preferences: ${JSON.stringify(learned)}`);
    
    // Select theme and mood based on learning
    const theme = learned.preferredThemes[0] || 'cinematic';
    const mood = learned.preferredMoods[0] || 'inspiring';
    
    // Generate curated assets
    const assets = generatePlaceholderAssets(request.projectId, request.maxAssets || 12);
    
    const response: CurateResponse = {
      success: true,
      projectId: request.projectId,
      assets,
      theme,
      mood,
      assetCount: assets.length,
      learnedFrom: MEMORY_INDEX.map(m => m.projectId),
    };
    
    console.log(`✅ Curated ${assets.length} assets with theme: ${theme}, mood: ${mood}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ Director Agent error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
    };
  }
};

export { handler };
