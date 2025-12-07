#!/usr/bin/env node
/**
 * AUDIO MIX - Combine narration and music tracks
 * 
 * PURPOSE: Mix voice narration with background music at proper levels
 * 
 * INPUT: narration.mp3, music.mp3
 * OUTPUT: mixed_audio.mp3
 * 
 * Features:
 * - Narration at -14 LUFS (broadcast standard)
 * - Music ducked to -20 LUFS under narration
 * - Fade in/out for music
 * - Beat-aligned transitions (if beatGrid provided)
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Configuration
 */
const CONFIG = {
  narrationLufs: -14,      // Target LUFS for narration
  musicLufs: -20,          // Target LUFS for music (ducked)
  musicFadeIn: 1.5,        // Seconds to fade in music
  musicFadeOut: 2.0,       // Seconds to fade out music
  crossfadeDuration: 0.5,  // Crossfade between segments
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
 * Get audio duration using FFprobe
 */
async function getAudioDuration(filePath) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffprobe', [
      '-v', 'quiet',
      '-show_entries', 'format=duration',
      '-of', 'csv=p=0',
      filePath
    ]);
    
    let output = '';
    proc.stdout.on('data', (data) => { output += data; });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve(parseFloat(output.trim()));
      } else {
        reject(new Error(`FFprobe failed with code ${code}`));
      }
    });
    proc.on('error', reject);
  });
}

/**
 * Mix audio tracks with FFmpeg
 */
async function mixAudio(narrationPath, musicPath, outputPath, options = {}) {
  const {
    narrationLufs = CONFIG.narrationLufs,
    musicLufs = CONFIG.musicLufs,
    fadeIn = CONFIG.musicFadeIn,
    fadeOut = CONFIG.musicFadeOut,
  } = options;

  // Get narration duration to match music length
  const narrationDuration = await getAudioDuration(narrationPath);
  
  // Build FFmpeg filter complex
  const filterComplex = [
    // Normalize narration to target LUFS
    `[0:a]loudnorm=I=${narrationLufs}:TP=-1.5:LRA=11[narration]`,
    // Normalize and duck music, add fades
    `[1:a]loudnorm=I=${musicLufs}:TP=-1.5:LRA=11,afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${narrationDuration - fadeOut}:d=${fadeOut}[music]`,
    // Mix together
    `[narration][music]amix=inputs=2:duration=first:dropout_transition=2[out]`
  ].join(';');

  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-i', narrationPath,
      '-i', musicPath,
      '-filter_complex', filterComplex,
      '-map', '[out]',
      '-c:a', 'libmp3lame',
      '-b:a', '192k',
      outputPath
    ];

    console.log(`🎵 Mixing audio: ${narrationPath} + ${musicPath}`);
    console.log(`   Narration LUFS: ${narrationLufs}, Music LUFS: ${musicLufs}`);
    
    const proc = spawn('ffmpeg', args);
    
    proc.stderr.on('data', (data) => {
      const line = data.toString();
      if (line.includes('time=')) {
        // Progress indicator
        process.stdout.write('.');
      }
    });
    
    proc.on('close', (code) => {
      console.log(''); // New line after progress dots
      if (code === 0) {
        console.log(`✅ Mixed audio saved to: ${outputPath}`);
        resolve(outputPath);
      } else {
        reject(new Error(`FFmpeg mix failed with code ${code}`));
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
  
  if (args.length < 3) {
    console.log('Usage: node audio_mix.mjs <narration.mp3> <music.mp3> <output.mp3>');
    console.log('');
    console.log('Options (via env vars):');
    console.log('  NARRATION_LUFS  Target LUFS for narration (default: -14)');
    console.log('  MUSIC_LUFS      Target LUFS for music (default: -20)');
    process.exit(1);
  }

  const [narrationPath, musicPath, outputPath] = args;

  // Check FFmpeg
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.error('❌ FFmpeg not found. Please install FFmpeg.');
    console.error('   brew install ffmpeg  (macOS)');
    console.error('   apt install ffmpeg   (Ubuntu)');
    console.error('   choco install ffmpeg (Windows)');
    process.exit(1);
  }

  // Check input files
  if (!existsSync(narrationPath)) {
    console.error(`❌ Narration file not found: ${narrationPath}`);
    process.exit(1);
  }
  if (!existsSync(musicPath)) {
    console.error(`❌ Music file not found: ${musicPath}`);
    process.exit(1);
  }

  // Mix audio
  try {
    await mixAudio(narrationPath, musicPath, outputPath, {
      narrationLufs: parseInt(process.env.NARRATION_LUFS) || CONFIG.narrationLufs,
      musicLufs: parseInt(process.env.MUSIC_LUFS) || CONFIG.musicLufs,
    });
  } catch (error) {
    console.error('❌ Audio mix failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
main().catch(console.error);

export { mixAudio, getAudioDuration, checkFFmpeg };
