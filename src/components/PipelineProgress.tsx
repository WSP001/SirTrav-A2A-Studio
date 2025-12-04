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

interface ProgressData {
  projectId: string;
  correlationId: string;
  currentStep: string;
  status: 'started' | 'running' | 'completed' | 'failed';
  timestamp: string;
  steps: AgentStatus[];
  totalSteps?: number;
  error?: string;
}

interface PipelineProgressProps {
  projectId: string;
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

export default function PipelineProgress({ projectId, onComplete, onError }: PipelineProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!projectId) return;

    // Try SSE first, fall back to polling
    const connectSSE = () => {
      const url = `/.netlify/functions/progress?projectId=${projectId}&stream=true`;
      
      try {
        const es = new EventSource(url);
        eventSourceRef.current = es;

        es.onopen = () => {
          setConnectionStatus('connected');
          console.log('[PipelineProgress] SSE connected');
        };

        es.onmessage = (event) => {
          try {
            const data: ProgressData = JSON.parse(event.data);
            setProgress(data);

            if (data.status === 'completed') {
              onComplete?.(data);
              es.close();
            } else if (data.status === 'failed') {
              onError?.(data.error || 'Pipeline failed');
              es.close();
            }
          } catch (err) {
            console.error('[PipelineProgress] Parse error:', err);
          }
        };

        es.onerror = () => {
          console.warn('[PipelineProgress] SSE error, falling back to polling');
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
      
      const poll = async () => {
        try {
          const res = await fetch(`/.netlify/functions/progress?projectId=${projectId}`);
          if (res.ok) {
            const data: ProgressData = await res.json();
            setProgress(data);

            if (data.status === 'completed') {
              onComplete?.(data);
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            } else if (data.status === 'failed') {
              onError?.(data.error || 'Pipeline failed');
              if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            }
          }
        } catch (err) {
          console.error('[PipelineProgress] Poll error:', err);
        }
      };

      poll(); // Initial poll
      pollIntervalRef.current = setInterval(poll, 2000);
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

  // Calculate progress percentage
  const completedSteps = progress?.steps?.filter(s => 
    s.status === 'completed' || s.status === 'fallback'
  ).length || 0;
  const totalSteps = AGENTS.length;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);

  // Get status for each agent
  const getAgentStatus = (agentId: string): AgentStatus => {
    const step = progress?.steps?.find(s => s.name === agentId);
    return step || { name: agentId, status: 'pending' };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'running': return 'bg-blue-500 animate-pulse';
      case 'failed': return 'bg-red-500';
      case 'fallback': return 'bg-yellow-500';
      default: return 'bg-gray-600';
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
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          connectionStatus === 'connected' ? 'bg-green-500/20 text-green-400' :
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

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {AGENTS.map((agent, index) => {
          const status = getAgentStatus(agent.id);
          return (
            <div 
              key={agent.id}
              className={`p-4 rounded-lg border transition-all duration-300 ${
                status.status === 'running' 
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
