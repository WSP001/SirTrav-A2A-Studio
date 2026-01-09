# SirTrav A2A Studio - Deployment Guide
## Netlify Production Setup

### 1. Environment Variables (Required for 7-Agent Pipeline)

The following keys must be set in the Netlify UI (Site settings > Environment variables).

#### 🤖 AI Core
| Key | Description | Status |
|-----|-------------|--------|
| `GEMINI_API_KEY` | Google Gemini 1.5 Pro (Script Analysis) | ✅ Confirmed |
| `OPENAI_API_KEY` | OpenAI GPT-4o + Vision (Director Agent) | ✅ Confirmed |
| `ELEVENLABS_API_KEY` | Voice Synthesis (Voice Agent) | ✅ Confirmed |
| `ELEVENLABS_DEFAULT_VOICE_ID` | Default Voice (e.g., 'Rachel') | ✅ Confirmed |
| `SUNO_API_KEY` | Music Generation (Composer Agent) | ❌ **MISSING** (Use Manual Mode until available) |

#### 📱 Social Platforms (Click-to-Kick)
| Key | Platform | Status |
|-----|----------|--------|
| `TIKTOK_CLIENT_KEY` | TikTok | ❌ MISSING |
| `TIKTOK_CLIENT_SECRET` | TikTok | ❌ MISSING |
| `TIKTOK_ACCESS_TOKEN` | TikTok | ❌ MISSING |
| `TIKTOK_REFRESH_TOKEN` | TikTok | ❌ MISSING |
| `INSTAGRAM_ACCESS_TOKEN` | Instagram Reels | ❌ MISSING |
| `INSTAGRAM_BUSINESS_ID` | Instagram Reels | ❌ MISSING |
| `YOUTUBE_CLIENT_ID` | YouTube Shorts | ✅ Confirmed |
| `YOUTUBE_CLIENT_SECRET` | YouTube Shorts | ✅ Confirmed |
| `YOUTUBE_REFRESH_TOKEN` | YouTube Shorts | ✅ Confirmed |
| `LINKEDIN_ACCESS_TOKEN` | LinkedIn (Business) | ❌ MISSING (New Agent) |
| `LINKEDIN_ORG_ID` | LinkedIn (Business) | ❌ MISSING (New Agent) |
| `TWITTER_API_KEY` | X / Twitter | ❌ MISSING (New Agent) |
| `TWITTER_API_SECRET` | X / Twitter | ❌ MISSING (New Agent) |
| `TWITTER_ACCESS_TOKEN` | X / Twitter | ❌ MISSING (New Agent) |

#### 🏗️ Infrastructure
| Key | Description | Status |
|-----|-------------|--------|
| `BS_API_KEY` | Build System / internal | ✅ Confirmed |
| `STORAGE_BACKEND` | `netlify-blobs` | ✅ Confirmed |
| `VAULT_PATH` | File storage path | ✅ Confirmed |

### 2. Manual Music Mode (Suno Fallback)

If `SUNO_API_KEY` is not available, the system now supports **Manual Mode**.

**How to use:**
1.  In the Studio UI (Click-to-Kick Launchpad), select **"Manual Mode"** under Audio Engine.
2.  Upload your music file (`.mp3` or `.wav`) to the input zone along with your images.
3.  The system will skip the Suno API call and use your uploaded audio file for the video soundtrack.

### 3. Click-to-Kick Testing ("One-by-One")

The new UI allows you to test specific platform agents individually to verify credentials.

**Procedure:**
1.  Upload a few test images.
2.  Select a target platform (e.g., **LinkedIn**) from the grid.
3.  Click **"LAUNCH LINKEDIN AGENT"**.
4.  The pipeline will configure the output format (16:9 for LinkedIn, 9:16 for TikTok) and target objective automatically.
5.  Check the "Test Results Preview" to verify the output aspect ratio and content.

### 4. Deploying Updates

To deploy the current "Production Ready" build:

1.  Commit all changes:
    ```bash
    git add .
    git commit -m "feat: Add Click-to-Kick UI and Social Agents"
    ```
2.  Push to main:
    ```bash
    git push origin main
    ```
3.  Netlify will auto-build. Monitor build logs in Netlify Dashboard.
