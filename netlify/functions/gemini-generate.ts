/**
 * Server-side Gemini proxy.
 *
 * Keeps GEMINI_API_KEY out of browser bundles while preserving a small
 * frontend helper surface for text and vision prompts.
 */

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash',
  'gemini-2.5-pro',
]);

function extractText(data: any): string {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part: any) => part?.text || '')
    .filter(Boolean)
    .join('\n')
    .trim() || '';
}

export default async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        ok: false,
        disabled: true,
        error: 'GEMINI_API_KEY is not configured on the server',
      }),
      { status: 503, headers },
    );
  }

  try {
    const body = await req.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    const model = ALLOWED_MODELS.has(body.model) ? body.model : 'gemini-2.5-flash';

    if (!prompt) {
      return new Response(JSON.stringify({ ok: false, error: 'prompt_required' }), {
        status: 400,
        headers,
      });
    }

    const parts: any[] = [{ text: prompt }];
    if (body.imageBase64) {
      parts.push({
        inlineData: {
          data: body.imageBase64,
          mimeType: body.mimeType || 'image/jpeg',
        },
      });
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
        signal: AbortSignal.timeout(30000),
      },
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: data?.error?.message || `Gemini request failed with HTTP ${response.status}`,
          status: response.status,
        }),
        { status: response.status, headers },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        model,
        text: extractText(data),
      }),
      { status: 200, headers },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error instanceof Error ? error.message : 'gemini_generate_failed',
      }),
      { status: 500, headers },
    );
  }
};
