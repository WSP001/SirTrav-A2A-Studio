import React, { useState, useEffect } from 'react';

/**
 * AnalyticsDashboard - Pipeline metrics and performance visualization
 * 
 * Features:
 * - Real-time pipeline stats
 * - Agent performance metrics
 * - User satisfaction tracking
 * - Historical trends
 */

interface AgentMetric {
  name: string;
  successRate: number;
  avgDuration: number;
  icon: string;
}

interface DashboardData {
  totalRuns: number;
  successRate: number;
  averages: {
    relevance: number;
    coherence: number;
    quality: number;
    duration_ms: number;
  };
  userSatisfaction: {
    good: number;
    bad: number;
    unrated: number;
  };
  agentPerformance: Record<string, { successRate: number; avgDuration: number }>;
}

const AGENT_ICONS: Record<string, string> = {
  director: '🎬',
  writer: '✍️',
  voice: '🎙️',
  composer: '🎵',
  editor: '🎞️',
  attribution: '📜',
  publisher: '🚀',
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
    // Refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/.netlify/functions/evals');
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📊</div>
        Loading analytics...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⚠️</div>
        {error}
        <button
          onClick={fetchMetrics}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#374151',
            color: '#e5e7eb',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data || data.totalRuns === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📈</div>
        <h3 style={{ color: '#e5e7eb', marginBottom: '0.5rem' }}>No Data Yet</h3>
        <p>Run some pipelines to see analytics here.</p>
      </div>
    );
  }

  const satisfactionTotal = data.userSatisfaction.good + data.userSatisfaction.bad;
  const satisfactionRate = satisfactionTotal > 0 
    ? (data.userSatisfaction.good / satisfactionTotal) * 100 
    : 0;

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ color: '#e5e7eb', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        📊 Pipeline Analytics
      </h2>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        <StatCard
          label="Total Runs"
          value={data.totalRuns.toString()}
          icon="🎬"
          color="#3b82f6"
        />
        <StatCard
          label="Success Rate"
          value={`${(data.successRate * 100).toFixed(0)}%`}
          icon="✅"
          color="#10b981"
        />
        <StatCard
          label="Avg Duration"
          value={`${(data.averages.duration_ms / 1000).toFixed(1)}s`}
          icon="⏱️"
          color="#f59e0b"
        />
        <StatCard
          label="Satisfaction"
          value={`${satisfactionRate.toFixed(0)}%`}
          icon="👍"
          color="#8b5cf6"
        />
      </div>

      {/* Quality Metrics */}
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ color: '#e5e7eb', marginBottom: '1rem', fontSize: '1rem' }}>
          Quality Metrics
        </h3>
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <MetricBar label="Relevance" value={data.averages.relevance} color="#3b82f6" />
          <MetricBar label="Coherence" value={data.averages.coherence} color="#10b981" />
          <MetricBar label="Quality" value={data.averages.quality} color="#8b5cf6" />
        </div>
      </div>

      {/* Agent Performance */}
      <div>
        <h3 style={{ color: '#e5e7eb', marginBottom: '1rem', fontSize: '1rem' }}>
          Agent Performance
        </h3>
        <div style={{ display: 'grid', gap: '0.5rem' }}>
          {Object.entries(data.agentPerformance).map(([agent, metrics]) => (
            <div
              key={agent}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem',
                backgroundColor: 'rgba(55, 65, 81, 0.5)',
                borderRadius: '8px',
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>{AGENT_ICONS[agent] || '🤖'}</span>
              <span style={{ color: '#e5e7eb', flex: 1, textTransform: 'capitalize' }}>
                {agent}
              </span>
              <span style={{ 
                color: metrics.successRate >= 0.9 ? '#10b981' : 
                       metrics.successRate >= 0.7 ? '#f59e0b' : '#ef4444',
                fontWeight: 600,
              }}>
                {(metrics.successRate * 100).toFixed(0)}%
              </span>
              <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
                {(metrics.avgDuration / 1000).toFixed(1)}s
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* User Feedback */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ color: '#e5e7eb', marginBottom: '1rem', fontSize: '1rem' }}>
          User Feedback
        </h3>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <FeedbackCard emoji="👍" label="Good" count={data.userSatisfaction.good} color="#10b981" />
          <FeedbackCard emoji="👎" label="Bad" count={data.userSatisfaction.bad} color="#ef4444" />
          <FeedbackCard emoji="🤷" label="Unrated" count={data.userSatisfaction.unrated} color="#6b7280" />
        </div>
      </div>
    </div>
  );
}

// Sub-components

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <div style={{
      padding: '1rem',
      backgroundColor: 'rgba(55, 65, 81, 0.5)',
      borderRadius: '12px',
      borderLeft: `3px solid ${color}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <span>{icon}</span>
        <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{label}</span>
      </div>
      <div style={{ color: '#e5e7eb', fontSize: '1.5rem', fontWeight: 700 }}>
        {value}
      </div>
    </div>
  );
}

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  const percentage = Math.round(value * 100);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
        <span style={{ color: '#9ca3af', fontSize: '0.875rem' }}>{label}</span>
        <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{percentage}%</span>
      </div>
      <div style={{
        height: '8px',
        backgroundColor: 'rgba(55, 65, 81, 0.8)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${percentage}%`,
          height: '100%',
          backgroundColor: color,
          borderRadius: '4px',
          transition: 'width 0.3s ease',
        }} />
      </div>
    </div>
  );
}

function FeedbackCard({ emoji, label, count, color }: { emoji: string; label: string; count: number; color: string }) {
  return (
    <div style={{
      flex: 1,
      padding: '1rem',
      backgroundColor: 'rgba(55, 65, 81, 0.5)',
      borderRadius: '8px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{emoji}</div>
      <div style={{ color, fontWeight: 700, fontSize: '1.25rem' }}>{count}</div>
      <div style={{ color: '#9ca3af', fontSize: '0.75rem' }}>{label}</div>
    </div>
  );
}

export { AnalyticsDashboard };
