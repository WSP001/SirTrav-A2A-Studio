/**
 * Workflow Generator
 *
 * Converts D2A documents (SOPs, Templates) into executable workflow manifests.
 * Generates agent pipelines from structured documentation.
 *
 * Version: 1.0.0
 * Last Updated: 2025-12-09
 */

import * as yaml from 'js-yaml';
import {
  D2ADocument,
  D2ASection,
  parseD2ADocument,
  findSections,
  extractAgentConfig,
  extractWorkflowSteps,
} from './d2a-parser';

/**
 * Platform configuration for output formats
 */
export interface PlatformConfig {
  platform: 'instagram' | 'tiktok' | 'youtube' | 'linkedin';
  format: {
    aspect_ratio: '9:16' | '16:9' | '1:1';
    duration_range: [number, number];
    resolution: string;
  };
  features: {
    captions: boolean;
    music_required: boolean;
    cta_overlay: boolean;
  };
}

/**
 * Workflow step definition
 */
export interface WorkflowStep {
  name: string;
  agent: string;
  doc_source?: string;
  inputs: Record<string, any>;
  outputs?: string[];
  retry?: number;
  timeout?: number;
  optional?: boolean;
}

/**
 * Generated workflow manifest
 */
export interface WorkflowManifest {
  name: string;
  version: string;
  trigger?: string;
  platform?: string;
  variables?: Record<string, any>;
  steps: WorkflowStep[];
  metadata?: Record<string, any>;
}

/**
 * Platform template configurations
 */
export const PLATFORM_CONFIGS: Record<string, PlatformConfig> = {
  instagram_reel: {
    platform: 'instagram',
    format: {
      aspect_ratio: '9:16',
      duration_range: [15, 60],
      resolution: '1080x1920',
    },
    features: {
      captions: true,
      music_required: true,
      cta_overlay: false,
    },
  },
  tiktok: {
    platform: 'tiktok',
    format: {
      aspect_ratio: '9:16',
      duration_range: [15, 60],
      resolution: '1080x1920',
    },
    features: {
      captions: true,
      music_required: true,
      cta_overlay: true,
    },
  },
  youtube_shorts: {
    platform: 'youtube',
    format: {
      aspect_ratio: '9:16',
      duration_range: [15, 58],
      resolution: '1080x1920',
    },
    features: {
      captions: true,
      music_required: false,
      cta_overlay: false,
    },
  },
  linkedin: {
    platform: 'linkedin',
    format: {
      aspect_ratio: '16:9',
      duration_range: [30, 120],
      resolution: '1920x1080',
    },
    features: {
      captions: true,
      music_required: false,
      cta_overlay: true,
    },
  },
};

/**
 * Generate workflow manifest from SOP document
 */
export function generateWorkflowFromSOP(
  sopContent: string,
  options: {
    platform?: string;
    variables?: Record<string, any>;
  } = {}
): WorkflowManifest {
  const document = parseD2ADocument(sopContent);

  if (document.type !== 'sop') {
    throw new Error(`Document type must be 'sop', got '${document.type}'`);
  }

  const steps = extractWorkflowSteps(document);
  const agentConfig = extractAgentConfig(document);

  // Convert workflow steps to manifest steps
  const manifestSteps: WorkflowStep[] = steps.map((step, index) => {
    const stepConfig = agentConfig?.[step.agent] || {};

    return {
      name: step.name.toLowerCase().replace(/\s+/g, '_'),
      agent: step.agent,
      doc_source: step.description.split('\n')[0], // First line as reference
      inputs: stepConfig,
      retry: 2,
      timeout: 300000, // 5 minutes default
    };
  });

  // Build manifest
  const manifest: WorkflowManifest = {
    name: document.name || 'generated_workflow',
    version: document.version || 'auto_generated',
    trigger: 'manual',
    platform: options.platform,
    variables: {
      ...document.variables,
      ...options.variables,
    },
    steps: manifestSteps,
    metadata: {
      generated_from: document.name,
      generated_at: new Date().toISOString(),
      doc_version: document.version,
    },
  };

  return manifest;
}

/**
 * Generate platform-specific workflow from template
 */
