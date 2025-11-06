import React from 'react';
import VideoGenerator from './components/VideoGenerator';
import './App.css';

/**
 * Main App Component
 * SirTrav Memory Channel - D2A Video Automation Pipeline UI
 */

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>SirTrav Memory Channel</h1>
        <p>Agent-to-Agent Studio pipeline controls for cinematic recaps.</p>
      </header>

      <main className="app__main">
        <VideoGenerator />
      </main>
    </div>
  );
}

export default App;
