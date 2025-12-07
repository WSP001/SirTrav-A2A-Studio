#!/usr/bin/env node
/**
 * LUFS CHECK - Audio Loudness Verification
 * 
 * PURPOSE: Verify audio meets broadcast loudness standards
 * 
 * INPUT: audio.mp3 or video.mp4
 * OUTPUT: LUFS measurements and pass/fail status
 * 
 * Standards:
 * - YouTube: -14 LUFS (recommended)
 * - Spotify: -14 LUFS
 * - Apple Music: -16 LUFS
 * - Broadcast TV: -24 LUFS (EBU R128)
 * - Podcast: -16 to -14 LUFS
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Target standards
 */
const STANDARDS = {
  youtube: { target: -14, tolerance: 1 },
  spotify: { target: -14, tolerance: 1 },
  apple: { target: -16, tolerance: 1 },
  broadcast: { target: -24, tolerance: 1 },
  podcast: { target: -16, tolerance: 2 },
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
 * Measure LUFS using FFmpeg loudnorm filter
 */
async function measureLufs(filePath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-i', filePath,
      '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json',
      '-f', 'null',
      '-'
    ];

    const proc = spawn('ffmpeg', args);
    
    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    proc.on('close', (code) => {
      // Parse the JSON output from loudnorm
      const jsonMatch = stderr.match(/\{[\s\S]*?"input_i"[\s\S]*?\}/);
      
      if (jsonMatch) {
        try {
          const measurements = JSON.parse(jsonMatch[0]);
          resolve({
            integrated: parseFloat(measurements.input_i),
            truePeak: parseFloat(measurements.input_tp),
            lra: parseFloat(measurements.input_lra),
            threshold: parseFloat(measurements.input_thresh),
            targetOffset: parseFloat(measurements.target_offset),
          });
        } catch (e) {
          reject(new Error('Failed to parse LUFS measurements'));
        }
      } else {
        reject(new Error('No LUFS data in FFmpeg output'));
      }
    });
    
    proc.on('error', reject);
  });
}

/**
 * Check if audio meets a specific standard
 */
function checkStandard(measurements, standardName) {
  const standard = STANDARDS[standardName];
  if (!standard) {
    return { pass: false, error: `Unknown standard: ${standardName}` };
  }
  
  const diff = Math.abs(measurements.integrated - standard.target);
  const pass = diff <= standard.tolerance;
  
  return {
    pass,
    standard: standardName,
    target: standard.target,
    actual: measurements.integrated,
    difference: diff,
    tolerance: standard.tolerance,
  };
}

/**
 * Format LUFS report
 */
function formatReport(measurements, checks) {
  let report = '\n📊 LUFS MEASUREMENT REPORT\n';
  report += '═'.repeat(50) + '\n\n';
  
  report += '📈 Measurements:\n';
  report += `   Integrated Loudness: ${measurements.integrated.toFixed(1)} LUFS\n`;
  report += `   True Peak:           ${measurements.truePeak.toFixed(1)} dBTP\n`;
  report += `   Loudness Range:      ${measurements.lra.toFixed(1)} LU\n`;
  report += '\n';
  
  report += '🎯 Standard Compliance:\n';
  for (const check of checks) {
    const icon = check.pass ? '✅' : '❌';
    const status = check.pass ? 'PASS' : 'FAIL';
    report += `   ${icon} ${check.standard.toUpperCase()}: ${status}`;
    report += ` (target: ${check.target} LUFS, actual: ${check.actual.toFixed(1)} LUFS)\n`;
  }
  
  report += '\n' + '═'.repeat(50) + '\n';
  
  return report;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: node lufs_check.mjs <audio_or_video_file> [standard]');
    console.log('');
    console.log('Standards: youtube, spotify, apple, broadcast, podcast');
    console.log('Default: checks all standards');
    console.log('');
    console.log('Examples:');
    console.log('  node lufs_check.mjs output.mp4');
    console.log('  node lufs_check.mjs narration.mp3 youtube');
    process.exit(1);
  }

  const [filePath, standardName] = args;

  // Check FFmpeg
  const hasFFmpeg = await checkFFmpeg();
  if (!hasFFmpeg) {
    console.error('❌ FFmpeg not found. Please install FFmpeg.');
    process.exit(1);
  }

  // Check input file
  if (!existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`🔊 Measuring LUFS for: ${filePath}`);
  console.log('   This may take a moment...\n');

  try {
    // Measure LUFS
    const measurements = await measureLufs(filePath);
    
    // Check standards
    let checks;
    if (standardName) {
      checks = [checkStandard(measurements, standardName.toLowerCase())];
    } else {
      checks = Object.keys(STANDARDS).map(name => 
        checkStandard(measurements, name)
      );
    }
    
    // Print report
    console.log(formatReport(measurements, checks));
    
    // Exit with error if any check failed
    const allPass = checks.every(c => c.pass);
    if (!allPass) {
      console.log('⚠️  Some standards not met. Consider normalizing audio.');
      process.exit(1);
    }
    
    console.log('✅ All checked standards passed!');
    
  } catch (error) {
    console.error('❌ LUFS check failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
main().catch(console.error);

export { measureLufs, checkStandard, STANDARDS };
