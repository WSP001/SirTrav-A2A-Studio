import React, { useState, useCallback } from 'react';
import { Upload, FileText, Music, Video, Settings, AlertTriangle, X, Sparkles, Zap, Play, Home, Globe, Lock, Users } from 'lucide-react';
import { Click2KickButton } from './Click2KickButton';
import { PipelineProgress } from './PipelineProgress';
import { useDropzone } from 'react-dropzone';

// 🔥 VERSION TAG - Check this to verify deployment!
const APP_VERSION = 'v1.8.0-FORMAT';
const BUILD_DATE = '2025-12-08';

// Types
type PipelineStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
type OutputObjective = 'personal' | 'social';
type SocialPlatform = 'tiktok' | 'youtube_shorts' | 'instagram' | 'youtube_full';

interface PipelineStep {
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: number;
  output?: string;
}

interface GenerateVideoResult {
  ok: boolean;
  projectId: string;
  videoUrl?: string;
  creditsUrl?: string;
  duration?: number;
  error?: string;
  outputFormat?: {
    objective: OutputObjective;
    platform?: SocialPlatform;
    aspectRatio: string;
    maxDuration?: number;
  };
}

interface CreativeHubProps {
  onPipelineStart: (projectId: string) => void;
  onPipelineComplete: (result: GenerateVideoResult) => void;
  onStatusChange: (status: PipelineStatus) => void;
}

// Agent configuration with colors
const AGENTS = [
  { name: 'Director', icon: '🎬', color: 'from-purple-500 to-indigo-500' },
  { name: 'Writer', icon: '✍️', color: 'from-blue-500 to-cyan-500' },
  { name: 'Voice', icon: '🎙️', color: 'from-green-500 to-emerald-500' },
  { name: 'Composer', icon: '🎵', color: 'from-yellow-500 to-orange-500' },
  { name: 'Editor', icon: '🎞️', color: 'from-red-500 to-pink-500' },
  { name: 'Attribution', icon: '📜', color: 'from-teal-500 to-cyan-500' },
  { name: 'Publisher', icon: '🚀', color: 'from-violet-500 to-purple-500' },
];

// Platform configurations
const PLATFORM_CONFIGS = {
  tiktok: { 
    name: 'TikTok', 
    icon: '📱', 
    aspectRatio: '9:16', 
    maxDuration: 60,
    color: 'from-pink-500 to-cyan-400'
  },
  youtube_shorts: { 
    name: 'YouTube Shorts', 
    icon: '▶️', 
    aspectRatio: '9:16', 
    maxDuration: 60,
    color: 'from-red-500 to-red-600'
  },
  instagram: { 
    name: 'Instagram Reels', 
    icon: '📸', 
    aspectRatio: '9:16', 
    maxDuration: 90,
    color: 'from-purple-500 to-pink-500'
  },
  youtube_full: { 
    name: 'YouTube', 
    icon: '🎬', 
    aspectRatio: '16:9', 
    maxDuration: null,
    color: 'from-red-600 to-red-700'
  },
};

