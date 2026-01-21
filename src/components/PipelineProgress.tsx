import { useEffect, useMemo, useRef, useState } from 'react';
import './PipelineProgress.css';

type ProgressEvent = {
  step?: string;
  status?: string;
  meta?: Record<string, unknown>;
  ts?: string | number;
  cid?: string;
};

type InvoiceItem = {
  agent: string;
  baseCost: number;
};

type Invoice = {
  items?: InvoiceItem[];
  totalDue?: number;
};

type AgentCard = {
  key: string;
  label: string;
  description: string;
};

const MAX_EVENTS = 50;

const formatTimestamp = (timestamp?: string | number) => {
  if (!timestamp) return '—';
  const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
  return new Intl.DateTimeFormat('en', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
};

const statusTone: Record<string, string> = {
  start: 'tone-start',
  ok: 'tone-ok',
  error: 'tone-error',
  loaded: 'tone-ok',
};

const agentCards: AgentCard[] = [
  { key: 'director', label: 'Director', description: 'Curates key shots' },
  { key: 'writer', label: 'Writer', description: 'Drafts the narrative' },
  { key: 'voice', label: 'Voice', description: 'Synthesizes narration' },
  { key: 'composer', label: 'Composer', description: 'Generates soundtrack' },
  { key: 'editor', label: 'Editor', description: 'Compiles the video' },
  { key: 'attribution', label: 'Attribution', description: 'Builds credits' },
  { key: 'publisher', label: 'Publisher', description: 'Publishes output' },
];

const resolveAgentStatus = (events: ProgressEvent[]) => {
  const latest = events[events.length - 1];
  if (!latest?.status) return 'pending';
  if (latest.status === 'error') return 'failed';
  if (latest.status === 'ok') return 'completed';
  if (latest.status === 'start') return 'running';
  return 'pending';
};

const PipelineProgress = () => {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const isConnecting = !connected && events.length === 0;
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    const connect = () => {
      const source = new EventSource('/.netlify/functions/progress');
      sourceRef.current = source;
      source.onopen = () => setConnected(true);
      source.onerror = () => {
        setConnected(false);
        source.close();
        sourceRef.current = null;
        setTimeout(connect, 4000);
      };
      source.addEventListener('progress', (event) => {
        try {
          const data: ProgressEvent = JSON.parse(event.data);
          setEvents((prev) => {
            const next = [...prev, data];
            return next.slice(-MAX_EVENTS);
          });
          const invoiceCandidate = data?.meta?.invoice as Invoice | undefined;
          if (invoiceCandidate?.items?.length || invoiceCandidate?.totalDue) {
            setInvoice(invoiceCandidate);
          }
        } catch (error) {
          console.warn('Unable to parse progress event', error);
        }
      });
    };

    connect();
    return () => sourceRef.current?.close();
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, ProgressEvent[]> = {};
    for (const evt of events) {
      const key = evt.step ?? 'unknown';
      groups[key] = groups[key] ? [...groups[key], evt] : [evt];
    }
    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [events]);

  return (
    <div className="progress-card card">
      <div className="progress-header">
        <h2>Pipeline Activity</h2>
        <span className={`badge ${connected ? 'online' : 'offline'}`}>
          {connected ? 'Live' : isConnecting ? 'Connecting' : 'Reconnecting'}
        </span>
      </div>
      <p className="progress-subtitle">
        Streaming progress events from <code>/.netlify/functions/progress</code>.
      </p>
      <div className="pipeline-grid">
        {agentCards.map((agent) => {
          const agentEvents = grouped.find(([step]) => step.includes(agent.key))?.[1] ?? [];
          const status = resolveAgentStatus(agentEvents);
          return (
            <div key={agent.key} className={`agent-card status-${status}`}>
              <span className="agent-label">{agent.label}</span>
              <span className="agent-description">{agent.description}</span>
              <span className="agent-status">{status}</span>
            </div>
          );
        })}
      </div>
      {grouped.length === 0 ? (
        <div className={`progress-empty ${isConnecting ? 'progress-loading' : ''}`}>
          {isConnecting
            ? 'Connecting to the pipeline stream…'
            : 'Waiting for events… trigger a manifest run to see activity.'}
        </div>
      ) : (
        <div className="progress-groups">
          {grouped.map(([step, stepEvents]) => (
            <div key={step} className="progress-group">
              <header>
                <span>{step}</span>
                <span>{stepEvents.length} event{stepEvents.length === 1 ? '' : 's'}</span>
              </header>
              <ul>
                {stepEvents.map((evt, index) => (
                  <li key={`${step}-${index}`} className={statusTone[evt.status ?? ''] ?? ''}>
                    <div className="event-main">
                      <strong>{evt.status ?? '—'}</strong>
                      <span>{formatTimestamp(evt.ts)}</span>
                    </div>
                    {evt.cid && <span className="event-meta">CID: {evt.cid}</span>}
                    {evt.meta && Object.keys(evt.meta).length > 0 && (
                      <pre className="event-json">{JSON.stringify(evt.meta, null, 2)}</pre>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {invoice && (
        <div className="invoice-panel">
          <h3>💰 Production Invoice</h3>
          <div className="invoice-items">
            {invoice.items?.map((item, index) => (
              <div key={`${item.agent}-${index}`} className="invoice-row">
                <span>{item.agent}</span>
                <span>${item.baseCost.toFixed(3)} +20%</span>
              </div>
            ))}
          </div>
          <div className="invoice-total">
            <span>TOTAL DUE</span>
            <span>${(invoice.totalDue ?? 0).toFixed(2)}</span>
          </div>
          <div className="invoice-badge">✅ Commons Good Verified</div>
        </div>
      )}
    </div>
  );
};

export default PipelineProgress;
