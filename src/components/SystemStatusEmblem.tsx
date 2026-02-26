import React, { useEffect, useMemo, useState } from 'react';
import { Shield } from 'lucide-react';
import { THEME } from '../remotion/branding';

type PacketMode = 'off' | 'real' | 'error';
type ServiceStatus = 'ok' | 'degraded' | 'down' | 'disabled';

type HealthService = {
  name: string;
  status: ServiceStatus;
  error?: string;
};

type HealthPayload = {
  status?: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  services?: HealthService[];
};

const EMBLEM_COLORS = {
  off: THEME.colors.textSecondary,
  real: '#D4AF37',
  error: THEME.colors.error,
};

function socialServiceOf(payload: HealthPayload | null) {
  if (!payload?.services) return null;
  return payload.services.find((s) => s.name === 'social_publishing') || null;
}

export default function SystemStatusEmblem() {
  const [health, setHealth] = useState<HealthPayload | null>(null);
  const [packetMode, setPacketMode] = useState<PacketMode>('off');
  const [packetLabel, setPacketLabel] = useState('Simulation Mode (Free)');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/.netlify/functions/healthcheck')
      .then((r) => r.json())
      .then((payload) => {
        if (!mounted) return;
        setHealth(payload);
      })
      .catch(() => {
        if (!mounted) return;
        setHealth({ status: 'offline' });
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const socialService = useMemo(() => socialServiceOf(health), [health]);
  const realModeReady = socialService?.status === 'ok';

  const togglePacketMode = (next: boolean) => {
    if (!next) {
      setPacketMode('off');
      setPacketLabel('Simulation Mode (Free)');
      return;
    }
    if (loading || !realModeReady) {
      setPacketMode('error');
      setPacketLabel('Real Mode Blocked (Auth/Config Required)');
      return;
    }
    setPacketMode('real');
    setPacketLabel('Real Packet Mode (Cost Incurred)');
  };

  return (
    <div
      className="packet-emblem"
      title={socialService?.error || packetLabel}
      style={{ borderColor: `${THEME.colors.textMuted}66`, background: `${THEME.colors.background}cc` }}
    >
      <Shield className="w-4 h-4" />
      <span className={`packet-status packet-status-${packetMode}`} style={{ color: EMBLEM_COLORS[packetMode] }}>
        {packetLabel}
      </span>
      <label className={`packet-toggle packet-toggle-${packetMode}`}>
        <input
          type="checkbox"
          checked={packetMode === 'real'}
          onChange={(e) => togglePacketMode(e.target.checked)}
          aria-label="Toggle Real Packet Mode"
        />
        <span className="packet-slider" />
      </label>
    </div>
  );
}
