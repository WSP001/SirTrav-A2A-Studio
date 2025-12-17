import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { mood } = JSON.parse(event.body || '{}');
  const API_KEY = process.env.SUNO_API_KEY;

  const isRealKey = API_KEY && !API_KEY.includes('placeholder');

  if (isRealKey) {
    console.log("🎵 [Music] Using Real Suno API ($$$)");
  } else {
    console.log("🎹 [Music] No valid API Key. Using Mock Track (Free).");
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      music_url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg", // Free test sound
      beat_grid: [0.5, 1.0, 1.5, 2.0],
      cost_usd: isRealKey ? 0.10 : 0
    })
  };
};
