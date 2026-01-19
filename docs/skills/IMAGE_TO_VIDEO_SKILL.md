# IMAGE_TO_VIDEO_SKILL.md
> Editor Agent - Compiles images + audio into final video

## Skill Identity
| Field | Value |
|-------|-------|
| **Name** | `EditorAgent` (ImageToVideo) |
| **Type** | `transformer` |
| **Pipeline Stage** | 5 |
| **Upstream** | VoiceAgent (audio), ComposerAgent (images) |
| **Downstream** | AttributionAgent |

---

## Contract

### Input Schema
```typescript
interface EditorInput {
  runId: string;
  projectId: string;
  audioUrl: string;           // From VoiceAgent
  images: Array<{             // From ComposerAgent
    url: string;
    caption?: string;
    duration?: number;        // Seconds per image
  }>;
  transitions?: 'fade' | 'cut' | 'dissolve';
  outputFormat?: 'mp4' | 'webm';
}
```

### Output Schema
```typescript
interface EditorOutput {
  ok: boolean;
  videoUrl: string;           // Final compiled video
  duration: number;           // Total video length in seconds
  resolution: string;         // e.g., "1920x1080"
  fileSize?: number;          // Bytes
  cost: number;               // Processing cost for manifest
}
```

### Artifacts Produced
| Artifact | Location | Format |
|----------|----------|--------|
| `video.mp4` | `output/weekly_video.mp4` | MP4 H.264 |
| `thumbnail.png` | `output/thumbnail.png` | PNG |
| `video_manifest.json` | `artifacts/video_manifest.json` | JSON |

---

## Implementation

### Entry Point
```
netlify/functions/lib/compile-video.ts
```

### Core Function
```typescript
export async function compileVideo(input: EditorInput): Promise<EditorOutput>
```

### External Dependencies
| Service | Env Var | Purpose |
|---------|---------|---------|
| FFmpeg | (binary) | Video encoding |
| Cloudinary | `CLOUDINARY_URL` | (optional) Cloud processing |

### Processing Steps
1. **Download Assets** - Fetch audio file and all images
2. **Image Preparation** - Resize/normalize images to target resolution
3. **Timeline Assembly** - Calculate duration per image based on audio length
4. **Video Encoding** - FFmpeg concat with audio track
5. **Thumbnail Extraction** - Frame grab at 10% mark
6. **Upload to Blob Store** - Store final video

### Error Codes
| Code | Meaning | Recovery |
|------|---------|----------|
| `EDITOR_001` | Audio download failed | Retry 3x with backoff |
| `EDITOR_002` | Image download failed | Skip image, log warning |
| `EDITOR_003` | FFmpeg encoding error | Fail, report to user |
| `EDITOR_004` | No images provided | Use placeholder frame |

---

## Quality Gate Checks
- [ ] Video file exists and > 0 bytes
- [ ] Duration matches expected length (±5%)
- [ ] Audio track present
- [ ] Minimum 720p resolution
- [ ] No FFmpeg error codes in output
- [ ] Cost recorded in manifest

---

## Example Invocation
```typescript
import { compileVideo } from './lib/compile-video';

const result = await compileVideo({
  runId: 'run_abc123',
  projectId: 'proj_xyz',
  audioUrl: 'https://blobs.netlify.app/audio/narration.mp3',
  images: [
    { url: 'https://example.com/img1.jpg', duration: 5 },
    { url: 'https://example.com/img2.jpg', duration: 5 },
    { url: 'https://example.com/img3.jpg', duration: 5 },
  ],
  transitions: 'fade',
  outputFormat: 'mp4'
});

// result.videoUrl -> signed URL to final video
```

---

## Integration Points

### Upstream: Parallel Engine
```typescript
// In run-pipeline-background.ts
const [voiceResult, composerResult] = await Promise.all([
  voiceAgent({ script, runId, projectId }),
  composerAgent({ script, runId, projectId })
]);

// Then feed to Editor
const editorResult = await compileVideo({
  runId,
  projectId,
  audioUrl: voiceResult.audioUrl,
  images: composerResult.images,
});
```

### Downstream: Attribution
```typescript
// Editor passes videoUrl to Attribution for credits overlay
const finalVideo = await attributionAgent({
  videoUrl: editorResult.videoUrl,
  credits: manifestGenerator.generate(runId)
});
```

---

## Performance Considerations
- **Memory**: Image processing requires ~500MB per 1080p image
- **CPU**: FFmpeg encoding is CPU-bound, consider serverless timeout
- **Network**: Large video files; use streaming upload to blob store
- **Timeout**: Allow 120s+ for full encoding pipeline

---

## Notes
- Currently uses placeholder URLs in dev mode (`placeholder://video.mp4`)
- Production will integrate with Cloudinary or direct FFmpeg
- Consider chunked encoding for videos > 5 minutes
- Thumbnail should capture most interesting frame, not just first
