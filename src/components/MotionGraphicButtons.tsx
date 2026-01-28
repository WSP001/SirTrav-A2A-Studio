/**
 * MOTION GRAPHIC BUTTONS (Click-to-Kick UI)
 * 
 * Mission control for generating motion graphics.
 * Handles the "Loading State" gracefully and exposes "Regenerative" controls.
 * 
 * PATTERN: Click → Dispatch → Poll → Display
 */
import React, { useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================
type RenderStatus = 'idle' | 'rendering' | 'polling' | 'done' | 'error';

interface Template {
    id: string;
    label: string;
    icon: string;
    description: string;
}

interface MotionGraphicButtonsProps {
    projectId: string;
    runId?: string;
    onRenderComplete?: (url: string) => void;
    onError?: (error: string) => void;
}

// ============================================================================
// TEMPLATE DEFINITIONS
// ============================================================================
const TEMPLATES: Template[] = [
    {
        id: 'IntroSlate',
        label: 'Intro Slate',
        icon: '🎬',
        description: 'Bold title card with logo',
    },
    {
        id: 'Changelog',
        label: 'Changelog',
        icon: '📋',
        description: 'Feature list animation',
    },
    {
        id: 'OutroCredits',
        label: 'Outro Credits',
        icon: '🎭',
        description: 'Attribution & CTA',
    },
    {
        id: 'SocialPromo',
        label: 'Social Promo',
        icon: '📱',
        description: 'Vertical teaser clip',
    },
];

// ============================================================================
// POLLING HELPER
// ============================================================================
async function pollForCompletion(
    pollUrl: string,
    onProgress?: (progress: number) => void,
    maxAttempts = 60,
    intervalMs = 2000
): Promise<string> {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const res = await fetch(pollUrl);
        const data = await res.json();

        if (data.done) {
            return data.outputFile || data.outputUrl;
        }

        if (data.fatalErrorEncountered) {
            throw new Error(data.errors?.message || 'Render failed');
        }

        if (onProgress && data.overallProgress !== undefined) {
            onProgress(Math.round(data.overallProgress * 100));
        }

        await new Promise(r => setTimeout(r, intervalMs));
    }

    throw new Error('Render timed out');
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const MotionGraphicButtons: React.FC<MotionGraphicButtonsProps> = ({
    projectId,
    runId,
    onRenderComplete,
    onError,
}) => {
    const [status, setStatus] = useState<RenderStatus>('idle');
    const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [error, setError] = useState<string>('');

    // ─────────────────────────────────────────────────────────────────────────
    // CLICK HANDLER
    // ─────────────────────────────────────────────────────────────────────────
    const handleKick = async (templateId: string) => {
        setStatus('rendering');
        setActiveTemplate(templateId);
        setProgress(0);
        setError('');
        setVideoUrl('');

        try {
            // 1. Dispatch to Motion Agent
            const res = await fetch('/.netlify/functions/generate-motion-graphic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    templateId,
                    projectId,
                    runId: runId || `run-${Date.now()}`,
                    platform: 'youtube',
                    forceRegenerate: true,
                    props: {
                        title: `SirTrav ${new Date().toLocaleDateString()}`,
                        subtitle: 'Automated Production',
                    },
                }),
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || 'Dispatch failed');
            }

            // 2. Handle placeholder mode (Lambda not configured)
            if (data.placeholder) {
                console.log('🎬 Placeholder mode:', data.message);
                setVideoUrl(data.mockUrl);
                setStatus('done');
                onRenderComplete?.(data.mockUrl);
                return;
            }

            // 3. Poll for completion (if polling is needed)
            if (data.polling && data.pollUrl) {
                setStatus('polling');
                const outputUrl = await pollForCompletion(
                    data.pollUrl,
                    (p) => setProgress(p)
                );
                setVideoUrl(outputUrl);
                setStatus('done');
                onRenderComplete?.(outputUrl);
            } else if (data.outputUrl) {
                setVideoUrl(data.outputUrl);
                setStatus('done');
                onRenderComplete?.(data.outputUrl);
            }

        } catch (err: any) {
            console.error('Motion render error:', err);
            setError(err.message || 'Unknown error');
            setStatus('error');
            onError?.(err.message);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="motion-graphic-panel">
            <h3 className="text-lg font-semibold mb-4 text-gray-100">
                🎬 Motion Graphics
            </h3>

            {/* Template Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                {TEMPLATES.map((template) => {
                    const isActive = activeTemplate === template.id;
                    const isDisabled = status !== 'idle' && !isActive;

                    return (
                        <button
                            key={template.id}
                            onClick={() => handleKick(template.id)}
                            disabled={isDisabled}
                            className={`
                relative p-4 rounded-lg border-2 transition-all duration-200
                ${isActive && status === 'rendering'
                                    ? 'border-blue-500 bg-blue-500/20 animate-pulse'
                                    : 'border-gray-700 hover:border-gray-500 bg-gray-800/50'}
                ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
                        >
                            <div className="text-3xl mb-2">{template.icon}</div>
                            <div className="text-sm font-medium text-gray-100">
                                {template.label}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                                {template.description}
                            </div>

                            {/* Progress indicator */}
                            {isActive && status === 'polling' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 rounded-b">
                                    <div
                                        className="h-full bg-blue-500 transition-all duration-300 rounded-b"
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Status Display */}
            {status !== 'idle' && (
                <div className={`
          p-3 rounded-lg mb-4
          ${status === 'error' ? 'bg-red-500/20 border border-red-500/50' : ''}
          ${status === 'done' ? 'bg-green-500/20 border border-green-500/50' : ''}
          ${(status === 'rendering' || status === 'polling') ? 'bg-blue-500/20 border border-blue-500/50' : ''}
        `}>
                    {status === 'rendering' && (
                        <div className="flex items-center gap-2 text-blue-400">
                            <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
                            <span>Dispatching to Lambda...</span>
                        </div>
                    )}

                    {status === 'polling' && (
                        <div className="flex items-center gap-2 text-blue-400">
                            <div className="animate-spin w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full" />
                            <span>Rendering... {progress}%</span>
                        </div>
                    )}

                    {status === 'done' && (
                        <div className="text-green-400">
                            ✅ Render complete!
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-red-400">
                            ❌ {error}
                        </div>
                    )}
                </div>
            )}

            {/* Video Player */}
            {videoUrl && status === 'done' && (
                <div className="mt-4 rounded-lg overflow-hidden bg-black">
                    <video
                        src={videoUrl}
                        controls
                        className="w-full"
                        autoPlay
                    />
                    <div className="p-2 bg-gray-800 flex justify-between items-center">
                        <span className="text-xs text-gray-400">
                            {activeTemplate} • {projectId}
                        </span>
                        <a
                            href={videoUrl}
                            download
                            className="text-xs text-blue-400 hover:text-blue-300"
                        >
                            Download
                        </a>
                    </div>
                </div>
            )}

            {/* Reset Button */}
            {(status === 'done' || status === 'error') && (
                <button
                    onClick={() => {
                        setStatus('idle');
                        setActiveTemplate(null);
                        setProgress(0);
                        setVideoUrl('');
                        setError('');
                    }}
                    className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-gray-200 transition-colors"
                >
                    Generate Another
                </button>
            )}
        </div>
    );
};

export default MotionGraphicButtons;
