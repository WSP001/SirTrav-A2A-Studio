/**
 * Memory Helper - Learning Loop Interface
 *
 * Provides a clean API for agents to read/write memory
 * Uses Netlify Blobs for persistence
 */
import { getConfiguredBlobsStore } from './storage';

// Memory store name
const MEMORY_STORE = 'sirtrav-memory';

export interface MemoryIndex {
  projectId: string;
  favorite_moods: string[];
  disliked_music_styles: string[];
  video_history: VideoHistoryEntry[];
  user_preferences: UserPreferences;
  lastUpdated: string;
}

export interface VideoHistoryEntry {
  runId: string;
  projectId: string;
  rating: 'good' | 'bad' | 'pending';
  timestamp: string;
  prompt?: string;
  mood?: string;
  pipelineMode?: string;
}

export interface UserPreferences {
  preferred_style: string;
  preferred_duration: string;
  preferred_music_genre: string;
  default_platform: string;
}

// Default memory index
const DEFAULT_MEMORY: MemoryIndex = {
  projectId: 'global',
  favorite_moods: ['reflective', 'contemplative', 'nostalgic'],
  disliked_music_styles: [],
  video_history: [],
  user_preferences: {
    preferred_style: 'cinematic',
    preferred_duration: '30-60s',
    preferred_music_genre: 'ambient',
    default_platform: 'tiktok'
  },
  lastUpdated: new Date().toISOString()
};

/**
 * Get the memory index for reading
 * Safe to call from any agent - returns defaults if not found
 */
export async function getMemoryIndex(projectId: string = 'global'): Promise<MemoryIndex> {
  try {
    const store = getConfiguredBlobsStore(MEMORY_STORE);
    const key = `memory_index_${projectId}.json`;
    const data = await store.get(key, { type: 'json' });

    if (data) {
      return data as MemoryIndex;
    }

    // Return defaults if not found
    return { ...DEFAULT_MEMORY, projectId };
  } catch (error) {
    console.warn('[Memory] Failed to read memory index, using defaults:', error);
    return { ...DEFAULT_MEMORY, projectId };
  }
}

/**
 * Update the memory index (partial update)
 */
export async function updateMemoryIndex(
  projectId: string,
  patch: Partial<MemoryIndex>
): Promise<MemoryIndex> {
  try {
    const store = getConfiguredBlobsStore(MEMORY_STORE);
    const key = `memory_index_${projectId}.json`;

    // Get existing or defaults
    const existing = await getMemoryIndex(projectId);

    // Merge with patch
    const updated: MemoryIndex = {
      ...existing,
      ...patch,
      projectId,
      lastUpdated: new Date().toISOString()
    };

    // Handle array merges specially
    if (patch.favorite_moods) {
      updated.favorite_moods = [...new Set([...existing.favorite_moods, ...patch.favorite_moods])];
    }
    if (patch.disliked_music_styles) {
      updated.disliked_music_styles = [...new Set([...existing.disliked_music_styles, ...patch.disliked_music_styles])];
    }
    if (patch.video_history) {
      updated.video_history = [...patch.video_history, ...existing.video_history].slice(0, 100);
    }
    if (patch.user_preferences) {
      updated.user_preferences = { ...existing.user_preferences, ...patch.user_preferences };
    }

    await store.set(key, JSON.stringify(updated), {
      metadata: { projectId, type: 'memory_index' }
    });

    return updated;
  } catch (error) {
    console.error('[Memory] Failed to update memory index:', error);
    throw error;
  }
}

/**
 * Record feedback for a video (thumbs up/down)
 * Updates both video_history and user_preferences
 */
export async function recordFeedback(
  projectId: string,
  runId: string,
  rating: 'good' | 'bad',
  metadata?: { mood?: string; prompt?: string; pipelineMode?: string }
): Promise<void> {
  try {
    const memory = await getMemoryIndex(projectId);

    // Add to video history
    const entry: VideoHistoryEntry = {
      runId,
      projectId,
      rating,
      timestamp: new Date().toISOString(),
      ...metadata
    };

    // Update based on rating
    if (rating === 'good' && metadata?.mood) {
      // Learn from good videos - add mood to favorites
      if (!memory.favorite_moods.includes(metadata.mood)) {
        memory.favorite_moods.push(metadata.mood);
      }
    }

    if (rating === 'bad' && metadata?.mood) {
      // Learn from bad videos - might add to disliked (optional)
      // For now, just track it
    }

    await updateMemoryIndex(projectId, {
      video_history: [entry]
    });

    console.log(`[Memory] Recorded ${rating} feedback for ${runId}`);
  } catch (error) {
    console.error('[Memory] Failed to record feedback:', error);
  }
}

/**
 * Get preferred mood for a project
 * Used by Director Agent to personalize content
 */
export async function getPreferredMood(projectId: string = 'global'): Promise<string> {
  const memory = await getMemoryIndex(projectId);

  // If we have favorites, return the most recent one
  if (memory.favorite_moods.length > 0) {
    return memory.favorite_moods[0];
  }

  return 'reflective'; // Default fallback
}

/**
 * Get video history for learning
 */
export async function getGoodVideos(projectId: string = 'global', limit: number = 10): Promise<VideoHistoryEntry[]> {
  const memory = await getMemoryIndex(projectId);

  return memory.video_history
    .filter(v => v.rating === 'good')
    .slice(0, limit);
}

/**
 * Export for use in other modules
 */
export {
  MEMORY_STORE,
  DEFAULT_MEMORY
};
