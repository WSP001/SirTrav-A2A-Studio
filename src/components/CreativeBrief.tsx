/**
 * CREATIVE BRIEF - User Intent Capture
 * Helps the 7-Agent pipeline understand what the user wants
 * 
 * This brief gets passed to:
 * - Director Agent (overall vision)
 * - Writer Agent (narration style)
 * - Voice Agent (tone selection)
 * - Composer Agent (music mood)
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Film, Music, Mic, Clock, Target } from 'lucide-react';

export interface CreativeBriefData {
  story: string;
  mood: 'cinematic' | 'upbeat' | 'nostalgic' | 'dramatic' | 'peaceful' | 'energetic';
  pace: 'slow' | 'medium' | 'fast';
  audience: 'personal' | 'family' | 'professional' | 'social';
  duration: 'short' | 'medium' | 'long';
  voiceStyle: 'warm' | 'professional' | 'energetic' | 'calm' | 'storyteller';
}

interface CreativeBriefProps {
  onBriefChange: (brief: CreativeBriefData) => void;
  initialBrief?: Partial<CreativeBriefData>;
}

const defaultBrief: CreativeBriefData = {
  story: '',
  mood: 'cinematic',
  pace: 'medium',
  audience: 'personal',
  duration: 'medium',
  voiceStyle: 'warm',
};

export const CreativeBrief: React.FC<CreativeBriefProps> = ({ 
  onBriefChange, 
  initialBrief 
}) => {
  const [brief, setBrief] = useState<CreativeBriefData>({
    ...defaultBrief,
    ...initialBrief,
  });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    onBriefChange(brief);
  }, [brief, onBriefChange]);

  const updateBrief = (key: keyof CreativeBriefData, value: string) => {
    setBrief(prev => ({ ...prev, [key]: value }));
  };

  const moodOptions = [
    { value: 'cinematic', label: '🎬 Cinematic', desc: 'Epic, movie-like feel' },
    { value: 'upbeat', label: '🎉 Upbeat', desc: 'Fun, energetic vibes' },
    { value: 'nostalgic', label: '💭 Nostalgic', desc: 'Warm memories' },
    { value: 'dramatic', label: '🎭 Dramatic', desc: 'Intense, emotional' },
    { value: 'peaceful', label: '🌅 Peaceful', desc: 'Calm, serene' },
    { value: 'energetic', label: '⚡ Energetic', desc: 'High-energy action' },
  ];

  const paceOptions = [
    { value: 'slow', label: 'Slow', desc: 'Contemplative, lingering shots' },
    { value: 'medium', label: 'Medium', desc: 'Balanced flow' },
    { value: 'fast', label: 'Fast', desc: 'Quick cuts, dynamic' },
  ];

  const audienceOptions = [
    { value: 'personal', label: '👤 Personal', desc: 'Just for you' },
    { value: 'family', label: '👨‍👩‍👧‍👦 Family', desc: 'Share with loved ones' },
    { value: 'professional', label: '💼 Professional', desc: 'Business/LinkedIn' },
    { value: 'social', label: '📱 Social Media', desc: 'TikTok/Instagram/YouTube' },
  ];

  const durationOptions = [
    { value: 'short', label: '15-30s', desc: 'TikTok/Reels' },
    { value: 'medium', label: '1-3 min', desc: 'Standard' },
    { value: 'long', label: '5+ min', desc: 'YouTube/Documentary' },
  ];

  const voiceOptions = [
    { value: 'warm', label: '🎙️ Warm', desc: 'Friendly, inviting' },
    { value: 'professional', label: '🎤 Professional', desc: 'Clear, authoritative' },
    { value: 'energetic', label: '⚡ Energetic', desc: 'Excited, dynamic' },
    { value: 'calm', label: '🌊 Calm', desc: 'Soothing, relaxed' },
    { value: 'storyteller', label: '📖 Storyteller', desc: 'Narrative, engaging' },
  ];

  return (
    <div className="glass-card p-6 space-y-4">
      {/* Header */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-brand-400" />
          Creative Brief
          <span className="text-xs text-zinc-500 font-normal">(Optional)</span>
        </h3>
        <button className="text-zinc-400 hover:text-white transition-colors">
          {isExpanded ? '▲ Collapse' : '▼ Expand'}
        </button>
      </div>

      {/* Story Input - Always Visible */}
      <div className="space-y-2">
        <label className="text-sm text-zinc-400">
          What story do you want to tell?
        </label>
        <textarea
          value={brief.story}
          onChange={(e) => updateBrief('story', e.target.value)}
          placeholder="A nostalgic look back at our summer vacation with the kids..."
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all resize-none"
          rows={3}
        />
      </div>

      {/* Expanded Options */}
      {isExpanded && (
        <div className="space-y-6 pt-4 border-t border-white/10 animate-fade-in">
          {/* Mood Selection */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 flex items-center gap-2">
              <Film className="w-4 h-4" /> Mood
            </label>
            <div className="grid grid-cols-3 gap-2">
              {moodOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateBrief('mood', opt.value)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    brief.mood === opt.value
                      ? 'bg-brand-500/20 border-brand-500 text-white'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  } border`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-zinc-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Pace Selection */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Pace
            </label>
            <div className="flex gap-2">
              {paceOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateBrief('pace', opt.value)}
                  className={`flex-1 p-3 rounded-xl text-center transition-all ${
                    brief.pace === opt.value
                      ? 'bg-brand-500/20 border-brand-500 text-white'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  } border`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-zinc-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Audience Selection */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 flex items-center gap-2">
              <Target className="w-4 h-4" /> Audience
            </label>
            <div className="grid grid-cols-2 gap-2">
              {audienceOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateBrief('audience', opt.value)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    brief.audience === opt.value
                      ? 'bg-brand-500/20 border-brand-500 text-white'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  } border`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-zinc-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration Selection */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> Duration
            </label>
            <div className="flex gap-2">
              {durationOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateBrief('duration', opt.value)}
                  className={`flex-1 p-3 rounded-xl text-center transition-all ${
                    brief.duration === opt.value
                      ? 'bg-brand-500/20 border-brand-500 text-white'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  } border`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-zinc-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Style Selection */}
          <div className="space-y-2">
            <label className="text-sm text-zinc-400 flex items-center gap-2">
              <Mic className="w-4 h-4" /> Voice Style
            </label>
            <div className="grid grid-cols-3 gap-2">
              {voiceOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateBrief('voiceStyle', opt.value)}
                  className={`p-3 rounded-xl text-left transition-all ${
                    brief.voiceStyle === opt.value
                      ? 'bg-brand-500/20 border-brand-500 text-white'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                  } border`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-zinc-500">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreativeBrief;
