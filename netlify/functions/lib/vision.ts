/**
 * Vision Module for Director Agent v2
 * 
 * Provides OpenAI Vision API integration for analyzing images.
 * Implements privacy taxonomy and quality scoring for the 7-agent pipeline.
 * 
 * @module vision
 * @version 2.0.0
 * @see docs/VISION_DIRECTOR_SPEC.md
 */

import OpenAI from 'openai';
import { trace } from './tracing';

// ============================================================================
// Type Definitions
// ============================================================================

export type ContentType = 
  | 'people'
  | 'place'
  | 'people_and_place'
  | 'screenshot'
  | 'document'
  | 'object'
  | 'mixed';

export type PrivacyBucket = 
  | 'public_commons'
  | 'family_private'
  | 'biz_internal'
  | 'sensitive';

export type SafetyProfile = 
  | 'ok_public'
  | 'blur_faces'
  | 'do_not_publish';

export type Mood = 
  | 'calm'
  | 'energetic'
  | 'serious'
  | 'playful'
  | 'reflective';

export type ShotType = 'wide' | 'medium' | 'closeup';
export type StoryRole = 'opening' | 'middle' | 'climax' | 'outro' | 'transition';
export type Tempo = 'slow' | 'medium' | 'fast';

export type ProjectMode = 
  | 'commons_public'
  | 'social_reel'
  | 'family_collage'
  | 'biz_pitch'
  | 'personal_journal';

export interface VisionAnalysisResult {
  raw_caption: string;
  tags: string[];
  content_type: ContentType;
  mood: Mood;
  safety_profile: SafetyProfile;
  privacy_bucket: PrivacyBucket;
  story_role: StoryRole;
  quality_score: number;
  shot_type: ShotType;
  writer_hint?: string;
  composer_hint?: string;
}

export interface ImageInput {
  id: string;
  vault_path: string;
  preview_url?: string;
  base64_data?: string;
}

export interface AnalyzedAsset extends ImageInput {
  analysis: VisionAnalysisResult | null;
  analysis_status: 'success' | 'failed' | 'skipped';
  error?: string;
}

// ============================================================================
// Constants
// ============================================================================

const MOOD_TO_TEMPO: Record<Mood, Tempo> = {
  calm: 'slow',
  reflective: 'medium',
  serious: 'medium',
  energetic: 'fast',
  playful: 'fast',
};

const PRIVACY_ALLOWED_BY_MODE: Record<ProjectMode, PrivacyBucket[]> = {
  commons_public: ['public_commons'],
  social_reel: ['public_commons'],
  family_collage: ['public_commons', 'family_private'],
  biz_pitch: ['public_commons', 'biz_internal'],
  personal_journal: ['public_commons', 'family_private', 'biz_internal', 'sensitive'],
};

// ============================================================================
// Vision Analysis Functions
// ============================================================================

/**
 * Generate the system prompt for vision analysis based on project mode
 */
