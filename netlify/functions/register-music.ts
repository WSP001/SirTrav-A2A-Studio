import { Handler } from "@netlify/functions";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

/**
 * register-music.ts v1.0.0
 * -------------------------
 * Netlify function to register manually-created music files.
 * Accepts base64-encoded audio + beat grid JSON.
 * 
 * In dev: writes to /tmp for local testing
 * In prod: returns paths for manual placement
 * 
 * Request body:
 * {
 *   projectId: string,
 *   filename: string,
 *   bpm: number,
 *   fileBase64: string,
 *   grid: { project, template, bpm, duration, beats: [...] }
 * }
 */

interface RegisterRequest {
  projectId: string;
  filename: string;
  bpm: number;
  fileBase64: string;
  grid: {
    project: string;
    template: string;
    bpm: number;
    duration: number;
    beats: Array<{ t: number; downbeat: boolean }>;
  };
}

export const handler: Handler = async (event) => {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: "POST, OPTIONS" },
      body: JSON.stringify({ error: "Method Not Allowed" }),
    };
  }

  try {
    const body: RegisterRequest = JSON.parse(event.body || "{}");
    const { projectId, filename, bpm, fileBase64, grid } = body;

    // Validate required fields
    if (!projectId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "projectId is required" }),
      };
    }
    if (!filename) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "filename is required" }),
      };
    }
    if (!fileBase64) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "fileBase64 is required" }),
      };
    }
    if (!grid) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "grid is required" }),
      };
    }

    // Sanitize filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    
    // Use /tmp in Netlify environment
    const tmpRoot = process.env.TMPDIR || "/tmp";
    const audioDir = join(tmpRoot, "sirtrav-music", projectId);
    const gridDir = join(tmpRoot, "sirtrav-grids", projectId);

    // Create directories
    mkdirSync(audioDir, { recursive: true });
    mkdirSync(gridDir, { recursive: true });

    const audioPath = join(audioDir, safeFilename);
    const gridPath = join(gridDir, `${safeFilename}.json`);

    // Decode and write audio file
    const buf = Buffer.from(fileBase64, "base64");
    writeFileSync(audioPath, buf);

    // Write grid JSON with additional metadata
    const enrichedGrid = {
      ...grid,
      bpm: bpm || grid.bpm,
      registeredAt: new Date().toISOString(),
      filename: safeFilename,
      source: "suno-prompt-wizard",
    };
    writeFileSync(gridPath, JSON.stringify(enrichedGrid, null, 2), "utf-8");

    // Calculate some stats for the response
    const stats = {
      audioSize: buf.length,
      audioSizeHuman: `${(buf.length / 1024 / 1024).toFixed(2)} MB`,
      beatCount: grid.beats?.length || 0,
      duration: grid.duration,
    };

    console.log(`[register-music] Registered: ${safeFilename} for project ${projectId}`);
    console.log(`[register-music] Audio: ${audioPath} (${stats.audioSizeHuman})`);
    console.log(`[register-music] Grid: ${gridPath} (${stats.beatCount} beats)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        mode: "dev-tmp",
        file: audioPath,
        grid: gridPath,
        stats,
        note: "Files written to /tmp. For production, save to public/music/ and data/beat-grids/",
        expectedPaths: {
          audio: `public/music/${safeFilename}`,
          grid: `data/beat-grids/${safeFilename}.json`,
        },
      }),
    };
  } catch (e: any) {
    console.error("[register-music] Error:", e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: e?.message || "Failed to register music",
        hint: "Check that fileBase64 is valid base64 and grid is valid JSON",
      }),
    };
  }
};
