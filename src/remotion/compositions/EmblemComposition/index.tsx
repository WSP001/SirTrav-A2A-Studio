/**
 * EMBLEM COMPOSITION — Sir Travis Jennings Gold Seal
 *
 * Animated 18-karat gold emblem with:
 *   - Sweeping light angle (rotating specular highlight)
 *   - Glitter particle burst on entry
 *   - Pulsing glow ring
 *   - Slow prestige rotation
 *   - Fade-in reveal sequence
 *
 * Template ID: "EmblemComposition"
 * Default Duration: 5 seconds @ 30fps (150 frames)
 * Output: 1:1 square (1080×1080) for thumbnails / social
 *
 * Owner: Antigravity (Design)
 * For the Commons Good!
 */
import React from 'react';
import {
    AbsoluteFill,
    useCurrentFrame,
    useVideoConfig,
    interpolate,
    spring,
    Img,
    Sequence,
    staticFile,
} from 'remotion';
import { THEME } from '../../branding';

// ─── Glitter Particle ────────────────────────────────────────────────────────
interface GlitterProps {
    x: number;
    y: number;
    size: number;
    delay: number;
    color: string;
}

const GlitterParticle: React.FC<GlitterProps> = ({ x, y, size, delay, color }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    const localFrame = Math.max(0, frame - delay);
    const lifetime = fps * 1.5; // 1.5s lifetime

    const opacity = interpolate(localFrame, [0, 8, lifetime * 0.6, lifetime], [0, 1, 0.8, 0], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp',
    });

    const scale = interpolate(localFrame, [0, 8, lifetime], [0, 1.2, 0.3], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp',
    });

    const drift = interpolate(localFrame, [0, lifetime], [0, (Math.random() - 0.5) * 40], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp',
    });

    if (opacity <= 0) return null;

    return (
        <div
            style={{
                position: 'absolute',
                left: x + drift,
                top: y,
                width: size,
                height: size,
                borderRadius: '50%',
                background: color,
                opacity,
                transform: `scale(${scale})`,
                boxShadow: `0 0 ${size * 2}px ${color}`,
                pointerEvents: 'none',
            }}
        />
    );
};

// ─── Sweeping Light Overlay ───────────────────────────────────────────────────
const SweepingLight: React.FC<{ width: number; height: number }> = ({ width, height }) => {
    const frame = useCurrentFrame();

    // Sweep from -30° to 210° over 90 frames, then hold
    const angle = interpolate(frame, [10, 90], [-30, 210], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp',
    });

    const opacity = interpolate(frame, [10, 25, 80, 95], [0, 0.55, 0.55, 0], {
        extrapolateRight: 'clamp',
        extrapolateLeft: 'clamp',
    });

    // Convert angle to gradient direction
    const rad = (angle * Math.PI) / 180;
    const x2 = 50 + 50 * Math.cos(rad);
    const y2 = 50 + 50 * Math.sin(rad);

    return (
        <div
            style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: `linear-gradient(${angle}deg, transparent 30%, rgba(255,220,100,${opacity}) 50%, transparent 70%)`,
                pointerEvents: 'none',
                mixBlendMode: 'screen',
            }}
        />
    );
};

// ─── Glow Ring ────────────────────────────────────────────────────────────────
const GlowRing: React.FC<{ size: number }> = ({ size }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Pulsing glow after entry
    const pulsePhase = (frame / fps) * 2 * Math.PI * 0.5; // 0.5Hz pulse
    const pulseScale = 1 + 0.04 * Math.sin(pulsePhase);

    const entryOpacity = interpolate(frame, [0, 20], [0, 1], {
        extrapolateRight: 'clamp',
    });

    return (
        <div
            style={{
                position: 'absolute',
                inset: -12,
                borderRadius: '50%',
                border: '3px solid rgba(255, 200, 50, 0.6)',
                boxShadow: `
          0 0 30px rgba(255, 200, 50, 0.4),
          0 0 60px rgba(255, 180, 30, 0.2),
          inset 0 0 20px rgba(255, 200, 50, 0.1)
        `,
                opacity: entryOpacity,
                transform: `scale(${pulseScale})`,
                pointerEvents: 'none',
            }}
        />
    );
};

// ─── Main Emblem Composition ──────────────────────────────────────────────────
export interface EmblemCompositionProps {
    /** Override emblem image URL (defaults to public/sir-travis-emblem.png) */
    emblemUrl?: string;
    /** Show "For the Commons Good" tagline */
    showTagline?: boolean;
    /** Background style: 'dark' | 'gold' | 'transparent' */
    background?: 'dark' | 'gold' | 'transparent';
    /** Number of glitter particles */
    glitterCount?: number;
}

