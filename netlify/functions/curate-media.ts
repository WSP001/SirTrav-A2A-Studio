import type { Handler, HandlerEvent } from '@netlify/functions';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { trace } from './lib/tracing';
import {
  analyzeImage,
  batchAnalyzeImages,
  filterByPrivacy,
  getDominantMood,
  moodToTempo,
  type ImageInput,
  type AnalyzedAsset,
  type ProjectMode,
  type Mood,
  type Tempo,
  type StoryRole,
  type PrivacyBucket,
} from './lib/vision';

/**
 * DIRECTOR AGENT v2 (curate-media) - VISION-ENABLED
 * 
 * Curates key shots from the private vault using:
 * - OpenAI Vision API for image understanding
 * - Privacy taxonomy (public_commons, family_private, biz_internal, sensitive)
 * - EXIF timestamp clustering for scene grouping
 * - Learning from memory_index.json (EGO-Prompt)
 * 
 * Input: { project_id, project_mode, images[], max_scenes?, max_assets_per_scene? }
 * Output: curated_media.json with scenes, assets, vision analysis
 * 
 * @see docs/VISION_DIRECTOR_SPEC.md
 */

// ============================================================================
// Type Definitions
// ============================================================================

interface Scene {
  scene_id: string;
  title: string;
  story_role: StoryRole;
  dominant_mood: Mood;
  tempo: Tempo;
  intended_audience: PrivacyBucket;
  summary_for_writer: string;
  assets: Asset[];
}

interface Asset {
  asset_id: string;
  vault_path: string;
  preview_url?: string;
  media_type: 'image' | 'video';
  shot_type: 'wide' | 'medium' | 'closeup';
  orientation: 'landscape' | 'portrait' | 'square';
  captured_at?: string;
  raw_caption: string;
  tags: string[];
  content_type: string;
  safety_profile: string;
  privacy_bucket: PrivacyBucket;
  mood: Mood;
  quality_score: number;
  story_role: StoryRole;
  agent_notes: {
    writer_hint?: string;
    composer_hint?: string;
  };
  analysis_status: 'success' | 'failed' | 'skipped';
}

interface CurateRequest {
  // v2 API (preferred)
  project_id?: string;
  project_mode?: ProjectMode;
  images?: ImageInput[];
  max_scenes?: number;
  max_assets_per_scene?: number;
  
  // v1 API (legacy support)
  projectId?: string;
  vaultPath?: string;
  maxScenes?: number;
}

interface CuratedMediaOutput {
  project_id: string;
  project_mode: ProjectMode;
  source: {
    upload_batch_id: string;
    total_images: number;
    analyzed_images: number;
    failed_images: number;
  };
  scenes: Scene[];
  metadata: {
    agent: 'director';
    version: '2.0';
    vision_enabled: boolean;
    processing_time_ms: number;
    timestamp: string;
  };
}

interface MemoryIndex {
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

function readMemoryIndex(vaultPath: string): MemoryIndex | null {
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

function learnFromHistory(memory: MemoryIndex | null): Mood {
  if (!memory) {
    console.log('✨ Learning: No memory available, defaulting to "reflective"');
    return 'reflective';
  }

  // Check explicit user preferences
  if (memory.user_preferences?.favorite_moods?.length) {
    const favs = memory.user_preferences.favorite_moods;
    const randomFav = favs[Math.floor(Math.random() * favs.length)] as Mood;
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
        return lastGood.theme as Mood;
      }
    }
  }

  return 'reflective';
}

// ============================================================================
// Scene Clustering Functions
// ============================================================================

function parseTimestamp(capturedAt?: string): number {
  if (!capturedAt) return 0;
  const date = new Date(capturedAt);
  return isNaN(date.getTime()) ? 0 : date.getTime();
}

function timeGapMinutes(t1?: string, t2?: string): number {
  const ts1 = parseTimestamp(t1);
  const ts2 = parseTimestamp(t2);
  if (ts1 === 0 || ts2 === 0) return 0;
  return Math.abs(ts2 - ts1) / (1000 * 60);
}

function buildScene(assets: Asset[], index: number): Scene {
  const dominantMood = getDominantMoodFromAssets(assets);
  const dominantPrivacy = getMostRestrictivePrivacy(assets);
  
  return {
    scene_id: `scene_${String(index + 1).padStart(3, '0')}`,
    title: generateSceneTitle(assets, index),
    story_role: 'middle', // Will be reassigned later
    dominant_mood: dominantMood,
    tempo: moodToTempo(dominantMood),
    intended_audience: dominantPrivacy,
    summary_for_writer: generateWriterSummary(assets),
    assets,
  };
}

function getDominantMoodFromAssets(assets: Asset[]): Mood {
  const moodCounts: Record<Mood, number> = {
    calm: 0, energetic: 0, serious: 0, playful: 0, reflective: 0,
  };
  
  for (const asset of assets) {
    moodCounts[asset.mood]++;
  }
  
  let dominant: Mood = 'calm';
  let maxCount = 0;
  
  for (const [mood, count] of Object.entries(moodCounts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = mood as Mood;
    }
  }
  
  return dominant;
}

