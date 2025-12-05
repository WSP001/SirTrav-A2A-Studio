/**
 * EDITOR AGENT - Compile Video
 * Agent 5 of 7 in the D2A Pipeline
 * 
 * PURPOSE: FFmpeg video compilation with LUFS audio normalization
 * 
 * INPUT: { projectId, images[], narrationUrl, musicUrl, beatGrid[] }
 * OUTPUT: { videoUrl, duration, resolution, stored }
 * 
 * REAL INTEGRATION: Uses FFmpeg (via ffmpeg.wasm or external service) + Netlify Blobs
 * 
 * NOTE: Netlify Functions have 10s timeout (26s for background).
 * For long videos, this should trigger an async job and poll for completion.
 */

import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { videoStore, audioStore } from "./lib/storage";

interface BeatPoint {
  time: number;
  type: 'downbeat' | 'upbeat' | 'accent';
  intensity: number;
}

interface ImageAsset {
  id: string;
  url: string;
  duration?: number;  // How long to show this image (seconds)
  transition?: 'fade' | 'cut' | 'dissolve';
}

interface CompileRequest {
  projectId: string;
  images: ImageAsset[];
  narrationUrl?: string;
  musicUrl?: string;
  beatGrid?: BeatPoint[];
  resolution?: '720p' | '1080p' | '4k';
  fps?: number;
  lufsTarget?: number;  // Target loudness (-14 LUFS for YouTube)
}

interface CompileResponse {
  success: boolean;
  projectId: string;
  videoUrl: string;
  duration: number;
  resolution: string;
  fileSize?: string;
  stored: boolean;
  placeholder: boolean;
  cost?: number;
  jobId?: string;  // For async processing
}

/**
 * Calculate video duration from images and beat grid
 */
function calculateDuration(images: ImageAsset[], beatGrid?: BeatPoint[]): number {
  // If beat grid exists, use music duration
  if (beatGrid && beatGrid.length > 0) {
    return beatGrid[beatGrid.length - 1].time + 2; // Add 2s buffer
  }
  
  // Otherwise, calculate from image durations (default 3s per image)
  return images.reduce((total, img) => total + (img.duration || 3), 0);
}

/**
 * Generate FFmpeg command for video compilation
 * This is for documentation/future implementation
 */
function generateFFmpegCommand(request: CompileRequest): string {
  const resolution = request.resolution === '4k' ? '3840:2160' 
                   : request.resolution === '1080p' ? '1920:1080' 
                   : '1280:720';
  const fps = request.fps || 30;
  const lufs = request.lufsTarget || -14;
  
  // This would be the actual FFmpeg command
  const cmd = `ffmpeg -y \\
    -framerate 1/${3} -i "images/%03d.jpg" \\
    ${request.narrationUrl ? `-i "${request.narrationUrl}"` : ''} \\
    ${request.musicUrl ? `-i "${request.musicUrl}"` : ''} \\
    -filter_complex "
      [0:v]scale=${resolution}:force_original_aspect_ratio=decrease,pad=${resolution}:(ow-iw)/2:(oh-ih)/2,fps=${fps}[v];
      ${request.narrationUrl && request.musicUrl ? `
      [1:a]loudnorm=I=${lufs}:TP=-1.5:LRA=11[narration];
      [2:a]volume=0.3,loudnorm=I=${lufs - 6}:TP=-1.5:LRA=11[music];
      [narration][music]amix=inputs=2:duration=longest[a]
      ` : request.narrationUrl ? `[1:a]loudnorm=I=${lufs}:TP=-1.5:LRA=11[a]` : ''}
    " \\
    -map "[v]" ${request.narrationUrl || request.musicUrl ? '-map "[a]"' : ''} \\
    -c:v libx264 -preset medium -crf 23 \\
    -c:a aac -b:a 192k \\
    -movflags +faststart \\
    output.mp4`;
  
  return cmd;
}

/**
 * Estimate cost based on video duration and resolution
 */
function estimateCost(duration: number, resolution: string): number {
  // Rough estimate: $0.01 per second for 1080p, scaled by resolution
  const resolutionMultiplier = resolution === '4k' ? 3 : resolution === '1080p' ? 1 : 0.5;
  return Math.ceil(duration * resolutionMultiplier);
}

