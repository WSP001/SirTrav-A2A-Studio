import type { Handler } from './types';

export const handler: Handler = async (event) => {
  const payload = event.body ? JSON.parse(event.body) : {};
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'narrate-project stub response',
      input: payload,
      ttsUrls: [`tmp/${payload?.projectId ?? 'project'}/tts_urls.json`],
    }),
  };
};
