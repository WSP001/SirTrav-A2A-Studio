# SirTrav-A2A-Studio

**Public “Commons-Good” Engine** for the **SirTrav A2A Studio**.

This repository contains the open-source automation layer that transforms creative media and narrative input into cinematic short-form videos.  
It demonstrates how **D2A (Doc-to-Agent)** manifests drive fully automated production pipelines for the *Memory-as-Media* concept.

---

## 🌍 Purpose

The **SirTrav-A2A-Studio** provides the reusable *engine* that connects data, design, and delivery across multiple creative agents.

Its goals:
- Automate cinematic storytelling from curated memories or uploaded raw media.
- Provide an **A2A (Agent-to-Agent)** orchestration model showing how Directors, Writers, and Editors cooperate autonomously.
- Empower developers, educators, and creators to repurpose this architecture for ethical, transparent, human-centered AI media work.
- Serve as the public mirror of the private **Sir-TRAV-scott Memory Vault**, excluding any confidential assets.

---

## 🧱 Architecture Overview

| Layer | Description | Example Components |
|:--|:--|:--|
| **UI “Skin”** | Front-end React components using Framer Motion for interaction | `/src/components/`, `Click2KickOffButton.tsx` |
| **Pipeline “Skeleton”** | Netlify Functions + CI/CD orchestrating multi-agent tasks | `/netlify/functions/`, `.github/workflows/` |
| **Memory Bridge** | Sanitized export link to the private vault | `.github/workflows/sanitized-export.yml` |
| **Learning Feedback** | Collects evals, LUFS metrics, token budgets | `/pipelines/`, `/data/` |

---

## 🧩 Workflow Summary

1. **Input:** new media or weekly manifest.  
2. **Director Agent:** curates key shots, sets theme & mood.  
3. **Writer Agent:** drafts reflective first-person script.  
4. **Voice Agent:** synthesizes narration.  
5. **Composer Agent:** generates soundtrack and beat grid.  
6. **Editor Agent:** assembles final video and applies LUFS/clipping gates.  
7. **Publisher Agent:** posts to private link or YouTube draft.

All steps report to `/progress` so production can be observed in real time.

---

## 🧪 Quick Start

```bash
# install dependencies
npm install

# run local Netlify functions + UI
npm run dev

# build production bundle
npm run build

# simulate a D2A manifest run
npm run run:manifest