function getVisionPrompt(projectMode: ProjectMode): string {
  return `You are a video director analyzing images for a ${projectMode} video project.
Your task is to analyze this image and return structured JSON data.

Return ONLY valid JSON matching this exact schema (no markdown, no explanation):

{
  "raw_caption": "2-3 sentence description of what's happening in the image",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "content_type": "people|place|people_and_place|screenshot|document|object|mixed",
  "mood": "calm|energetic|serious|playful|reflective",
  "safety_profile": "ok_public|blur_faces|do_not_publish",
  "privacy_bucket": "public_commons|family_private|biz_internal|sensitive",
  "story_role": "opening|middle|climax|outro|transition",
  "quality_score": 0.85,
  "shot_type": "wide|medium|closeup",
  "writer_hint": "Optional: Suggestion for how the narrator should describe this",
  "composer_hint": "Optional: Suggestion for music mood/style"
}

CLASSIFICATION GUIDELINES for ${projectMode}:

privacy_bucket:
- public_commons: Generic scenes, landscapes, public events, anonymous crowds
- family_private: Children's faces, home interiors, private family moments
- biz_internal: Whiteboards, code screens, financial data, client information
- sensitive: Government IDs, medical records, passwords, credit cards

safety_profile:
- ok_public: Safe to publish without modifications
- blur_faces: Contains identifiable faces that should be blurred for public use
- do_not_publish: Contains sensitive information that should never be published

content_type:
- people: Portraits, selfies, group photos focused on people
- place: Landscapes, cityscapes, architecture, interiors without people
- people_and_place: People in a notable location
- screenshot: Phone/computer screenshots
- document: Physical documents, text-heavy images
- object: Products, food, items, close-ups of objects
- mixed: Combination of multiple types

quality_score: Rate from 0.0 to 1.0 based on:
- Sharpness and focus
- Good lighting
- Interesting composition
- Storytelling potential

story_role: Based on emotional impact:
- opening: Hook image, establishes setting, first impression
- middle: Development, journey, supporting content
- climax: Peak emotional moment, hero shot, most impactful
- outro: Closing, resolution, calm ending
- transition: Bridge between different topics/moods

Focus on storytelling potential and emotional impact for video editing.`;
}

/**
 * Analyze a single image using OpenAI Vision API
 */
export async function analyzeImage(
  image: ImageInput,
  projectMode: ProjectMode,
  openaiClient?: OpenAI
): Promise<AnalyzedAsset> {
  const client = openaiClient || new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const traceSpan = trace('vision.analyzeImage', { 
    image_id: image.id, 
    project_mode: projectMode 
  });

  try {
    // Validate we have image data
    if (!image.base64_data && !image.preview_url) {
      return {
        ...image,
        analysis: null,
        analysis_status: 'skipped',
        error: 'No image data provided (need base64_data or preview_url)',
      };
    }

    // Build the image content for the API
    const imageContent: OpenAI.Chat.ChatCompletionContentPartImage = image.base64_data
      ? {
          type: 'image_url',
          image_url: {
            url: `data:image/jpeg;base64,${image.base64_data}`,
            detail: 'low', // Cost optimization: use low detail unless OCR needed
          },
        }
      : {
          type: 'image_url',
          image_url: {
            url: image.preview_url!,
            detail: 'low',
          },
        };

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini', // Cost-effective vision model
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: getVisionPrompt(projectMode),
            },
            imageContent,
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for consistent structured output
    });

    const content = response.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse the JSON response
    const analysis = parseVisionResponse(content);

    traceSpan.success({ 
      content_type: analysis.content_type,
      privacy_bucket: analysis.privacy_bucket,
      quality_score: analysis.quality_score,
    });

    return {
      ...image,
      analysis,
      analysis_status: 'success',
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    traceSpan.error(errorMessage);

    return {
      ...image,
      analysis: null,
      analysis_status: 'failed',
      error: errorMessage,
    };
  }
}

/**
 * Parse and validate the vision API response
 */
function parseVisionResponse(content: string): VisionAnalysisResult {
  // Remove any markdown code blocks if present
  let jsonStr = content.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const parsed = JSON.parse(jsonStr);

  // Validate and provide defaults
  return {
    raw_caption: parsed.raw_caption || 'No caption generated',
    tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 10) : [],
    content_type: validateEnum(parsed.content_type, [
      'people', 'place', 'people_and_place', 'screenshot', 'document', 'object', 'mixed'
    ], 'mixed'),
    mood: validateEnum(parsed.mood, [
      'calm', 'energetic', 'serious', 'playful', 'reflective'
    ], 'calm'),
    safety_profile: validateEnum(parsed.safety_profile, [
      'ok_public', 'blur_faces', 'do_not_publish'
    ], 'blur_faces'),
    privacy_bucket: validateEnum(parsed.privacy_bucket, [
      'public_commons', 'family_private', 'biz_internal', 'sensitive'
    ], 'family_private'),
    story_role: validateEnum(parsed.story_role, [
      'opening', 'middle', 'climax', 'outro', 'transition'
    ], 'middle'),
    quality_score: typeof parsed.quality_score === 'number' 
      ? Math.max(0, Math.min(1, parsed.quality_score)) 
      : 0.5,
    shot_type: validateEnum(parsed.shot_type, ['wide', 'medium', 'closeup'], 'medium'),
    writer_hint: parsed.writer_hint || undefined,
    composer_hint: parsed.composer_hint || undefined,
  };
}

