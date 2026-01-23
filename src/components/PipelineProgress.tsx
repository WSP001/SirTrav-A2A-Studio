import React, { useState, useEffect, useRef } from 'react';

/**
 * PipelineProgress - Real-time dashboard showing 7-agent pipeline status
 * 
 * Features:
 * - SSE connection to progress endpoint
 * - Visual agent status grid
 * - Progress bar with percentage
 * - Error display with retry option
 */

interface AgentStatus {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'fallback';
  duration_ms?: number;
  error?: string;
}

interface ProgressEvent {
  projectId: string;
  runId?: string;
  agent: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  message: string;
  timestamp: string;
  progress: number;
}

interface ProgressData {
  projectId: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  steps: AgentStatus[];
  error?: string;
}

interface PipelineProgressProps {
  projectId: string;
  runId?: string;
  onComplete?: (result: ProgressData) => void;
  onError?: (error: string) => void;
}

const AGENTS = [
  { id: 'director', name: 'Director', icon: '🎬', description: 'Curates media & sets direction' },
  { id: 'writer', name: 'Writer', icon: '✍️', description: 'Generates narrative script' },
  { id: 'voice', name: 'Voice', icon: '🎙️', description: 'Synthesizes narration' },
  { id: 'composer', name: 'Composer', icon: '🎵', description: 'Creates soundtrack' },
  { id: 'editor', name: 'Editor', icon: '🎞️', description: 'Assembles final video' },
  { id: 'attribution', name: 'Attribution', icon: '📜', description: 'Compiles credits' },
  { id: 'publisher', name: 'Publisher', icon: '🚀', description: 'Uploads to storage' }
];

