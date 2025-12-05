import React, { useState, useCallback } from "react";
import { BookOpen, Database, Github, Code2, Upload, FileText, X, Play, Loader2, CheckCircle, DollarSign, Clock, BarChart3 } from "lucide-react";
import "./App.css";

// Version for deployment verification
const APP_VERSION = "v1.8.0";
const BUILD_DATE = "2025-12-04";

// 7-Agent Configuration
const AGENTS = [
  { id: 'director', name: 'Director Agent', icon: '🎬', description: 'Reads memory, curates shots, sets theme/mood.' },
  { id: 'writer', name: 'Writer Agent', icon: '✍️', description: 'Drafts reflective first-person narrative script.' },
  { id: 'voice', name: 'Voice Agent', icon: '🎙️', description: 'Synthesizes narration (ElevenLabs).' },
  { id: 'composer', name: 'Composer Agent', icon: '🎵', description: 'Generates soundtrack & beat grid (Suno).' },
  { id: 'editor', name: 'Editor Agent', icon: '🎞️', description: 'Assembles video, applies LUFS gates.' },
  { id: 'attribution', name: 'Attribution Agent', icon: '📜', description: 'Compiles credits for Commons Good.' },
  { id: 'publisher', name: 'Publisher Agent', icon: '🚀', description: 'Uploads artifacts, updates memory vault.' },
];