export const CreativeHub: React.FC<CreativeHubProps> = ({ 
  onPipelineStart, 
  onPipelineComplete,
  onStatusChange 
}) => {
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [files, setFiles] = useState<File[]>([]);
  const [chaosMode, setChaosMode] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [steps, setSteps] = useState<PipelineStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  
  // NEW: Output format selection
  const [outputObjective, setOutputObjective] = useState<OutputObjective>('personal');
  const [socialPlatform, setSocialPlatform] = useState<SocialPlatform>('tiktok');

  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
    setError(null);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
      'video/*': ['.mp4', '.mov', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a'],
      'text/*': ['.txt', '.md'],
    },
  });

  // Remove file
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Get current format config
  const getFormatConfig = () => {
    if (outputObjective === 'personal') {
      return {
        aspectRatio: '16:9',
        maxDuration: null,
        name: 'Personal/Family',
        description: 'High quality, private viewing'
      };
    }
    return PLATFORM_CONFIGS[socialPlatform];
  };

  // Start pipeline
  const startPipeline = async () => {
    if (files.length === 0) {
      setError('Please upload at least one file to start the pipeline');
      return;
    }

    const projectId = `PROJ-${Date.now()}`;
    setStatus('uploading');
    onStatusChange('uploading');
    onPipelineStart(projectId);
    setError(null);

    try {
      // Initialize steps
      const initialSteps: PipelineStep[] = AGENTS.map(agent => ({
        agent: agent.name.toLowerCase(),
        status: 'pending',
      }));
      setSteps(initialSteps);

      // Upload files first
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('projectId', projectId);
      formData.append('chaosMode', String(chaosMode));

      const uploadResponse = await fetch('/.netlify/functions/intake-upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Upload failed');
      }

      setStatus('processing');
      onStatusChange('processing');

      // Simulate agent progression for visual feedback
      for (let i = 0; i < AGENTS.length; i++) {
        setCurrentStep(i);
        setSteps(prev => prev.map((step, idx) => ({
          ...step,
          status: idx < i ? 'completed' : idx === i ? 'running' : 'pending'
        })));
        // Simulate processing time per agent
        await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
      }

      // Get format configuration
      const formatConfig = getFormatConfig();

      // Call generate-video endpoint with format info
      const response = await fetch('/.netlify/functions/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          projectId,
          chaosMode,
          outputObjective,
          socialPlatform: outputObjective === 'social' ? socialPlatform : undefined,
          outputFormat: {
            objective: outputObjective,
            platform: outputObjective === 'social' ? socialPlatform : undefined,
            aspectRatio: formatConfig.aspectRatio,
            maxDuration: formatConfig.maxDuration,
          }
        }),
      });

      const result: GenerateVideoResult = await response.json();

      // Mark all steps completed
      setSteps(prev => prev.map(step => ({ ...step, status: 'completed' })));
      setCurrentStep(AGENTS.length);

      if (result.ok) {
        setStatus('completed');
        onStatusChange('completed');
        onPipelineComplete({
          ...result,
          outputFormat: {
            objective: outputObjective,
            platform: outputObjective === 'social' ? socialPlatform : undefined,
            aspectRatio: formatConfig.aspectRatio,
            maxDuration: formatConfig.maxDuration || undefined,
          }
        });
      } else {
        throw new Error(result.error || 'Pipeline failed');
      }

    } catch (err) {
      setStatus('error');
      onStatusChange('error');
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/30">
          <Sparkles className="w-4 h-4 text-brand-400" />
          <span className="text-sm font-medium text-brand-300">7-Agent AI Pipeline Ready</span>
          <span className="text-xs px-2 py-0.5 rounded bg-brand-500/30 text-brand-200 font-mono">{APP_VERSION}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold">
          <span className="gradient-text-animated">Creative Hub</span>
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
          Upload your content and watch our AI agents transform it into a cinematic masterpiece
        </p>
        {/* Version indicator for deployment verification */}
        <p className="text-xs text-gray-600">Build: {BUILD_DATE} | {APP_VERSION}</p>
      </div>

      {/* 🆕 OUTPUT OBJECTIVE SELECTOR */}
      <div className="glass-card p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Video className="w-5 h-5 text-brand-400" />
          Choose Your Output Format
        </h2>
        
        {/* Objective Toggle */}
        <div className="grid grid-cols-2 gap-4">
          {/* Personal/Family Option */}
          <button
            onClick={() => setOutputObjective('personal')}
            className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
              outputObjective === 'personal'
                ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/20'
                : 'border-white/10 bg-white/5 hover:border-white/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${outputObjective === 'personal' ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                <Home className={`w-6 h-6 ${outputObjective === 'personal' ? 'text-emerald-400' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold ${outputObjective === 'personal' ? 'text-emerald-300' : 'text-white'}`}>
                    Personal / Family
                  </h3>
                  <Lock className="w-4 h-4 text-gray-500" />
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Private viewing • 16:9 HD • No watermarks
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Users className="w-3 h-3" />
                  <span>Family memories, personal archives</span>
                </div>
              </div>
            </div>
            {outputObjective === 'personal' && (
              <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            )}
          </button>

          {/* Social Media Option */}
          <button
            onClick={() => setOutputObjective('social')}
            className={`relative p-4 rounded-xl border-2 transition-all duration-300 text-left ${
              outputObjective === 'social'
                ? 'border-brand-500 bg-brand-500/10 shadow-lg shadow-brand-500/20'
                : 'border-white/10 bg-white/5 hover:border-white/30'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-3 rounded-lg ${outputObjective === 'social' ? 'bg-brand-500/20' : 'bg-white/10'}`}>
                <Globe className={`w-6 h-6 ${outputObjective === 'social' ? 'text-brand-400' : 'text-gray-400'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className={`font-semibold ${outputObjective === 'social' ? 'text-brand-300' : 'text-white'}`}>
                    Social Media
                  </h3>
                  <Globe className="w-4 h-4 text-gray-500" />
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Public sharing • Platform-optimized
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                  <Zap className="w-3 h-3" />
                  <span>TikTok, YouTube, Instagram</span>
                </div>
              </div>
            </div>
            {outputObjective === 'social' && (
              <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-brand-500 animate-pulse" />
            )}
          </button>
        </div>

        {/* Platform Selection (only if Social Media selected) */}
        {outputObjective === 'social' && (
          <div className="mt-4 space-y-3 animate-fade-in">
            <h3 className="text-sm font-medium text-gray-300">Select Platform:</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(Object.entries(PLATFORM_CONFIGS) as [SocialPlatform, typeof PLATFORM_CONFIGS.tiktok][]).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setSocialPlatform(key)}
                  className={`p-3 rounded-lg border transition-all text-center ${
                    socialPlatform === key
                      ? `border-transparent bg-gradient-to-br ${config.color} shadow-lg`
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl mb-1">{config.icon}</div>
                  <div className={`text-sm font-medium ${socialPlatform === key ? 'text-white' : 'text-gray-300'}`}>
                    {config.name}
                  </div>
                  <div className={`text-xs mt-1 ${socialPlatform === key ? 'text-white/80' : 'text-gray-500'}`}>
                    {config.aspectRatio} • {config.maxDuration ? `${config.maxDuration}s max` : 'Unlimited'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Format Summary */}
        <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Output Format:</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {getFormatConfig().aspectRatio}
              </span>
              {getFormatConfig().maxDuration && (
                <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300">
                  Max {getFormatConfig().maxDuration}s
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded ${
                outputObjective === 'personal' 
                  ? 'bg-emerald-500/20 text-emerald-300' 
                  : 'bg-brand-500/20 text-brand-300'
              }`}>
                {outputObjective === 'personal' ? '🔒 Private' : '🌐 Public'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Status Grid */}
      <div className="grid grid-cols-7 gap-2 p-4 glass-card">
        {AGENTS.map((agent, index) => (
          <div 
            key={agent.name}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
              status === 'processing' && currentStep === index 
                ? 'bg-brand-500/20 scale-105' 
                : 'bg-white/5 hover:bg-white/10'
            }`}
          >
            <div className={`text-2xl ${status === 'processing' && currentStep >= index ? 'animate-bounce-subtle' : ''}`}>
              {agent.icon}
            </div>
            <span className="text-xs font-medium text-gray-400">{agent.name}</span>
            <div className={`status-dot ${
              status === 'completed' ? 'active' :
              status === 'processing' && currentStep === index ? 'pending' :
              status === 'processing' && currentStep > index ? 'active' :
              ''
            }`} />
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upload Zone - 2 columns */}
        <div className="lg:col-span-2 space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`glass-card p-8 border-2 border-dashed transition-all cursor-pointer ${
              isDragActive 
                ? 'border-brand-500 bg-brand-500/10' 
                : 'border-white/20 hover:border-brand-500/50 hover:bg-white/5'
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-4 text-center">
              <div className={`p-4 rounded-full ${isDragActive ? 'bg-brand-500/20' : 'bg-white/10'}`}>
                <Upload className={`w-8 h-8 ${isDragActive ? 'text-brand-400' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="text-lg font-medium text-white">
                  {isDragActive ? 'Drop your files here' : 'Drag & drop your content'}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Images, videos, audio, or text files
                </p>
              </div>
              <button className="btn-primary text-sm">
                Browse Files
              </button>
            </div>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-white">Uploaded Files ({files.length})</h3>
                <button 
                  onClick={() => setFiles([])}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Clear All
                </button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {files.map((file, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {file.type.startsWith('image') && <FileText className="w-4 h-4 text-blue-400" />}
                      {file.type.startsWith('video') && <Video className="w-4 h-4 text-purple-400" />}
                      {file.type.startsWith('audio') && <Music className="w-4 h-4 text-green-400" />}
                      {file.type.startsWith('text') && <FileText className="w-4 h-4 text-yellow-400" />}
                      <span className="text-sm text-gray-300 truncate max-w-xs">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-white/10 rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Click2Kick Button */}
          <Click2KickButton 
            status={status}
            onClick={startPipeline}
            disabled={files.length === 0 || status === 'processing' || status === 'uploading'}
          />
        </div>

        {/* Sidebar - Config */}
        <div className="space-y-4">
          <div className="glass-card p-4">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center justify-between w-full text-left"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-white">Pipeline Config</span>
              </div>
              <span className="text-xs text-gray-500">{showConfig ? '−' : '+'}</span>
            </button>
            
            {showConfig && (
              <div className="mt-4 space-y-4 pt-4 border-t border-white/10">
                {/* Chaos Mode Toggle */}
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm text-gray-300">Chaos Mode</span>
                  </div>
                  <div 
                    className={`w-10 h-6 rounded-full transition-colors ${chaosMode ? 'bg-brand-500' : 'bg-gray-600'}`}
                    onClick={() => setChaosMode(!chaosMode)}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white mt-1 transition-transform ${chaosMode ? 'translate-x-5' : 'translate-x-1'}`} />
                  </div>
                </label>
                <p className="text-xs text-gray-500">
                  Enable experimental features and creative variations
                </p>
              </div>
            )}
          </div>

          {/* Pipeline Status Card */}
          {status !== 'idle' && (
            <div className="glass-card p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className={`status-dot ${
                  status === 'completed' ? 'active' :
                  status === 'error' ? 'error' :
                  'pending'
                }`} />
                <span className="font-medium text-white capitalize">{status}</span>
              </div>
              {status === 'processing' && (
                <div className="space-y-2">
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-brand-500 to-accent-purple rounded-full transition-all duration-500"
                      style={{ width: `${((currentStep + 1) / 7) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    Processing: {AGENTS[currentStep]?.name || 'Initializing'}...
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Output Preview Card */}
          {status === 'idle' && (
            <div className="glass-card p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-300">Your Video Will Be:</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Format:</span>
                  <span className="text-white">{getFormatConfig().aspectRatio}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Type:</span>
                  <span className={outputObjective === 'personal' ? 'text-emerald-400' : 'text-brand-400'}>
                    {outputObjective === 'personal' ? '🔒 Private' : `🌐 ${PLATFORM_CONFIGS[socialPlatform]?.name || 'Social'}`}
                  </span>
                </div>
                {outputObjective === 'social' && getFormatConfig().maxDuration && (
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Max Duration:</span>
                    <span className="text-yellow-400">{getFormatConfig().maxDuration}s</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreativeHub;
