import React, { useState, useEffect, useCallback, useMemo } from 'react';
import KenBurnsSlide, { SlideData, MOTION_PRESETS, applyPreset } from './KenBurnsSlide';

/**
 * CinematicTheater - Container for Ken Burns photo reels
 * 
 * Features:
 * - Pre-loads next 3 images for zero-lag transitions
 * - Accepts motionManifest from Project Genie (Gemini AI)
 * - Playback HUD showing current agent status
 * - Azure & Gold design tokens
 * 
 * @example
 * <CinematicTheater
 *   motionManifest={genieManifest}
 *   onSlideChange={(index) => console.log('Now showing:', index)}
 *   agentStatus={{ agent: 'director', message: 'Gemini is directing...' }}
 * />
 */

export interface MotionManifestEntry {
  file: string;
  motion: {
    type: string;
    start: { scale: number; x: string; y: string };
    end: { scale: number; x: string; y: string };
    duration: string;
  };
}

export interface AgentStatus {
  agent: string;
  message: string;
  icon?: string;
  progress?: number;
}

interface CinematicTheaterProps {
  /** Array of image URLs or motion manifest entries */
  motionManifest: (string | MotionManifestEntry)[];
  /** Callback when slide changes */
  onSlideChange?: (index: number) => void;
  /** Callback when all slides complete */
  onComplete?: () => void;
  /** Current agent status for HUD */
  agentStatus?: AgentStatus;
  /** Auto-play slides */
  autoPlay?: boolean;
  /** Show Genie mode badge */
  genieMode?: boolean;
  /** Additional CSS class */
  className?: string;
}

// Agent icons mapping
const AGENT_ICONS: Record<string, string> = {
  director: '🎬',
  writer: '✍️',
  voice: '🎙️',
  composer: '🎵',
  editor: '🎞️',
  attribution: '📜',
  publisher: '🚀',
  genie: '✨',
};

// Cycle through motion presets for variety
const PRESET_CYCLE = [
  'zoom-in-center',
  'pan-right',
  'zoom-in-top-left',
  'pan-left',
  'zoom-out-center',
  'pan-up',
  'zoom-in-bottom-right',
  'pan-down',
] as const;

/**
 * Converts manifest entries to SlideData format.
 * Handles both raw URLs and Gemini motion manifests.
 */
function normalizeManifest(manifest: (string | MotionManifestEntry)[]): SlideData[] {
  return manifest.map((entry, index) => {
    if (typeof entry === 'string') {
      // Raw URL - apply preset based on position for variety
      const presetName = PRESET_CYCLE[index % PRESET_CYCLE.length];
      return applyPreset(entry, presetName, `Slide ${index + 1}`);
    }

    // Gemini motion manifest entry
    return {
      imageUrl: entry.file,
      startCoords: entry.motion.start,
      endCoords: entry.motion.end,
      duration: entry.motion.duration,
      alt: `${entry.motion.type} - Slide ${index + 1}`,
    };
  });
}

export default function CinematicTheater({
  motionManifest,
  onSlideChange,
  onComplete,
  agentStatus,
  autoPlay = true,
  genieMode = false,
  className = '',
}: CinematicTheaterProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [preloadedImages, setPreloadedImages] = useState<Set<string>>(new Set());

  // Normalize manifest to SlideData format
  const slides = useMemo(() => normalizeManifest(motionManifest), [motionManifest]);

  // Pre-load next 3 images for smooth transitions
  useEffect(() => {
    const imagesToPreload: string[] = [];
    
    for (let i = 0; i < 3; i++) {
      const nextIndex = (currentIndex + i) % slides.length;
      const url = slides[nextIndex]?.imageUrl;
      if (url && !preloadedImages.has(url)) {
        imagesToPreload.push(url);
      }
    }

    imagesToPreload.forEach((url) => {
      const img = new Image();
      img.src = url;
      img.onload = () => {
        setPreloadedImages((prev) => new Set(prev).add(url));
      };
    });
  }, [currentIndex, slides, preloadedImages]);

  // Handle slide transition
  const handleSlideEnd = useCallback(() => {
    if (!autoPlay) return;

    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= slides.length) {
      // All slides complete
      onComplete?.();
      setCurrentIndex(0); // Loop back
    } else {
      setCurrentIndex(nextIndex);
      onSlideChange?.(nextIndex);
    }
  }, [currentIndex, slides.length, autoPlay, onComplete, onSlideChange]);

  // Calculate progress percentage
  const progressPercent = slides.length > 0 
    ? ((currentIndex + 1) / slides.length) * 100 
    : 0;

  if (slides.length === 0) {
    return (
      <div className={`cinematic-theater ${className}`}>
        <div className="flex items-center justify-center h-full text-gray-500">
          No slides to display
        </div>
      </div>
    );
  }

  const currentSlide = slides[currentIndex];
  const agentIcon = agentStatus?.icon || AGENT_ICONS[agentStatus?.agent || 'genie'];

  return (
    <div className={`cinematic-theater ${genieMode ? 'genie-mode-active' : ''} ${className}`}>
      {/* Genie Mode Badge */}
      {genieMode && (
        <div className="genie-badge">
          Project Genie
        </div>
      )}

      {/* Current Slide */}
      <KenBurnsSlide
        slideData={currentSlide}
        isActive={true}
        onAnimationEnd={handleSlideEnd}
      />

      {/* Cinematic Vignette Overlay */}
      <div className="cinematic-vignette" />

      {/* Playback HUD */}
      {agentStatus && (
        <div className="playback-hud">
          <div className="playback-agent-status">
            <div className="agent-icon">
              {agentIcon}
            </div>
            <div>
              <span className="status-text">{agentStatus.message}</span>
            </div>
          </div>

          <div className="playback-progress">
            <div className="text-xs text-gray-400 mb-1">
              {currentIndex + 1} / {slides.length}
            </div>
            <div className="playback-progress-bar">
              <div 
                className="playback-progress-fill" 
                style={{ width: `${agentStatus.progress ?? progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Demo manifest for testing - Florida bird-watching scenes
 * Replace with real Gemini-generated manifest in production
 */
export const DEMO_MANIFEST: MotionManifestEntry[] = [
  {
    file: 'https://picsum.photos/seed/eagle-lake/1920/1080',
    motion: {
      type: 'pan-right',
      start: { scale: 1.0, x: '0%', y: '0%' },
      end: { scale: 1.1, x: '-10%', y: '0%' },
      duration: '10s',
    },
  },
  {
    file: 'https://picsum.photos/seed/cormorant/1920/1080',
    motion: {
      type: 'zoom-in-center',
      start: { scale: 1.0, x: '0%', y: '0%' },
      end: { scale: 1.3, x: '0%', y: '-5%' },
      duration: '8s',
    },
  },
  {
    file: 'https://picsum.photos/seed/sunset-florida/1920/1080',
    motion: {
      type: 'pan-left',
      start: { scale: 1.1, x: '5%', y: '0%' },
      end: { scale: 1.1, x: '-5%', y: '0%' },
      duration: '12s',
    },
  },
];
