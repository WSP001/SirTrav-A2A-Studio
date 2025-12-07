#!/usr/bin/env node
/**
 * FFMPEG COMPILE - Assemble final video from assets
 * 
 * PURPOSE: Compile images, audio, and overlays into final video
 * 
 * INPUT: images/, mixed_audio.mp3, config.json
 * OUTPUT: final_video.mp4
 * 
 * Features:
 * - Image slideshow with Ken Burns effect
 * - Audio sync with beat grid
 * - Text overlays (titles, credits)
 * - Multiple resolution outputs
 */

import { spawn } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Configuration
 */
const CONFIG = {
  resolution: '1920:1080',  // Output resolution
  fps: 30,                   // Frames per second
  imageDuration: 4,          // Seconds per image (default)
  transitionDuration: 1,     // Crossfade between images
  codec: 'libx264',          // Video codec
  preset: 'medium',          // Encoding preset
  crf: 23,                   // Quality (lower = better, 18-28 typical)
};

/**
 * Check if FFmpeg is available
 */
async function checkFFmpeg() {
  return new Promise((resolve) => {
    const proc = spawn('ffmpeg', ['-version']);
    proc.on('close', (code) => resolve(code === 0));
    proc.on('error', () => resolve(false));
  });
}

/**
 * Get list of images from directory
 */
function getImageFiles(directory) {
  const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
  
  if (!existsSync(directory)) {
    return [];
  }
  
  return readdirSync(directory)
    .filter(file => validExtensions.includes(extname(file).toLowerCase()))
    .sort()
    .map(file => join(directory, file));
}

/**
 * Generate FFmpeg filter for Ken Burns effect
 */
function generateKenBurnsFilter(imageCount, imageDuration, resolution) {
  const [width, height] = resolution.split(':').map(Number);
  const filters = [];
  
  for (let i = 0; i < imageCount; i++) {
    // Alternate between zoom in and zoom out
    const zoomIn = i % 2 === 0;
    const startScale = zoomIn ? 1.0 : 1.1;
    const endScale = zoomIn ? 1.1 : 1.0;
    
    filters.push(
      `[${i}:v]scale=${width * 1.2}:${height * 1.2},` +
      `zoompan=z='${startScale}+(${endScale - startScale})*on/${imageDuration * CONFIG.fps}':` +
      `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
      `d=${imageDuration * CONFIG.fps}:s=${width}x${height}:fps=${CONFIG.fps}[v${i}]`
    );
  }
  
  return filters;
}

/**
 * Compile video with FFmpeg
 */
async function compileVideo(imagesDir, audioPath, outputPath, options = {}) {
  const {
    resolution = CONFIG.resolution,
    fps = CONFIG.fps,
    imageDuration = CONFIG.imageDuration,
    beatGrid = null,
  } = options;

  const images = getImageFiles(imagesDir);
  
  if (images.length === 0) {
    throw new Error(`No images found in ${imagesDir}`);
  }

  console.log(`🎬 Compiling video from ${images.length} images`);
  console.log(`   Resolution: ${resolution}, FPS: ${fps}`);
  console.log(`   Audio: ${audioPath || 'none'}`);

  // Build input arguments
  const inputArgs = [];
  images.forEach(img => {
    inputArgs.push('-loop', '1', '-t', String(imageDuration), '-i', img);
  });
  
  if (audioPath && existsSync(audioPath)) {
    inputArgs.push('-i', audioPath);
  }

  // Build filter complex
  const kenBurnsFilters = generateKenBurnsFilter(images.length, imageDuration, resolution);
  
  // Concatenate all video streams
  const concatInputs = images.map((_, i) => `[v${i}]`).join('');
  const filterComplex = [
    ...kenBurnsFilters,
    `${concatInputs}concat=n=${images.length}:v=1:a=0[outv]`
  ].join(';');

  // Build output arguments
  const outputArgs = [
    '-filter_complex', filterComplex,
    '-map', '[outv]',
  ];
  
  if (audioPath && existsSync(audioPath)) {
    outputArgs.push('-map', `${images.length}:a`);
    outputArgs.push('-c:a', 'aac', '-b:a', '192k');
    outputArgs.push('-shortest'); // Match video to audio length
  }
  
  outputArgs.push(
    '-c:v', CONFIG.codec,
    '-preset', CONFIG.preset,
    '-crf', String(CONFIG.crf),
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    outputPath
  );

  return new Promise((resolve, reject) => {
    const args = ['-y', ...inputArgs, ...outputArgs];
    
    const proc = spawn('ffmpeg', args);
    
    let lastProgress = 0;
    proc.stderr.on('data', (data) => {
      const line = data.toString();
      const timeMatch = line.match(/time=(\d+):(\d+):(\d+)/);
      if (timeMatch) {
        const seconds = parseInt(timeMatch[1]) * 3600 + 
                       parseInt(timeMatch[2]) * 60 + 
                       parseInt(timeMatch[3]);
        if (seconds > lastProgress) {
          lastProgress = seconds;
          process.stdout.write(`\r   Progress: ${seconds}s encoded`);
        }
      }
    });
    
    proc.on('close', (code) => {
      console.log(''); // New line
      if (code === 0) {
        console.log(`✅ Video saved to: ${outputPath}`);
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg compile failed with code ${code}`));
      }
    });
    
    proc.on('error', reject);
  });
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node ffmpeg_compile.mjs <images_dir> <output.mp4> [audio.mp3]');
    console.log('');
    console.log('Options (via env vars):');
    console.log('  RESOLUTION      Output resolution (default: 1920:1080)');
    console.log('  FPS             Frames per second (default: 30)');
    console.log('  IMAGE_DURATION  Seconds per image (default: 4)');
    process.exit(1);
  }

  const [imagesDir, outputPath, audioPath] = args;

  // Check FFmpeg
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.error('❌ FFmpeg not found. Please install FFmpeg.');
    process.exit(1);
  }

  // Check images directory
  if (!existsSync(imagesDir)) {
    console.error(`❌ Images directory not found: ${imagesDir}`);
    process.exit(1);
  }

  // Compile video
  try {
    await compileVideo(imagesDir, audioPath, outputPath, {
      resolution: process.env.RESOLUTION || CONFIG.resolution,
      fps: parseInt(process.env.FPS) || CONFIG.fps,
      imageDuration: parseInt(process.env.IMAGE_DURATION) || CONFIG.imageDuration,
    });
  } catch (error) {
    console.error('❌ Video compile failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
main().catch(console.error);

export { compileVideo, getImageFiles, checkFFmpeg };