/**
 * Validate enum value with fallback
 */
function validateEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  if (typeof value === 'string' && allowed.includes(value as T)) {
    return value as T;
  }
  return fallback;
}

/**
 * Analyze multiple images in batch with rate limiting
 */
export async function batchAnalyzeImages(
  images: ImageInput[],
  projectMode: ProjectMode,
  options: {
    concurrency?: number;
    delayBetweenBatches?: number;
    openaiClient?: OpenAI;
  } = {}
): Promise<{
  results: AnalyzedAsset[];
  summary: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
    processing_time_ms: number;
  };
}> {
  const { 
    concurrency = 3, 
    delayBetweenBatches = 500,
    openaiClient 
  } = options;

  const startTime = Date.now();
  const results: AnalyzedAsset[] = [];
  
  const traceSpan = trace('vision.batchAnalyze', { 
    total_images: images.length,
    project_mode: projectMode,
    concurrency,
  });

  // Process in batches
  for (let i = 0; i < images.length; i += concurrency) {
    const batch = images.slice(i, i + concurrency);
    
    const batchResults = await Promise.all(
      batch.map(img => analyzeImage(img, projectMode, openaiClient))
    );
    
    results.push(...batchResults);

    // Rate limiting delay between batches
    if (i + concurrency < images.length) {
      await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
    }
  }

  const summary = {
    total: images.length,
    success: results.filter(r => r.analysis_status === 'success').length,
    failed: results.filter(r => r.analysis_status === 'failed').length,
    skipped: results.filter(r => r.analysis_status === 'skipped').length,
    processing_time_ms: Date.now() - startTime,
  };

  traceSpan.success(summary);

  return { results, summary };
}

// ============================================================================
// Privacy & Filtering Functions
// ============================================================================

/**
 * Filter assets by project mode privacy rules
 */
export function filterByPrivacy(
  assets: AnalyzedAsset[],
  projectMode: ProjectMode
): AnalyzedAsset[] {
  const allowedBuckets = PRIVACY_ALLOWED_BY_MODE[projectMode];
  
  return assets.filter(asset => {
    if (!asset.analysis) return false;
    
    // Filter by privacy bucket
    if (!allowedBuckets.includes(asset.analysis.privacy_bucket)) {
      return false;
    }
    
    // Never include do_not_publish
    if (asset.analysis.safety_profile === 'do_not_publish') {
      return false;
    }
    
    return true;
  });
}

/**
 * Get tempo from mood
 */
export function moodToTempo(mood: Mood): Tempo {
  return MOOD_TO_TEMPO[mood];
}

/**
 * Calculate dominant mood from a set of assets
 */
export function getDominantMood(assets: AnalyzedAsset[]): Mood {
  const moodCounts: Record<Mood, number> = {
    calm: 0,
    energetic: 0,
    serious: 0,
    playful: 0,
    reflective: 0,
  };

  for (const asset of assets) {
    if (asset.analysis) {
      moodCounts[asset.analysis.mood]++;
    }
  }

  let dominantMood: Mood = 'calm';
  let maxCount = 0;

  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominantMood = mood as Mood;
    }
  }

  return dominantMood;
}

// ============================================================================
// Exports
// ============================================================================

export {
  MOOD_TO_TEMPO,
  PRIVACY_ALLOWED_BY_MODE,
  getVisionPrompt,
};
