/**
 * WRITER AGENT - Narrate Project
 * Agent 2 of 7 in the D2A Pipeline
 * 
 * PURPOSE: Generates narrative script using Flash First rule:
 *   1. Gemini Flash (primary — fast, cheap, 1M+ context)
 *   2. OpenAI GPT-4 (fallback — if Gemini unavailable)
 *   3. Template stubs (last resort — always works, no API needed)
 * 
 * INPUT: { projectId, theme, mood, sceneCount }
 * OUTPUT: { narrative, scenes[], wordCount, estimatedDuration }
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { readMemoryIndex, learnFromHistory } from './lib/memory';

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
  generatedBy: 'gemini' | 'openai' | 'fallback';
}

function buildFallbackResponse(projectId: string, note: string, error?: string): NarrateResponse & { note: string; error?: string } {
  const fallback = generateFallbackNarrative({
    projectId,
    theme: 'cinematic',
    mood: 'reflective',
    sceneCount: 3,
  });

  return {
    success: true,
    projectId,
    narrative: fallback.narrative,
    scenes: fallback.scenes,
    wordCount: fallback.narrative.split(/\s+/).filter(Boolean).length,
    estimatedDuration: fallback.scenes.reduce((sum, s) => sum + s.duration, 0),
    generatedBy: 'fallback',
    note,
    error,
  };
}

/**
 * Generate narrative using Gemini Flash (primary — Flash First rule)
 */
async function generateWithGemini(request: NarrateRequest): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.log('⚠️ No Gemini API key, trying OpenAI...');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    // gemini-2.5-flash: latest Flash model, fast, cheap, 1M+ context
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a cinematic narrator for travel documentaries. Create compelling, visual narratives.

Create a ${request.sceneCount}-scene narrative for project "${request.projectId}" with theme "${request.theme}" and mood "${request.mood}".

Return ONLY valid JSON in this exact format (no markdown, no code fences):
{
  "scenes": [
    { "id": 1, "text": "Scene narration text (2-3 sentences)", "duration": 10, "visualCue": "Visual direction" }
  ]
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    // Try to parse structured JSON from Gemini
    try {
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.scenes && Array.isArray(parsed.scenes)) {
        // Return the raw text for the narrative, scenes will be parsed in handler
        return JSON.stringify(parsed);
      }
    } catch {
      // If JSON parsing fails, return raw text (handler will split into scenes)
    }

    return text || null;
  } catch (error) {
    console.error('Gemini request failed:', error);
    return null;
  }
}

/**
 * Generate narrative using OpenAI GPT-4 (fallback when Gemini unavailable)
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
    // Netlify Dev may base64-encode the body or pass it as-is
    let rawBody = event.body || '{}';
    if (event.isBase64Encoded && typeof rawBody === 'string') {
      rawBody = Buffer.from(rawBody, 'base64').toString('utf-8');
    }
    const request: NarrateRequest = typeof rawBody === 'object' ? rawBody as any : JSON.parse(rawBody);

    if (!request.projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId is required' }),
      };
    }

    // Load memory for context (safe fallback if memory store is unavailable)
    let learnedMood = 'cinematic';
    try {
      const memory = readMemoryIndex('./Sir-TRAV-scott'); // Default vault path
      learnedMood = learnFromHistory(memory);
    } catch (memoryError) {
      console.warn('⚠️ Memory load failed, using cinematic defaults:', memoryError);
    }

    // Set defaults with memory persistence
    request.theme = request.theme || learnedMood;
    request.mood = request.mood || (learnedMood === 'energetic' ? 'inspiring' : 'reflective');
    request.sceneCount = request.sceneCount || 4;

    // Flash First: Gemini → OpenAI → templates
    let narrative: string;
    let scenes: Scene[];
    let generatedBy: 'gemini' | 'openai' | 'fallback' = 'fallback';

    // 1. Try Gemini Flash (primary)
    const geminiResult = await generateWithGemini(request);
    if (geminiResult) {
      generatedBy = 'gemini';
      // Try to parse structured JSON from Gemini
      try {
        const parsed = JSON.parse(geminiResult);
        if (parsed.scenes && Array.isArray(parsed.scenes)) {
          scenes = parsed.scenes.slice(0, request.sceneCount).map((s: any, i: number) => ({
            id: s.id || i + 1,
            text: String(s.text || ''),
            duration: Number(s.duration) || 10,
            visualCue: String(s.visualCue || `Scene ${i + 1}`),
          }));
          narrative = scenes.map(s => s.text).join(' ');
        } else {
          throw new Error('No scenes array in parsed JSON');
        }
      } catch {
        // Gemini returned raw text, split into scenes
        narrative = geminiResult;
        const sentencePairs = narrative.match(/[^.!?]+[.!?]+\s*[^.!?]+[.!?]+/g) || [narrative];
        scenes = sentencePairs.slice(0, request.sceneCount).map((text, i) => ({
          id: i + 1,
          text: text.trim(),
          duration: 10,
          visualCue: `Scene ${i + 1}`,
        }));
      }
    } else {
      // 2. Try OpenAI (fallback)
      const openaiNarrative = await generateWithOpenAI(request);
      if (openaiNarrative) {
        narrative = openaiNarrative;
        generatedBy = 'openai';
        const sentencePairs = narrative.match(/[^.!?]+[.!?]+\s*[^.!?]+[.!?]+/g) || [narrative];
        scenes = sentencePairs.slice(0, request.sceneCount).map((text, i) => ({
          id: i + 1,
          text: text.trim(),
          duration: 10,
          visualCue: `Scene ${i + 1}`,
        }));
      } else {
        // 3. Template fallback (always works)
        const fallback = generateFallbackNarrative(request);
        narrative = fallback.narrative;
        scenes = fallback.scenes;
      }
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

  } catch (error: any) {
    console.error('❌ Writer Agent error (graceful fallback):', error);
    const projectId = (() => {
      try {
        if (!event.body) return 'unknown';
        const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf-8') : event.body;
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return parsed?.projectId || 'unknown';
      } catch {
        return 'unknown';
      }
    })();
    const fallbackResponse = buildFallbackResponse(
      projectId,
      'Generated via fallback due to API/provider or runtime unavailability.',
      error?.message || 'Unknown error'
    );
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(fallbackResponse),
    };
  }
};

export { handler };
