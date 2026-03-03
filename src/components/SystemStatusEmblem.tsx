import React, { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { THEME } from '../remotion/branding';

type PacketMode = 'off' | 'real' | 'degraded' | 'error';
type VerdictColor = 'GREEN' | 'YELLOW' | 'RED';

type ControlPlanePayload = {
  verdict?: {
    local?: VerdictColor;
    cloud?: VerdictColor;
    combined?: VerdictColor;
    reasons?: string[];
  };
};

const EMBLEM_COLORS = {
  off: THEME.colors.textSecondary,
  real: '#D4AF37',
  degraded: '#F59E0B',
  error: THEME.colors.error,
};

export default function SystemStatusEmblem() {
  const [controlPlane, setControlPlane] = useState<ControlPlanePayload | null>(null);
  const [packetMode, setPacketMode] = useState<PacketMode>('off');
  const [packetLabel, setPacketLabel] = useState('Control Plane: loading');
  const [reasonLabel, setReasonLabel] = useState('Awaiting verdict...');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/.netlify/functions/control-plane')
      .then((r) => r.json())
      .then((payload) => {
        if (!mounted) return;
        setControlPlane(payload);
        const combined = payload?.verdict?.combined;
        if (combined === 'GREEN') {
          setPacketMode('real');
          setPacketLabel('Control Plane: GREEN');
        } else if (combined === 'YELLOW') {
          setPacketMode('degraded');
          setPacketLabel('Control Plane: YELLOW');
        } else if (combined === 'RED') {
          setPacketMode('error');
          setPacketLabel('Control Plane: RED');
        } else {
          setPacketMode('off');
          setPacketLabel('Control Plane: unknown');
        }
        const reasons = Array.isArray(payload?.verdict?.reasons) ? payload.verdict.reasons : [];
        setReasonLabel(reasons.length ? reasons.join(' | ') : 'No reasons provided');
      })
      .catch(() => {
        if (!mounted) return;
        setControlPlane(null);
        setPacketMode('error');
        setPacketLabel('Control Plane: unavailable');
        setReasonLabel('Failed to fetch /.netlify/functions/control-plane');
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div
      className="packet-emblem"
      title={reasonLabel}
      style={{ borderColor: `${THEME.colors.textMuted}66`, background: `${THEME.colors.background}cc` }}
    >
      <Shield className="w-4 h-4" />
      <span className={`packet-status packet-status-${packetMode}`} style={{ color: EMBLEM_COLORS[packetMode] }}>
        {packetLabel}
      </span>
      {!loading && controlPlane?.verdict && (
        <span className="packet-reason">
          L:{controlPlane.verdict.local || '?'} C:{controlPlane.verdict.cloud || '?'}
        </span>
      )}
    </div>
  );
}
