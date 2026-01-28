/**
 * INTRO SLATE COMPOSITION
 * 
 * Bold title card with logo animation.
 * Template ID: "IntroSlate"
 * Default Duration: 5 seconds @ 30fps (150 frames)
 */
import React from 'react';
import {
    AbsoluteFill,
    useCurrentFrame,
    interpolate,
    Img,
    Audio,
    Sequence,
} from 'remotion';
import { THEME, ASSETS } from '../../branding';
import { AutoScalingText, GradientText } from '../../components/AutoScalingText';
import type { IntroSlateProps } from '../../types';

// ============================================================================
// LOGO ANIMATION COMPONENT
// ============================================================================
const LogoAnimation: React.FC<{ logoUrl?: string }> = ({ logoUrl }) => {
    const frame = useCurrentFrame();

    const scale = interpolate(frame, [0, 20], [0.5, 1], {
        extrapolateRight: 'clamp',
    });

    const opacity = interpolate(frame, [0, 15], [0, 1], {
        extrapolateRight: 'clamp',
    });

    const rotation = interpolate(frame, [0, 20], [-10, 0], {
        extrapolateRight: 'clamp',
    });

    const logoSrc = logoUrl || ASSETS.logo;

    return (
        <div style={{
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            opacity,
        }}>
            <Img
                src={logoSrc}
                style={{
                    width: 150,
                    height: 150,
                    objectFit: 'contain',
                }}
            />
        </div>
    );
};

// ============================================================================
// DATE BADGE COMPONENT
// ============================================================================
const DateBadge: React.FC<{ show: boolean }> = ({ show }) => {
    const frame = useCurrentFrame();

    if (!show) return null;

    const opacity = interpolate(frame, [40, 50], [0, 1], {
        extrapolateRight: 'clamp',
    });

    const date = new Date().toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
    });

    return (
        <div style={{
            opacity,
            backgroundColor: THEME.colors.accent,
            color: THEME.colors.background,
            padding: '8px 20px',
            borderRadius: 4,
            fontSize: 18,
            fontWeight: 600,
            fontFamily: THEME.typography.body,
            letterSpacing: '0.05em',
        }}>
            {date.toUpperCase()}
        </div>
    );
};

// ============================================================================
// ANIMATED BACKGROUND
// ============================================================================
const AnimatedBackground: React.FC = () => {
    const frame = useCurrentFrame();

    // Subtle gradient animation
    const gradientAngle = interpolate(frame, [0, 150], [135, 145]);

    return (
        <AbsoluteFill style={{
            background: `linear-gradient(${gradientAngle}deg, 
        ${THEME.colors.background} 0%, 
        ${THEME.colors.secondary} 50%,
        ${THEME.colors.background} 100%)`,
        }}>
            {/* Subtle noise overlay for texture */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E")`,
                opacity: 0.3,
            }} />

            {/* Animated glow */}
            <div style={{
                position: 'absolute',
                left: '50%',
                top: '30%',
                transform: 'translate(-50%, -50%)',
                width: 600,
                height: 600,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${THEME.colors.primary}22 0%, transparent 70%)`,
                animation: `pulse ${3}s ease-in-out infinite`,
            }} />
        </AbsoluteFill>
    );
};

// ============================================================================
// MAIN INTRO SLATE COMPONENT
// ============================================================================
export const IntroSlate: React.FC<IntroSlateProps> = ({
    title,
    subtitle,
    logoUrl,
    showDate = true,
    theme = 'default',
}) => {
    return (
        <AbsoluteFill>
            {/* Background */}
            <AnimatedBackground />

            {/* Audio */}
            <Audio src={ASSETS.introSound} volume={0.7} />

            {/* Content Layout */}
            <AbsoluteFill style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: THEME.spacing.md,
                padding: THEME.spacing.xl,
            }}>
                {/* Logo */}
                <Sequence from={0} durationInFrames={150}>
                    <LogoAnimation logoUrl={logoUrl} />
                </Sequence>

                {/* Title */}
                <Sequence from={10} durationInFrames={140}>
                    <AutoScalingText
                        text={title}
                        baseSize={100}
                        minSize={48}
                        maxLength={15}
                        color={THEME.colors.textPrimary}
                    />
                </Sequence>

                {/* Subtitle */}
                {subtitle && (
                    <Sequence from={25} durationInFrames={125}>
                        <AutoScalingText
                            text={subtitle}
                            baseSize={36}
                            minSize={24}
                            maxLength={40}
                            color={THEME.colors.textSecondary}
                        />
                    </Sequence>
                )}

                {/* Date Badge */}
                <Sequence from={40} durationInFrames={110}>
                    <DateBadge show={showDate} />
                </Sequence>
            </AbsoluteFill>

            {/* Bottom Attribution Bar */}
            <Sequence from={60} durationInFrames={90}>
                <div style={{
                    position: 'absolute',
                    bottom: THEME.spacing.md,
                    left: 0,
                    right: 0,
                    display: 'flex',
                    justifyContent: 'center',
                }}>
                    <span style={{
                        fontSize: 14,
                        color: THEME.colors.textMuted,
                        fontFamily: THEME.typography.body,
                    }}>
                        For the Commons Good
                    </span>
                </div>
            </Sequence>
        </AbsoluteFill>
    );
};

export default IntroSlate;
