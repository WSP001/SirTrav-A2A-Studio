#!/usr/bin/env node
/**
 * suno_prompt_builder.mjs v1.0.0
 * -----------------------------
 * CLI tool to generate copy-ready Suno prompts from prompt_pack.json
 * 
 * Usage:
 *   node tools/suno_prompt_builder.mjs [templateId] [projectId] [duration]
 * 
 * Examples:
 *   node tools/suno_prompt_builder.mjs weekly_reflective week44 90
 *   node tools/suno_prompt_builder.mjs adventure_theme trip01 120
 *   node tools/suno_prompt_builder.mjs                     # uses defaults
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

// Parse CLI args
const [,, templateId = "weekly_reflective", projectId = "project01", duration = "90"] = process.argv;

// Try to load prompt pack
const packPaths = [
  path.join(projectRoot, "prompts/suno/prompt_pack.json"),
  path.join(projectRoot, "prompts/suno/prompt_pack.yml"),
];

let pack = null;

for (const packPath of packPaths) {
  if (fs.existsSync(packPath)) {
    try {
      const raw = fs.readFileSync(packPath, "utf-8");
      if (packPath.endsWith(".json")) {
        pack = JSON.parse(raw);
      } else {
        // Basic YAML parsing (key: value only)
        console.warn("⚠️ YAML parsing limited - use JSON for full support");
        pack = JSON.parse(raw); // fallback
      }
      console.log(`📦 Loaded: ${packPath}\n`);
      break;
    } catch (e) {
      console.error(`❌ Failed to parse ${packPath}:`, e.message);
    }
  }
}

// Fallback pack
if (!pack) {
  console.log("⚠️ No prompt_pack found, using built-in defaults\n");
  pack = {
    defaults: {
      bpm: 92,
      key: "D major",
      genre: "cinematic folk",
      mood: "warm, hopeful, adventurous",
      structure: "intro(4), A(8), A'(8), bridge(8), outro(4)",
      instruments: "acoustic guitar, hand drums, upright bass, light strings, glockenspiel sprinkles",
      mix_notes: "gentle low-end, no pumping, soft tape saturation",
      usage: "background bed for weekly recap voiceover; should never fight narration",
      ducking_cue: "allow 400ms space before phrases; avoid sharp transients at :00, :15, :30 marks",
    },
    templates: [
      {
        id: "weekly_reflective",
        title: "Weekly Reflective Bed",
        overrides: {
          bpm: 88,
          mood: "reflective, grateful, sunset",
          genre: "acoustic cinematic",
          instruments: "fingerstyle guitar, brushed kit, soft pads",
        },
      },
    ],
    prompts: {
      prose: "Create a {genre} instrumental at {bpm} BPM in {key}.\nMood: {mood}. Use {instruments}. Structure: {structure}.\nMix: {mix_notes}. Usage: {usage}. {ducking_cue}.\nNo vocals, no chanting, no risers that drown spoken voice.",
      tags: "instrumental, {genre}, {mood}, bed, no vocals",
    },
  };
}

// Find template
const base = pack.defaults || {};
const tpl = (pack.templates || []).find((t) => t.id === templateId) || { id: templateId, overrides: {} };

// Merge context
const ctx = { ...base, ...(tpl.overrides || {}) };

// Interpolate variables
function interpolate(template, context) {
  return template.replace(/\{(\w+)\}/g, (_, key) => context[key] || `{${key}}`);
}

const prose = interpolate(pack.prompts?.prose || "", ctx);
const tags = interpolate(pack.prompts?.tags || "", ctx);

const title = `[SirTrav ${projectId}] ${tpl.title || templateId} • ${ctx.genre} • ${ctx.bpm} BPM • ${duration}s`;
const filename = `suno_${projectId}_${templateId}_${ctx.bpm}bpm_${duration}s`;

// Output
console.log("═".repeat(60));
console.log("🎵 SUNO PROMPT (copy into Suno.ai)");
console.log("═".repeat(60));
console.log();
console.log(`📝 ${title}`);
console.log();
console.log(prose);
console.log();
console.log(`🏷️  Tags: ${tags}`);
console.log();
console.log("─".repeat(60));
console.log(`⏱️  Set duration in Suno: ${duration} seconds`);
console.log("─".repeat(60));
console.log();
console.log("═".repeat(60));
console.log("📁 FILENAME PLAN (save downloaded audio as)");
console.log("═".repeat(60));
console.log();
console.log(`   public/music/${filename}.mp3`);
console.log();
console.log("═".repeat(60));
console.log("🔧 AFTER DOWNLOAD, RUN:");
console.log("═".repeat(60));
console.log();
console.log(`   node tools/track_register.mjs public/music/${filename}.mp3 --project ${projectId} --template ${templateId} --bpm ${ctx.bpm}`);
console.log();
console.log("═".repeat(60));
console.log("✅ QUICK COPY (full prompt):");
console.log("═".repeat(60));
console.log();
console.log(`${title}\n\n${prose}\n\nTags: ${tags}`);
console.log();
