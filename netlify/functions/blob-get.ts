/**
 * Modern function: streams a blob from uploadsStore by key.
 * GET /.netlify/functions/blob-get?key=<blob-key>
 */
import { uploadsStore } from './lib/storage';

export default async (req: Request) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!key) {
    return new Response('Missing key', { status: 400 });
  }

  try {
    const store = uploadsStore();
    const entry = await store.getWithMetadata(key, { type: 'stream' });
    if (!entry) {
      return new Response('Not found', { status: 404 });
    }
    const contentType =
      (entry.metadata?.contentType as string | undefined) || 'application/octet-stream';

    return new Response(entry.data as ReadableStream, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (e: any) {
    console.error('blob-get error', e);
    return new Response('Internal error', { status: 500 });
  }
};
