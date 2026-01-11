
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

// ============================================================================
// Type Definitions
// ============================================================================

export interface MemoryIndex {
    version: string;
    user_preferences?: {
        favorite_moods: string[];
        disliked_music_styles: string[];
    };
    video_history?: Array<{
        project_id: string;
        user_rating: 'good' | 'bad';
        theme?: string;
        social_engagement?: {
            views?: number;
            engagement?: number;
        };
    }>;
    projects?: Array<any>;
}

// ============================================================================
// Memory & Learning Functions
// ============================================================================

/**
 * Read the memory index from the vault.
 * @param vaultPath Path to the vault directory
 */
export function readMemoryIndex(vaultPath: string): MemoryIndex | null {
    try {
        const memoryPath = join(vaultPath, 'memory_index.json');
        if (existsSync(memoryPath)) {
            const content = readFileSync(memoryPath, 'utf-8');
            return JSON.parse(content);
        }
        console.log('📚 Memory index not found, using defaults.');
    } catch (error) {
        console.warn('📚 Could not read memory index:', error);
    }
    return null;
}

/**
 * Learn from history to suggest a mood.
 * @param memory The loaded memory index
 */
export function learnFromHistory(memory: MemoryIndex | null): string {
    if (!memory) {
        console.log('✨ Learning: No memory available, defaulting to "reflective"');
        return 'reflective';
    }

    // Check explicit user preferences
    if (memory.user_preferences?.favorite_moods?.length) {
        const favs = memory.user_preferences.favorite_moods;
        const randomFav = favs[Math.floor(Math.random() * favs.length)];
        console.log(`✨ Learning: Using user favorite mood: ${randomFav}`);
        return randomFav;
    }

    // Fallback to history with 'good' rating
    if (memory.video_history?.length) {
        const goodProjects = memory.video_history.filter(p => p.user_rating === 'good');
        if (goodProjects.length > 0) {
            const lastGood = goodProjects[goodProjects.length - 1];
            if (lastGood.theme) {
                console.log(`✨ Learning: Repeating successful theme: ${lastGood.theme}`);
                return lastGood.theme;
            }
        }
    }

    return 'reflective';
}

/**
 * Default empty memory structure
 */
export const DEFAULT_MEMORY: MemoryIndex = {
    version: "1.0.0",
    user_preferences: {
        favorite_moods: [],
        disliked_music_styles: []
    },
    video_history: []
};
