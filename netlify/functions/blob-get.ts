import type { Handler } from '@netlify/functions';
import { uploadsStore } from './lib/storage';

/**
 * blob-get
 * GET /.netlify/functions/blob-get?key=<blob-key>
 * Streams a stored blob with content-type from metadata.
 */

export const handler: Handler = async (event) => {
  const key = event.queryStringParameters?.key;
  if (!key) {
    return { statusCode: 400, body: 'Missing key' };
  }

  try {
    const store = uploadsStore();
    const entry = await store.getWithMetadata(key, { type: 'stream' });
    if (!entry) {
      return { statusCode: 404, body: 'Not found' };
    }

    const contentType =
      (entry.metadata?.contentType as string | undefined) || 'application/octet-stream';

    return new Response(entry.data as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60',
      },
    }) as any;
  } catch (e) {
    console.error('blob-get error', e);
    return { statusCode: 500, body: 'Internal error' };
  }
};
