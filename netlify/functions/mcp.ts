import type { Handler } from './types';

type Tool = { name: string; description: string };

export const handler: Handler = async (event) => {
  const token = event.headers?.['x-mcp-secret'] || event.headers?.['authorization'];
  const expected = process.env.MCP_SECRET_TOKEN;
  const authorized =
    !expected ||
    token === expected ||
    token === `Bearer ${expected}`;

  if (!authorized) {
    return {
      statusCode: 401,
      headers: {
        'Content-Type': 'application/json',
        'WWW-Authenticate': 'Bearer'
      },
      body: JSON.stringify({ ok: false, error: 'Unauthorized' })
    };
  }

  const tools: Tool[] = [
    { name: 'narrate-project', description: 'Stubbed narration endpoint.' },
    { name: 'generate-music', description: 'Stubbed Suno integration with beat grid.' }
  ];

  return {
    statusCode: 200,
    body: JSON.stringify({ tools })
  };
};

export default handler;