function getMostRestrictivePrivacy(assets: Asset[]): PrivacyBucket {
  const order: PrivacyBucket[] = ['sensitive', 'biz_internal', 'family_private', 'public_commons'];
  
  for (const bucket of order) {
    if (assets.some(a => a.privacy_bucket === bucket)) {
      return bucket;
    }
  }
  
  return 'public_commons';
}

function generateSceneTitle(assets: Asset[], index: number): string {
  // Use most common tags or content type
  const tagCounts: Record<string, number> = {};
  
  for (const asset of assets) {
    for (const tag of asset.tags.slice(0, 3)) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  
  const topTag = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0];
  
  if (topTag) {
    return `Scene ${index + 1}: ${topTag.charAt(0).toUpperCase() + topTag.slice(1)}`;
  }
  
  return `Scene ${index + 1}`;
}

function generateWriterSummary(assets: Asset[]): string {
  const captions = assets
    .map(a => a.raw_caption)
    .filter(Boolean)
    .slice(0, 3);
  
  if (captions.length === 0) {
    return 'A collection of moments to weave into the narrative.';
  }
  
  return captions.join(' ');
}

function clusterIntoScenes(
  analyzedAssets: AnalyzedAsset[],
  maxScenes: number = 8,
  maxAssetsPerScene: number = 4
): Scene[] {
  // Filter out failed/skipped assets
  const validAssets = analyzedAssets.filter(a => a.analysis_status === 'success' && a.analysis);
  
  if (validAssets.length === 0) {
    return [];
  }
  
  // Convert to Asset format
  const assets: Asset[] = validAssets.map((a, idx) => ({
    asset_id: a.id,
    vault_path: a.vault_path,
    preview_url: a.preview_url,
    media_type: 'image' as const,
    shot_type: a.analysis!.shot_type,
    orientation: 'landscape' as const, // TODO: extract from EXIF
    captured_at: undefined, // TODO: extract from EXIF
    raw_caption: a.analysis!.raw_caption,
    tags: a.analysis!.tags,
    content_type: a.analysis!.content_type,
    safety_profile: a.analysis!.safety_profile,
    privacy_bucket: a.analysis!.privacy_bucket,
    mood: a.analysis!.mood,
    quality_score: a.analysis!.quality_score,
    story_role: a.analysis!.story_role,
    agent_notes: {
      writer_hint: a.analysis!.writer_hint,
      composer_hint: a.analysis!.composer_hint,
    },
    analysis_status: a.analysis_status,
  }));
  
  // Sort by quality score (descending) as fallback without timestamps
  const sorted = [...assets].sort((a, b) => b.quality_score - a.quality_score);
  
  // Group by content_type for natural scene breaks
  const scenes: Scene[] = [];
  let currentGroup: Asset[] = [];
  let lastContentType: string | null = null;
  
  for (const asset of sorted) {
    const shouldSplit = 
      lastContentType !== null && 
      asset.content_type !== lastContentType &&
      currentGroup.length >= 2;
    
    if (shouldSplit && scenes.length < maxScenes - 1) {
      scenes.push(buildScene(currentGroup.slice(0, maxAssetsPerScene), scenes.length));
      currentGroup = [];
    }
    
    currentGroup.push(asset);
    lastContentType = asset.content_type;
    
    // Force split if group too large
    if (currentGroup.length >= maxAssetsPerScene * 2 && scenes.length < maxScenes - 1) {
      scenes.push(buildScene(currentGroup.slice(0, maxAssetsPerScene), scenes.length));
      currentGroup = currentGroup.slice(maxAssetsPerScene);
    }
  }
  
  // Add remaining assets as final scene
  if (currentGroup.length > 0) {
    scenes.push(buildScene(currentGroup.slice(0, maxAssetsPerScene), scenes.length));
  }
  
  // Assign story roles
  return assignStoryRoles(scenes);
}

function assignStoryRoles(scenes: Scene[]): Scene[] {
  if (scenes.length === 0) return scenes;
  
  scenes[0].story_role = 'opening';
  
  if (scenes.length > 1) {
    scenes[scenes.length - 1].story_role = 'outro';
  }
  
  // Middle scenes and climax
  for (let i = 1; i < scenes.length - 1; i++) {
    const position = i / (scenes.length - 1);
    if (position >= 0.4 && position <= 0.7) {
      // Find the scene with most "energetic" or highest quality for climax
      const isClimaxCandidate = 
        scenes[i].dominant_mood === 'energetic' ||
        scenes[i].dominant_mood === 'playful';
      scenes[i].story_role = isClimaxCandidate ? 'climax' : 'middle';
    } else {
      scenes[i].story_role = 'middle';
    }
  }
  
  // Update assets with scene-level story role
  for (const scene of scenes) {
    for (const asset of scene.assets) {
      asset.story_role = scene.story_role;
    }
  }
  
  return scenes;
}

// ============================================================================
// Legacy v1 API Support
// ============================================================================

