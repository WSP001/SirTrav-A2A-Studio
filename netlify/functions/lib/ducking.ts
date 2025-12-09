/**
 * Audio Ducking Utilities v1.0.0
 * 
 * Provides FFmpeg filter generation for audio ducking:
 * - Theme music ducks to -10dB during narration
 * - Theme music returns to -3dB in gaps between narration
 * 
 * Usage in FFmpeg complex filter chain for Editor Agent
 */

/**
 * Narration segment with timing information
 * Derived from TTS word-level timestamps or silence detection
 */
export interface NarrationSegment {
  start: number;  // Start time in seconds
  end: number;    // End time in seconds
  text?: string;  // Optional transcript
}

/**
 * Ducking configuration
 */
export interface DuckingConfig {
  /** Volume during narration (default: -10dB → 0.316) */
  narrationVolume: number;
  /** Volume in gaps (default: -3dB → 0.708) */
  gapVolume: number;
  /** Attack time in ms for fade-down (default: 200ms) */
  attackMs: number;
  /** Release time in ms for fade-up (default: 400ms) */
  releaseMs: number;
  /** Minimum gap duration to consider for volume up (default: 0.5s) */
  minGapDuration: number;
}

// dB to linear conversion: 10^(dB/20)
const DB_TO_LINEAR = {
  '-10': 0.316227766,  // 10^(-10/20)
  '-3': 0.707945784,   // 10^(-3/20)
  '-6': 0.501187234,   // 10^(-6/20)
  '0': 1.0,
};

/**
 * Default ducking configuration
 * -10dB during narration, -3dB in gaps
 */
export const DEFAULT_DUCKING_CONFIG: DuckingConfig = {
  narrationVolume: DB_TO_LINEAR['-10'],
  gapVolume: DB_TO_LINEAR['-3'],
  attackMs: 200,
  releaseMs: 400,
  minGapDuration: 0.5,
};

/**
 * Generate FFmpeg volume keyframes for ducking
 * 
 * @param segments - Array of narration segments
 * @param totalDuration - Total audio duration in seconds
 * @param config - Ducking configuration
 * @returns FFmpeg volume filter with keyframe expressions
 */
export function generateVolumeKeyframes(
  segments: NarrationSegment[],
  totalDuration: number,
  config: DuckingConfig = DEFAULT_DUCKING_CONFIG
): string {
  if (!segments || segments.length === 0) {
    // No narration - just apply gap volume
    return `volume=${config.gapVolume}`;
  }

  // Sort segments by start time
  const sorted = [...segments].sort((a, b) => a.start - b.start);
  
  // Build keyframe points
  const keyframes: Array<{ time: number; volume: number }> = [];
  const attackSec = config.attackMs / 1000;
  const releaseSec = config.releaseMs / 1000;
  
  // Start at gap volume
  keyframes.push({ time: 0, volume: config.gapVolume });
  
  for (let i = 0; i < sorted.length; i++) {
    const seg = sorted[i];
    const nextSeg = sorted[i + 1];
    
    // Fade down before narration starts
    const fadeDownStart = Math.max(0, seg.start - attackSec);
    if (fadeDownStart > keyframes[keyframes.length - 1].time) {
      keyframes.push({ time: fadeDownStart, volume: config.gapVolume });
    }
    keyframes.push({ time: seg.start, volume: config.narrationVolume });
    
    // Stay ducked during narration
    keyframes.push({ time: seg.end, volume: config.narrationVolume });
    
    // Check if there's a gap after this segment
    if (nextSeg) {
      const gapDuration = nextSeg.start - seg.end;
      if (gapDuration >= config.minGapDuration) {
        // Fade up to gap volume
        const fadeUpEnd = Math.min(seg.end + releaseSec, nextSeg.start - attackSec);
        keyframes.push({ time: fadeUpEnd, volume: config.gapVolume });
      }
      // If gap is too short, stay ducked
    } else {
      // Last segment - fade up to gap volume
      const fadeUpEnd = Math.min(seg.end + releaseSec, totalDuration);
      keyframes.push({ time: fadeUpEnd, volume: config.gapVolume });
    }
  }
  
  // Ensure we end at gap volume
  if (keyframes[keyframes.length - 1].time < totalDuration) {
    keyframes.push({ time: totalDuration, volume: config.gapVolume });
  }
  
  // Convert to FFmpeg expression
  // Using 'enable' with between() for each segment or volume with keyframe interpolation
  return buildFFmpegVolumeExpression(keyframes);
}

/**
 * Build FFmpeg volume expression with keyframe interpolation
 * Uses the 'volume' filter with 'eval=frame' and expression
 */
function buildFFmpegVolumeExpression(
  keyframes: Array<{ time: number; volume: number }>
): string {
  if (keyframes.length < 2) {
    return `volume=${keyframes[0]?.volume || 0.708}`;
  }
  
  // Build piecewise linear expression
  // volume=if(lt(t,t1),v1, if(lt(t,t2),lerp(v1,v2,(t-t1)/(t2-t1)), ...))
  const parts: string[] = [];
  
  for (let i = 0; i < keyframes.length - 1; i++) {
    const curr = keyframes[i];
    const next = keyframes[i + 1];
    
    if (curr.volume === next.volume) {
      // Constant segment
      parts.push(`if(between(t,${curr.time.toFixed(3)},${next.time.toFixed(3)}),${curr.volume.toFixed(4)}`);
    } else {
      // Linear interpolation segment
      const slope = (next.volume - curr.volume) / (next.time - curr.time);
      parts.push(
        `if(between(t,${curr.time.toFixed(3)},${next.time.toFixed(3)}),` +
        `${curr.volume.toFixed(4)}+${slope.toFixed(6)}*(t-${curr.time.toFixed(3)})`
      );
    }
  }
  
  // Close all if statements and add default
  const expr = parts.join(',') + ','.repeat(parts.length - 1) + 
               `)`.repeat(parts.length) + 
               `:${keyframes[keyframes.length - 1].volume.toFixed(4)}`;
  
  return `volume='${expr}':eval=frame`;
}

