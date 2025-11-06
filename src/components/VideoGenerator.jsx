import React, { useEffect, useMemo, useState } from 'react';
import './VideoGenerator.css';

const STORAGE_KEY = 'sirtrav-video-api-keys';

const STATUS = {
  idle: { label: 'Idle', tone: 'neutral' },
  preparing: { label: 'Validating request…', tone: 'info' },
  generating: { label: 'Generating…', tone: 'info' },
  processing: { label: 'Processing assets…', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  error: { label: 'Error', tone: 'danger' },
};

const maskKey = (value) => {
  if (!value) {
    return '';
  }
  const tail = value.slice(-4);
  return `${'*'.repeat(Math.max(value.length - 4, 0))}${tail}`;
};

const defaultKeyLabel = (existing) => {
  const index = existing.length + 1;
  return `Key ${index}`;
};

const generateId = () => {
  try {
    if (
      typeof globalThis !== 'undefined' &&
      typeof globalThis.crypto?.randomUUID === 'function'
    ) {
      return globalThis.crypto.randomUUID();
    }
  } catch (err) {
    // Ignore and fall back to manual method.
  }

  return `key-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
};

function VideoGenerator() {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedKeyId, setSelectedKeyId] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyLabel, setNewKeyLabel] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setApiKeys(parsed);
          if (parsed[0]?.id) {
            setSelectedKeyId(parsed[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to read stored API keys', err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apiKeys));
    } catch (err) {
      console.warn('Failed to persist API keys', err);
    }
  }, [apiKeys]);

  const selectedKey = useMemo(
    () => apiKeys.find((item) => item.id === selectedKeyId),
    [apiKeys, selectedKeyId],
  );

  const handleSaveKey = () => {
    const trimmedValue = newKeyValue.trim();
    if (!trimmedValue) {
      setError('Provide an API key value before saving.');
      return;
    }

    const id = generateId();
    const entry = {
      id,
      label: newKeyLabel.trim() || defaultKeyLabel(apiKeys),
      value: trimmedValue,
      createdAt: new Date().toISOString(),
    };

    setApiKeys((prev) => [entry, ...prev]);
    setSelectedKeyId(id);
    setNewKeyValue('');
    setNewKeyLabel('');
    setError('');
  };

  const handleDeleteKey = (id) => {
    setApiKeys((prev) => {
      const next = prev.filter((key) => key.id !== id);
      if (selectedKeyId === id) {
        setSelectedKeyId(next[0]?.id || '');
      }
      return next;
    });
  };

  const handleGenerate = async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      setError('Enter a prompt describing the video you want to produce.');
      return;
    }
    if (!selectedKey?.value) {
      setError('Select or add an API key before generating a video.');
      return;
    }

    setStatus('preparing');
    setError('');
    setResult(null);

    try {
      const response = await fetch('/.netlify/functions/generate-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': selectedKey.value,
        },
        body: JSON.stringify({ prompt: trimmedPrompt }),
      });

      if (!response.ok) {
        setStatus('error');
        const detail = await response.text();
        throw new Error(
          detail || `Video generation request failed with status ${response.status}`,
        );
      }

      setStatus('generating');
      const payload = await response.json();

      let nextStatus = 'completed';
      if (payload?.status === 'processing') {
        nextStatus = 'processing';
      } else if (payload?.status === 'queued') {
        nextStatus = 'generating';
      }

      setResult(payload);
      setStatus(nextStatus);
    } catch (err) {
      console.error('Video generation failed', err);
      setStatus('error');
      setError(
        err.message ||
          'Video generation failed due to an unexpected error. Please try again.',
      );
    }
  };

  const handleStatusReset = () => {
    setStatus('idle');
    setError('');
    setResult(null);
  };

  return (
    <section className="video-generator">
      <header className="video-generator__header">
        <h2>Video Generator</h2>
        <p>
          Provide a creative brief, select the service key, and trigger the Doc-to-Agent
          pipeline.
        </p>
      </header>

      <div className="video-generator__form">
        <label className="video-generator__label" htmlFor="video-prompt">
          Prompt
        </label>
        <textarea
          id="video-prompt"
          className="video-generator__prompt"
          placeholder="Example: Produce a 60-second recap highlighting this week&apos;s wins..."
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          rows={5}
        />

        <div className="video-generator__api-key">
          <div className="video-generator__api-key-select">
            <label className="video-generator__label" htmlFor="api-key-select">
              Saved API Keys
            </label>
            <select
              id="api-key-select"
              value={selectedKeyId}
              onChange={(event) => setSelectedKeyId(event.target.value)}
            >
              <option value="">Select an API key…</option>
              {apiKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.label} ({maskKey(key.value)})
                </option>
              ))}
            </select>
            {selectedKeyId && (
              <button
                type="button"
                className="video-generator__danger"
                onClick={() => handleDeleteKey(selectedKeyId)}
              >
                Remove
              </button>
            )}
          </div>

          <div className="video-generator__api-key-new">
            <label className="video-generator__label" htmlFor="api-key-value">
              Add New Key
            </label>
            <input
              id="api-key-label"
              type="text"
              placeholder="Optional label (e.g., Suno Sandbox)"
              value={newKeyLabel}
              onChange={(event) => setNewKeyLabel(event.target.value)}
            />
            <input
              id="api-key-value"
              type="password"
              placeholder="Paste API key value"
              value={newKeyValue}
              onChange={(event) => setNewKeyValue(event.target.value)}
              autoComplete="off"
            />
            <button type="button" onClick={handleSaveKey}>
              Save Key
            </button>
          </div>
        </div>

        <div className="video-generator__actions">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={status === 'generating' || status === 'processing'}
          >
            {status === 'generating' || status === 'processing'
              ? 'Working…'
              : 'Generate Video'}
          </button>
          <button
            type="button"
            className="video-generator__secondary"
            onClick={handleStatusReset}
          >
            Reset
          </button>
        </div>
      </div>

      <div
        className={`video-generator__status video-generator__status--${
          STATUS[status]?.tone || 'neutral'
        }`}
      >
        <span className="video-generator__status-label">
          {STATUS[status]?.label || STATUS.idle.label}
        </span>
      </div>

      {error && (
        <div className="video-generator__alert video-generator__alert--error">
          <strong>Something went wrong.</strong>
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="video-generator__result">
          <h3>Latest Run</h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </section>
  );
}

export default VideoGenerator;
