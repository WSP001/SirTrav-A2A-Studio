import type { Handler, HandlerEvent } from '@netlify/functions';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface AttributionInput {
  projectId: string;
  runId?: string;
  outputs?: {
    director?: string;
    writer?: string;
    voice?: string;
    composer?: string;
    editor?: string;
  };
}

interface Credits {
  project_id: string;
  run_id?: string;
  created_at: string;
  services_used: {
    director: { service: string; model: string; task: string };
    writer: { service: string; model: string; task: string };
    voice: { service: string; model: string; task: string };
    composer: { service: string; model: string; task: string };
    editor: { service: string; tool: string; task: string };
  };
  commons_good_statement: string;
  license: string;
  total_cost_usd?: number;
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const input: AttributionInput = JSON.parse(event.body || '{}');

    if (!input.projectId) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'projectId required' }) };
    }

    const tmpDir = process.env.TMPDIR || '/tmp';
    const projectDir = join(tmpDir, input.projectId);
    if (!existsSync(projectDir)) {
      mkdirSync(projectDir, { recursive: true });
    }

    // Best-effort cost aggregation from referenced outputs
    let totalCost = 0;
    const outputs = input.outputs || {};
    for (const outputPath of Object.values(outputs)) {
      if (outputPath && existsSync(outputPath)) {
        try {
          const data = JSON.parse(readFileSync(outputPath, 'utf-8'));
          if (data.cost_usd) totalCost += Number(data.cost_usd) || 0;
        } catch {
          // ignore parse errors
        }
      }
    }

    const credits: Credits = {
      project_id: input.projectId,
      run_id: input.runId,
      created_at: new Date().toISOString(),
      services_used: {
        director: {
          service: 'Google Gemini',
          model: 'gemini-2.0-flash',
          task: 'Vision analysis and scene curation',
        },
        writer: {
          service: 'OpenAI',
          model: 'gpt-4',
          task: 'Narrative script generation',
        },
        voice: {
          service: 'ElevenLabs',
          model: 'eleven_multilingual_v2',
          task: 'Text-to-speech narration',
        },
        composer: {
          service: 'Suno AI',
          model: 'suno-v3',
          task: 'Original soundtrack composition',
        },
        editor: {
          service: 'FFmpeg',
          tool: 'ffmpeg 6.0',
          task: 'Video compilation and audio mixing',
        },
      },
      commons_good_statement:
        'This video was created using AI tools in service of the Commons Good. ' +
        'All AI services are credited transparently. SirTrav A2A Studio is committed to ethical AI use and proper attribution.',
      license: 'CC BY-SA 4.0 (Creative Commons Attribution-ShareAlike)',
      total_cost_usd: totalCost,
    };

    const creditsPath = join(projectDir, 'credits.json');
    writeFileSync(creditsPath, JSON.stringify(credits, null, 2));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        projectId: input.projectId,
        runId: input.runId,
        credits_file: creditsPath,
        credits,
      }),
    };
  } catch (error: any) {
    console.error('Attribution error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: 'attribution_failed', detail: error.message }),
    };
  }
};

export default handler;
