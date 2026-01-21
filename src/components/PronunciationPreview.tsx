import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PronunciationDictionary, PronunciationEntry } from '../types/pronunciation';
import './PronunciationPreview.css';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

const normalize = (value: string) => value.trim().toLowerCase();

const filterEntries = (entries: PronunciationEntry[], query: string) => {
  if (!query) return entries;
  const normalized = normalize(query);
  return entries.filter((entry) =>
    [entry.term, entry.spelling, entry.notes, ...(entry.tags ?? [])]
      .filter(Boolean)
      .some((value) => normalize(String(value)).includes(normalized))
  );
};

const PronunciationPreview = () => {
  const [query, setQuery] = useState('');
  const [entries, setEntries] = useState<PronunciationEntry[]>([]);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();

  const fetchDictionary = useCallback(async (signal?: AbortSignal) => {
    setState('loading');
    setError(null);

    try {
      const response = await fetch('/.netlify/functions/pronunciation-dictionary', {
        signal,
      });

      if (!response.ok) {
        throw new Error(`Fetch failed with status ${response.status}`);
      }

      const payload = (await response.json()) as {
        ok?: boolean;
        dictionary?: PronunciationDictionary;
        error?: string;
      };

      if (!payload.ok || !payload.dictionary) {
        throw new Error(payload.error ?? 'Unexpected dictionary response');
      }

      setEntries(payload.dictionary.entries ?? []);
      setUpdatedAt(payload.dictionary.updatedAt);
      setState('ready');
    } catch (cause) {
      if ((cause as Error).name === 'AbortError') {
        return;
      }
      setError(cause instanceof Error ? cause.message : String(cause));
      setState('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchDictionary(controller.signal);
    return () => controller.abort();
  }, [fetchDictionary]);

  const filtered = useMemo(() => filterEntries(entries, query), [entries, query]);

  return (
    <section className="pronunciation-card card">
      <div className="dictionary-header">
        <div>
          <h2>Pronunciation Dictionary</h2>
          <p>
            Entries from the private vault are synced to ElevenLabs before narration begins.
          </p>
        </div>
        <button
          type="button"
          className="secondary-btn"
          onClick={() => fetchDictionary()}
          disabled={state === 'loading'}
        >
          {state === 'loading' ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      <div className="dictionary-status" role="status">
        {state === 'loading' && <span>Loading dictionary…</span>}
        {state === 'ready' && (
          <span>
            Loaded {entries.length} entr{entries.length === 1 ? 'y' : 'ies'}
            {updatedAt ? ` · Updated ${new Date(updatedAt).toLocaleString()}` : ''}
          </span>
        )}
        {state === 'error' && <span className="error">Failed to load dictionary: {error}</span>}
      </div>

      <div className="dictionary-search">
        <label htmlFor="dictionary-filter">Filter terms</label>
        <input
          id="dictionary-filter"
          type="search"
          placeholder="Search by term, spelling, or tag"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          disabled={state === 'loading'}
        />
      </div>

      {state === 'error' ? (
        <div className="dictionary-empty">
          Dictionary unavailable. Try refreshing once the Netlify functions are reachable.
        </div>
      ) : filtered.length === 0 ? (
        <div className="dictionary-empty">No entries match the current filter.</div>
      ) : (
        <table className="dictionary-table">
          <thead>
            <tr>
              <th>Term</th>
              <th>Pronunciation</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.term}>
                <td>{entry.term}</td>
                <td>
                  <code>{entry.spelling}</code>
                </td>
                <td>{entry.notes ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
};

export default PronunciationPreview;
