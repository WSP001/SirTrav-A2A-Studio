# A2A Manifest Schema Definition (v1.0)
## Overview
The **A2A (Agent-to-Agent) Manifest** is the executable blueprint for the SirTrav Studio pipeline. It defines the sequence of agents, their inputs, outputs, and execution parameters. The `pipelines/run-manifest.mjs` script consumes this YAML file to orchestrate the video generation process.

## Schema Structure

### Root Object
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `version` | string | Yes | Manifest version (e.g., "1.0") |
| `name` | string | Yes | Human-readable name of the workflow |
| `project` | object | Yes | Project-level configuration and metadata |
| `steps` | array | Yes | Ordered list of agent execution steps |

### Project Object
Global variables accessible via `${project.KEY}`.
```yaml
project:
  id: "week-44-recap"
  mode: "commons_public"
  theme: "reflective"
  target_platform: "linkedin"
```

### Step Object
Defines a single unit of work (Agent execution).

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique identifier for the step |
| `agent` | string | Yes | Agent ID (director, writer, voice, composer, editor, publisher) |
| `endpoint` | string | No | Custom override URL. Defaults to Agent ID mapping. |
| `input` | object | Yes | JSON payload sent to the agent |
| `output` | string | No | Path to save the step result (optional) |

### Variable Interpolation
Values in `input` can reference other values dynamically:
- `${env.VAR_NAME}` - Environment variables
- `${project.VAR_NAME}` - Project metadata
- `${steps.STEP_NAME.output.FIELD}` - Output from a previous step
- `${run.correlation_id}` - Unique run ID

## Example Manifest

```yaml
version: "1.0"
name: "Weekly Recap - LinkedIn"

project:
  id: "sirtrav-recap-001"
  objective: "social"

steps:
  - name: "curate_assets"
    agent: "director"
    input:
      projectId: "${project.id}"
      mode: "commons_public"

  - name: "draft_script"
    agent: "writer"
    input:
      projectId: "${project.id}"
      theme: "${steps.curate_assets.output.theme}"
      sceneCount: 5

  - name: "generate_video"
    agent: "editor"
    input:
      projectId: "${project.id}"
      narrationUrl: "${steps.synthesize_voice.output.audioUrl}"
      images: "${steps.curate_assets.output.scenes}"
```

## Agent Interfaces

### Director (`curate-media`)
- **Input:** `projectId`, `images[]`
- **Output:** `theme`, `mood`, `scenes[]`

### Writer (`narrate-project`)
- **Input:** `theme`, `mood`
- **Output:** `narrative` (text), `estimatedDuration`

### Composer (`generate-music`)
- **Input:** `mood`, `duration`
- **Output:** `musicUrl`, `beatGrid`

### Editor (`generate-video`)
- **Input:** `images`, `narrationUrl`, `musicUrl`
- **Output:** `videoUrl`, `duration`

### Publisher (`publish`)
- **Input:** `videoUrl`, `platform`, `caption`
- **Output:** `publicUrl`, `postId`