/**
 * Alternative: Generate sidechaincompress filter for dynamic ducking
 * This uses the narration track to automatically duck the music
 * More natural sounding but requires both audio tracks
 */
export function generateSidechainFilter(
  narrationInput: string = '1:a',
  musicInput: string = '2:a',
  config: DuckingConfig = DEFAULT_DUCKING_CONFIG
): string {
  // Sidechain compression parameters
  // threshold: level at which compression starts (low = more sensitive)
  // ratio: amount of compression (higher = more ducking)
  // attack/release: how fast the ducking engages/disengages
  const threshold = 0.02;  // Start ducking at low narration levels
  const ratio = 4;         // 4:1 ratio for noticeable ducking
  
  return `[${musicInput}][${narrationInput}]sidechaincompress=` +
         `threshold=${threshold}:` +
         `ratio=${ratio}:` +
         `attack=${config.attackMs}:` +
         `release=${config.releaseMs}:` +
         `level_sc=1[ducked_music]`;
}

/**
 * Generate complete FFmpeg complex filter for audio mixing with ducking
 * 
 * @param narrationInput - FFmpeg input label for narration (e.g., '1:a')
 * @param musicInput - FFmpeg input label for music (e.g., '2:a')
 * @param segments - Narration segments for keyframe-based ducking
 * @param totalDuration - Total duration in seconds
 * @param config - Ducking configuration
 * @param useSidechain - Use sidechain compression instead of keyframes
 */
export function generateDuckingFilterChain(
  narrationInput: string,
  musicInput: string,
  segments: NarrationSegment[],
  totalDuration: number,
  config: DuckingConfig = DEFAULT_DUCKING_CONFIG,
  useSidechain: boolean = false
): string {
  if (useSidechain) {
    // Sidechain approach - music automatically ducks based on narration level
    return `
      [${narrationInput}]loudnorm=I=-14:TP=-1.5:LRA=11[narration];
      [${musicInput}]${generateVolumeKeyframes([], totalDuration, { ...config, gapVolume: config.gapVolume })}[music_vol];
      [music_vol][narration]sidechaincompress=threshold=0.015:ratio=6:attack=${config.attackMs}:release=${config.releaseMs}[ducked_music];
      [narration][ducked_music]amix=inputs=2:duration=longest[a]
    `.trim().replace(/\n\s+/g, '');
  }
  
  // Keyframe approach - explicit volume automation based on narration timing
  const volumeFilter = generateVolumeKeyframes(segments, totalDuration, config);
  
  return `
    [${narrationInput}]loudnorm=I=-14:TP=-1.5:LRA=11[narration];
    [${musicInput}]${volumeFilter}[ducked_music];
    [narration][ducked_music]amix=inputs=2:duration=longest:weights=1 0.5[a]
  `.trim().replace(/\n\s+/g, '');
}

/**
 * Detect silence/gaps in narration for segment creation
 * This would typically run on the server with ffprobe
 */
export function parseSilenceDetection(ffprobeOutput: string): NarrationSegment[] {
  // Parse ffprobe silencedetect output
  // Format: [silencedetect @ ...] silence_start: 1.234
  //         [silencedetect @ ...] silence_end: 2.567 | silence_duration: 1.333
  
  const segments: NarrationSegment[] = [];
  const silenceRanges: Array<{ start: number; end: number }> = [];
  
  const startMatches = ffprobeOutput.matchAll(/silence_start:\s*([\d.]+)/g);
  const endMatches = ffprobeOutput.matchAll(/silence_end:\s*([\d.]+)/g);
  
  const starts = [...startMatches].map(m => parseFloat(m[1]));
  const ends = [...endMatches].map(m => parseFloat(m[1]));
  
  for (let i = 0; i < Math.min(starts.length, ends.length); i++) {
    silenceRanges.push({ start: starts[i], end: ends[i] });
  }
  
  // Invert silence ranges to get speech ranges
  let lastEnd = 0;
  for (const silence of silenceRanges) {
    if (silence.start > lastEnd) {
      segments.push({ start: lastEnd, end: silence.start });
    }
    lastEnd = silence.end;
  }
  
  return segments;
}

/**
 * Generate ffprobe command to detect silence in narration
 */
export function generateSilenceDetectCommand(narrationPath: string): string {
  return `ffprobe -f lavfi -i "amovie=${narrationPath},silencedetect=noise=-30dB:d=0.3" -show_entries frame_tags=lavfi.silence_start,lavfi.silence_end -of json`;
}

export default {
  generateVolumeKeyframes,
  generateSidechainFilter,
  generateDuckingFilterChain,
  parseSilenceDetection,
  generateSilenceDetectCommand,
  DEFAULT_DUCKING_CONFIG,
};
