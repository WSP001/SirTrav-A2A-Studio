import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { projectId, curated_media } = JSON.parse(event.body || '{}');

  // LOGIC: Create a script based on what the Director found
  const assetCount = curated_media?.media_sequence?.length || 0;
  const scriptText = assetCount > 0
    ? `Welcome back. We found ${assetCount} amazing moments in the vault today. Let's take a look.`
    : `The vault looks empty, but every blank canvas is an opportunity.`;

  const narrative = [
    { id: "intro", text: scriptText, voice: "default" },
    { id: "outro", text: "That wraps up this week's recap. See you on the water.", voice: "default" }
  ];

  return { statusCode: 200, headers, body: JSON.stringify({ ok: true, narrative }) };
};