function App() {
  const [projectId, setProjectId] = useState(`week${new Date().getWeekNumber()}_recap`);
  const [files, setFiles] = useState([]);
  const [pipelineStatus, setPipelineStatus] = useState('idle'); // idle, running, completed, error
  const [agentStates, setAgentStates] = useState({});
  const [metrics, setMetrics] = useState({ cost: 0, time: 0 });
  const [logs, setLogs] = useState({});

  // File drop handler
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Simulate pipeline execution
  const runPipeline = async () => {
    if (files.length === 0) return;
    
    setPipelineStatus('running');
    setMetrics({ cost: 0, time: 0 });
    const startTime = Date.now();

    for (let i = 0; i < AGENTS.length; i++) {
      const agent = AGENTS[i];
      setAgentStates(prev => ({ ...prev, [agent.id]: 'processing' }));
      setLogs(prev => ({ ...prev, [agent.id]: [`> ${agent.name} task started...`] }));

      // Simulate agent work
      const agentTime = 1500 + Math.random() * 2000;
      await new Promise(r => setTimeout(r, agentTime));

      const agentCost = (Math.random() * 0.05).toFixed(3);
      setAgentStates(prev => ({ ...prev, [agent.id]: 'done' }));
      setLogs(prev => ({ 
        ...prev, 
        [agent.id]: [
          ...prev[agent.id], 
          `> ${agent.name} task completed in ${(agentTime/1000).toFixed(1)}s`
        ] 
      }));
      setMetrics(prev => ({ 
        cost: prev.cost + parseFloat(agentCost), 
        time: (Date.now() - startTime) / 1000 
      }));
    }

    setPipelineStatus('completed');
  };

  return (
    <div className="app min-h-screen">
      {/* Header */}
      <header className="header">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="logo-icon">
              <Code2 className="w-5 h-5" />
            </div>
            <span className="text-lg font-semibold text-white">SirTrav A2A Studio</span>
            <span className="version-badge">{APP_VERSION}</span>
          </div>
          
          <nav className="flex items-center gap-4">
            <a href="#" className="nav-link"><BookOpen className="w-4 h-4" /> Documentation</a>
            <a href="#" className="nav-link"><Database className="w-4 h-4" /> Vault Status</a>
            <a href="https://github.com/WSP001/SirTrav-A2A-Studio" target="_blank" rel="noopener noreferrer" className="nav-link">
              <Github className="w-4 h-4" />
            </a>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <h1 className="hero-title">
          <span className="text-brand-400">D2A</span> Video Automation
        </h1>
        <p className="hero-subtitle">
          Transform raw assets into cinematic stories using a 7-agent sequential pipeline. Built for the Commons Good.
        </p>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          
          {/* Left Panel: Input Source */}
          <div className="space-y-6">
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-title">
                  <Upload className="w-5 h-5" /> Input Source
                </h2>
                {files.length > 0 && (
                  <span className="status-badge status-secured">✓ ASSET SECURED</span>
                )}
              </div>

              {/* Project ID */}
              <div className="mb-4">
                <label className="text-xs text-gray-500 uppercase tracking-wide">Project ID / Job Ticket</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-gray-500">#</span>
                  <input 
                    type="text" 
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="input-field flex-1"
                  />
                </div>
              </div>

              {/* File Drop Zone */}
              <div 
                className="drop-zone"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                {files.length === 0 ? (
                  <div className="text-center py-8">
                    <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                    <p className="text-gray-400">Drag & drop assets here or click to upload</p>
                    <p className="text-xs text-gray-600 mt-1">Supports: .txt, .mp3, .mp4, .jpg</p>
                    <input type="file" multiple onChange={handleFileSelect} className="hidden" id="file-input" />
                    <label htmlFor="file-input" className="btn-secondary mt-4 inline-block cursor-pointer">
                      Browse Files
                    </label>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {files.map((file, idx) => (
                      <div key={idx} className="file-item">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-purple-400" />
                          <div>
                            <p className="text-sm text-white truncate max-w-[200px]">{file.name}</p>
                            <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB • Ready for Agents</p>
                          </div>
                        </div>
                        <button onClick={() => removeFile(idx)} className="text-gray-500 hover:text-red-400">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weekly Recap Template */}
              <button className="btn-template mt-4 w-full">
                <span>📅</span> Use Weekly Recap Template
              </button>
            </div>

            {/* Metrics Panel */}
            <div className="glass-card p-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="metric-card">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-xs text-gray-500">Est. Cost</p>
                    <p className="text-xl font-bold text-white">${metrics.cost.toFixed(2)}</p>
                    <p className="text-xs text-gray-600">Target: &lt; $1.00</p>
                  </div>
                </div>
                <div className="metric-card">
                  <Clock className="w-4 h-4 text-blue-400" />
                  <div>
                    <p className="text-xs text-gray-500">Total Time</p>
                    <p className="text-xl font-bold text-white">{metrics.time.toFixed(1)}s</p>
                    <p className="text-xs text-gray-600">P95: 180s</p>
                  </div>
                </div>
                <div className="metric-card">
                  <BarChart3 className="w-4 h-4 text-purple-400" />
                  <div>
                    <p className="text-xs text-gray-500">Cost Distrib</p>
                    <div className="flex gap-0.5 mt-1">
                      {[40, 60, 80, 50, 30, 20, 10].map((h, i) => (
                        <div key={i} className="w-2 bg-amber-500 rounded-sm" style={{height: `${h}%`, maxHeight: '24px'}} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: Agent Orchestration */}
          <div className="glass-card p-6">
            <h2 className="section-title mb-6">Agent Orchestration</h2>
            
            <div className="space-y-4">
              {AGENTS.map((agent) => {
                const state = agentStates[agent.id] || 'pending';
                const agentLogs = logs[agent.id] || [];
                
                return (
                  <div key={agent.id} className={`agent-card ${state}`}>
                    <div className="flex items-start gap-4">
                      <div className={`agent-icon ${state}`}>
                        <span className="text-xl">{agent.icon}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-white">{agent.name}</h3>
                          <div className="flex items-center gap-2">
                            {state === 'done' && <span className="text-green-400 text-xs">DONE</span>}
                            {state === 'processing' && <span className="text-amber-400 text-xs">PROCESSING</span>}
                            {state === 'done' && <span className="text-gray-500 text-xs">$0.0{Math.floor(Math.random()*9)}</span>}
                          </div>
                        </div>
                        <p className="text-sm text-gray-500">{agent.description}</p>
                        
                        {/* Progress bar for processing */}
                        {state === 'processing' && (
                          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse w-2/3" />
                          </div>
                        )}
                        {state === 'done' && (
                          <div className="mt-2 h-1 bg-green-500 rounded-full" />
                        )}
                        
                        {/* Logs */}
                        {agentLogs.length > 0 && (
                          <div className="mt-2 font-mono text-xs text-gray-500 space-y-0.5">
                            {agentLogs.map((log, i) => (
                              <p key={i}>{log}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Button */}
            <button 
              onClick={runPipeline}
              disabled={files.length === 0 || pipelineStatus === 'running'}
              className={`action-button mt-6 ${pipelineStatus === 'running' ? 'running' : ''}`}
            >
              {pipelineStatus === 'running' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Agents Working...</span>
                </>
              ) : pipelineStatus === 'completed' ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Pipeline Complete!</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5" />
                  <span>Click2Kick</span>
                </>
              )}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-600">
        Build: {BUILD_DATE} | {APP_VERSION} | For the Commons Good 🌍
      </footer>
    </div>
  );
}

// Helper to get week number
Date.prototype.getWeekNumber = function() {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
};

export default App;