export default function PipelineProgress({ projectId, runId, onComplete, onError }: PipelineProgressProps) {
  const [events, setEvents] = useState<ProgressEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!projectId) return;

    // Try SSE first, fall back to polling
    const connectSSE = () => {
      // Add runId if available to filter stream
      const url = `/.netlify/functions/progress?projectId=${projectId}&runId=${runId || ''}&stream=true`;

      try {
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
          setConnectionStatus('connected');
          console.log('[PipelineProgress] SSE connected');
        };

        // Listen for named events from backend
        es.addEventListener('connected', (event: any) => {
          console.log('[PipelineProgress] Connection established:', event.data);
          setConnectionStatus('connected');
        });

        es.addEventListener('progress', (event: any) => {
          try {
            const evt: ProgressEvent = JSON.parse(event.data);
            setEvents(prev => {
              // Avoid duplicates
              if (prev.find(e => e.timestamp === evt.timestamp && e.agent === evt.agent && e.status === evt.status)) {
                return prev;
              }
              return [...prev, evt];
            });
          } catch (err) {
            console.error('[PipelineProgress] Parse error:', err);
          }
        });

        es.addEventListener('complete', (event: any) => {
          try {
            const data = JSON.parse(event.data);
            // Verify final state
            onComplete?.(data);
            es.close();
          } catch (err) {
            console.error('[PipelineProgress] Parse error on complete:', err);
          }
        });

        es.addEventListener('error', (event: any) => {
          // Custom error event from backend (not network error)
          try {
            const data = JSON.parse(event.data);
            onError?.(data.message || 'Pipeline failed');
            es.close();
          } catch (err) { }
        });

        es.onerror = (err) => {
          console.warn('[PipelineProgress] SSE network error, falling back to polling', err);
          es.close();
          startPolling();
        };

      } catch (err) {
        console.warn('[PipelineProgress] SSE not available, using polling');
        startPolling();
      }
    };

    const startPolling = () => {
      setConnectionStatus('connected');

      // Adaptive polling state
      let consecutiveNoChange = 0;
      let lastEventCount = 0;

      const poll = async () => {
        try {
          const res = await fetch(`/.netlify/functions/progress?projectId=${projectId}${runId ? `&runId=${runId}` : ''}`);
          if (res.ok) {
            const data = await res.json();
            if (data.events && Array.isArray(data.events)) {
              // Check if state changed
              if (data.events.length === lastEventCount) {
                consecutiveNoChange++;
              } else {
                consecutiveNoChange = 0;
                lastEventCount = data.events.length;
              }

              setEvents(data.events);

              // Check completion from events
              const last = data.events[data.events.length - 1];
              if (last?.status === 'completed' && last?.agent === 'publisher') {
                if (pollIntervalRef.current) clearTimeout(pollIntervalRef.current);
                return;
              }
            }
          }
        } catch (err) {
          console.error('[PipelineProgress] Poll error:', err);
        }

        // Calculate next interval based on activity (Adaptive Polling)
        // Active: 2s (first 10 polls with no change)
        // Idle: 5s (after 10 polls)
        // Stale: 10s (after 20 polls)
        const nextInterval = consecutiveNoChange > 20 ? 10000
          : consecutiveNoChange > 10 ? 5000
            : 2000;

        pollIntervalRef.current = setTimeout(poll, nextInterval);
      };

      poll(); // Initial poll
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [projectId, onComplete, onError]);

  // Aggregate events into ProgressStatus
  const progress: ProgressData | null = React.useMemo(() => {
    if (events.length === 0) return null;

    const stepsMap = new Map<string, AgentStatus>();
    // Initialize defaults
    AGENTS.forEach(a => stepsMap.set(a.id, { name: a.id, status: 'pending' }));

    let pipelineStatus: 'started' | 'running' | 'completed' | 'failed' = 'started';
    let error: string | undefined;

    // Process events in order
    events.forEach(evt => {
      let targets = [evt.agent];

      // Map backend step names to frontend agents
      if (evt.agent === 'production_parallel') {
        targets = ['voice', 'composer'];
      } else if (evt.agent === 'completed') {
        targets = ['publisher'];
      } else if (evt.agent === 'pipeline' || evt.agent === 'quality_gate') {
        targets = []; // These don't map to specific agent visualization cards
      }

      targets.forEach(agentId => {
        const current = stepsMap.get(agentId);
        if (current) {
          // Map backend status to frontend status
          let status: any = evt.status;
          if (status === 'started') status = 'running';

          // Don't overwrite completed status with running if multiple events overlap (rare but possible)
          if (current.status === 'completed' && status === 'running') return;

          stepsMap.set(agentId, { ...current, status, error: evt.status === 'failed' ? evt.message : undefined });
        }
      });

      if (evt.status === 'failed') {
        pipelineStatus = 'failed';
        error = evt.message;
      }
    });

    // Check if all completed
    const allCompleted = AGENTS.every(a => {
      const s = stepsMap.get(a.id)?.status;
      return s === 'completed' || s === 'fallback'; // fallback treated as success
    });

    if (allCompleted && pipelineStatus !== 'failed') pipelineStatus = 'completed';

    return {
      projectId,
      status: pipelineStatus,
      steps: Array.from(stepsMap.values()),
      error
    };
  }, [events, projectId]);

  // Handle completion callbacks using effect
  useEffect(() => {
    if (progress?.status === 'completed') {
      // @ts-ignore
      onComplete?.(progress);
    } else if (progress?.status === 'failed') {
      onError?.(progress.error || 'Pipeline failed');
    }
  }, [progress?.status]);

  // Calculate progress percentage
  const completedSteps = progress?.steps?.filter(s =>
    s.status === 'completed' || s.status === 'fallback'
  ).length || 0;
  const totalSteps = AGENTS.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  // Get status for each agent
  const getAgentStatus = (agentId: string): AgentStatus => {
    return progress?.steps?.find(s => s.name === agentId) || { name: agentId, status: 'pending' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
      case 'running': return 'bg-blue-500 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.3)]';
      case 'failed': return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]';
      case 'fallback': return 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
      default: return 'bg-zinc-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '⏳';
      case 'failed': return '❌';
      case 'fallback': return '⚠️';
      default: return '⏸️';
    }
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">Pipeline Progress</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Project: <code className="bg-[var(--color-bg-primary)] px-2 py-0.5 rounded">{projectId}</code>
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
          connectionStatus === 'error' ? 'bg-red-500/20 text-red-400' :
            'bg-yellow-500/20 text-yellow-400'
          }`}>
          {connectionStatus === 'connected' ? '● Live' : connectionStatus === 'error' ? '● Disconnected' : '● Connecting...'}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-[var(--color-text-secondary)]">Overall Progress</span>
          <span className="text-[var(--color-text-primary)] font-medium">{progressPercent}%</span>
        </div>
        <div className="h-3 bg-[var(--color-bg-primary)] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Agent Grid - 7 cards: 4 on top row, 3 centered on bottom row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {AGENTS.slice(0, 4).map((agent, index) => {
          const status = getAgentStatus(agent.id);
          return (
            <div
              key={agent.id}
              className={`p-4 rounded-lg border transition-all duration-300 ${status.status === 'running'
                ? 'border-blue-500 bg-blue-500/10'
                : status.status === 'completed'
                  ? 'border-green-500/50 bg-green-500/5'
                  : status.status === 'failed'
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-primary)]'
                }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{agent.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--color-text-primary)]">{agent.name}</span>
                    <span className="text-sm">{getStatusIcon(status.status)}</span>
                  </div>
                  <span className="text-xs text-[var(--color-text-secondary)]">Agent {index + 1}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">{agent.description}</p>

              {/* Status indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(status.status)}`} />
                <span className="text-xs capitalize text-[var(--color-text-secondary)]">
                  {status.status}
                  {status.duration_ms && ` (${(status.duration_ms / 1000).toFixed(1)}s)`}
                </span>
              </div>

              {/* Error message */}
              {status.error && (
                <p className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                  {status.error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Row 2: Editor, Attribution, Publisher (3 cards centered) */}
      <div className="grid grid-cols-3 gap-4 mt-4 max-w-3xl mx-auto">
        {AGENTS.slice(4).map((agent, index) => {
          const status = getAgentStatus(agent.id);
          return (
            <div
              key={agent.id}
              className={`p-4 rounded-lg border transition-all duration-300 ${status.status === 'running'
                ? 'border-blue-500 bg-blue-500/10'
                : status.status === 'completed'
                  ? 'border-green-500/50 bg-green-500/5'
                  : status.status === 'failed'
                    ? 'border-red-500/50 bg-red-500/5'
                    : 'border-[var(--color-border)] bg-[var(--color-bg-primary)]'
                }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{agent.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[var(--color-text-primary)]">{agent.name}</span>
                    <span className="text-sm">{getStatusIcon(status.status)}</span>
                  </div>
                  <span className="text-xs text-[var(--color-text-secondary)]">Agent {index + 5}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--color-text-secondary)] mb-2">{agent.description}</p>

              {/* Status indicator */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${getStatusColor(status.status)}`} />
                <span className="text-xs capitalize text-[var(--color-text-secondary)]">
                  {status.status}
                  {status.duration_ms && ` (${(status.duration_ms / 1000).toFixed(1)}s)`}
                </span>
              </div>

              {/* Error message */}
              {status.error && (
                <p className="mt-2 text-xs text-red-400 bg-red-500/10 p-2 rounded">
                  {status.error}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Status Message */}
      {progress?.status === 'completed' && (
        <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
          <span className="text-2xl">🎉</span>
          <p className="text-green-400 font-medium mt-2">Pipeline completed successfully!</p>
        </div>
      )}

      {progress?.status === 'failed' && (
        <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
          <span className="text-2xl">❌</span>
          <p className="text-red-400 font-medium mt-2">Pipeline failed</p>
          {progress.error && (
            <p className="text-red-300 text-sm mt-1">{progress.error}</p>
          )}
        </div>
      )}
    </div>
  );
}
