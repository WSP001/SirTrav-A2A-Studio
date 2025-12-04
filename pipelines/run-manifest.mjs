#!/usr/bin/env node

/**
 * A2A Manifest Runner - Full Implementation
 * Executes the D2A (Doc-to-Agent) video automation pipeline
 * 
 * Features:
 * - YAML manifest parsing
 * - Sequential agent execution with retries
 * - Variable interpolation (${env.X}, ${steps.X.output}, ${project.X})
 * - Progress logging to /tmp for SSE streaming
 * - Graceful degradation for non-critical agents
 * - Caching for tight iteration loops
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createHash } from 'crypto';
import { parse as parseYaml } from 'yaml';

// Agent criticality - non-critical agents can fail without crashing pipeline
const CRITICAL_AGENTS = ['director', 'writer', 'editor', 'publisher'];
const NON_CRITICAL_AGENTS = ['voice', 'composer'];

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

/**
 * Pipeline execution context
 */
class PipelineContext {
  constructor(projectId, manifest) {
    this.projectId = projectId;
    this.manifest = manifest;
    this.steps = {};
    this.startTime = new Date().toISOString();
    this.correlationId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.tmpDir = process.env.TMPDIR || '/tmp';
    this.progressFile = join(this.tmpDir, `sirtrav-progress-${projectId}.json`);
  }

  /**
   * Interpolate variables in a string or object
   */
  interpolate(value) {
    if (typeof value === 'string') {
      return value.replace(/\$\{([^}]+)\}/g, (match, path) => {
        const parts = path.split('.');
        let result;

        if (parts[0] === 'env') {
          result = process.env[parts[1]] || '';
        } else if (parts[0] === 'project') {
          result = this.manifest.project?.[parts[1]] || this.projectId;
        } else if (parts[0] === 'steps' && parts.length >= 3) {
          const stepName = parts[1];
          const stepData = this.steps[stepName];
          if (stepData) {
            if (parts[2] === 'output') {
              result = parts.length > 3 ? stepData.output?.[parts[3]] : stepData.output;
            } else if (parts[2] === 'outputPath') {
              result = stepData.outputPath;
            }
          }
        } else if (parts[0] === 'manifest') {
          result = this.manifest[parts[1]];
        } else if (parts[0] === 'run') {
          if (parts[1] === 'start_time') result = this.startTime;
          if (parts[1] === 'correlation_id') result = this.correlationId;
        }

        return result !== undefined ? (typeof result === 'object' ? JSON.stringify(result) : result) : match;
      });
    } else if (Array.isArray(value)) {
      return value.map(v => this.interpolate(v));
    } else if (typeof value === 'object' && value !== null) {
      const result = {};
      for (const [k, v] of Object.entries(value)) {
        result[k] = this.interpolate(v);
      }
      return result;
    }
    return value;
  }

  /**
   * Log progress for SSE streaming
   */
  async logProgress(stepName, status, details = {}) {
    const progress = {
      projectId: this.projectId,
      correlationId: this.correlationId,
      currentStep: stepName,
      status,
      timestamp: new Date().toISOString(),
      steps: Object.entries(this.steps).map(([name, data]) => ({
        name,
        status: data.status,
        duration_ms: data.duration_ms,
        error: data.error
      })),
      ...details
    };

    try {
      await writeFile(this.progressFile, JSON.stringify(progress, null, 2));
    } catch (err) {
      console.error('Failed to write progress:', err.message);
    }

    console.log(`[${status.toUpperCase()}] ${stepName}`, details.error || '');
  }
}

/**
 * Execute a single agent step with retries
 */
