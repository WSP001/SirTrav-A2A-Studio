/**
 * WRITER AGENT - Narrate Project
 * Agent 2 of 7 in the D2A Pipeline
 * 
 * PURPOSE: Generates narrative script using GPT-4 with fallback stubs
 * 
 * INPUT: { projectId, theme, mood, sceneCount }
 * OUTPUT: { narrative, scenes[], wordCount, estimatedDuration }
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface NarrateRequest {
  projectId: string;
  theme: string;
  mood: string;
  sceneCount: number;
}

interface Scene {
  id: number;
  text: string;
  duration: number;
  visualCue: string;
}

interface NarrateResponse {
  success: boolean;
  projectId: string;
  narrative: string;
  scenes: Scene[];
  wordCount: number;
  estimatedDuration: number;
  generatedBy: 'openai' | 'fallback';
}

/**
 * Generate narrative using OpenAI (if API key available)
 */
async function generateWithOpenAI(request: NarrateRequest): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️ No OpenAI API key, using fallback');
    return null;
  }
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a cinematic narrator for travel documentaries. Create compelling, visual narratives.`
          },
          {
            role: 'user',
            content: `Create a ${request.sceneCount}-scene narrative for project "${request.projectId}" with theme "${request.theme}" and mood "${request.mood}". Each scene should be 2-3 sentences.`
          }
        ],
        max_tokens: 1000,
        temperature: 0.8,
      }),
    });
    
    if (!response.ok) {
      console.error('OpenAI API error:', response.statusText);
      return null;
    }
    
    const data = await response.json();
    return data.choices[0]?.message?.content || null;
    
  } catch (error) {
    console.error('OpenAI request failed:', error);
    return null;
  }
}

/**
 * Fallback narrative generation (no API needed)
 */
function generateFallbackNarrative(request: NarrateRequest): { narrative: string; scenes: Scene[] } {
  const templates: Record<string, string[]> = {
    adventure: [
      "The journey begins where the ordinary ends, stepping into realms unknown.",
      "Each step forward reveals new horizons, challenges that shape the soul.",
      "In the heart of adventure, we discover not just places, but ourselves.",
      "The path winds through wonder, leading to moments that define a lifetime.",
    ],
    reflection: [
      "In stillness, we find the space to hear our own thoughts clearly.",
      "Time slows here, allowing memories to surface like gentle waves.",
      "The quiet moments hold the deepest truths, waiting to be noticed.",
      "Looking back, we see how far we've traveled, how much we've grown.",
    ],
    cinematic: [
      "Light breaks through the horizon, painting the world in golden hues.",
      "The camera captures what words cannot—pure, unfiltered emotion.",
      "Every frame tells a story, every moment becomes eternal.",
      "As the scene unfolds, we witness beauty in its most authentic form.",
    ],
  };
  
  const sceneTexts = templates[request.theme] || templates.cinematic;
  const scenes: Scene[] = [];
  
  for (let i = 0; i < request.sceneCount; i++) {
    scenes.push({
      id: i + 1,
      text: sceneTexts[i % sceneTexts.length],
      duration: 8 + Math.random() * 4, // 8-12 seconds per scene
      visualCue: `Scene ${i + 1}: ${request.mood} atmosphere`,
    });
  }
  
  const narrative = scenes.map(s => s.text).join(' ');
  
  return { narrative, scenes };
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('✍️ WRITER AGENT - Narrate Project');
  
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
    const request: NarrateRequest = JSON.parse(event.body || '{}');
    
    if (!request.projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId is required' }),
      };
    }
    
    // Set defaults
    request.theme = request.theme || 'cinematic';
    request.mood = request.mood || 'inspiring';
    request.sceneCount = request.sceneCount || 4;
    
    // Try OpenAI first, fallback to templates
    let narrative: string;
    let scenes: Scene[];
    let generatedBy: 'openai' | 'fallback' = 'fallback';
    
    const openaiNarrative = await generateWithOpenAI(request);
    
    if (openaiNarrative) {
      narrative = openaiNarrative;
      generatedBy = 'openai';
      // Parse scenes from OpenAI response (simplified)
      const sentencePairs = narrative.match(/[^.!?]+[.!?]+\s*[^.!?]+[.!?]+/g) || [narrative];
      scenes = sentencePairs.slice(0, request.sceneCount).map((text, i) => ({
        id: i + 1,
        text: text.trim(),
        duration: 10,
        visualCue: `Scene ${i + 1}`,
      }));
    } else {
      const fallback = generateFallbackNarrative(request);
      narrative = fallback.narrative;
      scenes = fallback.scenes;
    }
    
    const wordCount = narrative.split(/\s+/).length;
    const estimatedDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
    
    const response: NarrateResponse = {
      success: true,
      projectId: request.projectId,
      narrative,
      scenes,
      wordCount,
      estimatedDuration,
      generatedBy,
    };
    
    console.log(`✅ Generated ${scenes.length} scenes, ${wordCount} words (${generatedBy})`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ Writer Agent error:', error);
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
