import { useEffect, useState } from 'react';

export interface ProgressEvent {
  status: 'running' | 'completed' | 'error' | string;
  agents?: Record<string, any>;
  message?: string;
}

/**
 * Simple SSE hook to consume progress events from the backend.
 * Defaults to the Netlify function path: /.netlify/functions/progress
 */
export function useProgress(feedUrl = '/.netlify/functions/progress') {
  const [progress, setProgress] = useState<ProgressEvent | null>(null);

  useEffect(() => {
    const es = new EventSource(feedUrl, { withCredentials: false });
    es.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);
        setProgress(data);
      } catch {
        // ignore bad payload
      }
    };
    es.onerror = () => {
      es.close();
    };
    return () => es.close();
  }, [feedUrl]);

  return progress;
}
