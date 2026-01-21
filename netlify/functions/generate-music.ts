import type { Handler } from './types';

export const handler: Handler = async (event) => {
  const payload = event.body ? JSON.parse(event.body) : {};
  const projectId = payload?.projectId ?? 'project';

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'generate-music stub returning synthetic beat grid',
      input: payload,
      music_url: `https://example.com/${projectId}/music.mp3`,
      beat_grid: {
        version: '1.0.0',
        bpm: payload?.tempo_bpm ?? 128,
        offset_sec: 0.12,
        time_signature: '4/4',
        downbeats: [0.12, 0.59, 1.06, 1.53],
        bars: [
          { bar_index: 1, start_sec: 0.12, end_sec: 1.12 },
          { bar_index: 2, start_sec: 1.12, end_sec: 2.12 }
        ],
        confidence: 0.9
      }
    }),
  };
};
