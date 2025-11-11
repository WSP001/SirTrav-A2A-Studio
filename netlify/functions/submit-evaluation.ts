import type { Handler, HandlerEvent } from '@netlify/functions';
import { readMemory, writeMemory, type MemoryIndex } from './lib/memory';

/**
 * USER FEEDBACK LOOP - submit-evaluation.ts
 * 
 * Closes the EGO-Prompt learning loop by capturing 👍/👎 feedback
 * 
 * Flow:
 * 1. User watches video in ResultsPreview modal
 * 2. Clicks 👍 (good) or 👎 (bad) button
 * 3. This function updates memory_index.json with preferences
 * 4. Director Agent reads preferences on next run
 * 5. AI gets smarter over time based on USER feedback
 */

type FeedbackPayload = {
  projectId: string;
  rating: 'good' | 'bad';
  tags?: string[]; // e.g., ["reflective", "calm_music", "60s_length"]
  comment?: string;
};

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const feedback: FeedbackPayload = JSON.parse(event.body || '{}');

    // Validate input
    if (!feedback.projectId || !feedback.rating) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Missing required fields: projectId, rating',
        }),
      };
    }

    // Read current memory
    const memory = await readMemory();

    // Create video history entry
    const historyEntry = {
      project_id: feedback.projectId,
      user_rating: feedback.rating,
      tags: feedback.tags || [],
      comment: feedback.comment || '',
      created_at: new Date().toISOString(),
    };

    // Append to video history
    if (!memory.video_history) {
      memory.video_history = [];
    }
    memory.video_history.push(historyEntry);

    // Update user preferences based on feedback
    if (!memory.user_preferences) {
      memory.user_preferences = {
        favorite_themes: [],
        disliked_elements: [],
        preferred_length_sec: 60,
      };
    }

    // If good rating, add tags to favorites
    if (feedback.rating === 'good' && feedback.tags) {
      for (const tag of feedback.tags) {
        if (!memory.user_preferences.favorite_themes.includes(tag)) {
          memory.user_preferences.favorite_themes.push(tag);
        }
        // Remove from dislikes if it was there
        memory.user_preferences.disliked_elements = 
          memory.user_preferences.disliked_elements.filter(el => el !== tag);
      }
    }

    // If bad rating, add tags to dislikes
    if (feedback.rating === 'bad' && feedback.tags) {
      for (const tag of feedback.tags) {
        if (!memory.user_preferences.disliked_elements.includes(tag)) {
          memory.user_preferences.disliked_elements.push(tag);
        }
        // Remove from favorites if it was there
        memory.user_preferences.favorite_themes = 
          memory.user_preferences.favorite_themes.filter(th => th !== tag);
      }
    }

    // Write updated memory back
    await writeMemory(memory);

    console.log(`✅ Feedback logged for ${feedback.projectId}: ${feedback.rating}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: 'Feedback recorded successfully',
        memory_updated: true,
        history_entries: memory.video_history.length,
      }),
    };

  } catch (error) {
    console.error('Error processing feedback:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to process feedback',
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export default handler;
