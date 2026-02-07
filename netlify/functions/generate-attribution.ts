/**
 * ATTRIBUTION AGENT - Generate Attribution
 * Agent 7 of 7 in the D2A Pipeline
 *
 * PURPOSE: Compile Commons Good credits from all agents
 *
 * INPUT: { runId, projectId, agents }
 * OUTPUT: { for_the_commons_good, ai_attribution, cost_plus_20_percent, credits, markdown }
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { creditsStore } from './lib/storage';

interface AttributionRequest {
  projectId: string;
  runId?: string;
  agents?: string[] | Record<string, string>;
  services?: string[];
}

interface Credit {
  service: string;
  type: 'ai' | 'media' | 'platform' | 'human';
  description: string;
  license: string;
  url?: string;
}

interface AIAttribution {
  provider: string;
  [key: string]: string;
}

/**
 * Standard credits for services used in the pipeline
 */
const SERVICE_CREDITS: Record<string, Credit> = {
  openai: {
    service: 'OpenAI GPT-4',
    type: 'ai',
    description: 'Narrative script generation',
    license: 'OpenAI Terms of Use',
    url: 'https://openai.com',
  },
  elevenlabs: {
    service: 'ElevenLabs',
    type: 'ai',
    description: 'Voice synthesis and narration',
    license: 'ElevenLabs Terms of Service',
    url: 'https://elevenlabs.io',
  },
  suno: {
    service: 'Suno AI',
    type: 'ai',
    description: 'Original music composition',
    license: 'Suno Terms of Service',
    url: 'https://suno.ai',
  },
  ffmpeg: {
    service: 'FFmpeg',
    type: 'platform',
    description: 'Video compilation and processing',
    license: 'LGPL/GPL',
    url: 'https://ffmpeg.org',
  },
  netlify: {
    service: 'Netlify',
    type: 'platform',
    description: 'Serverless hosting and functions',
    license: 'Netlify Terms of Service',
    url: 'https://netlify.com',
  },
  sirtrav: {
    service: 'SirTrav A2A Studio',
    type: 'platform',
    description: 'D2A Pipeline orchestration',
    license: 'MIT',
    url: 'https://github.com/WSP001/SirTrav-A2A-Studio',
  },
};

/**
 * Map agent roles to their AI attribution details.
 * Uses the actual provider string from the pipeline when available.
 */
const AGENT_ATTRIBUTION: Record<string, { key: string; fallback: AIAttribution; real: AIAttribution }> = {
  director: {
    key: 'vision',
    fallback: { provider: 'Fallback', method: 'template' },
    real: { provider: 'OpenAI', model: 'GPT-4 Vision' },
  },
  writer: {
    key: 'script',
    fallback: { provider: 'Fallback', method: 'template' },
    real: { provider: 'OpenAI', model: 'GPT-4' },
  },
  voice: {
    key: 'voice',
    fallback: { provider: 'Placeholder', method: 'silent' },
    real: { provider: 'ElevenLabs', voice: 'Adam' },
  },
  composer: {
    key: 'music',
    fallback: { provider: 'Template', style: 'preset' },
    real: { provider: 'Suno AI', style: 'cinematic' },
  },
  editor: {
    key: 'video',
    fallback: { provider: 'Fallback', method: 'placeholder' },
    real: { provider: 'FFmpeg', method: 'compilation' },
  },
};

const FALLBACK_MARKERS = ['fallback', 'placeholder', 'template'];

/**
 * Build ai_attribution from agents input
 */
function buildAIAttribution(agents: string[] | Record<string, string>): Record<string, AIAttribution> {
  const attribution: Record<string, AIAttribution> = {};

  if (Array.isArray(agents)) {
    // Array format: ["director", "writer", ...] - assume all used real providers
    for (const agent of agents) {
      const config = AGENT_ATTRIBUTION[agent];
      if (config) {
        attribution[config.key] = config.real;
      }
    }
  } else {
    // Object format: { director: "openai_vision", writer: "fallback", ... }
    for (const [agent, provider] of Object.entries(agents)) {
      const config = AGENT_ATTRIBUTION[agent];
      if (config) {
        const isFallback = FALLBACK_MARKERS.includes(provider);
        attribution[config.key] = isFallback ? config.fallback : config.real;
      }
    }
  }

  return attribution;
}

/**
 * Resolve which services were used based on agents input
 */
