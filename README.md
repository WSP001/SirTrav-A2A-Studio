# SirTrav A2A Studio (V1.0)

The "For the Commons Good" Automated Video Engine.
**D2A (Doc-to-Agent) Orchestration.**

## 🚀 Quickstart (Local Studio)

1.  **Install:** `npm install`
2.  **Start Engine:** `npm run dev`
3.  **Open Studio:** `http://localhost:8888`

## 🎬 How to Produce a Video

1.  **Seed Vault:** Place raw media in `../Sir-TRAV-scott/content/intake/demo`.
2.  **Click2Kick:** Click the button in the Web UI.
3.  **Watch:** Agents (Director -> Writer -> Voice -> Music -> Editor) perform tasks.
4.  **Review:** Watch the final video in the Results Preview.
5.  **Vote:** Thumbs Up/Down to train the memory.

## 📂 Architecture

*   **Public Engine:** React UI + Netlify Functions (Orchestrator).
*   **Private Vault:** Stores raw media and long-term memory.
*   **Artifacts:** Generated videos are saved to `public/run-{timestamp}/`.
*   **The Envelope:** Every run generates `final_envelope.json` (Audit Trail).
