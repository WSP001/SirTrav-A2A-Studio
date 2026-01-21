import type { Handler } from './types';

const ok = (body: unknown) => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify(body),
});

const bad = (code: number, msg: string) => ({
  statusCode: code,
  headers: {
    'Access-Control-Allow-Origin': '*',
  },
  body: JSON.stringify({ ok: false, error: msg }),
});

export const handler: Handler = async (event) => {
  try {
    if (event.httpMethod === 'OPTIONS') {
      return ok({});
    }
    if (event.httpMethod !== 'POST') {
      return bad(405, 'Method Not Allowed');
    }

    const body = event.body ? JSON.parse(event.body) : {};
    const { vaultPrefix = 'content/intake/2025-11-01-week44', maxAssets = 12 } = body;

    const sample = [
      { file: 'IMG_0001.jpg', type: 'image', duration: 2, score: 0.82, tags: ['faces', 'smile'] },
      { file: 'VID_0002.mp4', type: 'video', trim: [3, 8], score: 0.79, tags: ['action'] },
      { file: 'IMG_0003.jpg', type: 'image', duration: 3, score: 0.77, tags: ['golden-hour'] },
    ].slice(0, maxAssets);

    return ok({
      ok: true,
      curated: {
        vaultPrefix,
        media_sequence: sample,
        strategy: {
          rules: ['Human connection', 'Good-take bias', 'Arc pacing'],
          notes: 'Placeholder curation; set GEMINI_API_KEY to enable AI vision.',
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'curate-media error';
    return bad(500, message);
  }
};

export default handler;
