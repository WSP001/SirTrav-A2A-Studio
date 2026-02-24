import React, { useState, useCallback, useEffect } from "react";
import { BookOpen, Database, Github, Code2, Upload, FileText, X, Play, Loader2, CheckCircle, DollarSign, Clock, BarChart3, Download, Share2, Lock, Globe, Youtube, Instagram, Twitter, ThumbsUp, ThumbsDown, Video, ExternalLink, LayoutGrid, Zap, Shield, Award } from "lucide-react";
import "./App.css";
import ResultsPreview from './components/ResultsPreview';
import PipelineProgress from './components/PipelineProgress';
import PersonaVault from './components/PersonaVault';

// Version for deployment verification
const APP_VERSION = "v2.1.0";
const BUILD_DATE = "2026-02-13";

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
  const [view, setView] = useState('studio'); // 'studio' or 'vault'

  // Click-to-Kick State
  const [targetPlatform, setTargetPlatform] = useState('tiktok'); // tiktok, instagram, youtube_shorts, linkedin, twitter
  const [musicMode, setMusicMode] = useState('manual'); // suno, manual
  const [manualMusicFile, setManualMusicFile] = useState(null); // File object if uploaded
  // 🎯 MG-002: U2A Preferences
  const [voiceStyle, setVoiceStyle] = useState('friendly'); // serious, friendly, hype
  const [videoLength, setVideoLength] = useState('short'); // short (15s), long (60s)
  const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }
  const [systemHealth, setSystemHealth] = useState(null); // live health status
  const [heroVisible, setHeroVisible] = useState(false);

  // Fetch live system health on mount
  useEffect(() => {
    setHeroVisible(true);
    fetch('/.netlify/functions/healthcheck')
      .then(r => r.json())
      .then(data => setSystemHealth(data))
      .catch(() => setSystemHealth({ status: 'offline' }));
  }, []);

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
            voiceStyle,
            videoLength
          },
        }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Pipeline start failed');
      }

      console.log('Pipeline started, listening via SSE...');

    } catch (error) {
      console.error('Pipeline error:', error);
      setPipelineStatus('error');
      setLogs(prev => ({ ...prev, director: [...(prev.director || []), `> ERROR: ${error.message}`] }));
    }
  };

  const handlePipelineComplete = (data) => {
    setPipelineStatus('completed');

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
      isPlaceholder: !isRealVideo,
      invoice: data.artifacts?.invoice,
    });
  };

  const handlePipelineError = (err) => {
    setPipelineStatus('error');
    console.error('Pipeline failed:', err);
  };

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
        setToast({ message: `Feedback Received: ${rating === 'good' ? '👍' : '👎'}`, type: 'success' });
        setTimeout(() => setToast(null), 3000);
      } else {
        throw new Error('Submission failed');
      }
    } catch (error) {
      console.error('Feedback submission failed:', error);
      setToast({ message: 'Failed to submit feedback. Check connection.', type: 'error' });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const previewResult = (videoResult && pipelineStatus === 'completed')
    ? {
      videoUrl: videoResult.videoUrl,
      projectId,
      runId: videoResult.runId,
      metadata: {
        resolution: videoResult.resolution,
        platform: targetPlatform,
      },
      credits: { platform: 'SirTrav A2A Studio' },
      invoice: videoResult.invoice,
    }
    : {
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      projectId: 'test-project-123',
      runId: 'ui-demo-run',
      metadata: { duration: 154, resolution: '1080p', platform: 'TikTok', fileSize: 24500000 },
      credits: { music: 'Suno AI', voice: 'ElevenLabs', platform: 'SirTrav A2A Studio' },
    };

  return (
    <div className="app min-h-screen relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md border animate-fade-in ${toast.type === 'success'
          ? 'bg-green-500/20 border-green-500/30 text-green-300'
          : 'bg-red-500/20 border-red-500/30 text-red-300'
          }`}>
          <div className="flex items-center gap-3">
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <p className="font-medium text-sm">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Enhanced Header */}
      <header className="header">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => setView('studio')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="logo-icon logo-icon-animated" style={{ background: 'none', padding: 0, border: 'none', width: 36, height: 36 }}>
              <img
                src="/sir-travis-emblem.png"
                alt="Sir Travis Jennings Emblem"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  filter: 'drop-shadow(0 0 6px rgba(200,160,30,0.7))',
                  animation: 'emblem-shimmer 3s ease-in-out infinite',
                }}
              />
            </div>
            <span className="text-lg font-semibold text-white">SirTrav A2A Studio</span>
          </button>

          <nav className="flex items-center gap-4">
            <button
              onClick={() => setView('studio')}
              className={`nav-link ${view === 'studio' ? 'text-amber-400' : ''}`}
            >
              <Code2 className="w-4 h-4" /> Studio
            </button>
            <button
              onClick={() => { setView('vault'); setShowResultsPreview(false); }}
              className={`nav-link ${view === 'vault' ? 'text-amber-400' : ''}`}
            >
              <Lock className="w-4 h-4" /> Vault
            </button>
            <button
              onClick={() => setShowResultsPreview(true)}
              className="btn-secondary"
            >
              Preview
            </button>
            {systemHealth && (
              <div className={`health-dot ${systemHealth.status === 'ok' ? 'health-green' : 'health-red'}`} title="System Health" />
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className={`hero-section hero-premium ${heroVisible ? 'hero-visible' : ''}`}>
        <div className="hero-orbs">
          <div className="hero-orb hero-orb-1" />
          <div className="hero-orb hero-orb-2" />
          <div className="hero-orb hero-orb-3" />
        </div>

        <h1 className="hero-title hero-title-premium">
          <span className="hero-d2a">D2A</span>
          <span className="hero-word">Video</span>
          <span className="hero-word hero-word-accent">Automation</span>
        </h1>

        <p className="hero-subtitle">
          One click. Seven AI agents. Real cinematic video — narrated, scored, credited, and published.
        </p>

        {/* SirTrav signature plaque */}
        <div className="signature-plaque">
          <div className="signature-border">
            <div className="signature-inner">
              <div style={{ position: 'relative', width: 64, height: 64, flexShrink: 0 }}>
                <img
                  src="/sir-travis-emblem.png"
                  alt="Sir Travis Jennings Gold Seal"
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    filter: 'drop-shadow(0 0 12px rgba(200,160,30,0.8))',
                    animation: 'emblem-shimmer 3s ease-in-out infinite, emblem-rotate 20s linear infinite',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  inset: -4,
                  borderRadius: '50%',
                  border: '2px solid rgba(200,160,30,0.5)',
                  animation: 'emblem-pulse 2s ease-in-out infinite',
                  pointerEvents: 'none',
                }} />
              </div>
              <div className="signature-text">
                <span className="signature-name">Sir Travis Jennings</span>
                <span className="signature-tagline">For the Commons Good</span>
              </div>
              <div className="signature-seal">
                <Shield className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* AGENT ORBIT ROW */}
        <div className="agent-orbit-row">
          {AGENTS.map((agent, idx) => (
            <div
              key={agent.id}
              className={`agent-orbit-card ${pipelineStatus === 'running' ? 'agent-orbit-active' : ''}`}
              style={{ animationDelay: `${idx * 0.1}s` }}
              title={agent.description}
            >
              <span className="agent-orbit-icon">{agent.icon}</span>
              <span className="agent-orbit-label">{agent.name.replace(' Agent', '')}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {view === 'vault' ? (
          <PersonaVault />
        ) : (
          <>
            <div className="grid lg:grid-cols-2 gap-8">
              {/* Left Panel */}
              <div className="space-y-6">
                <div className="glass-card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="section-title">
                      <Upload className="w-5 h-5" /> Input Source
                    </h2>
                    {files.length > 0 && <span className="status-badge status-secured">✓ ASSET SECURED</span>}
                  </div>

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

                  <div
                    className="drop-zone"
                    onDrop={handleDrop}
                    onDragOver={(e) => e.preventDefault()}
                  >
                    {files.length === 0 ? (
                      <div className="text-center py-8">
                        <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
                        <p className="text-gray-400">Drag & drop assets here or click to upload</p>
                        <input type="file" multiple onChange={handleFileSelect} className="hidden" id="file-input" />
                        <label htmlFor="file-input" className="btn-secondary mt-4 inline-block cursor-pointer">Browse Files</label>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {files.map((file, idx) => (
                          <div key={idx} className="file-item">
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-amber-300" />
                              <span className="text-sm text-white truncate max-w-[200px]">{file.name}</span>
                            </div>
                            <button onClick={() => removeFile(idx)} className="text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="glass-card p-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div><p className="text-[10px] text-gray-500 uppercase">Cost</p><p className="text-lg font-bold text-white">${metrics.cost.toFixed(2)}</p></div>
                    <div><p className="text-[10px] text-gray-500 uppercase">Time</p><p className="text-lg font-bold text-white">{metrics.time.toFixed(1)}s</p></div>
                    <div><p className="text-[10px] text-gray-500 uppercase">Health</p><div className="flex justify-center gap-0.5 mt-1">{[1, 2, 3, 4, 5].map(i => <div key={i} className="w-1 h-3 bg-amber-500 rounded-full" />)}</div></div>
                  </div>
                </div>
              </div>

              {/* Right Panel */}
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
                  <div className="space-y-3">
                    {AGENTS.map(agent => (
                      <div key={agent.id} className="agent-card pending p-3 rounded-lg border border-white/5 bg-white/5 flex items-center gap-3">
                        <span className="text-xl">{agent.icon}</span>
                        <div className="flex-1 text-sm font-medium text-gray-300">{agent.name}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-6 p-4 rounded-xl border border-gray-700 bg-gray-800/80 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4 text-brand-400" />
                      Click-to-Kick Launchpad
                    </h3>
                  </div>

                  {/* Platform Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {[
                      { id: 'tiktok', label: 'TikTok', icon: '🎵', ratio: '9:16' },
                      { id: 'instagram', label: 'Reels', icon: '📸', ratio: '9:16' },
                      { id: 'youtube_shorts', label: 'Shorts', icon: '▶️', ratio: '9:16' },
                      { id: 'linkedin', label: 'LinkedIn', icon: '💼', ratio: '16:9' },
                      { id: 'twitter', label: 'X (Twitter)', icon: '🐦', ratio: '16:9' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setTargetPlatform(p.id)}
                        disabled={files.length === 0 || pipelineStatus === 'running'}
                        className={`relative p-3 rounded-lg border text-left transition-all ${targetPlatform === p.id
                          ? 'bg-amber-900/40 border-amber-500 shadow-[0_0_10px_rgba(212,175,55,0.2)]'
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
                      </button>
                    ))}
                  </div>

                  {/* Creative Direction */}
                  <div className="mb-4 bg-black/20 p-3 rounded-lg border border-white/5 space-y-3">
                    <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider block">Creative Direction</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Voice</label>
                        <select
                          value={voiceStyle}
                          onChange={(e) => setVoiceStyle(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded p-2 focus:ring-1 focus:ring-amber-500 outline-none"
                        >
                          <option value="serious">🧐 Serious</option>
                          <option value="friendly">😊 Friendly</option>
                          <option value="hype">⚡ Hype</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-400">Length</label>
                        <select
                          value={videoLength}
                          onChange={(e) => setVideoLength(e.target.value)}
                          className="w-full bg-gray-900 border border-gray-700 text-white text-xs rounded p-2 focus:ring-1 focus:ring-amber-500 outline-none"
                        >
                          <option value="short">Short (15s)</option>
                          <option value="long">Long (60s)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Audio Engine */}
                  <div className="mb-4 bg-black/20 p-2 rounded-lg border border-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Audio Engine</label>
                    </div>
                    <div className="flex bg-gray-900 rounded p-0.5">
                      <button
                        onClick={() => setMusicMode('suno')}
                        className={`flex-1 py-1 text-xs rounded transition-colors ${musicMode === 'suno' ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        Suno AI
                      </button>
                      <button
                        onClick={() => setMusicMode('manual')}
                        className={`flex-1 py-1 text-xs rounded transition-colors ${musicMode === 'manual' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={runPipeline}
                    disabled={files.length === 0 || pipelineStatus === 'running'}
                    className={`w-full py-3 rounded-lg font-bold text-white text-sm flex items-center justify-center gap-2 transition-all transform active:scale-[0.98] ${pipelineStatus === 'running'
                      ? 'bg-gray-700 cursor-wait'
                      : files.length > 0
                        ? 'bg-gradient-to-r from-amber-600 to-yellow-500 hover:from-amber-500 hover:to-yellow-400 shadow-lg shadow-amber-900/40'
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

            {/* Results Output */}
            {pipelineStatus === 'completed' && videoResult && (
              <div className="mt-8 glass-card p-6 animate-slide-up">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="section-title"><Video className="w-5 h-5" /> Final Output</h2>
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-1 text-[10px] font-bold bg-green-500/10 text-green-400 rounded border border-green-500/20">{videoResult.pipelineMode} MODE</span>
                    <a href={videoResult.videoUrl} download className="btn-secondary text-xs"><Download className="w-3 h-3" /> Download</a>
                  </div>
                </div>
                <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/5">
                  <video src={videoResult.videoUrl} controls className="w-full h-full object-contain" />
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="premium-footer mt-20 py-10 border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col items-center gap-4 text-gray-500 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3" />
            <span className="font-semibold text-gray-400">SirTrav A2A Studio</span>
            <span>•</span>
            <span>{APP_VERSION}</span>
          </div>
          <p>© 2024–2026 For the Commons Good 🌍 Refined by Sir Travis Jennings</p>
        </div>
      </footer>

      {/* Modals */}
      {showResultsPreview && (
        <ResultsPreview
          result={previewResult}
          onClose={() => setShowResultsPreview(false)}
        />
      )}
    </div>
  );
}

// Global Week Number helper
Date.prototype.getWeekNumber = function () {
  const d = new Date(Date.UTC(this.getFullYear(), this.getMonth(), this.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
};

export default App;
