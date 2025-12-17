# Developer Guide - SirTrav A2A Studio

**"For the Commons Good"**

Welcome to the SirTrav A2A (Agent-to-Agent) Studio. This guide covers setup, architecture, and workflows for developers contributing to the project.

## 🚀 Quick Start

### 1. Workspace Setup
We recommend setting up your workspace in `C:\WSP001` to match team conventions.

```bash
# 1. Navigate to workspace
cd C:\WSP001

# 2. Clone the repo
git clone https://github.com/WSP001/SirTrav-A2A-Studio.git

# 3. Enter the project
cd SirTrav-A2A-Studio

# 4. Install dependencies
npm install

# 5. Start development server
npm run dev
```

Access the studio at: `http://localhost:8888`

### For Existing Team Members
Sync the latest changes:
```bash
git pull origin main
npm install
npm run dev
```

---

## 📂 Project Structure

The architecture consists of two repositories:

1.  **`SirTrav-A2A-Studio` (Public)**: The engine, UI, and orchestration logic.
    *   `src/`: React frontend (Vite).
    *   `netlify/functions/`: Backend serverless functions (Agents).
    *   `pipelines/`: YAML manifests and execution scripts.
    *   `docs/`: Documentation and Agent Specs.

2.  **`Sir-TRAV-scott` (Private)**: The memory vault and raw media.
    *   *Note: This repo is private and stores the "Long-Term Memory" and raw assets.*

---

## 🤖 The 7-Agent Pipeline

Our D2A (Doc-to-Agent) workflow consists of 7 specialized agents. See `MASTER.md` for full specs.

| Agent | Role | Input | Output |
|-------|------|-------|--------|
| **1. Director** | Creative Vision | Memory Index | `curated_media.json` |
| **2. Writer** | Scriptwriting | Curated Media | `narrative.json` |
| **3. Voice** | Narration (ElevenLabs) | Script | `narration.wav` |
| **4. Composer** | Soundtrack (Suno) | Mood/Theme | `soundtrack.wav` |
| **5. Editor** | Assembly (FFmpeg) | Assets | `FINAL_RECAP.mp4` |
| **6. Attribution** | Credits & Commons Good | JSON Metadata | `credits.json` |
| **7. Publisher** | Distribution & Memory | Final Video | S3 Upload + Memory Update |

---

## 🔐 Environment Variables

Create a `.env` file in the root directory. **DO NOT COMMIT THIS FILE.**

```env
# AI Services
ELEVENLABS_API_KEY=sk_...
SUNO_API_KEY=...
GEMINI_API_KEY=...

# Storage & Infrastructure
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=sirtrav-artifacts

# Security
GITHUB_PAT=...  # Personal Access Token for Private Vault access
MCP_SECRET_TOKEN=...

# App Config
URL=http://localhost:8888
NODE_ENV=development
```

---

## 🐳 Docker Instructions

To build and run the studio in a containerized environment:

```bash
# Build the image
docker build -t sirtrav-studio .

# Run the container
docker run -p 8888:8888 --env-file .env sirtrav-studio
```

---

## 🧪 Testing

We use a mix of unit tests and AI evaluation.

**Run Evaluation Harness:**
```bash
# Requires Python environment
pip install -r evaluation/requirements.txt
python evaluation/evaluate.py
```

**Validate Manifest:**
```bash
npm run validate:manifest
```

---

## ✅ New Developer Checklist

- [ ] Cloned `SirTrav-A2A-Studio` into `C:\WSP001`.
- [ ] Installed Node.js dependencies (`npm install`).
- [ ] Created `.env` with valid API keys.
- [ ] Verified the app runs locally (`npm run dev`).
- [ ] Read `MASTER.md` to understand the current sprint focus.