/**
 * AUTO-SCALING TEXT COMPONENT
 * 
 * Prevents text overflow - the #1 failure in automated video.
 * Uses algorithmic font sizing based on text length.
 * 
 * RULE: Never use fixed font sizes for dynamic text.
 */
import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { THEME } from '../branding';

interface AutoScalingTextProps {
    text: string;
    baseSize?: number;
    minSize?: number;
    maxLength?: number;
    color?: string;
    fontFamily?: string;
    entranceDelay?: number;
    className?: string;
}

export const AutoScalingText: React.FC<AutoScalingTextProps> = ({
    text,
    baseSize = 120,
    minSize = 36,
    maxLength = 10,
    color = THEME.colors.textPrimary,
    fontFamily = THEME.typography.display,
    entranceDelay = 0,
    className = '',
}) => {
    const frame = useCurrentFrame();
    const adjustedFrame = Math.max(0, frame - entranceDelay);

    // =========================================================================
    // ALGORITHMIC FONT SIZING
    // =========================================================================
    // Characters beyond maxLength reduce font size
    const lengthFactor = Math.max(0, text.length - maxLength);
    const scaleFactor = 2.5; // Pixels reduced per extra character
    const calculatedSize = Math.max(minSize, baseSize - (lengthFactor * scaleFactor));

    // =========================================================================
    // ENTRANCE ANIMATION
    // =========================================================================
    const entranceDuration = THEME.animation.entranceDuration;

    const opacity = interpolate(
        adjustedFrame,
        [0, entranceDuration],
        [0, 1],
        { extrapolateRight: 'clamp' }
    );

    const scale = interpolate(
        adjustedFrame,
        [0, entranceDuration],
        [0.8, 1],
        { extrapolateRight: 'clamp' }
    );

    const translateY = interpolate(
        adjustedFrame,
        [0, entranceDuration],
        [20, 0],
        { extrapolateRight: 'clamp' }
    );

    // =========================================================================
    // STYLES
    // =========================================================================
    const style: React.CSSProperties = {
        fontSize: calculatedSize,
        fontFamily,
        color,
        opacity,
        transform: `scale(${scale}) translateY(${translateY}px)`,
        fontWeight: 700,
        letterSpacing: '-0.02em',
        lineHeight: 1.1,
        textAlign: 'center',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
    };

    return (
        <div style={style} className={className}>
            {text}
        </div>
    );
};

// ============================================================================
// ANIMATED NUMBER COMPONENT (For stats/metrics)
// ============================================================================
interface AnimatedNumberProps {
    value: number;
    suffix?: string;
    prefix?: string;
    duration?: number;
    color?: string;
    size?: number;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
    value,
    suffix = '',
    prefix = '',
    duration = 30,
    color = THEME.colors.accent,
    size = 72,
}) => {
    const frame = useCurrentFrame();

    const displayValue = Math.floor(
        interpolate(frame, [0, duration], [0, value], {
            extrapolateRight: 'clamp',
        })
    );

    return (
        <span style={{
            fontSize: size,
            fontWeight: 800,
            color,
            fontFamily: THEME.typography.display,
        }}>
            {prefix}{displayValue.toLocaleString()}{suffix}
        </span>
    );
};

// ============================================================================
// GRADIENT TEXT COMPONENT
// ============================================================================
interface GradientTextProps {
    text: string;
    size?: number;
    startColor?: string;
    endColor?: string;
}

export const GradientText: React.FC<GradientTextProps> = ({
    text,
    size = 80,
    startColor = THEME.colors.gradientStart,
    endColor = THEME.colors.gradientEnd,
}) => {
    const frame = useCurrentFrame();

    // Animated gradient position
    const gradientPosition = interpolate(frame, [0, 60], [0, 100], {
        extrapolateRight: 'clamp',
    });

    const style: React.CSSProperties = {
        fontSize: size,
        fontWeight: 800,
        fontFamily: THEME.typography.display,
        background: `linear-gradient(90deg, ${startColor}, ${endColor} ${gradientPosition}%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
    };

    return <span style={style}>{text}</span>;
};
