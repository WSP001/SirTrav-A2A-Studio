import CreativeHub from './components/CreativeHub';
import PronunciationPreview from './components/PronunciationPreview';
import PipelineProgress from './components/PipelineProgress';
import './App.css';

const App = () => {
  return (
    <div className="app-shell">
      <header>
        <span className="badge">Phase 8</span>
        <h1>SirTrav A2A Studio</h1>
        <p>
          Direct the creative agents, then launch the beat-aligned recap pipeline. Start with the
          Creative Hub to storyboard, script, and brief the music team before you hand work to the
          automation crew.
        </p>
      </header>
      <div className="status-banner">
        <span>📘 Ready to validate a new skill?</span>
        <a href="/docs/READY_TO_TEST.md" target="_blank" rel="noreferrer">
          See READY_TO_TEST.md
        </a>
        <span>·</span>
        <a href="/docs/DEPLOYMENT_READINESS.md" target="_blank" rel="noreferrer">
          Deployment readiness steps
        </a>
      </div>

      <main className="app-layout">
        <CreativeHub />
        <aside className="support-stack">
          <PipelineProgress />
          <PronunciationPreview />
        </aside>
      </main>

      <footer className="section-footer">
        <span>Creative Hub orchestrates AI direction · Pipeline monitor streams live progress.</span>
        <a
          href="https://github.com/WSP001/SirTrav-A2A-Studio/blob/main/docs/PHASE7_QUICKSTART.md"
          target="_blank"
          rel="noreferrer"
        >
          Read the quickstart
        </a>
      </footer>
    </div>
  );
};

export default App;