function resolveServices(agents?: string[] | Record<string, string>): string[] {
  const services = new Set(['netlify', 'sirtrav']);

  if (!agents) return ['openai', 'elevenlabs', 'suno', 'ffmpeg', 'netlify', 'sirtrav'];

  const agentList = Array.isArray(agents) ? agents : Object.keys(agents);
  const providerValues = Array.isArray(agents) ? [] : Object.values(agents);

  if (agentList.includes('writer') || agentList.includes('director')) {
    const writerProvider = Array.isArray(agents) ? 'real' : (agents as Record<string, string>).writer;
    const directorProvider = Array.isArray(agents) ? 'real' : (agents as Record<string, string>).director;
    if (!FALLBACK_MARKERS.includes(writerProvider) || !FALLBACK_MARKERS.includes(directorProvider)) {
      services.add('openai');
    }
  }
  if (agentList.includes('voice')) {
    const voiceProvider = Array.isArray(agents) ? 'real' : (agents as Record<string, string>).voice;
    if (!FALLBACK_MARKERS.includes(voiceProvider)) services.add('elevenlabs');
  }
  if (agentList.includes('composer')) {
    const composerProvider = Array.isArray(agents) ? 'real' : (agents as Record<string, string>).composer;
    if (!FALLBACK_MARKERS.includes(composerProvider)) services.add('suno');
  }
  if (agentList.includes('editor')) {
    services.add('ffmpeg');
  }

  return Array.from(services);
}

/**
 * Generate markdown credits
 */
function generateMarkdown(credits: Credit[], projectId: string): string {
  let md = `# Credits - ${projectId}\n\n`;
  md += `*Generated by SirTrav A2A Studio*\n\n`;
  md += `## For the Commons Good\n\n`;
  md += `This project was created using open and AI-powered tools, attributed below.\n\n`;
  md += `---\n\n`;

  const byType: Record<string, Credit[]> = {};
  credits.forEach(c => {
    if (!byType[c.type]) byType[c.type] = [];
    byType[c.type].push(c);
  });

  const typeLabels: Record<string, string> = {
    ai: 'AI Services',
    platform: 'Platforms & Tools',
    media: 'Media Sources',
    human: 'Human Contributors',
  };

  for (const [type, typeCredits] of Object.entries(byType)) {
    md += `### ${typeLabels[type] || type}\n\n`;
    for (const credit of typeCredits) {
      md += `- **${credit.service}**: ${credit.description}`;
      if (credit.url) md += ` ([link](${credit.url}))`;
      md += `\n`;
      md += `  - License: ${credit.license}\n`;
    }
    md += `\n`;
  }

  md += `---\n\n`;
  md += `*Attribution generated on ${new Date().toISOString()}*\n`;

  return md;
}

const handler: Handler = async (event: HandlerEvent, _context: HandlerContext) => {
  console.log('📜 ATTRIBUTION AGENT - Generate Attribution');

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
    const request: AttributionRequest = JSON.parse(event.body || '{}');

    if (!request.projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId is required' }),
      };
    }

    const { projectId, runId, agents } = request;

    // Build AI attribution from agents input
    const ai_attribution = agents
      ? buildAIAttribution(agents)
      : {
          voice: { provider: 'ElevenLabs', voice: 'Adam' },
          music: { provider: 'Suno AI', style: 'cinematic' },
          script: { provider: 'OpenAI', model: 'GPT-4' },
        };

    // Resolve which services were actually used
    const usedServices = request.services || resolveServices(agents);
    const credits: Credit[] = usedServices
      .filter(s => SERVICE_CREDITS[s])
      .map(s => SERVICE_CREDITS[s]);

    // Generate markdown
    const markdown = generateMarkdown(credits, projectId);
    const generatedAt = new Date().toISOString();

    const response = {
      success: true,
      projectId,
      runId: runId || null,
      for_the_commons_good: true,
      ai_attribution,
      cost_plus_20_percent: true,
      credits,
      license: 'CC BY-SA 4.0',
      commonsGood: 'This work is shared for the Commons Good. Please attribute all contributors.',
      markdown,
      generated_at: generatedAt,
    };

    // Persist credits to Blobs storage
    if (runId) {
      try {
        const store = creditsStore;
        await store.uploadData(
          `${projectId}/${runId}/credits.json`,
          JSON.stringify(response, null, 2),
          { contentType: 'application/json', metadata: { projectId, runId } }
        );
        console.log(`📜 Credits saved to blobs: ${projectId}/${runId}/credits.json`);
      } catch (storeErr) {
        console.warn('📜 Credits blob save failed (non-fatal):', storeErr);
      }
    }

    console.log(`✅ Generated attribution with ${credits.length} credits for ${Object.keys(ai_attribution).length} agents`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };

  } catch (error) {
    console.error('❌ Attribution Agent error:', error);
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
