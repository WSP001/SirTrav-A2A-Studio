export const KEYS = [
  { name: 'GEMINI_API_KEY', importance: 'required', group: 'core-ai', note: 'Flash First — narrate-project.ts primary model (gemini-2.5-flash)' },
  { name: 'OPENAI_API_KEY', importance: 'optional', group: 'core-ai', note: 'Fallback Writer/Director (GPT-4 Vision)' },
  { name: 'ELEVENLABS_API_KEY', importance: 'optional', group: 'core-ai', note: 'Voice agent narration' },
  { name: 'SUNO_API_KEY', importance: 'optional', group: 'core-ai', note: 'Composer music generation' },
  { name: 'CV_IDENTITY_URL', importance: 'optional', group: 'cv-wire', note: 'CV identity endpoint — has hardcoded fallback, not a blocker' },
  { name: 'CV_TRUTH_PACK_URL', importance: 'optional', group: 'cv-wire', note: 'Full CV truth pack endpoint' },
  { name: 'VECTOR_ENGINE_URL', importance: 'optional', group: 'cv-wire', note: 'pgvector Cloud Run retrieval endpoint' },
  { name: 'LINEAR_API_KEY', importance: 'optional', group: 'infra', note: 'Linear project management API' },
  { name: 'MCP_SECRET_TOKEN', importance: 'optional', group: 'infra', note: 'MCP gateway auth token' },
  { name: 'SHARE_SECRET', importance: 'optional', group: 'infra', note: 'HMAC share link signing' },
  { name: 'TWITTER_API_KEY', importance: 'optional', group: 'social-x', note: 'Consumer API key' },
  { name: 'TWITTER_API_SECRET', importance: 'optional', group: 'social-x', note: 'Consumer secret' },
  { name: 'TWITTER_ACCESS_TOKEN', importance: 'optional', group: 'social-x', note: 'Access token' },
  { name: 'TWITTER_ACCESS_SECRET', importance: 'optional', group: 'social-x', note: 'Access token secret' },
  { name: 'LINKEDIN_CLIENT_ID', importance: 'optional', group: 'social-linkedin', note: 'OAuth client ID' },
  { name: 'LINKEDIN_CLIENT_SECRET', importance: 'optional', group: 'social-linkedin', note: 'OAuth client secret' },
  { name: 'LINKEDIN_ACCESS_TOKEN', importance: 'optional', group: 'social-linkedin', note: 'Publishing access token' },
  { name: 'LINKEDIN_PERSON_URN', importance: 'optional', group: 'social-linkedin', note: 'Post author URN' },
  { name: 'YOUTUBE_CLIENT_ID', importance: 'optional', group: 'social-youtube', note: 'OAuth client ID' },
  { name: 'YOUTUBE_CLIENT_SECRET', importance: 'optional', group: 'social-youtube', note: 'OAuth client secret' },
  { name: 'YOUTUBE_REFRESH_TOKEN', importance: 'optional', group: 'social-youtube', note: 'Refresh token for uploads' },
  { name: 'TIKTOK_CLIENT_KEY', importance: 'optional', group: 'social-tiktok', note: 'Client key' },
  { name: 'TIKTOK_CLIENT_SECRET', importance: 'optional', group: 'social-tiktok', note: 'Client secret' },
  { name: 'INSTAGRAM_ACCESS_TOKEN', importance: 'optional', group: 'social-instagram', note: 'Access token' },
  { name: 'INSTAGRAM_BUSINESS_ID', importance: 'optional', group: 'social-instagram', note: 'Business account ID' },
  { name: 'BITLY_ACCESS_TOKEN', importance: 'optional', group: 'utility', note: 'URL shortener' },
];

export function maskValue(v) {
  if (!v) return '-';
  if (v.length <= 6) return '*'.repeat(v.length);
  return `${v.slice(0, 4)}…${v.slice(-2)}`;
}

export function pad(s, n) {
  return s.length >= n ? s.slice(0, n) : s + ' '.repeat(n - s.length);
}