/**
 * Compile video using external FFmpeg service
 * For MVP, this returns a placeholder. In production, would call:
 * - ffmpeg.wasm (browser-based)
 * - AWS Lambda with FFmpeg layer
 * - Dedicated video processing service (Mux, Cloudinary, etc.)
 */
async function compileWithFFmpeg(request: CompileRequest): Promise<Buffer | null> {
  const ffmpegServiceUrl = process.env.FFMPEG_SERVICE_URL;
  
  if (!ffmpegServiceUrl) {
    console.log('⚠️ No FFmpeg service URL, using placeholder mode');
    console.log('📋 FFmpeg command would be:');
    console.log(generateFFmpegCommand(request));
    return null;
  }
  
  try {
    console.log(`🎬 Calling FFmpeg service: ${ffmpegServiceUrl}`);
    
    const response = await fetch(ffmpegServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.FFMPEG_API_KEY || ''}`,
      },
      body: JSON.stringify({
        projectId: request.projectId,
        images: request.images,
        narrationUrl: request.narrationUrl,
        musicUrl: request.musicUrl,
        resolution: request.resolution || '1080p',
        fps: request.fps || 30,
        lufsTarget: request.lufsTarget || -14,
      }),
    });
    
    if (!response.ok) {
      console.error('FFmpeg service error:', response.statusText);
      return null;
    }
    
    // Check if response is video or job ID
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('video')) {
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    }
    
    // Async job - would need polling
    const result = await response.json();
    console.log('FFmpeg job started:', result.jobId);
    return null; // Would poll for completion
    
  } catch (error) {
    console.error('FFmpeg request failed:', error);
    return null;
  }
}

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  console.log('🎞️ EDITOR AGENT - Compile Video');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }
  
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }
  
  try {
    const request: CompileRequest = JSON.parse(event.body || '{}');
    
    if (!request.projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'projectId is required' }),
      };
    }
    
    if (!request.images || request.images.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'At least one image is required' }),
      };
    }
    
    // Set defaults
    request.resolution = request.resolution || '1080p';
    request.fps = request.fps || 30;
    request.lufsTarget = request.lufsTarget || -14;
    
    const duration = calculateDuration(request.images, request.beatGrid);
    
    // Try FFmpeg service, fallback to placeholder
    const videoBuffer = await compileWithFFmpeg(request);
    const isPlaceholder = !videoBuffer;
    
    let videoUrl: string;
    let stored = false;
    let fileSize: string | undefined;
    
    if (videoBuffer) {
      // REAL: Store video in Netlify Blobs
      const videoKey = `${request.projectId}/final.mp4`;
      const uploadResult = await videoStore.uploadData(videoKey, videoBuffer, {
        contentType: 'video/mp4',
        metadata: {
          projectId: request.projectId,
          resolution: request.resolution,
          duration: String(duration),
          fps: String(request.fps),
          imageCount: String(request.images.length),
        },
      });
      
      if (uploadResult.ok && uploadResult.publicUrl) {
        videoUrl = uploadResult.publicUrl;
        stored = true;
        fileSize = `${(videoBuffer.length / (1024 * 1024)).toFixed(1)} MB`;
        console.log(`📦 Stored video to Netlify Blobs: ${videoKey}`);
      } else {
        console.error('Failed to store video:', uploadResult.error);
        videoUrl = `error://storage-failed/${request.projectId}`;
      }
    } else {
      // Placeholder mode - return test video URL
      videoUrl = `/test-assets/test-video.mp4`;
    }
    
    const cost = estimateCost(duration, request.resolution);
    
    const response: CompileResponse = {
      success: true,
      projectId: request.projectId,
      videoUrl,
      duration,
      resolution: request.resolution,
      fileSize,
      stored,
      placeholder: isPlaceholder,
      cost,
    };
    
    console.log(`✅ Editor Agent: ${isPlaceholder ? 'Placeholder' : 'Compiled'} ${duration}s video @ ${request.resolution}, stored: ${stored}`);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response),
    };
    
  } catch (error) {
    console.error('❌ Editor Agent error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
    };
  }
};

export { handler };
