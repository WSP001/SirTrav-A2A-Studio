import React, { useCallback, CSSProperties } from 'react';

/**
 * KenBurnsSlide - Single cinematic slide with AI-driven motion
 * 
 * Motion coordinates are provided by Project Genie (Gemini AI),
 * which analyzes each photo to determine optimal zoom/pan direction.
 * 
 * @example
 * // Gemini manifest entry:
 * {
 *   "file": "eagle-lake-sunset.jpg",
 *   "motion": {
 *     "type": "pan-right",
 *     "start": { "scale": 1.0, "x": "0%", "y": "0%" },
 *     "end": { "scale": 1.1, "x": "-10%", "y": "0%" },
 *     "duration": "10s"
 *   }
 * }
 */

export interface MotionCoords {
  scale: number;
  x: string;
  y: string;
}

export interface SlideData {
  imageUrl: string;
  startCoords: MotionCoords;
  endCoords: MotionCoords;
  duration: string;
  alt?: string;
}

interface KenBurnsSlideProps {
  slideData: SlideData;
  isActive: boolean;
  onAnimationEnd?: () => void;
  className?: string;
}

/**
 * Maps SlideData to CSS custom properties for the Ken Burns animation.
 * The animation keyframes reference these variables dynamically.
 */
function getSlideStyles(slideData: SlideData): CSSProperties {
  return {
    '--kb-start-scale': slideData.startCoords.scale,
    '--kb-start-x': slideData.startCoords.x,
    '--kb-start-y': slideData.startCoords.y,
    '--kb-end-scale': slideData.endCoords.scale,
    '--kb-end-x': slideData.endCoords.x,
    '--kb-end-y': slideData.endCoords.y,
    '--kb-duration': slideData.duration,
  } as CSSProperties;
}

export default function KenBurnsSlide({
  slideData,
  isActive,
  onAnimationEnd,
  className = '',
}: KenBurnsSlideProps) {
  const handleAnimationEnd = useCallback(() => {
    if (onAnimationEnd) {
      onAnimationEnd();
    }
  }, [onAnimationEnd]);

  const slideStyles = getSlideStyles(slideData);
  const animationClass = isActive ? 'ken-burns-active ken-burns-focus' : '';

  return (
    <div
      className={`ken-burns-slide ${className}`}
      style={slideStyles}
    >
      <img
        src={slideData.imageUrl}
        alt={slideData.alt || 'Cinematic slide'}
        className={animationClass}
        onAnimationEnd={handleAnimationEnd}
        draggable={false}
      />
    </div>
  );
}

/**
 * Preset motion patterns for common Ken Burns effects.
 * Used when Gemini doesn't provide specific coordinates.
 */
export const MOTION_PRESETS: Record<string, Omit<SlideData, 'imageUrl' | 'alt'>> = {
  'zoom-in-center': {
    startCoords: { scale: 1.0, x: '0%', y: '0%' },
    endCoords: { scale: 1.2, x: '0%', y: '0%' },
    duration: '8s',
  },
  'zoom-out-center': {
    startCoords: { scale: 1.2, x: '0%', y: '0%' },
    endCoords: { scale: 1.0, x: '0%', y: '0%' },
    duration: '8s',
  },
  'pan-left': {
    startCoords: { scale: 1.1, x: '5%', y: '0%' },
    endCoords: { scale: 1.1, x: '-5%', y: '0%' },
    duration: '10s',
  },
  'pan-right': {
    startCoords: { scale: 1.1, x: '-5%', y: '0%' },
    endCoords: { scale: 1.1, x: '5%', y: '0%' },
    duration: '10s',
  },
  'pan-up': {
    startCoords: { scale: 1.1, x: '0%', y: '5%' },
    endCoords: { scale: 1.1, x: '0%', y: '-5%' },
    duration: '10s',
  },
  'pan-down': {
    startCoords: { scale: 1.1, x: '0%', y: '-5%' },
    endCoords: { scale: 1.1, x: '0%', y: '5%' },
    duration: '10s',
  },
  'zoom-in-top-left': {
    startCoords: { scale: 1.0, x: '0%', y: '0%' },
    endCoords: { scale: 1.3, x: '10%', y: '10%' },
    duration: '8s',
  },
  'zoom-in-bottom-right': {
    startCoords: { scale: 1.0, x: '0%', y: '0%' },
    endCoords: { scale: 1.3, x: '-10%', y: '-10%' },
    duration: '8s',
  },
};

/**
 * Applies a preset motion pattern to an image URL.
 * Fallback when Gemini manifest isn't available.
 */
export function applyPreset(
  imageUrl: string,
  presetName: keyof typeof MOTION_PRESETS,
  alt?: string
): SlideData {
  const preset = MOTION_PRESETS[presetName] || MOTION_PRESETS['zoom-in-center'];
  return {
    imageUrl,
    alt,
    ...preset,
  };
}
