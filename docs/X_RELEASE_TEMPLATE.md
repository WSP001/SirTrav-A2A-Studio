---
title: "X Agent Release Thread Template"
description: "Standard operating procedure for release announcements and signal ops."
agent: "X Agent"
version: "1.0.0"
---

# 📣 X Release Thread Template

**Objective:** Standardize how we announce new releases and generated artifacts on X (formerly Twitter).
**Principle:** "Signal, not Noise." Be authentic, precise, and attribution-heavy.
**Constraint:** NO FAKE SUCCESS. If a feature is disabled/mocked, explicitly state it or omit the claim. Do not pretend to have posted if the API returned `disabled: true`.

---

## 🧵 The Thread Structure

### 1. The Hook (Main Tweet)
*Must include the generated video artifact or a high-quality GIF.*

> 🚀 **[Project Name/Title]**
>
> Just shipped a new [Motion Graphic/Video/Release] generated completely by the automated pipeline.
>
> ⏱️ Render Time: {{RENDER_TIME}}s
> 🤖 Agents: Director, Writer, Voice, Composer, Editor
>
> [Link to Artifact/Repo]
>
> #BuiltWithRemotion #Agents #Automation

### 2. The "How it Works" (Transparency)
*Explain the mechanics. Don't magic-wash it.*

> 🏗️ **Under the Hood:**
>
> This wasn't manually edited.
> 1. **Director** agent derived the tailored script.
> 2. **Voice** agent synthesized the audio ({{VOICE_MODEL}}).
> 3. **Composer** agent generated the score.
> 4. **Editor** agent compiled the assets using Remotion Lambda.
>
> 100% Code-driven video.

### 3. Attribution (Credit where due)
*Tag the tools and libraries used.*

> 🔋 **Powered By:**
>
> *   @Netlify (Functions & Blobs)
> *   @Remotion (Video Rendering)
> *   @OpenAI / @AnthropicAI / @GoogleDeepMind (Intelligence layers)
> *   [Other APIs if used]

### 4. Integrity Check (No Fake Success)
*If specific integrations were disabled/mocked during this run, note it here.*

> ⚠️ **Integrity Note:**
> *   X Publishing: {{X_STATUS}} (e.g., "Mocked/Disabled - Validation Only")
> *   Voice: {{VOICE_STATUS}} (e.g., "Use-it-or-lose-it" / "Polly")

### 5. Call to Action (The "Why")
*Link to the source or the next step.*

> 🛠️ **Build Your Own:**
> The entire pipeline is open source / documented.
> Check out the repo to see how we orchestrate the Agents:
>
> 🔗 [GitHub Repository URL]

---

## 📝 Release Log Format

When logging a release in `releases.json` or `memory-index.json`, use this schema:

```json
{
  "releaseId": "{{TIMESTAMP}}-{{RUN_ID}}",
  "artifactUrl": "https://...",
  "socialCheck": {
    "x": {
      "attempted": true,
      "status": "disabled | published | failed",
      "threadId": "123456789..."
    }
  },
  "attribution": [
    "Director",
    "Writer",
    "Voice",
    "Composer",
    "Editor"
  ]
}
```
