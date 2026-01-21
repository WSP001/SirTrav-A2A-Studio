import type { Handler } from './types';

export const handler: Handler = async (event) => {
  const payload = event.body ? JSON.parse(event.body) : {};
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'evals stub: enforce quality gates here.',
      input: payload,
      status: 'pending'
    }),
  };
};
