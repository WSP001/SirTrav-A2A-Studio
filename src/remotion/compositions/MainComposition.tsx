import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export const MainComposition: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => {
    const frame = useCurrentFrame();
    const { fps, durationInFrames } = useVideoConfig();

    // Intro Animation
    const scale = spring({
        frame,
        fps,
        config: { damping: 200 },
    });

    // Fade out at end
    const opacity = interpolate(
        frame,
        [durationInFrames - 30, durationInFrames],
        [1, 0],
        { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );

    return (
        <AbsoluteFill style={{
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#0f172a', // Slate 900
            color: 'white',
            fontFamily: 'Inter, system-ui, sans-serif',
        }}>
            <div style={{ opacity, transform: `scale(${scale})`, textAlign: 'center' }}>
                <h1 style={{
                    fontSize: 80,
                    fontWeight: 800,
                    background: 'linear-gradient(to right, #38bdf8, #818cf8)', // Sky to Indigo
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    margin: 0,
                    marginBottom: 20
                }}>
                    {title}
                </h1>
                <h2 style={{
                    fontSize: 40,
                    fontWeight: 400,
                    color: '#94a3b8' // Slate 400
                }}>
                    {subtitle}
                </h2>
            </div>

            <div style={{
                position: 'absolute',
                bottom: 40,
                fontSize: 20,
                color: '#475569'
            }}>
                Rendered by SirTrav-A2A
            </div>
        </AbsoluteFill>
    );
};