export function generateWorkflowFromTemplate(
  templateContent: string,
  platform: string
): WorkflowManifest {
  const document = parseD2ADocument(templateContent);

  if (document.type !== 'template') {
    throw new Error(`Document type must be 'template', got '${document.type}'`);
  }

  const platformConfig = PLATFORM_CONFIGS[platform];
  if (!platformConfig) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  const agentConfig = extractAgentConfig(document);

  // Standard 7-agent pipeline
  const steps: WorkflowStep[] = [
    {
      name: 'intake',
      agent: 'director',
      doc_source: 'Asset Collection',
      inputs: agentConfig?.director || {
        max_assets: 12,
        privacy_filter: 'public_commons',
      },
      outputs: ['curated_media.json'],
    },
    {
      name: 'curate',
      agent: 'director',
      doc_source: 'Curation Rules',
      inputs: {
        curated_media: '${STEP_OUTPUT.intake}',
        platform_config: platformConfig,
      },
      outputs: ['curated_media.json'],
    },
    {
      name: 'narrate',
      agent: 'writer',
      doc_source: 'Script Generation',
      inputs: agentConfig?.writer || {
        style: 'reflective',
        word_count: 150,
      },
      outputs: ['narrative.json'],
    },
    {
      name: 'voice',
      agent: 'voice',
      doc_source: 'Voice Synthesis',
      inputs: agentConfig?.voice || {
        pace: 'moderate',
      },
      outputs: ['narration.wav'],
    },
    {
      name: 'music',
      agent: 'composer',
      doc_source: 'Music Generation',
      inputs: agentConfig?.composer || {
        mood: 'uplifting',
      },
      outputs: ['soundtrack.wav', 'beat_grid.json'],
      optional: !platformConfig.features.music_required,
    },
    {
      name: 'compile',
      agent: 'editor',
      doc_source: 'Video Compilation',
      inputs: {
        ...(agentConfig?.editor || {}),
        platform_format: platformConfig.format,
        captions_enabled: platformConfig.features.captions,
      },
      outputs: ['final_video.mp4'],
    },
    {
      name: 'attribute',
      agent: 'attribution',
      doc_source: 'Attribution Generation',
      inputs: {
        platform: platformConfig.platform,
      },
      outputs: ['credits.json'],
    },
    {
      name: 'publish',
      agent: 'publisher',
      doc_source: 'Publishing',
      inputs: {
        platform: platformConfig.platform,
      },
      outputs: ['publish_result.json'],
    },
  ];

  return {
    name: `${platform}_workflow`,
    version: document.version || '1.0.0',
    trigger: 'manual',
    platform,
    variables: {
      PLATFORM: platform,
      ASPECT_RATIO: platformConfig.format.aspect_ratio,
      RESOLUTION: platformConfig.format.resolution,
      MIN_DURATION: platformConfig.format.duration_range[0],
      MAX_DURATION: platformConfig.format.duration_range[1],
    },
    steps,
    metadata: {
      template_name: document.name,
      platform_config: platformConfig,
      generated_at: new Date().toISOString(),
    },
  };
}

/**
 * Apply platform template to existing workflow
 */
export function applyPlatformTemplate(
  workflow: WorkflowManifest,
  platform: string
): WorkflowManifest {
  const platformConfig = PLATFORM_CONFIGS[platform];
  if (!platformConfig) {
    throw new Error(`Unknown platform: ${platform}`);
  }

  // Update workflow with platform-specific settings
  const updatedWorkflow = { ...workflow };
  updatedWorkflow.platform = platform;
  updatedWorkflow.variables = {
    ...updatedWorkflow.variables,
    PLATFORM: platform,
    ASPECT_RATIO: platformConfig.format.aspect_ratio,
    RESOLUTION: platformConfig.format.resolution,
    MIN_DURATION: platformConfig.format.duration_range[0],
    MAX_DURATION: platformConfig.format.duration_range[1],
  };

  // Update editor step with platform format
  const editorStep = updatedWorkflow.steps.find(step => step.agent === 'editor');
  if (editorStep) {
    editorStep.inputs = {
      ...editorStep.inputs,
      platform_format: platformConfig.format,
      captions_enabled: platformConfig.features.captions,
    };
  }

  // Update publisher step with platform
  const publisherStep = updatedWorkflow.steps.find(step => step.agent === 'publisher');
  if (publisherStep) {
    publisherStep.inputs = {
      ...publisherStep.inputs,
      platform: platformConfig.platform,
    };
  }

  return updatedWorkflow;
}

/**
 * Serialize workflow to YAML manifest
 */
export function serializeWorkflow(workflow: WorkflowManifest): string {
  return yaml.dump(workflow, {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
  });
}

/**
 * Load workflow from YAML string
 */
export function loadWorkflow(yamlContent: string): WorkflowManifest {
  try {
    const workflow = yaml.load(yamlContent);
    if (typeof workflow !== 'object' || workflow === null) {
      throw new Error('Invalid workflow YAML');
    }
    return workflow as WorkflowManifest;
  } catch (error) {
    throw new Error(`Failed to load workflow: ${error}`);
  }
}

/**
 * Validate workflow manifest
 */
export function validateWorkflow(workflow: WorkflowManifest): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!workflow.name) {
    errors.push('Workflow name is required');
  }

  if (!workflow.version) {
    errors.push('Workflow version is required');
  }

  if (!workflow.steps || workflow.steps.length === 0) {
    errors.push('Workflow must have at least one step');
  }

  // Validate each step
  workflow.steps?.forEach((step, index) => {
    if (!step.name) {
      errors.push(`Step ${index + 1}: name is required`);
    }

    if (!step.agent) {
      errors.push(`Step ${index + 1}: agent is required`);
    }

    if (!step.inputs) {
      errors.push(`Step ${index + 1}: inputs are required`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate workflow summary for logging
 */
export function getWorkflowSummary(workflow: WorkflowManifest): string {
  const lines = [
    `Workflow: ${workflow.name} v${workflow.version}`,
    `Platform: ${workflow.platform || 'N/A'}`,
    `Steps: ${workflow.steps.length}`,
    '',
    'Pipeline:',
  ];

  workflow.steps.forEach((step, index) => {
    const optional = step.optional ? ' (optional)' : '';
    lines.push(`  ${index + 1}. ${step.name} [${step.agent}]${optional}`);
  });

  return lines.join('\n');
}

/**
 * Create a minimal workflow for testing
 */
export function createTestWorkflow(platform?: string): WorkflowManifest {
  return {
    name: 'test_workflow',
    version: '1.0.0',
    trigger: 'manual',
    platform: platform || 'instagram_reel',
    variables: {
      TEST_MODE: true,
    },
    steps: [
      {
        name: 'intake',
        agent: 'director',
        inputs: {
          max_assets: 5,
        },
      },
      {
        name: 'narrate',
        agent: 'writer',
        inputs: {
          word_count: 50,
        },
      },
      {
        name: 'compile',
        agent: 'editor',
        inputs: {
          test_mode: true,
        },
      },
    ],
  };
}
