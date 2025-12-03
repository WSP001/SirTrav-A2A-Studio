# SirTrav A2A Studio Wiki

> **Technical Reference Guide for Developers**

This wiki provides detailed technical documentation for understanding, extending, and troubleshooting the SirTrav A2A Studio.

---

## 📚 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Agent Deep Dives](#agent-deep-dives)
3. [Data Flow](#data-flow)
4. [API Reference](#api-reference)
5. [Configuration](#configuration)
6. [Troubleshooting](#troubleshooting)
7. [Glossary](#glossary)

---

## 🏗️ Architecture Overview

### System Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    UI LAYER (React + Vite)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ CreativeHub │  │ Dashboard   │  │ ResultsPreview      │  │
│  │ (Upload)    │  │ (Stats)     │  │ (Video Player)      │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│                          │                                   │
│                   Click2KickButton                           │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              ORCHESTRATION LAYER (Manifest Runner)          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  a2a_manifest.yml  →  run-manifest.mjs              │    │
│  │  (Defines steps)      (Executes pipeline)           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                 AGENT LAYER (Netlify Functions)             │
│  ┌───────┐ ┌───────┐ ┌───────┐ ┌────────┐ ┌───────┐        │
│  │Director│→│Writer │→│Voice  │→│Composer│→│Editor │        │
│  └───────┘ └───────┘ └───────┘ └────────┘ └───────┘        │
│       │                                         │           │
│       ▼                                         ▼           │
│  ┌────────────┐                         ┌────────────┐      │
│  │Attribution │                         │ Publisher  │      │
│  └────────────┘                         └────────────┘      │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   STORAGE LAYER                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ MockStorage │  │ S3Storage   │  │ NetlifyLMStorage    │  │
│  │ (Testing)   │  │ (AWS)       │  │ (Large Media)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React 18 + Vite 5 | Fast SPA with HMR |
| Styling | Tailwind CSS | Utility-first CSS |
| Backend | Netlify Functions | Serverless agents |
| Runtime | Node.js 18 | JavaScript execution |
| Video | FFmpeg | Video compilation |
| Tracing | OpenTelemetry | Observability |
| Evaluation | Azure AI Evaluation | Quality metrics |

---

## 🤖 Agent Deep Dives

### Agent 1: Director (curate-media.ts)

**Purpose:** Curates media from the vault and sets creative direction.

**Input:**
```json
{
  "projectId": "week44",
  "vaultPath": "/path/to/vault",
  "maxScenes": 12
}
```

**Output:**
```json
{
  "ok": true,
  "curated_media": [
    { "file": "sunset.jpg", "type": "image", "order": 1, "caption": "Golden hour" }
  ],
  "theme": "reflection",
  "mood": "contemplative"
}
```

**Key Features:**
- EGO-Prompt learning from `memory_index.json`
- Learns from past successful projects
- Placeholder mode for testing without vault

---

### Agent 2: Writer (narrate-project.ts)

**Purpose:** Generates first-person narrative script.

**Input:**
```json
{
  "projectId": "week44",
  "curated_media": [...],
  "theme": "reflection",
  "mood": "contemplative"
}
```

**Output:**
```json
{
  "ok": true,
  "narrative": "As I look back on this week...",
  "word_count": 450
}
```

**Key Features:**
- GPT-4 powered with fallback templates
- Reflective first-person voice
- Token budget awareness

---

### Agent 3: Voice (text-to-speech.ts)

**Purpose:** Synthesizes narration audio.

**Input:**
```json
{
  "projectId": "week44",
  "text": "As I look back...",
  "voice_id": "Rachel"
}
```

**Output:**
```json
{
  "ok": true,
  "audio_url": "/tmp/week44/narration.wav",
  "duration": 154
}
```

**Key Features:**
- ElevenLabs integration
- Multiple voice options
- Placeholder mode returns estimated duration

---

### Agent 4: Composer (generate-music.ts)

**Purpose:** Generates soundtrack with beat grid.

**Input:**
```json
{
  "projectId": "week44",
  "mood": "contemplative",
  "tempo": 72,
  "genre": "ambient"
}
```

**Output:**
```json
{
  "ok": true,
  "music_url": "/tmp/week44/soundtrack.mp3",
  "beat_grid": { "bpm": 72, "beats": [...] },
  "duration": 180
}
```

**Key Features:**
- Suno AI integration
- Beat grid for video sync
- Mood-to-tempo mapping

---

### Agent 5: Editor (ffmpeg_compile.mjs)

**Purpose:** Assembles final video with quality gates.

**Input (via ENV):**
```json
{
  "projectId": "week44",
  "curated_file": "/tmp/week44/curated.json",
  "narration_file": "/tmp/week44/narration.wav",
  "music_file": "/tmp/week44/music.json",
  "out_mp4": "/tmp/week44/FINAL_RECAP.mp4"
}
```

**Output:**
```json
{
  "success": true,
  "videoPath": "/tmp/week44/FINAL_RECAP.mp4",
  "duration": 180,
  "lufs": -14.2,
  "qualityGatePassed": true
}
```

**Quality Gates:**
- LUFS range: -18 to -12 dB (broadcast standard)
- Resolution: minimum 720p
- Frame rate: 30fps

---

### Agent 6: Attribution (generate-attribution.ts)

**Purpose:** Compiles credits for all AI services.

**Input:**
```json
{
  "projectId": "week44",
  "curated_file": "...",
  "music_file": "...",
  "voice_file": "...",
  "video_file": "..."
}
```

**Output:**
```json
{
  "ok": true,
  "credits_file": "/tmp/week44/credits.json",
  "credits_markdown": "# Credits\n..."
}
```

---

### Agent 7: Publisher (publish.ts)

**Purpose:** Uploads artifacts to storage.

**Input:**
```json
{
  "projectId": "week44",
  "artifacts": [...],
  "lufs_ok": true,
  "metadata": {}
}
```

**Output:**
```json
{
  "ok": true,
  "published": [
    { "type": "video", "url": "https://..." }
  ]
}
```

---

## 🔄 Data Flow

### Pipeline Sequence

```
1. User clicks "Click2Kick"
         │
         ▼
2. intake-upload.ts receives request
         │
         ▼
3. run-manifest.mjs loads a2a_manifest.yml
         │
         ▼
4. For each step in manifest:
   ┌─────────────────────────────────────┐
   │  Director → curated.json           │
   │  Writer   → narrative.json         │
   │  Voice    → narration.wav          │
   │  Composer → music.json + beat_grid │
   │  Editor   → FINAL_RECAP.mp4        │
   │  Attribution → credits.json        │
   │  Publisher → public URLs           │
   └─────────────────────────────────────┘
         │
         ▼
5. progress.ts streams updates via SSE
         │
         ▼
6. ResultsPreview shows final video
```

### File Artifacts

```
tmp/{projectId}/
├── curated.json        # Director output
├── narrative.json      # Writer output
├── narration.wav       # Voice output
├── music.json          # Composer metadata
├── soundtrack.mp3      # Composer audio
├── FINAL_RECAP.mp4     # Editor output
├── credits.json        # Attribution output
└── credits.md          # Human-readable credits
```

---

## 📡 API Reference

### Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/.netlify/functions/intake-upload` | POST | Start pipeline |
| `/.netlify/functions/curate-media` | POST | Director agent |
| `/.netlify/functions/narrate-project` | POST | Writer agent |
| `/.netlify/functions/text-to-speech` | POST | Voice agent |
| `/.netlify/functions/generate-music` | POST | Composer agent |
| `/.netlify/functions/generate-attribution` | POST | Attribution agent |
| `/.netlify/functions/publish` | POST | Publisher agent |
| `/.netlify/functions/progress` | GET/POST | Progress tracking |

### Common Response Format

```json
{
  "ok": true,
  "data": { ... },
  "error": null
}
```

### Error Response

```json
{
  "ok": false,
  "data": null,
  "error": "error_code",
  "message": "Human readable message"
}
```

---

## ⚙️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | GPT-4 for Writer |
| `ELEVENLABS_API_KEY` | No | Placeholder mode | Voice synthesis |
| `SUNO_API_KEY` | No | Placeholder mode | Music generation |
| `VAULT_PATH` | No | ./content/intake | Media source |
| `STORAGE_MODE` | No | mock | mock/s3/netlify |
| `AWS_REGION` | No | us-east-1 | For S3 storage |
| `AWS_S3_BUCKET` | No | - | S3 bucket name |

### Manifest Configuration (a2a_manifest.yml)

```yaml
version: "1.3.0"
project:
  id: "week44"
  source_root: "content/intake"
  out_dir: "public/week44"

steps:
  - name: "curate_media"
    agent: "director"
    # ... agent config
```

---

## 🔧 Troubleshooting

### Common Issues

#### "Agent returned ok: false"
- Check API keys in `.env`
- Verify network connectivity
- Check Netlify function logs

#### "LUFS quality gate failed"
- Audio levels outside -18 to -12 dB range
- Check source audio levels
- Editor will attempt to normalize

#### "Placeholder mode active"
- Missing API key for that service
- Intentional for testing (saves API costs)
- Set real API key for production

#### "File not found" errors
- Check `VAULT_PATH` environment variable
- Verify file permissions
- Ensure media files exist in intake folder

### Debug Mode

Set `DEBUG=true` in environment for verbose logging:

```bash
DEBUG=true npm run dev
```

### Health Check

Run the doctor script:

```powershell
pwsh -File scripts/doctor.ps1
```

---

## 📖 Glossary

| Term | Definition |
|------|------------|
| **A2A** | Agent-to-Agent - orchestration of multiple AI agents |
| **D2A** | Doc-to-Agent - manifest-driven automation |
| **EGO-Prompt** | Learning from past successful outputs |
| **LUFS** | Loudness Units Full Scale - audio loudness standard |
| **Memory Vault** | Private storage of source media |
| **Commons Good** | Philosophy of transparent AI attribution |
| **Click2Kick** | One-button pipeline trigger |
| **Beat Grid** | Timing markers for video-music sync |

---

## 🔗 Related Documentation

- [README.md](README.md) - Quick start guide
- [MASTER.md](MASTER.md) - Build plan and roadmap
- [COMMONS_GOOD.md](COMMONS_GOOD.md) - Philosophy and attribution
- [docs/EVALUATION.md](docs/EVALUATION.md) - Quality evaluation
- [docs/TRACING.md](docs/TRACING.md) - OpenTelemetry setup
- [walkthrough.md](walkthrough.md) - End-to-end tutorial

---

*Last updated: December 3, 2025*