function generateLegacyResponse(
  projectId: string,
  vaultPath: string,
  maxScenes: number
): object {
  console.log('⚠️ Using legacy v1 API (placeholder mode)');
  
  const memory = readMemoryIndex(vaultPath);
  const learnedTheme = learnFromHistory(memory);
  
  // Mock scenes for backward compatibility
  const curatedScenes = [
    { file: 'IMG_001.jpg', type: 'image', order: 1, caption: 'Opening shot', duration: 3 },
    { file: 'VID_002.mp4', type: 'video', order: 2, caption: 'Main content', duration: 5 },
    { file: 'IMG_003.jpg', type: 'image', order: 3, caption: 'Closing shot', duration: 4 },
  ].slice(0, maxScenes);
  
  return {
    ok: true,
    projectId,
    theme: learnedTheme,
    mood: learnedTheme === 'energetic' ? 'warm' : 'contemplative',
    pacing: 'moderate',
    curated_media: curatedScenes,
    metadata: {
      agent: 'director',
      version: '1.0',
      vision_enabled: false,
      learned_from_memory: memory !== null,
      timestamp: new Date().toISOString(),
    },
  };
}

// ============================================================================
// Main Handler
// ============================================================================

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { Allow: 'POST' },
      body: JSON.stringify({ ok: false, error: 'method_not_allowed' }),
    };
  }

  const startTime = Date.now();
  const traceSpan = trace('curate-media.handler');

  try {
    const payload: CurateRequest = event.body ? JSON.parse(event.body) : {};
    
    // Detect API version
    const isV2 = Boolean(payload.project_id && payload.images);
    
    // ========================================================================
    // Legacy v1 API Support
    // ========================================================================
    if (!isV2) {
      const { projectId, vaultPath = './Sir-TRAV-scott', maxScenes = 5 } = payload;
      
      if (!projectId) {
        return {
          statusCode: 400,
          body: JSON.stringify({ ok: false, error: 'projectId required' }),
        };
      }
      
      console.log(`🎬 Director Agent v1: Curating media for ${projectId}`);
      
      const response = generateLegacyResponse(projectId, vaultPath, maxScenes);
      
      return {
        statusCode: 200,
        body: JSON.stringify(response),
      };
    }
    
    // ========================================================================
    // Vision-Enabled v2 API
    // ========================================================================
    const {
      project_id,
      project_mode = 'commons_public',
      images = [],
      max_scenes = 8,
      max_assets_per_scene = 4,
    } = payload;
    
    if (!project_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'project_id required' }),
      };
    }
    
    if (images.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, error: 'images array required (must contain at least 1 image)' }),
      };
    }
    
    console.log(`🎬 Director Agent v2: Analyzing ${images.length} images for ${project_id}`);
    console.log(`📋 Project mode: ${project_mode}`);
    
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not configured');
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          ok: false, 
          error: 'vision_not_configured',
          detail: 'OPENAI_API_KEY environment variable not set',
        }),
      };
    }
    
    // Step 1: Batch analyze images with Vision API
    console.log('👁️ Analyzing images with OpenAI Vision...');
    const { results, summary } = await batchAnalyzeImages(images, project_mode, {
      concurrency: 3,
      delayBetweenBatches: 500,
    });
    
    console.log(`✅ Vision analysis complete: ${summary.success}/${summary.total} successful`);
    
    // Step 2: Filter by project mode privacy rules
    const filteredAssets = filterByPrivacy(results, project_mode);
    console.log(`🔒 After privacy filter: ${filteredAssets.length} assets for ${project_mode}`);
    
    // Step 3: Cluster into scenes
    const scenes = clusterIntoScenes(filteredAssets, max_scenes, max_assets_per_scene);
    console.log(`🎬 Clustered into ${scenes.length} scenes`);
    
    // Step 4: Build output
    const output: CuratedMediaOutput = {
      project_id,
      project_mode,
      source: {
        upload_batch_id: `batch_${Date.now()}`,
        total_images: images.length,
        analyzed_images: summary.success,
        failed_images: summary.failed,
      },
      scenes,
      metadata: {
        agent: 'director',
        version: '2.0',
        vision_enabled: true,
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };
    
    // Step 5: Save curated_media.json (optional - for local dev)
    const outputPath = `/tmp/${project_id}/curated_media.json`;
    try {
      mkdirSync(dirname(outputPath), { recursive: true });
      writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`💾 Saved curated_media.json to ${outputPath}`);
    } catch (writeError) {
      console.warn('Could not save curated_media.json:', writeError);
    }
    
    traceSpan.success({
      project_id,
      scenes_count: scenes.length,
      analyzed_count: summary.success,
      processing_time_ms: output.metadata.processing_time_ms,
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        ...output,
        curated_media_path: outputPath,
        summary: {
          total_images: images.length,
          analyzed: summary.success,
          scenes: scenes.length,
          dominant_mood: scenes.length > 0 ? getDominantMood(filteredAssets) : 'calm',
        },
      }),
    };
    
  } catch (error) {
    console.error('Director agent error:', error);
    traceSpan.error(error instanceof Error ? error.message : String(error));
    
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: 'curate_failed',
        detail: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

export default handler;
