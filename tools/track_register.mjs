#!/usr/bin/env node
/**
 * track_register.mjs v1.0.0
 * -------------------------
 * CLI tool to register and optionally normalize audio files.
 * Creates beat grid JSON for pipeline synchronization.
 * 
 * Usage:
 *   node tools/track_register.mjs <audio-file> [options]
 * 
 * Options:
 *   --project <id>      Project identifier (default: dev)
 *   --template <name>   Template name used (default: manual)
 *   --bpm <number>      BPM for beat grid (default: 92)
 *   --duration <sec>    Override duration (auto-detected if ffprobe available)
 *   --no-normalize      Skip FFmpeg normalization
 * 
 * Examples:
 *   node tools/track_register.mjs public/music/theme.mp3 --project week44 --bpm 92
 *   node tools/track_register.mjs ~/Downloads/suno_output.mp3 --project trip01 --template adventure_theme --bpm 96
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Parse arguments
const args = process.argv.slice(2);
const inputFile = args.find((a) => !a.startsWith("--"));

if (!inputFile) {
  console.error(`
╔══════════════════════════════════════════════════════════════╗
║  🎵 Track Register - SirTrav Audio Registration Tool         ║
╠══════════════════════════════════════════════════════════════╣
║  Usage:                                                      ║
║    node tools/track_register.mjs <audio-file> [options]      ║
║                                                              ║
║  Options:                                                    ║
║    --project <id>      Project ID (default: dev)             ║
║    --template <name>   Template name (default: manual)       ║
║    --bpm <number>      BPM for beat grid (default: 92)       ║
║    --duration <sec>    Override duration                     ║
║    --no-normalize      Skip FFmpeg loudness normalization    ║
║                                                              ║
║  Example:                                                    ║
║    node tools/track_register.mjs public/music/theme.mp3 \\   ║
║      --project week44 --template weekly_reflective --bpm 88  ║
╚══════════════════════════════════════════════════════════════╝
  `);
  process.exit(1);
}

// Parse named arguments
function getArg(name, defaultVal) {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) {
    return args[idx + 1];
  }
  return defaultVal;
}

const hasFlag = (name) => args.includes(`--${name}`);

const project = getArg("project", "dev");
const template = getArg("template", "manual");
const bpm = parseInt(getArg("bpm", "92"), 10) || 92;
const durationOverride = getArg("duration", null);
const skipNormalize = hasFlag("no-normalize");

// Resolve input path
const inputPath = path.isAbsolute(inputFile) ? inputFile : path.resolve(process.cwd(), inputFile);

if (!fs.existsSync(inputPath)) {
  console.error(`❌ File not found: ${inputPath}`);
  process.exit(1);
}

console.log("\n🎵 Track Register v1.0.0");
console.log("═".repeat(50));
console.log(`📁 Input: ${inputPath}`);
console.log(`🎯 Project: ${project}`);
console.log(`📋 Template: ${template}`);
console.log(`🥁 BPM: ${bpm}`);
console.log("═".repeat(50));

// Setup output directories
const musicDir = path.join(projectRoot, "public/music");
const gridDir = path.join(projectRoot, "data/beat-grids");

fs.mkdirSync(musicDir, { recursive: true });
fs.mkdirSync(gridDir, { recursive: true });

// Generate canonical filename
const ext = path.extname(inputPath);
const baseName = path.basename(inputPath, ext);
const safeName = baseName.replace(/[^a-zA-Z0-9._-]/g, "_");
const canonicalName = `${safeName}${ext}`;

// Paths
const outputAudioPath = path.join(musicDir, canonicalName);
const normalizedPath = path.join(musicDir, `${safeName}.norm${ext}`);
const gridPath = path.join(gridDir, `${canonicalName}.json`);

// Step 1: Normalize audio (optional)
let finalAudioPath = inputPath;
let normalized = false;

if (!skipNormalize) {
  console.log("\n🔊 Attempting loudness normalization...");
  try {
    // -16 LUFS is broadcast standard, -1.5 dB true peak
    execSync(
      `ffmpeg -y -i "${inputPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" "${normalizedPath}"`,
      { stdio: "pipe" }
    );
    finalAudioPath = normalizedPath;
    normalized = true;
    console.log("   ✅ Normalized to -16 LUFS");
  } catch (e) {
    console.log("   ⚠️ FFmpeg not available, using original audio");
    console.log("   💡 Install FFmpeg for automatic loudness normalization");
  }
}

// Step 2: Copy to public/music
if (finalAudioPath !== outputAudioPath) {
  fs.copyFileSync(finalAudioPath, outputAudioPath);
  console.log(`\n📦 Copied to: ${outputAudioPath}`);
}

// Clean up temp normalized file if it's not the final destination
if (normalized && normalizedPath !== outputAudioPath && fs.existsSync(normalizedPath)) {
  fs.unlinkSync(normalizedPath);
}

// Step 3: Get duration
let duration = 90; // default

if (durationOverride) {
  duration = parseInt(durationOverride, 10);
  console.log(`\n⏱️  Using override duration: ${duration}s`);
} else {
  console.log("\n⏱️  Detecting duration...");
  try {
    const raw = execSync(
      `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "${outputAudioPath}"`,
      { encoding: "utf-8" }
    ).trim();
    duration = Math.max(30, Math.min(300, Math.round(parseFloat(raw))));
    console.log(`   ✅ Detected: ${duration}s`);
  } catch (e) {
    // Fallback: estimate from file size @ 192kbps
    const stats = fs.statSync(outputAudioPath);
    const estimated = Math.round((stats.size * 8) / 192000);
    duration = Math.max(30, Math.min(300, estimated));
    console.log(`   ⚠️ ffprobe unavailable, estimated from size: ~${duration}s`);
  }
}

// Step 4: Generate beat grid
console.log("\n🥁 Generating beat grid...");

function makeGrid(bpm, durationSec) {
  const secondsPerBeat = 60 / bpm;
  const beats = [];
  let beatIndex = 0;
  
  for (let t = 0; t <= durationSec; t += secondsPerBeat) {
    beats.push({
      t: Number(t.toFixed(3)),
      beat: beatIndex % 4 + 1,      // 1, 2, 3, 4
      downbeat: beatIndex % 4 === 0, // true on beat 1
      measure: Math.floor(beatIndex / 4) + 1,
    });
    beatIndex++;
  }
  
  return beats;
}

const beats = makeGrid(bpm, duration);

const grid = {
  version: 1,
  project,
  template,
  bpm,
  duration,
  beatsPerMeasure: 4,
  totalBeats: beats.length,
  totalMeasures: Math.ceil(beats.length / 4),
  file: `/music/${canonicalName}`,
  createdAt: new Date().toISOString(),
  source: "track_register.mjs",
  beats,
};

fs.writeFileSync(gridPath, JSON.stringify(grid, null, 2), "utf-8");

console.log(`   ✅ ${beats.length} beats across ${grid.totalMeasures} measures`);
console.log(`   📁 Saved to: ${gridPath}`);

// Summary
console.log("\n" + "═".repeat(50));
console.log("✅ REGISTRATION COMPLETE");
console.log("═".repeat(50));
console.log();
console.log("📁 Audio file:");
console.log(`   ${outputAudioPath}`);
console.log(`   Web path: /music/${canonicalName}`);
console.log();
console.log("📊 Beat grid:");
console.log(`   ${gridPath}`);
console.log();
console.log("🎬 To use in pipeline, set in manifest:");
console.log(`   manualFile: "${canonicalName}"`);
console.log(`   bpm: ${bpm}`);
console.log();
console.log("🔗 Or call generate-music endpoint with:");
console.log(JSON.stringify({ manualFile: canonicalName, bpm, project }, null, 2));
console.log();
