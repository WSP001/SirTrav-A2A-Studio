import React from 'react';
import CreativeHub from './components/CreativeHub';
import PipelineProgress from './components/PipelineProgress';
import ResultsPreview from './components/ResultsPreview';
import './App.css';

/**
 * Main App Component
 * SirTrav Memory Channel - D2A Video Automation Pipeline UI
 */

function App() {
  const [view, setView] = React.useState('hub'); // hub | progress | results
  const [projectId, setProjectId] = React.useState('');
  const [runId, setRunId] = React.useState('');
  const [videoUrl, setVideoUrl] = React.useState('');

  const handlePipelineStart = (id, newRunId) => {
    setProjectId(id);
    setRunId(newRunId || '');
    setView('progress');
  };

  const handlePipelineComplete = () => {
    // Assuming the video is served from a public path or function
    // For local dev, we might need to adjust this if it's in /tmp
    setVideoUrl(`/.netlify/functions/get-video?projectId=${projectId}`);
    // OR if using public folder: `/${projectId}/FINAL.mp4`
    // Let's stick to the prop passing for now.
    setVideoUrl(`/${projectId}/FINAL.mp4`);
    setView('results');
  };

  return (
    <div className="app">
      <header className="app__header">
        <h1>SirTrav Memory Channel</h1>
        <p>Agent-to-Agent Studio pipeline controls for cinematic recaps.</p>
      </header>

      <main className="app__main">
        {view === 'hub' && (
          <CreativeHub onPipelineStart={handlePipelineStart} />
        )}

        {view === 'progress' && (
          <PipelineProgress
            projectId={projectId}
            onComplete={handlePipelineComplete}
          />
        )}

        {view === 'results' && (
          <ResultsPreview
            projectId={projectId}
            videoUrl={videoUrl}
            onReset={() => setView('hub')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
