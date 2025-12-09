# 🚀 SirTrav A2A Studio - Setup Guide

**Version:** 1.7.0
**Last Updated:** 2025-12-09

This guide walks you through setting up your local development environment for SirTrav A2A Studio.

---

## 📋 Prerequisites

### Required Software
- **Node.js** >= 18.17 ([Download](https://nodejs.org/))
- **npm** >= 9.0 (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **Python** >= 3.9 (for evaluation harness) ([Download](https://www.python.org/))

### Required API Keys (Minimum)
- **ElevenLabs API Key** - For Voice Agent ([Get Key](https://elevenlabs.io/app/keys))
- **OpenAI API Key** - For Director Agent + Evaluation ([Get Key](https://platform.openai.com/api-keys))

### Optional API Keys
- **Suno API Key** - For real music generation (currently uses placeholder)
- **AWS Credentials** - For S3 video storage (can use mock mode for testing)

---

## 🛠️ Step-by-Step Setup

### Step 1: Clone the Repository

```bash
# Clone the public repository
git clone https://github.com/WSP001/SirTrav-A2A-Studio.git
cd SirTrav-A2A-Studio
```

### Step 2: Install Node Dependencies

```bash
# Install all required packages
npm ci

# This installs:
# - React, Vite (frontend)
# - TypeScript
# - js-yaml (D2A parser)
# - @octokit/rest (GitHub integration)
# - react-dropzone (file uploads)
```

**Expected Output:**
```
added 500 packages in 30s
```

### Step 3: Create Environment File

```bash
# Copy the example .env file
cp .env.example .env

# Edit .env with your favorite editor
# Windows: notepad .env
# Mac/Linux: nano .env
```

**Minimal `.env` configuration:**

```bash
# REQUIRED: ElevenLabs Voice Agent
ELEVENLABS_API_KEY=sk_your_elevenlabs_key_here

# REQUIRED: OpenAI for Vision + Evaluation
OPENAI_API_KEY=sk-your_openai_key_here

# TESTING MODE (use mock storage, no AWS needed)
STORAGE_BACKEND=mock
MOCK_MODE=true
NODE_ENV=development
```

### Step 4: Set Up Python Evaluation Environment

```bash
# Navigate to evaluation directory
cd evaluation

# Create virtual environment (recommended)
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt

# Return to project root
cd ..
```

**Expected Output:**
```
Successfully installed azure-ai-evaluation-1.0.0 openai-1.0.0 ...
```

### Step 5: Verify Installation

```bash
# Run preflight checks
npm run preflight

# This checks:
# - Node.js version
# - npm dependencies
# - Environment variables
# - Directory structure
```

**Expected Output:**
```
✅ Node.js version: v18.17.0
✅ npm dependencies: OK
✅ Environment file: .env found
✅ All checks passed!
```

### Step 6: Start Development Server

```bash
# Start Netlify Dev server (runs frontend + functions)
npm run dev
```

**Expected Output:**
```
◈ Netlify Dev ◈
◈ Server now ready on http://localhost:8888
```

### Step 7: Open in Browser

Navigate to: **http://localhost:8888**

You should see the SirTrav A2A Studio interface with:
- Animated gradient background
- Glass card effects
- "Creative Hub" title
- Agent status indicators
- Upload zone

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] Development server starts without errors
- [ ] Frontend loads at http://localhost:8888
- [ ] No console errors in browser (F12 → Console)
- [ ] `.env` file exists with API keys
- [ ] Python evaluation environment activated
- [ ] `evaluation/requirements.txt` installed

---

## 🔑 API Key Setup Details

### 1. ElevenLabs API Key

**Purpose:** Text-to-speech voice synthesis (Voice Agent)

**Steps:**
1. Go to https://elevenlabs.io/app/keys
2. Sign up for free account (or log in)
3. Click "Create API Key"
4. Copy the key (starts with `sk_`)
5. Paste into `.env` as `ELEVENLABS_API_KEY`

**Free Tier:**
- 10,000 characters/month
- Good for ~10-15 test videos

### 2. OpenAI API Key

**Purpose:** Vision-enabled Director Agent + Evaluation Harness

**Steps:**
1. Go to https://platform.openai.com/api-keys
2. Sign up for account (or log in)
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Paste into `.env` as `OPENAI_API_KEY`

**Cost Estimate:**
- gpt-4o-mini: ~$0.15 per 1M input tokens
- Typical video: ~$0.03-0.05

### 3. Suno API Key (Optional)

**Purpose:** Music generation (Composer Agent)

**Status:** Currently in placeholder mode (not required for testing)

**When Available:**
1. Go to https://suno.ai
2. Sign up for API access
3. Get API key
4. Set `ENABLE_REAL_SUNO=true` in `.env`

---

## 🧪 Testing Your Setup

### Test 1: Health Check

```bash
# Run health check
npm run health
```

**Expected:** All systems green ✅

### Test 2: Progress Function

```bash
# Test progress tracking
npm run practice:test
```

**Expected:** `progress loop stub ok`

### Test 3: Evaluation Harness

```bash
# Activate Python env
cd evaluation
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Run evaluation (requires OPENAI_API_KEY)
python evaluate.py

# Check results
cat evaluation_results.json
```

**Expected:** JSON output with relevance/coherence scores

---

## 🚨 Troubleshooting

### Issue: "Module not found: js-yaml"

**Solution:**
```bash
npm ci
# Reinstalls all dependencies
```

### Issue: "ELEVENLABS_API_KEY is not set"

**Solution:**
1. Check `.env` file exists in project root
2. Verify key is set: `ELEVENLABS_API_KEY=sk_...`
3. Restart dev server: `npm run dev`

### Issue: "Python not found"

**Solution:**
- Install Python 3.9+ from https://www.python.org/
- Ensure `python` command works in terminal

### Issue: "Cannot connect to Netlify Dev"

**Solution:**
```bash
# Kill any existing processes on port 8888
# Windows:
netstat -ano | findstr :8888
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:8888 | xargs kill
```

### Issue: "AWS credentials not found"

**Solution:**
Set `STORAGE_BACKEND=mock` in `.env` for testing (no AWS needed)

---

## 📁 Project Structure

```
SirTrav-A2A-Studio/
├── .env                          # Your API keys (DO NOT COMMIT!)
├── .env.example                  # Template for .env
├── package.json                  # Node dependencies
├── netlify.toml                  # Netlify configuration
├── vite.config.js                # Vite bundler config
│
├── src/                          # Frontend (React)
│   ├── App.tsx                   # Main app component
│   ├── components/
│   │   ├── CreativeHub.tsx       # Upload wizard
│   │   ├── ResultsPreview.tsx    # Video preview + feedback
│   │   ├── PipelineProgress.tsx  # Real-time agent progress
│   │   └── VideoGenerator.jsx    # API key manager
│   └── main.jsx                  # Entry point
│
├── netlify/functions/            # Backend (Serverless Functions)
│   ├── curate-media.ts           # Director Agent
│   ├── narrate-project.ts        # Writer Agent
│   ├── text-to-speech.ts         # Voice Agent
│   ├── generate-music.ts         # Composer Agent
│   ├── generate-attribution.ts   # Attribution Agent
│   ├── publish.ts                # Publisher Agent
│   ├── submit-evaluation.ts      # Feedback loop
│   ├── progress.ts               # SSE progress tracking
│   └── lib/
│       ├── d2a-parser.ts         # D2A document parser
│       ├── workflow-gen.ts       # Workflow generator
│       └── storage.ts            # Storage abstraction
│
├── docs/                         # Documentation
│   ├── templates/                # Platform templates
│   │   ├── REEL_TEMPLATE.md      # Instagram
│   │   ├── TIKTOK_TEMPLATE.md    # TikTok
│   │   ├── SHORTS_TEMPLATE.md    # YouTube
│   │   └── LINKEDIN_TEMPLATE.md  # LinkedIn
│   └── agents/                   # Agent specifications
│       ├── DIRECTOR_SPEC.md
│       ├── WRITER_SPEC.md
│       ├── VOICE_SPEC.md
│       └── ...
│
├── evaluation/                   # Evaluation harness
│   ├── evaluate.py               # Evaluation runner
│   ├── requirements.txt          # Python dependencies
│   └── venv/                     # Python virtual env
│
├── pipelines/                    # Workflow orchestration
│   ├── a2a_manifest.yml          # Workflow blueprint
│   └── run-manifest.mjs          # Manifest executor
│
├── MASTER.md                     # Project master plan
├── COMPLETED_TASKS.md            # Task completion log
├── TASK_STATUS.md                # RED/GREEN status
└── SETUP_GUIDE.md                # This file
```

---

## 🎯 Next Steps After Setup

### 1. Test the Feedback Loop
- Upload test images via Creative Hub
- Click "Kick Off Video Production"
- Wait for pipeline completion
- Click 👍 or 👎 on ResultsPreview modal
- Check `/tmp/memory_index.json` for updates

### 2. Run First Evaluation
```bash
cd evaluation
source venv/bin/activate
python evaluate.py
cat evaluation_results.json
```

### 3. Deploy to Netlify (Production)
```bash
# Link to Netlify account
netlify login
netlify init

# Deploy
netlify deploy --prod
```

### 4. Explore D2A Framework
```bash
# Parse a template
node -e "const {parseD2ADocument} = require('./netlify/functions/lib/d2a-parser'); ..."

# Generate a workflow
node -e "const {generateWorkflowFromTemplate} = require('./netlify/functions/lib/workflow-gen'); ..."
```

---

## 📚 Additional Resources

- **MASTER.md** - Complete project plan and architecture
- **COMPLETED_TASKS.md** - List of completed features
- **TASK_STATUS.md** - RED/GREEN task status
- **docs/agents/** - Individual agent specifications
- **docs/templates/** - Platform-specific templates

---

## 🆘 Getting Help

### Logs
```bash
# View function logs
netlify dev --debug

# View browser console
# Press F12 in browser → Console tab
```

### Common Commands
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preflight    # Run health checks
npm run health       # System health status
```

### Support
- **GitHub Issues:** https://github.com/WSP001/SirTrav-A2A-Studio/issues
- **Documentation:** See `docs/` directory
- **Email:** scott@worldseafoodproducers.com

---

## 🎉 Success!

If you've reached this point, you have a fully functional local development environment!

**You can now:**
- ✅ Upload photos via Creative Hub
- ✅ Generate videos with 7-agent pipeline
- ✅ Preview videos with playback controls
- ✅ Submit feedback (👍/👎) to train the AI
- ✅ Run evaluation metrics
- ✅ Parse D2A documents into workflows
- ✅ Generate platform-specific outputs

**For the Commons Good!** 🌟

---

**Last Updated:** 2025-12-09 by Claude Code (Sonnet 4.5)