async function executeStep(ctx, step, baseUrl) {
  const stepName = step.name;
  const agentName = step.agent || stepName;
  const isCritical = CRITICAL_AGENTS.includes(agentName);
  
  ctx.steps[stepName] = { status: 'running', startTime: Date.now() };
  await ctx.logProgress(stepName, 'running');

  // Interpolate inputs
  const input = ctx.interpolate(step.input || {});
  input.projectId = input.projectId || ctx.projectId;

  // Determine endpoint
  let endpoint = step.endpoint;
  if (!endpoint && step.agent) {
    // Map agent names to function endpoints
    const agentEndpoints = {
      director: 'curate-media',
      writer: 'narrate-project',
      voice: 'text-to-speech',
      composer: 'generate-music',
      editor: 'generate-video', // Editor uses generate-video which calls ffmpeg
      attribution: 'generate-attribution',
      publisher: 'publish'
    };
    endpoint = `${baseUrl}/.netlify/functions/${agentEndpoints[step.agent] || step.agent}`;
  }
  endpoint = ctx.interpolate(endpoint);

  let lastError;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`  → Calling ${endpoint} (attempt ${attempt}/${MAX_RETRIES})`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input)
      });

      const result = await response.json();

      if (!response.ok || result.ok === false) {
        throw new Error(result.message || result.error || `HTTP ${response.status}`);
      }

      // Success
      const duration = Date.now() - ctx.steps[stepName].startTime;
      ctx.steps[stepName] = {
        status: 'completed',
        output: result.data || result,
        outputPath: step.output ? ctx.interpolate(step.output) : null,
        duration_ms: duration
      };

      await ctx.logProgress(stepName, 'completed', { duration_ms: duration });
      return result;

    } catch (err) {
      lastError = err;
      console.error(`  ✗ Attempt ${attempt} failed: ${err.message}`);
      
      if (attempt < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
      }
    }
  }

  // All retries exhausted
  const duration = Date.now() - ctx.steps[stepName].startTime;
  ctx.steps[stepName] = {
    status: 'failed',
    error: lastError.message,
    duration_ms: duration
  };

  if (isCritical) {
    await ctx.logProgress(stepName, 'failed', { error: lastError.message });
    throw new Error(`Critical agent ${stepName} failed: ${lastError.message}`);
  } else {
    // Non-critical: log warning and continue with fallback
    console.warn(`  ⚠ Non-critical agent ${stepName} failed, using fallback`);
    ctx.steps[stepName].status = 'fallback';
    await ctx.logProgress(stepName, 'fallback', { error: lastError.message });
    
    // Return fallback data
    return {
      ok: true,
      fallback: true,
      data: getFallbackData(agentName, ctx.projectId)
    };
  }
}

/**
 * Get fallback data for non-critical agents
 */
function getFallbackData(agentName, projectId) {
  const fallbacks = {
    voice: {
      audio_url: null,
      duration: 120,
      placeholder: true,
      message: 'Voice synthesis unavailable - using text overlay mode'
    },
    composer: {
      music_url: null,
      beat_grid: { bpm: 72, beats: [] },
      duration: 180,
      placeholder: true,
      message: 'Music generation unavailable - using silent track'
    }
  };
  return fallbacks[agentName] || { placeholder: true };
}

/**
 * Main manifest runner
 */
async function runManifest(manifestPath, options = {}) {
  const { projectId = `project-${Date.now()}`, baseUrl = process.env.URL || 'http://localhost:8888' } = options;
  
  console.log('═'.repeat(60));
  console.log('  SirTrav A2A Studio - Pipeline Runner');
  console.log('═'.repeat(60));
  console.log(`  Manifest: ${manifestPath}`);
  console.log(`  Project:  ${projectId}`);
  console.log(`  Base URL: ${baseUrl}`);
  console.log('═'.repeat(60));

  // Load and parse manifest
  const manifestContent = await readFile(manifestPath, 'utf-8');
  const manifest = parseYaml(manifestContent);
  
  // Create context
  const ctx = new PipelineContext(projectId, manifest);
  
  // Ensure tmp directory exists
  const projectTmpDir = join(ctx.tmpDir, projectId);
  if (!existsSync(projectTmpDir)) {
    mkdirSync(projectTmpDir, { recursive: true });
  }

  await ctx.logProgress('pipeline', 'started', { 
    totalSteps: manifest.steps?.length || 0 
  });

  // Execute steps sequentially
  const steps = manifest.steps || [];
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`\n[${i + 1}/${steps.length}] ${step.name}`);
    
    try {
      await executeStep(ctx, step, baseUrl);
    } catch (err) {
      await ctx.logProgress('pipeline', 'failed', { 
        failedStep: step.name,
        error: err.message 
      });
      throw err;
    }
  }

  // Pipeline complete
  await ctx.logProgress('pipeline', 'completed', {
    totalDuration_ms: Date.now() - new Date(ctx.startTime).getTime()
  });

  console.log('\n' + '═'.repeat(60));
  console.log('  ✅ Pipeline completed successfully!');
  console.log('═'.repeat(60));

  return {
    ok: true,
    projectId,
    correlationId: ctx.correlationId,
    steps: ctx.steps
  };
}

// Main entry point
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const defaultManifest = join(scriptDir, 'a2a_manifest.yml');
  const manifestPath = process.argv[2] || defaultManifest;
  const projectId = process.argv[3] || `cli-${Date.now()}`;
  
  runManifest(manifestPath, { projectId })
    .then(result => {
      console.log('\nResult:', JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch(err => {
      console.error('\n❌ Pipeline failed:', err.message);
      process.exit(1);
    });
}

export { runManifest, PipelineContext };
