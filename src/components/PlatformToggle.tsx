import React, { useEffect } from 'react';

export type PublishPlatform = 'x' | 'linkedin' | 'youtube' | 'instagram' | 'tiktok';

export type PlatformAvailability = Record<PublishPlatform, { enabled: boolean; reason?: string }>;

const PLATFORM_ORDER: PublishPlatform[] = ['x', 'linkedin', 'youtube', 'instagram', 'tiktok'];

const PLATFORM_ESTIMATE_USD: Record<PublishPlatform, number> = {
  x: 0.0012,
  linkedin: 0.0040,
  youtube: 0.0060,
  instagram: 0.0030,
  tiktok: 0.0030,
};

const DEFAULT_AVAILABILITY: PlatformAvailability = {
  x: { enabled: true },
  linkedin: { enabled: true },
  youtube: { enabled: true },
  instagram: { enabled: true },
  tiktok: { enabled: true },
};

interface PlatformToggleProps {
  value: PublishPlatform[];
  onChange: (targets: PublishPlatform[]) => void;
  disabled?: boolean;
  onAvailabilityChange?: (availability: PlatformAvailability) => void;
}

function parseDisabledFromHealth(errorText?: string): PublishPlatform[] {
  if (!errorText) return [];
  const s = errorText.toLowerCase();
  const out: PublishPlatform[] = [];
  if (s.includes('x/twitter') || s.includes('twitter')) out.push('x');
  if (s.includes('linkedin')) out.push('linkedin');
  if (s.includes('youtube')) out.push('youtube');
  if (s.includes('instagram')) out.push('instagram');
  if (s.includes('tiktok')) out.push('tiktok');
  return out;
}

export default function PlatformToggle({ value, onChange, disabled, onAvailabilityChange }: PlatformToggleProps) {
  const [availability, setAvailability] = React.useState<PlatformAvailability>(DEFAULT_AVAILABILITY);

  useEffect(() => {
    let mounted = true;

    const syncAvailability = async () => {
      const next: PlatformAvailability = {
        x: { ...DEFAULT_AVAILABILITY.x },
        linkedin: { ...DEFAULT_AVAILABILITY.linkedin },
        youtube: { ...DEFAULT_AVAILABILITY.youtube },
        instagram: { ...DEFAULT_AVAILABILITY.instagram },
        tiktok: { ...DEFAULT_AVAILABILITY.tiktok },
      };

      try {
        const cp = await fetch('/.netlify/functions/control-plane').then(r => r.json());
        const pubs = Array.isArray(cp?.publishers) ? cp.publishers : [];
        for (const p of pubs) {
          const key = p?.platform as PublishPlatform;
          if (key && next[key]) {
            next[key].enabled = !!p.enabled;
            if (!p.enabled) next[key].reason = 'Not configured in control-plane';
          }
        }
      } catch {
        // Local mode may not have control-plane available; keep optimistic defaults.
      }

      try {
        const hc = await fetch('/.netlify/functions/healthcheck').then(r => r.json());
        const social = Array.isArray(hc?.services)
          ? hc.services.find((s: any) => s.name === 'social_publishing')
          : null;
        const status = social?.status;
        const reason = social?.error || '';
        if (status === 'disabled') {
          for (const k of PLATFORM_ORDER) {
            next[k].enabled = false;
            next[k].reason = reason || 'Social publishing disabled';
          }
        } else if (status === 'degraded' || status === 'ok') {
          const disabledPlatforms = parseDisabledFromHealth(reason);
          for (const k of disabledPlatforms) {
            next[k].enabled = false;
            next[k].reason = reason || 'Missing credentials';
          }
        }
      } catch {
        // keep control-plane derived values
      }

      if (!mounted) return;
      setAvailability(next);
      onAvailabilityChange?.(next);
      // DON'T call onChange here - only on explicit user toggle to prevent loops
    };

    syncAvailability();
    const t = setInterval(syncAvailability, 20000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const handleToggle = (target: PublishPlatform, enabled: boolean) => {
    if (!enabled) return;
    if (value.includes(target)) {
      const next = value.filter(v => v !== target);
      if (next.length > 0) onChange(next);
      return;
    }
    onChange([...value, target]);
  };

  return (
    <div className="mb-4 bg-black/20 p-2 rounded-lg border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Publish Targets</label>
        <span className="text-[10px] text-gray-400">{value.length} selected</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PLATFORM_ORDER.map((target) => {
          const enabled = availability[target]?.enabled !== false;
          const selected = value.includes(target);
          const cost = PLATFORM_ESTIMATE_USD[target];
          return (
            <button
              key={target}
              onClick={() => handleToggle(target, enabled)}
              disabled={disabled || !enabled}
              title={enabled ? `Estimated $${cost.toFixed(4)} per publish` : availability[target]?.reason || `${target} not configured`}
              className={`px-2 py-1.5 rounded text-xs border transition-colors ${
                !enabled
                  ? 'bg-gray-900/50 border-gray-700 text-gray-500 cursor-not-allowed'
                  : selected
                    ? 'bg-amber-600/30 border-amber-500 text-amber-200'
                    : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
              }`}
            >
              {target} {!enabled ? '🔒' : ''} · ${cost.toFixed(3)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
