import type { Handler } from './types';

export const handler: Handler = async (event) => {
  const payload = event.body ? JSON.parse(event.body) : {};
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'text-to-speech stub: synthesize narrative segments here.',
      input: payload,
    }),
  };
};
