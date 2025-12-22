import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, Music, Video, Settings, X, Sparkles, Zap, Play, Link, Unlink } from 'lucide-react';
import { Click2KickButton } from './Click2KickButton';
import { Dashboard } from './Dashboard';
import { useDropzone } from 'react-dropzone';
import { getTheme, buildThemePreference, ThemeAttachment } from '../lib/theme';
import { useProgress } from '../lib/useProgress';

type PipelineStatus = 'idle' | 'validating' | 'running' | 'completed' | 'error';

interface GenerateVideoResult {
  ok: boolean;
  projectId: string;
  videoUrl?: string;
  creditsUrl?: string;
  duration?: number;
  error?: string;
}

interface CreativeHubProps {
  onPipelineStart: (projectId: string) => void;
  onPipelineComplete: (result: GenerateVideoResult) => void;
  onStatusChange: (status: PipelineStatus) => void;
}

// v1.9.0-THEME - Added theme attachment toggle (default ON)
export const CreativeHub: React.FC<CreativeHubProps> = ({ 
  onPipelineStart, 
  onPipelineComplete,
  onStatusChange 
}) => {
  const [status, setStatus] = useState<PipelineStatus>('idle');
  const [files, setFiles] = useState<File[]>([]);
  // Chaos Mode removed - always run real pipeline
  const progress = useProgress('/.netlify/functions/progress');
  
  // Theme Attachment State - default ON
  const [projectId] = useState(() => `project-${Date.now()}`);
  const [attachTheme, setAttachTheme] = useState(true);
  const [theme, setThemeState] = useState<ThemeAttachment | null>(() => getTheme(projectId));

  // Sync theme from localStorage on storage events (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === `sj:theme:${projectId}`) {
        setThemeState(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [projectId]);

  // Refresh theme when projectId changes
  useEffect(() => {
    setThemeState(getTheme(projectId));
  }, [projectId]);

  // Reflect backend progress into local status
  useEffect(() => {
    if (!progress) return;
    if (progress.status === 'completed') {
      setStatus('completed');
      onStatusChange('completed');
      // optionally load result from progress.agents/payload if present
    } else if (progress.status === 'error') {
      setStatus('error');
      onStatusChange('error');
    } else if (progress.status === 'running') {
      setStatus('running');
      onStatusChange('running');
    }
  }, [progress, onStatusChange]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const clearTheme = () => {
    localStorage.removeItem(`sj:theme:${projectId}`);
    setThemeState(null);
  };

  // Helper: Convert file to base64
  const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // Remove data:... prefix
    };
    reader.onerror = reject;
  });

  const startPipeline = async () => {
    setStatus('validating');
    onStatusChange('validating');
    onPipelineStart(projectId);
    
    // Use stable projectId from state
    const pid = projectId;

    // 2. Trigger Backend Pipeline
    try {
      // Step A: Upload files with REAL base64 data (not just names!)
      console.log(`📤 Uploading ${files.length} files with base64 data...`);
      for (const file of files) {
        const base64 = await fileToBase64(file);
        const intakeResponse = await fetch('/.netlify/functions/intake-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            projectId: pid,
            filename: file.name,
            contentType: file.type,
            fileBase64: base64,
          }),
        });

        if (!intakeResponse.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
        console.log(`✅ Uploaded: ${file.name}`);
      }

      setStatus('running');
      onStatusChange('running');

      // Step B: Trigger the 7-agent video generation pipeline
      // Include themePreference so Composer can skip if theme attached
      const generateResponse = await fetch('/.netlify/functions/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: pid,
          prompt: `Generate a cinematic memory video from the uploaded assets`,
          projectMode: 'commons_public',
          themePreference: buildThemePreference(pid, attachTheme),
        }),
      });

      if (!generateResponse.ok) {
        const errorData = await generateResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Video generation failed');
      }

      const result = await generateResponse.json();
      console.log('🎬 Pipeline result:', result);

      if (!result.ok) {
        throw new Error(result.error || 'Pipeline returned error');
      }

      setStatus('completed');
      onStatusChange('completed');

      // 3. Hand off to App with the video result
      onPipelineComplete(result);

    } catch (error) {
      console.error('Pipeline start failed:', error);
      setStatus('error');
      onStatusChange('error');
      alert(`Pipeline failed: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-10 animate-fade-in">
      {/* Hero Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-sm font-medium animate-bounce-subtle">
          <Sparkles className="w-4 h-4" />
          <span>7-Agent AI Pipeline Ready</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight">
          <span className="text-white">Creative</span>
          <span className="gradient-text-animated">Hub</span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto">
          Upload your assets, configure your pipeline, and let our AI agents transform your content into cinematic videos
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Director', status: 'ready', color: 'brand' },
          { label: 'Writer', status: 'ready', color: 'purple' },
          { label: 'Voice', status: 'ready', color: 'emerald' },
          { label: 'Editor', status: 'ready', color: 'amber' },
        ].map((agent, i) => (
          <div key={i} className="glass-card p-4 flex items-center gap-3 group cursor-default">
            <div className={`status-dot active`}></div>
            <div>
              <p className="text-white font-semibold text-sm">{agent.label}</p>
              <p className="text-zinc-500 text-xs">Agent {agent.status}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Input Zone */}
        <div className="lg:col-span-2 space-y-6">
          {/* Upload Card */}
          <div 
            {...getRootProps()} 
            className={`glass-card p-10 text-center cursor-pointer group transition-all duration-300
              ${isDragActive 
                ? 'border-brand-500 bg-brand-500/10 shadow-glow-md scale-[1.02]' 
                : 'hover:border-brand-500/50 hover:shadow-glow-sm'}`}
          >
            <input {...getInputProps()} />
            <div className="relative">
              <div className={`w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center transition-all duration-300
                ${isDragActive 
                  ? 'bg-brand-500 shadow-glow-md scale-110' 
                  : 'bg-gradient-to-br from-brand-500/20 to-accent-purple/20 group-hover:from-brand-500/30 group-hover:to-accent-purple/30'}`}>
                <Upload className={`w-10 h-10 transition-all duration-300 ${isDragActive ? 'text-white animate-bounce-subtle' : 'text-brand-400'}`} />
              </div>
              {isDragActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-2 border-brand-500 animate-ping opacity-30"></div>
                </div>
              )}
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              {isDragActive ? 'Drop it like it\'s hot! 🔥' : 'Drop your assets here'}
            </h3>
            <p className="text-zinc-400 max-w-md mx-auto">
              Scripts, images, audio files — we'll transform them into cinematic magic
            </p>
            <div className="flex items-center justify-center gap-4 mt-4">
              {['.txt', '.mp4', '.mp3', '.jpg', '.png'].map((ext, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-500 text-xs font-mono">
                  {ext}
                </span>
              ))}
            </div>
          </div>

          {/* Staged Files */}
          {files.length > 0 && (
            <div className="glass-card p-6 animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Staged Assets
                </h4>
                <span className="text-xs text-zinc-500">{files.length} file{files.length > 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-2">
                {files.map((file, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:bg-white/8 hover:border-brand-500/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-brand-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{file.name}</p>
                        <p className="text-xs text-zinc-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Zone */}
        <div className="space-y-6">
          <div className="glass-card p-6 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-400" />
                Pipeline Config
              </h3>
              {/* Chaos Mode removed - always run real pipeline */}
            </div>

            <div className="space-y-3 flex-grow">
              {[
                { name: 'Script Analysis', model: 'GPT-4o', color: 'brand', icon: '📝' },
                { name: 'Voice Synthesis', model: 'ElevenLabs', color: 'emerald', icon: '🎙️' },
                { name: 'Video Generation', model: 'Stable Video', color: 'amber', icon: '🎬' },
                { name: 'Music Composition', model: 'SUNO AI', color: 'pink', icon: '🎵' },
              ].map((config, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{config.icon}</span>
                    <span className="text-sm text-zinc-300 font-medium">{config.name}</span>
                  </div>
                  <span className={`text-xs font-mono px-2 py-1 rounded-md bg-${config.color}-500/10 text-${config.color}-400 border border-${config.color}-500/20`}>
                    {config.model}
                  </span>
                </div>
              ))}
            </div>

            {/* Theme Attachment Toggle */}
            <div className="mt-4 p-4 rounded-xl bg-white/5 border border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Music className="w-5 h-5 text-pink-400" />
                  <div>
                    <p className="text-sm font-medium text-white">Attach Theme</p>
                    <p className="text-xs text-zinc-500">
                      {theme ? theme.filename : 'Use Suno Wizard to add'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAttachTheme(!attachTheme)}
                  className={`p-2 rounded-lg transition-all ${attachTheme 
                    ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' 
                    : 'bg-white/5 text-zinc-500 hover:text-white border border-white/5'}`}
                  title={attachTheme ? 'Theme attached' : 'Theme detached'}
                >
                  {attachTheme ? <Link className="w-4 h-4" /> : <Unlink className="w-4 h-4" />}
                </button>
              </div>
              
              {/* Theme Preview (when attached and available) */}
              {attachTheme && theme && (
                <div className="mt-3 p-3 rounded-lg bg-pink-500/5 border border-pink-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-mono text-pink-300">{theme.filename}</p>
                      <p className="text-xs text-zinc-500">
                        {theme.bpm} BPM • {theme.duration?.toFixed(1)}s
                      </p>
                    </div>
                    <button
                      onClick={clearTheme}
                      className="p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all"
                      title="Remove theme"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
              <Click2KickButton 
                status={status} 
                onClick={startPipeline}
              />
              <div className="flex items-center justify-center gap-2 mt-4 text-xs text-zinc-500">
                <Play className="w-3 h-3" />
                <span>Estimated: ~2 minutes</span>
              </div>
              {progress?.message && (
                <div className="mt-3 text-xs text-zinc-400">
                  {progress.message}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
