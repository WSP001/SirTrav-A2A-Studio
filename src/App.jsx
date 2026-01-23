import React, { useState, useCallback } from "react";
import { BookOpen, Database, Github, Code2, Upload, FileText, X, Play, Loader2, CheckCircle, DollarSign, Clock, BarChart3, Download, Share2, Lock, Globe, Youtube, Instagram, Twitter, ThumbsUp, ThumbsDown, Video, ExternalLink, LayoutGrid } from "lucide-react";
import "./App.css";
import ResultsPreview from './components/ResultsPreview';
import PipelineProgress from './components/PipelineProgress';

// Version for deployment verification
const APP_VERSION = "v2.0.0";
const BUILD_DATE = "2025-12-21";

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
  const [videoResult, setVideoResult] = useState(null);
  const [publishMode, setPublishMode] = useState('private'); // private, unlisted, public
  const [showShareModal, setShowShareModal] = useState(false);
  const [showResultsPreview, setShowResultsPreview] = useState(false);
  const [currentRunId, setCurrentRunId] = useState(null);

  // Click-to-Kick State
  const [targetPlatform, setTargetPlatform] = useState('tiktok'); // tiktok, instagram, youtube_shorts, linkedin, twitter
  const [musicMode, setMusicMode] = useState('manual'); // suno, manual
  const [manualMusicFile, setManualMusicFile] = useState(null); // File object if uploaded
  // 🎯 MG-002: U2A Preferences
  const [voiceStyle, setVoiceStyle] = useState('friendly'); // serious, friendly, hype
  const [videoLength, setVideoLength] = useState('short'); // short (15s), long (60s)

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

  // Helper: Convert file to base64
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });

  // REAL pipeline execution - calls backend agents
  const runPipeline = async () => {
    if (files.length === 0) return;

    setPipelineStatus('running');
    const newRunId = `run-${Date.now()}`;
    setCurrentRunId(newRunId);
    setMetrics({ cost: 0, time: 0 });
    const startTime = Date.now();

    // Reset agent states
    AGENTS.forEach(agent => {
      setAgentStates(prev => ({ ...prev, [agent.id]: 'pending' }));
      setLogs(prev => ({ ...prev, [agent.id]: [] }));
    });

    try {
      // Step 1: Upload files with actual base64 data
      setAgentStates(prev => ({ ...prev, director: 'processing' }));
      setLogs(prev => ({ ...prev, director: ['> Uploading assets to backend...'] }));

      for (const file of files) {
        const base64 = await fileToBase64(file);
        const uploadResponse = await fetch('/.netlify/functions/intake-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            filename: file.name,
            contentType: file.type,
            fileBase64: base64,
          }),
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed for ${file.name}`);
        }
        setLogs(prev => ({ ...prev, director: [...(prev.director || []), `> Uploaded: ${file.name}`] }));
      }

      // Step 2: Start the real pipeline
      setLogs(prev => ({ ...prev, director: [...(prev.director || []), '> Starting 7-agent pipeline...'] }));

      const startResponse = await fetch('/.netlify/functions/start-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer demo',
        },
        body: JSON.stringify({
          projectId,
          runId: newRunId,
          platform: targetPlatform,
          brief: {
            mood: 'reflective',
            pace: videoLength === 'short' ? 'fast' : 'medium',
            story: `Weekly recap for ${projectId}`,
            cta: 'Share your story',
            tone: (targetPlatform === 'linkedin' || targetPlatform === 'twitter') ? 'professional' : 'casual',
            // 🎯 MG-002: Pass U2A Preferences
            voiceStyle,
            videoLength
          },
          payload: {
            images: files.map(f => ({ id: f.name, url: `uploads/${projectId}/${f.name}` })),
            projectMode: (targetPlatform === 'linkedin' || targetPlatform === 'twitter') ? 'business_public' : 'commons_public',
            socialPlatform: targetPlatform,
            outputObjective: (targetPlatform === 'linkedin' || targetPlatform === 'twitter') ? 'social' : 'personal',
            musicMode,
            manualMusicFile: musicMode === 'manual' ? files.find(f => f.type.startsWith('audio/'))?.name : undefined,
            // 🎯 MG-002: Pass U2A Preferences in payload too for explicit agent handling
            voiceStyle,
            videoLength
          },
        }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Pipeline start failed');
      }

      // NO POLLING HERE - PipelineProgress component handles SSE
      console.log('Pipeline started, listening via SSE...');

    } catch (error) {
      console.error('Pipeline error:', error);
      setPipelineStatus('error');
      setLogs(prev => ({ ...prev, director: [...(prev.director || []), `> ERROR: ${error.message}`] }));
    }
  };

  const handlePipelineComplete = (data) => {
    setPipelineStatus('completed');

    // Validate videoUrl
    const videoUrl = data.artifacts?.videoUrl;
    const isRealVideo = videoUrl && !videoUrl.startsWith('placeholder://') && !videoUrl.startsWith('error://');

    setVideoResult({
      runId: currentRunId,
      videoUrl: isRealVideo ? videoUrl : '/test-assets/test-video.mp4',
      thumbnailUrl: `https://picsum.photos/seed/${projectId}/640/360`,
      duration: data.artifacts?.duration ? `${Math.floor(data.artifacts.duration / 60)}:${String(data.artifacts.duration % 60).padStart(2, '0')}` : '0:30',
      resolution: '1080p',
      fileSize: data.artifacts?.fileSize || '10.1 MB',
      creditsUrl: data.artifacts?.creditsUrl || '/test-assets/credits.json',
      generatedAt: new Date().toISOString(),
      pipelineMode: data.artifacts?.pipelineMode || 'DEMO',
      pipelineMode: data.artifacts?.pipelineMode || 'DEMO',
      isPlaceholder: !isRealVideo,
      invoice: data.artifacts?.invoice, // Extract Invoice for display
    });
  };

  const handlePipelineError = (err) => {
    setPipelineStatus('error');
    console.error('Pipeline failed:', err);
  };

  // Submit feedback to backend
  const handleFeedback = async (rating) => {
    if (!currentRunId) return;
    try {
      const response = await fetch('/.netlify/functions/submit-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          runId: currentRunId,
          rating,
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        alert(`Thanks for your feedback: ${rating === 'good' ? '👍' : '👎'}`);
      }
    } catch (error) {
      console.error('Feedback submission failed:', error);
    }
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
            <button
              onClick={() => setShowResultsPreview(true)}
              className="btn-secondary"
            >
              Test Results Preview
            </button>
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
              <button
                onClick={() => {
                  setFiles([
                    new File(["(dummy content)"], "journal_entry_day1.txt", { type: "text/plain" }),
                    new File(["(dummy content)"], "voice_memo_day1.mp3", { type: "audio/mpeg" }),
                    new File(["(dummy content)"], "photo_day1.jpg", { type: "image/jpeg" })
                  ]);
                  setProjectId(`week${new Date().getWeekNumber()}_recap_demo`);
                }}
                className="btn-template mt-4 w-full"
              >
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
                        <div key={i} className="w-2 bg-amber-500 rounded-sm" style={{ height: `${h}%`, maxHeight: '24px' }} />
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

            {pipelineStatus === 'running' || pipelineStatus === 'completed' ? (
              <PipelineProgress
                projectId={projectId}
                runId={currentRunId}
                onComplete={handlePipelineComplete}
                onError={handlePipelineError}
              />
            ) : (
              /* Fallback / Idle State */
              <div className="space-y-4">
                {AGENTS.map((agent) => (
                  <div key={agent.id} className="agent-card pending">
                    <div className="flex items-start gap-4">
                      <div className="agent-icon pending">
                        <span className="text-xl">{agent.icon}</span>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-white">{agent.name}</h3>
                        <p className="text-sm text-gray-500">{agent.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Click-to-Kick Dashboard (Launchpad) */}
            <div className={`mt-6 p-4 rounded-xl border border-gray-700 transition-all ${files.length > 0 ? 'bg-gray-800/80' : 'bg-gray-800/40 opacity-75'
              }`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-brand-400" />
                  Click-to-Kick Launchpad
                </h3>
                {files.length === 0 && (
                  <span className="text-xs text-amber-500 animate-pulse">Upload assets to unlock</span>
                )}
              </div>

              {/* Platform Grid */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { id: 'tiktok', label: 'TikTok', icon: '🎵', ratio: '9:16' },
                  { id: 'instagram', label: 'Reels', icon: '📸', ratio: '9:16' },
                  { id: 'youtube_shorts', label: 'Shorts', icon: '▶️', ratio: '9:16' },
                  { id: 'linkedin', label: 'LinkedIn', icon: '💼', ratio: '16:9' },
                  { id: 'twitter', label: 'X / Twitter', icon: '🐦', ratio: '16:9' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setTargetPlatform(p.id)}
                    disabled={files.length === 0 || pipelineStatus === 'running'}
                    className={`relative p-3 rounded-lg border text-left transition-all ${targetPlatform === p.id
                      ? 'bg-purple-900/60 border-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                      : 'bg-gray-900/50 border-gray-700 hover:bg-gray-800'
                      } ${files.length === 0 ? 'cursor-not-allowed grayscale opacity-50' : 'cursor-pointer'}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-lg">{p.icon}</span>
                      <span className="text-[10px] font-mono text-gray-400 bg-black/40 px-1 rounded">{p.ratio}</span>
                    </div>
                    <span className={`text-xs font-semibold block ${targetPlatform === p.id ? 'text-white' : 'text-gray-400'}`}>
                      {p.label}
                    </span>
                    {targetPlatform === p.id && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-purple-400 rounded-full animate-ping" />
                    )}
                  </button>
                ))}
              </div>

              {/* 🎯 MG-002: Creative Direction (U2A Preferences) */}
              <div className="mb-4 bg-black/20 p-3 rounded-lg border border-white/5 space-y-3">
                <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Creative Direction</label>

                <div className="grid grid-cols-2 gap-3">
                  {/* Voice Style */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Voice Style</label>
                    <select
                      value={voiceStyle}
                      onChange={(e) => setVoiceStyle(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded p-2 focus:ring-1 focus:ring-purple-500 outline-none"
                    >
                      <option value="serious">🧐 Serious</option>
                      <option value="friendly">😊 Friendly</option>
                      <option value="hype">⚡ Hype</option>
                    </select>
                  </div>

                  {/* Video Length */}
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400">Length</label>
                    <select
                      value={videoLength}
                      onChange={(e) => setVideoLength(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded p-2 focus:ring-1 focus:ring-purple-500 outline-none"
                    >
                      <option value="short">Short (15s)</option>
                      <option value="long">Long (60s)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Music Mode Toggle */}
              <div className="mb-4 bg-black/20 p-2 rounded-lg border border-white/5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Audio Engine</label>
                  <span className="text-[10px] text-gray-400">{musicMode === 'suno' ? 'AI Generated (Requires API)' : 'Local File Fallback'}</span>
                </div>
                <div className="flex bg-gray-900 rounded p-0.5">
                  <button
                    onClick={() => setMusicMode('suno')}
                    disabled={files.length === 0}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${musicMode === 'suno' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Suno AI
                  </button>
                  <button
                    onClick={() => setMusicMode('manual')}
                    disabled={files.length === 0}
                    className={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${musicMode === 'manual' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                  >
                    Manual Mode
                  </button>
                </div>
              </div>

              {/* Big Launch Button */}
              <button
                onClick={runPipeline}
                disabled={files.length === 0 || pipelineStatus === 'running'}
                className={`w-full py-3 rounded-lg font-bold text-white text-sm flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${pipelineStatus === 'running'
                  ? 'bg-gray-700 cursor-wait'
                  : files.length > 0
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 shadow-lg shadow-purple-900/40'
                    : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700'
                  }`}
              >
                {pipelineStatus === 'running' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    INITIALIZING AGENTS...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    LAUNCH {targetPlatform.replace('_', ' ').toUpperCase()} AGENT
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel - Shows after pipeline completion */}
        {pipelineStatus === 'completed' && videoResult && (
          <div className="mt-8 glass-card p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="section-title">
                <Video className="w-5 h-5" /> Final Output
              </h2>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 text-xs font-bold rounded ${videoResult.pipelineMode === 'FULL' ? 'bg-green-500/20 text-green-400' :
                  videoResult.pipelineMode === 'ENHANCED' ? 'bg-blue-500/20 text-blue-400' :
                    videoResult.pipelineMode === 'SIMPLE' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                  }`}>
                  {videoResult.pipelineMode} MODE
                </span>
                <span className="text-xs text-gray-500">Generated: {new Date(videoResult.generatedAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Placeholder Warning */}
            {videoResult.isPlaceholder && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <p className="text-sm text-amber-400">
                  <span className="font-bold">Demo Mode:</span> Showing test video. Configure API keys (ElevenLabs, Suno) for real video generation.
                </p>
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              {/* Video Preview - Real playable video */}
              <div className="space-y-4">
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden">
                  <video
                    src={videoResult.videoUrl}
                    controls
                    poster={videoResult.thumbnailUrl}
                    className="w-full h-full object-contain"
                    preload="metadata"
                  >
                    Your browser does not support video playback.
                  </video>
                </div>

                {/* Video Info */}
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-gray-500">Resolution</p>
                    <p className="text-sm font-medium text-white">{videoResult.resolution}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-gray-500">Duration</p>
                    <p className="text-sm font-medium text-white">{videoResult.duration}</p>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg">
                    <p className="text-xs text-gray-500">File Size</p>
                    <p className="text-sm font-medium text-white">{videoResult.fileSize}</p>
                  </div>
                </div>

                {/* INVOICE MANIFEST DISPLAY (Task 5) */}
                {videoResult.invoice && (
                  <div className="invoice-card">
                    <div className="invoice-header">
                      <h4 className="invoice-title">
                        <DollarSign className="w-4 h-4" /> Cost Plus Invoice
                      </h4>
                      <span className="invoice-id">{videoResult.invoice.jobId}</span>
                    </div>
                    <div className="invoice-grid">
                      <div className="invoice-cell invoice-cell-sub">
                        <p className="text-emerald-500/70">Subtotal</p>
                        <p className="text-emerald-200 font-mono">${videoResult.invoice.subtotal.toFixed(3)}</p>
                      </div>
                      <div className="invoice-cell invoice-cell-sub">
                        <p className="text-emerald-500/70">Markup (20%)</p>
                        <p className="text-emerald-200 font-mono">${videoResult.invoice.markupTotal.toFixed(3)}</p>
                      </div>
                      <div className="invoice-cell invoice-cell-total">
                        <p className="text-emerald-100 font-bold">TOTAL</p>
                        <p className="text-white font-bold font-mono">${videoResult.invoice.totalDue.toFixed(3)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                <div className="flex items-center justify-center gap-4 p-4 bg-white/5 rounded-xl">
                  <span className="text-sm text-gray-400">Rate this output:</span>
                  <button
                    onClick={() => handleFeedback('good')}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 rounded-lg text-green-400 transition-colors"
                  >
                    <ThumbsUp className="w-4 h-4" /> Good
                  </button>
                  <button
                    onClick={() => handleFeedback('bad')}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 transition-colors"
                  >
                    <ThumbsDown className="w-4 h-4" /> Bad
                  </button>
                </div>
              </div>

              {/* Publishing Options */}
              <div className="space-y-4">
                <h3 className="font-medium text-white">Publishing Options</h3>

                {/* Privacy Mode */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Visibility</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setPublishMode('private')}
                      className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${publishMode === 'private' ? 'bg-brand-500/20 border-brand-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                    >
                      <Lock className="w-4 h-4" />
                      <span className="text-xs">Private</span>
                    </button>
                    <button
                      onClick={() => setPublishMode('unlisted')}
                      className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${publishMode === 'unlisted' ? 'bg-brand-500/20 border-brand-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                    >
                      <Share2 className="w-4 h-4" />
                      <span className="text-xs">Unlisted</span>
                    </button>
                    <button
                      onClick={() => setPublishMode('public')}
                      className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${publishMode === 'public' ? 'bg-brand-500/20 border-brand-500' : 'bg-white/5 border-white/10 hover:border-white/20'}`}
                    >
                      <Globe className="w-4 h-4" />
                      <span className="text-xs">Public</span>
                    </button>
                  </div>
                </div>

                {/* Download Button */}
                <a
                  href={videoResult.videoUrl}
                  download={`${projectId}-video.mp4`}
                  className="w-full flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-brand-500 to-accent-purple rounded-xl text-white font-medium hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  Download Video ({videoResult.fileSize})
                </a>

                {/* Social Media Publishing */}
                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Publish to Social Media</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="social-btn youtube">
                      <Youtube className="w-5 h-5" />
                      <span>YouTube</span>
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </button>
                    <button className="social-btn tiktok">
                      <span className="text-lg">📱</span>
                      <span>TikTok</span>
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </button>
                    <button className="social-btn instagram">
                      <Instagram className="w-5 h-5" />
                      <span>Instagram</span>
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </button>
                    <button className="social-btn twitter">
                      <Twitter className="w-5 h-5" />
                      <span>X (Twitter)</span>
                      <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                    </button>
                  </div>
                </div>

                {/* Copy Link */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`https://sirtrav.studio/v/${projectId}`}
                    className="input-field flex-1 text-sm"
                  />
                  <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                    Copy
                  </button>
                </div>

                {/* Credits Attribution */}
                <div className="p-3 bg-teal-500/10 border border-teal-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-teal-400 text-sm">
                    <span>📜</span>
                    <span>Commons Good Attribution included</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">All media sources properly credited in video description</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-6 text-xs text-gray-600">
        Build: {BUILD_DATE} | {APP_VERSION} | For the Commons Good 🌍
      </footer>

      {/* Results Preview Modal */}
      {showResultsPreview && (
        <ResultsPreview
          result={{
            videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
            projectId: "test-project-123",
            runId: "ui-demo-run",
            metadata: {
              duration: 154,
              resolution: "1080p",
              platform: "TikTok",
              fileSize: 24500000
            },
            credits: {
              music: "Suno AI",
              voice: "ElevenLabs",
              platform: "SirTrav A2A Studio"
            }
          }}
          onClose={() => setShowResultsPreview(false)}
          onFeedback={async (projectId, rating, comments) => {
            try {
              const res = await fetch('/.netlify/functions/submit-evaluation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId,
                  runId: currentRunId || 'ui-demo',
                  rating,
                  feedback: comments,
                }),
              });
              if (!res.ok) {
                const detail = await res.text();
                throw new Error(`submit-evaluation failed (${res.status}): ${detail}`);
              }
            } catch (err) {
              console.error('Feedback submit failed', err);
              alert('Failed to submit feedback. Please try again.');
            }
          }}
        />
      )}
    </div>
  );
}

// Helper to get week number
Date.prototype.getWeekNumber = function () {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

export default App;
