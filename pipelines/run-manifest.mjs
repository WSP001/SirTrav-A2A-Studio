#!/usr/bin/env node

/**
 * A2A Manifest Runner
 * Executes the D2A (Doc-to-Agent) video automation pipeline
 * 
 * ITERATION 3 COMPLETE:
 * - YAML parsing with js-yaml
 * - Variable interpolation (${env.*}, ${project.*}, ${manifest.*}, ${run.*})
 * - Sequential step execution (Endpoint FETCH or Script SPAWN)
 * - Progress logging via progress.ts function
 * - Error handling and retries
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { spawn } from 'child_process';
import yaml from 'js-yaml';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate unique correlation ID for this pipeline run
 */
function generateCorrelationId() {
  return `run-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Log progress event to progress tracking function
 */
async function logProgress(projectId, agent, status, message, progress, metadata = {}) {
  const progressUrl = process.env.URL
    ? `${process.env.URL}/.netlify/functions/progress`
    : 'http://localhost:8888/.netlify/functions/progress';

  const event = {
    projectId,
    agent,
    status,
    message,
    timestamp: new Date().toISOString(),
    progress,
    metadata,
  };

  try {
    const response = await fetch(progressUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      console.warn(`⚠️  Progress logging failed: ${response.statusText}`);
    }
  } catch (error) {
    console.warn(`⚠️  Progress logging error: ${error.message}`);
  }
}

/**
 * Interpolate variables in strings
 * Supports: ${env.*}, ${project.*}, ${manifest.*}, ${run.*}, ${steps.*}
 */
function interpolate(value, context) {
  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/\$\{([^}]+)\}/g, (match, path) => {
    const parts = path.split('.');
    let current = context;

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        // console.warn(`⚠️  Variable not found: ${path}`);
        return match; // Keep original if not found
      }
    }

    return current;
  });
}

/**
 * Interpolate all values in an object recursively
 */
function interpolateObject(obj, context) {
  if (Array.isArray(obj)) {
    return obj.map(item => interpolateObject(item, context));
  }

  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = interpolateObject(value, context);
    }
    return result;
  }

  return interpolate(obj, context);
}

/**
 * Execute a script step
 */
async function executeScript(scriptPath, input, context) {
  return new Promise((resolve, reject) => {
    // Convert input object to CLI args: --key=value
    const args = Object.entries(input).map(([key, value]) => `--${key}=${value}`);

    console.log(`   Running script: ${scriptPath}`);
    console.log(`   Args: ${args.join(' ')}`);

    const child = spawn('node', [scriptPath, ...args], {
      stdio: 'inherit',
      env: { ...process.env, ...context.env }
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Ensure every step body includes the canonical run context.
 */
function withRunContext(stepName, input, projectId, runId) {
  const safeInput = input && typeof input === 'object' ? { ...input } : {};

  if (safeInput.projectId && safeInput.projectId !== projectId) {
    throw new Error(`[${stepName}] projectId mismatch: ${safeInput.projectId} != ${projectId}`);
  }
  if (safeInput.runId && safeInput.runId !== runId) {
    throw new Error(`[${stepName}] runId mismatch: ${safeInput.runId} != ${runId}`);
  }

  return {
    projectId,
    runId,
    ...safeInput,
  };
}

/**
 * Execute a single step by calling its endpoint or script
 */
async function executeStep(step, context, projectId, runId, retries = 3) {
  const input = interpolateObject(step.input || {}, context);
  const inputWithRun = withRunContext(step.name, input, projectId, runId);

  console.log(`
?? Executing step: ${step.name}`);
  console.log(`   Input:`, JSON.stringify(inputWithRun, null, 2));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      let result;

      if (step.script) {
        // EXECUTE SCRIPT
        const scriptPath = interpolate(step.script, context);
        result = await executeScript(scriptPath, inputWithRun, context);
      } else if (step.endpoint) {
        // EXECUTE ENDPOINT
        const endpoint = interpolate(step.endpoint, context);
        console.log(`   Endpoint: ${endpoint}`);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(inputWithRun),
        });

        result = await response.json();

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${result.error || response.statusText}`);
        }
      } else {
        throw new Error(`Step ${step.name} has neither endpoint nor script defined.`);
      }

      console.log(`? Step completed: ${step.name}`);

      // Save output if specified
      if (step.output) {
        const outputPath = interpolate(step.output, context);
        const outputDir = dirname(outputPath);

        if (!existsSync(outputDir)) {
          await mkdir(outputDir, { recursive: true });
        }

        // If result is just { success: true } from script, we might want to save something else?
        // Or maybe the script wrote the file itself?
        // For now, save the result metadata.
        await writeFile(outputPath, JSON.stringify(result, null, 2));
        console.log(`   Output saved: ${outputPath}`);
      }

      return result;
    } catch (error) {
      console.error(`? Step failed (attempt ${attempt}/${retries}): ${error.message}`);

      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`   Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}

// ============================================================================
// MAIN MANIFEST EXECUTION
// ============================================================================

async function runManifest(manifestPath, projectConfig = {}) {
  const startTime = new Date().toISOString();
  const correlationId = generateCorrelationId();

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  SirTrav A2A Studio - Manifest Executor                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(`📋 Manifest: ${manifestPath}`);
  console.log(`🔑 Correlation ID: ${correlationId}`);
  console.log(`⏰ Start time: ${startTime}\n`);

  try {
    // 1. Load and parse manifest
    console.log('📖 Loading manifest...');
    const manifestContent = await readFile(manifestPath, 'utf-8');
    const manifest = yaml.load(manifestContent);
    console.log(`✅ Manifest loaded: ${manifest.pipeline.name}`);
    console.log(`   Version: ${manifest.version}`);
    console.log(`   Stages: ${manifest.steps.length}\n`);

    // 2. Build execution context
    const projectId = projectConfig.projectId || `project-${Date.now()}`;
    const runId = projectConfig.runId || process.env.RUN_ID;

    if (!projectId) {
      throw new Error('projectId is required');
    }
    if (!runId) {
      throw new Error('runId is required (pass --runId or set RUN_ID)');
    }

    const context = {
      env: { ...process.env, URL: process.env.URL || 'http://localhost:8888' },
      project: {
        id: projectId,
        source_root: projectConfig.sourceRoot || './intake',
        ...projectConfig,
      },
      manifest: {
        version: manifest.version,
        name: manifest.pipeline.name,
      },
      run: {
        id: runId,
        start_time: startTime,
        correlation_id: correlationId,
      },
      steps: {}, // Will be populated with step outputs
    };

    // 3. Log pipeline start
    await logProgress(
      projectId,
      'system',
      'started',
      `Pipeline started: ${manifest.pipeline.name}`,
      0,
      { correlationId, stages: manifest.steps.length }
    );

    // 4. Execute steps sequentially
    const steps = manifest.steps || [];
    const totalSteps = steps.length;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const progress = (i + 1) / totalSteps;

      try {
        // Log step start
        await logProgress(
          projectId,
          'system',
          'progress',
          `Executing: ${step.name}`,
          progress,
          { step: step.name, stage: step.stage }
        );

        // Execute step
        const retries = step.retries !== undefined ? step.retries : 3;
        const result = await executeStep(step, context, projectId, runId, retries);

        // Store result in context for later steps
        context.steps[step.name] = {
          output: result,
          outputPath: step.output ? interpolate(step.output, context) : undefined
        };

        // Log step completion
        await logProgress(
          projectId,
          'system',
          'progress',
          `Completed: ${step.name}`,
          progress,
          { step: step.name, success: true }
        );
      } catch (error) {
        console.error(`\n❌ Pipeline failed at step: ${step.name}`);
        console.error(`   Error: ${error.message}\n`);

        // FALLBACK LOGIC
        if (step.fallback) {
          console.warn(`⚠️  Using fallback for ${step.name}`);

          // If fallback provides a static value
          if (step.fallback.value) {
            context.steps[step.name] = { output: step.fallback.value };

            await logProgress(
              projectId,
              'system',
              'warning',
              `Step ${step.name} failed, used fallback`,
              progress,
              { step: step.name, usedFallback: true }
            );
            continue; // Continue pipeline
          }
        }

        // Log failure
        await logProgress(
          projectId,
          'system',
          'error',
          `Failed at step: ${step.name}`,
          progress,
          { step: step.name, error: error.message }
        );

        throw error;
      }
    }

    // 5. Pipeline completed successfully
    const endTime = new Date().toISOString();
    const duration = new Date(endTime) - new Date(startTime);

    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ PIPELINE COMPLETED SUCCESSFULLY                       ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`📦 Project ID: ${projectId}`);
    console.log(`🔑 Correlation ID: ${correlationId}\n`);

    await logProgress(
      projectId,
      'system',
      'completed',
      'Pipeline completed successfully',
      1,
      { duration, correlationId }
    );

    return {
      success: true,
      projectId,
      correlationId,
      duration,
      steps: Object.keys(context.steps),
    };
  } catch (error) {
    console.error('\n╔═══════════════════════════════════════════════════════════╗');
    console.error('║  ❌ PIPELINE FAILED                                       ║');
    console.error('╚═══════════════════════════════════════════════════════════╝\n');
    console.error(`Error: ${error.message}\n`);

    throw error;
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  const scriptDir = dirname(fileURLToPath(import.meta.url));
  const defaultManifest = join(scriptDir, 'a2a_manifest.yml');
  const manifestPath = process.argv[2] || defaultManifest;

  // Parse CLI options
  const projectId = process.argv[3] || `week-${new Date().toISOString().slice(0, 10)}`;
  const runId = process.argv[4] || process.env.RUN_ID;

  runManifest(manifestPath, { projectId, runId })
    .then(result => {
      console.log('Pipeline result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('Pipeline error:', error);
      process.exit(1);
    });
}

export { runManifest };
