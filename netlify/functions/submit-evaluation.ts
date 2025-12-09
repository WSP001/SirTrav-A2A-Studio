/**
 * Submit Evaluation Function
 *
 * Handles user feedback (👍/👎) for the EGO-Prompt learning loop.
 * Updates memory_index.json with user preferences and video history.
 *
 * Version: 1.0.0
 * Last Updated: 2025-12-09
 */

import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * User evaluation payload
 */
interface EvaluationPayload {
  projectId: string;
  rating: 'good' | 'bad';
  comments?: string;
  metadata?: {
    platform?: string;
    theme?: string;
    style?: string;
  };
}

/**
 * Video history entry
 */
interface VideoHistoryEntry {
  projectId: string;
  timestamp: string;
  rating: 'good' | 'bad';
  comments?: string;
  metadata?: Record<string, any>;
}

/**
 * User preferences structure
 */
interface UserPreferences {
  themes: Record<string, number>; // theme -> score (positive/negative)
  styles: Record<string, number>;
  pacing: Record<string, number>;
  music_genres: Record<string, number>;
  avg_rating: number;
  total_videos: number;
  good_videos: number;
  bad_videos: number;
}

/**
 * Memory index structure
 */
interface MemoryIndex {
  version: string;
  last_updated: string;
  video_history: VideoHistoryEntry[];
  user_preferences: UserPreferences;
  learned_patterns: string[];
}

const MEMORY_INDEX_PATH = path.join(
  process.env.TMPDIR || '/tmp',
  'memory_index.json'
);

/**
 * Load existing memory index or create new one
 */
async function loadMemoryIndex(): Promise<MemoryIndex> {
  try {
    const data = await fs.readFile(MEMORY_INDEX_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // Create new memory index if file doesn't exist
    return {
      version: '1.0.0',
      last_updated: new Date().toISOString(),
      video_history: [],
      user_preferences: {
        themes: {},
        styles: {},
        pacing: {},
        music_genres: {},
        avg_rating: 0,
        total_videos: 0,
        good_videos: 0,
        bad_videos: 0,
      },
      learned_patterns: [],
    };
  }
}

/**
 * Save memory index to disk
 */
async function saveMemoryIndex(memoryIndex: MemoryIndex): Promise<void> {
  memoryIndex.last_updated = new Date().toISOString();
  await fs.writeFile(
    MEMORY_INDEX_PATH,
    JSON.stringify(memoryIndex, null, 2),
    'utf-8'
  );
}

/**
 * Update user preferences based on evaluation
 */
function updatePreferences(
  preferences: UserPreferences,
  evaluation: EvaluationPayload
): UserPreferences {
  const updated = { ...preferences };

  // Update totals
  updated.total_videos += 1;
  if (evaluation.rating === 'good') {
    updated.good_videos += 1;
  } else {
    updated.bad_videos += 1;
  }

  // Calculate average rating
  updated.avg_rating = updated.good_videos / updated.total_videos;

  // Update theme preferences
  if (evaluation.metadata?.theme) {
    const theme = evaluation.metadata.theme;
    const score = evaluation.rating === 'good' ? 1 : -1;
    updated.themes[theme] = (updated.themes[theme] || 0) + score;
  }

  // Update style preferences
  if (evaluation.metadata?.style) {
    const style = evaluation.metadata.style;
    const score = evaluation.rating === 'good' ? 1 : -1;
    updated.styles[style] = (updated.styles[style] || 0) + score;
  }

  return updated;
}

/**
 * Generate learned patterns from preferences
 */
function generateLearnedPatterns(preferences: UserPreferences): string[] {
  const patterns: string[] = [];

  // Identify preferred themes
  const topThemes = Object.entries(preferences.themes)
    .filter(([_, score]) => score > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme);

  if (topThemes.length > 0) {
    patterns.push(`Preferred themes: ${topThemes.join(', ')}`);
  }

  // Identify disliked themes
  const worstThemes = Object.entries(preferences.themes)
    .filter(([_, score]) => score < -2)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 2)
    .map(([theme]) => theme);

  if (worstThemes.length > 0) {
    patterns.push(`Avoid themes: ${worstThemes.join(', ')}`);
  }

  // Identify preferred styles
  const topStyles = Object.entries(preferences.styles)
    .filter(([_, score]) => score > 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([style]) => style);

  if (topStyles.length > 0) {
    patterns.push(`Preferred styles: ${topStyles.join(', ')}`);
  }

  // Overall rating insight
  if (preferences.avg_rating > 0.7) {
    patterns.push('User is generally satisfied with current approach');
  } else if (preferences.avg_rating < 0.4) {
    patterns.push('User preferences require more calibration');
  }

  return patterns;
}

/**
 * Main handler
 */
export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers,
      body: '',
    };
  }

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const evaluation: EvaluationPayload = JSON.parse(event.body || '{}');

    // Validate payload
    if (!evaluation.projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId is required' }),
      };
    }

    if (!['good', 'bad'].includes(evaluation.rating)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'rating must be "good" or "bad"' }),
      };
    }

    console.log(`[Evaluation] Received feedback for ${evaluation.projectId}:`, {
      rating: evaluation.rating,
      hasComments: !!evaluation.comments,
    });

    // Load memory index
    const memoryIndex = await loadMemoryIndex();

    // Add to video history
    const historyEntry: VideoHistoryEntry = {
      projectId: evaluation.projectId,
      timestamp: new Date().toISOString(),
      rating: evaluation.rating,
      comments: evaluation.comments,
      metadata: evaluation.metadata,
    };

    memoryIndex.video_history.push(historyEntry);

    // Limit history to last 100 entries
    if (memoryIndex.video_history.length > 100) {
      memoryIndex.video_history = memoryIndex.video_history.slice(-100);
    }

    // Update user preferences
    memoryIndex.user_preferences = updatePreferences(
      memoryIndex.user_preferences,
      evaluation
    );

    // Generate learned patterns
    memoryIndex.learned_patterns = generateLearnedPatterns(
      memoryIndex.user_preferences
    );

    // Save updated memory index
    await saveMemoryIndex(memoryIndex);

    console.log(`[Evaluation] Memory updated:`, {
      totalVideos: memoryIndex.user_preferences.total_videos,
      avgRating: memoryIndex.user_preferences.avg_rating.toFixed(2),
      patterns: memoryIndex.learned_patterns.length,
    });

    // Return success response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Feedback recorded successfully',
        stats: {
          total_videos: memoryIndex.user_preferences.total_videos,
          avg_rating: memoryIndex.user_preferences.avg_rating,
          good_videos: memoryIndex.user_preferences.good_videos,
          bad_videos: memoryIndex.user_preferences.bad_videos,
        },
        learned_patterns: memoryIndex.learned_patterns,
      }),
    };
  } catch (error) {
    console.error('[Evaluation] Error processing feedback:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to process feedback',
        details: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};
