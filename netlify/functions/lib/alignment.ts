export interface NarrationSegment {
  start: number;
  end: number;
  text?: string;
}

/**
 * Convert ElevenLabs-style alignment into generic NarrationSegment[].
 * Falls back to empty array on unknown shapes.
 */
export function alignmentToSegments(alignment: any): NarrationSegment[] {
  if (!alignment) return [];

  const words = Array.isArray(alignment.words) ? alignment.words : [];
  const segments: NarrationSegment[] = [];

  for (const w of words) {
    const start = typeof w.start === 'number' ? w.start : typeof w.t === 'number' ? w.t : null;
    const end = typeof w.end === 'number' ? w.end : typeof w.d === 'number' ? (start ?? 0) + w.d : null;
    if (start === null || end === null) continue;
    segments.push({
      start,
      end,
      text: typeof w.text === 'string' ? w.text : typeof w.word === 'string' ? w.word : undefined,
    });
  }

  return segments;
}
