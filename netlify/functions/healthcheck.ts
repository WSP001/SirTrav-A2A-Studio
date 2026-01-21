import type { Handler } from './types';

export const handler: Handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'ok' })
  };
};