export const EmblemComposition: React.FC<EmblemCompositionProps> = ({
    emblemUrl,
    showTagline = true,
    background = 'dark',
    glitterCount = 40,
}) => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    const emblemSrc = emblemUrl || staticFile('/sir-travis-emblem.png');
    const emblemSize = Math.min(width, height) * 0.72;
    const cx = width / 2;
    const cy = height / 2;

    // ─── Entry spring animation ─────────────────────────────────────────────
    const entryScale = spring({
        frame,
        fps,
        config: { damping: 14, stiffness: 120, mass: 1 },
        from: 0.4,
        to: 1,
    });

    const entryOpacity = interpolate(frame, [0, 12], [0, 1], {
        extrapolateRight: 'clamp',
    });

    // ─── Slow prestige rotation (subtle, 1° per second) ────────────────────
    const slowRotation = interpolate(frame, [0, fps * 5], [0, 2], {
        extrapolateRight: 'clamp',
    });

    // ─── Tagline fade-in ────────────────────────────────────────────────────
    const taglineOpacity = interpolate(frame, [60, 80], [0, 1], {
        extrapolateRight: 'clamp',
    });

    // ─── Background ─────────────────────────────────────────────────────────
    const bgStyle: React.CSSProperties =
        background === 'gold'
            ? { background: 'radial-gradient(ellipse at center, #2a1a00 0%, #0d0800 100%)' }
            : background === 'transparent'
                ? { background: 'transparent' }
                : { background: 'radial-gradient(ellipse at center, #0f0f1a 0%, #050508 100%)' };

    // ─── Glitter particles (deterministic positions) ────────────────────────
    const particles = Array.from({ length: glitterCount }, (_, i) => {
        const angle = (i / glitterCount) * 2 * Math.PI;
        const radius = emblemSize * 0.38 + (i % 5) * 12;
        return {
            x: cx + radius * Math.cos(angle) - 4,
            y: cy + radius * Math.sin(angle) - 4,
            size: 4 + (i % 4) * 2,
            delay: Math.floor((i / glitterCount) * 20),
            color: i % 3 === 0
                ? 'rgba(255, 220, 80, 0.9)'
                : i % 3 === 1
                    ? 'rgba(255, 255, 200, 0.8)'
                    : 'rgba(200, 160, 40, 0.7)',
        };
    });

    return (
        <AbsoluteFill style={{ ...bgStyle, overflow: 'hidden' }}>

            {/* ── Ambient background glow ── */}
            <div style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: emblemSize * 1.4,
                height: emblemSize * 1.4,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(180,130,20,0.18) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            {/* ── Glitter burst (Sequence: frames 0–60) ── */}
            <Sequence from={0} durationInFrames={60}>
                {particles.map((p, i) => (
                    <GlitterParticle key={i} {...p} />
                ))}
            </Sequence>

            {/* ── Emblem container ── */}
            <div style={{
                position: 'absolute',
                left: cx - emblemSize / 2,
                top: cy - emblemSize / 2,
                width: emblemSize,
                height: emblemSize,
                opacity: entryOpacity,
                transform: `scale(${entryScale}) rotate(${slowRotation}deg)`,
            }}>
                {/* Glow ring */}
                <GlowRing size={emblemSize} />

                {/* The actual emblem */}
                <Img
                    src={emblemSrc}
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: '50%',
                        filter: 'drop-shadow(0 0 24px rgba(200,150,20,0.5))',
                    }}
                />

                {/* Sweeping light overlay */}
                <Sequence from={10} durationInFrames={90}>
                    <SweepingLight width={emblemSize} height={emblemSize} />
                </Sequence>
            </div>

            {/* ── Tagline ── */}
            {showTagline && (
                <div style={{
                    position: 'absolute',
                    bottom: height * 0.08,
                    left: 0,
                    right: 0,
                    textAlign: 'center',
                    opacity: taglineOpacity,
                    fontFamily: THEME.typography.display,
                    fontSize: Math.max(18, width * 0.022),
                    color: 'rgba(220, 180, 60, 0.9)',
                    letterSpacing: '0.18em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    textShadow: '0 0 20px rgba(220,180,60,0.4)',
                }}>
                    For the Commons Good
                </div>
            )}

            {/* ── "SirTrav" wordmark ── */}
            <div style={{
                position: 'absolute',
                top: height * 0.06,
                left: 0,
                right: 0,
                textAlign: 'center',
                opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: 'clamp' }),
                fontFamily: THEME.typography.display,
                fontSize: Math.max(14, width * 0.018),
                color: 'rgba(180, 140, 40, 0.7)',
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                fontWeight: 300,
            }}>
                SirTrav A2A Studio
            </div>

        </AbsoluteFill>
    );
};

export default EmblemComposition;
