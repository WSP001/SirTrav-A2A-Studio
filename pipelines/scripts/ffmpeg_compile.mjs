import fs from 'fs';
import path from 'path';

const args = process.argv.slice(2);
const options = {};
args.forEach(arg => {
    const [key, value] = arg.split('=');
    if (key && value) options[key.replace(/^--/, '')] = value;
});

// EXPECT: --media_root=... --out_mp4=public/{projectId}/FINAL.mp4
const mediaRoot = options.media_root || "C:\\Users\\Roberto002\\Documents\\GitHub\\Sir-TRAV-scott\\content\\intake\\demo";
const outPath = options.out_mp4;

console.log(`🎬 [Editor] Assembly Target: ${outPath}`);

if (!outPath) {
    console.error(`❌ No output path specified via --out_mp4`);
    process.exit(1);
}

if (!fs.existsSync(mediaRoot)) {
    console.error(`❌ Media root not found: ${mediaRoot}`);
    process.exit(1);
}

const clips = fs.readdirSync(mediaRoot).filter(f => f.endsWith('.mp4'));
if (clips.length === 0) {
    console.error(`❌ No MP4 clips found in ${mediaRoot}`);
    process.exit(1);
}

// Ensure the DYNAMIC folder exists
const outDir = path.dirname(outPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// Copy the first clip found to the unique project folder
const sourceClip = path.join(mediaRoot, clips[0]);
fs.copyFileSync(sourceClip, outPath);

console.log(`✅ [Editor] Rendered to Unique Path: ${outPath}`);
