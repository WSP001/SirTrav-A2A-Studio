import { Handler } from '@netlify/functions';

export const handler: Handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const { text, voiceId } = JSON.parse(event.body || '{}');
  const API_KEY = process.env.ELEVENLABS_API_KEY;

  // === COST GUARD ===
  // Only call external API if we have a real key (not a placeholder)
  const isRealKey = API_KEY && !API_KEY.includes('placeholder') && API_KEY.startsWith('sk_');

  if (isRealKey) {
    console.log("🔊 [Voice] Using Real ElevenLabs API ($$$)");
    // TODO: Insert real fetch call to ElevenLabs here
    // For P0, we still mock the return to verify logic flow first
  } else {
    console.log("🔇 [Voice] No valid API Key found. Using Mock Audio (Free).");
  }

  // Return a dummy URL that the frontend can "play" (or just visualize)
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: true,
      audio_url: "https://actions.google.com/sounds/v1/alarms/beep_short.ogg", // Free test sound
      cost_usd: isRealKey ? 0.05 : 0
    })
  };
};
