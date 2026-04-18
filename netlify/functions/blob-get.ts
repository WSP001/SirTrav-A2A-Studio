/**
 * Modern function: streams a blob from the requested store.
 * GET /.netlify/functions/blob-get?key=<blob-key>&store=audio|video|uploads|artifacts|exports|runs|evals
 * Default store is uploads to stay backward compatible.
 */
import {
  audioStore,
  videoStore,
  uploadsStore,
  artifactsStore,
  exportsStore,
  runsStore,
  evalsStore,
} from './lib/storage';

function pickStore(name?: string) {
  const normalized = (name || 'uploads').toLowerCase();
  switch (normalized) {
    case 'audio':
      return audioStore;
    case 'video':
      return videoStore;
    case 'artifacts':
      return artifactsStore;
    case 'exports':
      return exportsStore;
    case 'runs':
      return runsStore;
    case 'evals':
      return evalsStore;
    case 'uploads':
    default:
      return uploadsStore;
  }
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const storeParam = url.searchParams.get('store');
  const isJson = key?.endsWith('.json');
  if (!key) {
    return new Response('Missing key', { status: 400 });
  }

  try {
    const storeFactory = pickStore(storeParam);
    const store: any = typeof storeFactory === 'function' ? storeFactory() : storeFactory;
    if (typeof store.getWithMetadata === 'function') {
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
    }

    const data = await store.get(key, { type: isJson ? 'json' : 'arrayBuffer' });
    if (!data) {
      return new Response('Not found', { status: 404 });
    }

    const metadata = typeof store.getMetadata === 'function'
      ? await store.getMetadata(key)
      : null;
    const contentType =
      (metadata?.metadata?.contentType as string | undefined)
      || (isJson ? 'application/json' : 'application/octet-stream');

    if (isJson) {
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'private, max-age=60',
        },
      });
    }

    return new Response(data as ArrayBuffer, {
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
