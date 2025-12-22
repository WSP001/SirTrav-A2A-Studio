/**
 * USER PREFERENCES - Onboarding Survey
 * Safe user preferences (NO API KEYS - those go in Netlify Dashboard)
 * 
 * Stored in localStorage for returning users
 */

import React, { useState, useEffect } from 'react';
import { User, Film, Mic, Clock, Palette, Check, X } from 'lucide-react';

export interface UserPreferences {
  displayName: string;
  videoType: 'family' | 'travel' | 'business' | 'creative' | 'education' | 'other';
  preferredStyle: 'cinematic' | 'documentary' | 'social' | 'minimal' | 'vibrant';
  preferredLength: 'short' | 'medium' | 'long';
  defaultVoice: 'rachel' | 'adam' | 'bella' | 'josh' | 'random';
  colorTheme: 'warm' | 'cool' | 'neutral' | 'vibrant';
  autoSave: boolean;
  hasCompletedOnboarding: boolean;
}

interface UserPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prefs: UserPreferences) => void;
  existingPrefs?: Partial<UserPreferences>;
}

const STORAGE_KEY = 'sirtrav-user-preferences';

const defaultPrefs: UserPreferences = {
  displayName: '',
  videoType: 'family',
  preferredStyle: 'cinematic',
  preferredLength: 'medium',
  defaultVoice: 'rachel',
  colorTheme: 'warm',
  autoSave: true,
  hasCompletedOnboarding: false,
};

// Hook to load/save preferences
export const useUserPreferences = () => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPrefs);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setPreferences({ ...defaultPrefs, ...JSON.parse(saved) });
      } catch (e) {
        console.warn('Failed to parse saved preferences');
      }
    }
    setIsLoaded(true);
  }, []);

  const savePreferences = (prefs: UserPreferences) => {
    setPreferences(prefs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  };

  const clearPreferences = () => {
    localStorage.removeItem(STORAGE_KEY);
    setPreferences(defaultPrefs);
  };

  return { preferences, savePreferences, clearPreferences, isLoaded };
};

export const UserPreferencesModal: React.FC<UserPreferencesModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingPrefs,
}) => {
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState<UserPreferences>({
    ...defaultPrefs,
    ...existingPrefs,
  });

  const totalSteps = 4;

  const updatePref = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const finalPrefs = { ...prefs, hasCompletedOnboarding: true };
    onSave(finalPrefs);
    onClose();
  };

  if (!isOpen) return null;

  const videoTypes = [
    { value: 'family', label: '👨‍👩‍👧‍👦 Family Memories', desc: 'Vacations, milestones, everyday moments' },
    { value: 'travel', label: '✈️ Travel Adventures', desc: 'Trips, explorations, destinations' },
    { value: 'business', label: '💼 Business Content', desc: 'LinkedIn, presentations, promos' },
    { value: 'creative', label: '🎨 Creative Projects', desc: 'Art, music, storytelling' },
    { value: 'education', label: '📚 Educational', desc: 'Tutorials, courses, how-tos' },
    { value: 'other', label: '✨ Other', desc: 'Something unique!' },
  ];

  const styleOptions = [
    { value: 'cinematic', label: '🎬 Cinematic', desc: 'Epic, movie-like' },
    { value: 'documentary', label: '📽️ Documentary', desc: 'Authentic, real' },
    { value: 'social', label: '📱 Social Media', desc: 'Trendy, engaging' },
    { value: 'minimal', label: '⚪ Minimal', desc: 'Clean, simple' },
    { value: 'vibrant', label: '🌈 Vibrant', desc: 'Colorful, energetic' },
  ];

  const lengthOptions = [
    { value: 'short', label: '⚡ Short', desc: '15-30 seconds', platform: 'TikTok, Reels' },
    { value: 'medium', label: '📹 Medium', desc: '1-3 minutes', platform: 'YouTube, LinkedIn' },
    { value: 'long', label: '🎥 Long', desc: '5+ minutes', platform: 'YouTube, Documentary' },
  ];

  const voiceOptions = [
    { value: 'rachel', label: '🎙️ Rachel', desc: 'Warm, friendly female voice' },
    { value: 'adam', label: '🎤 Adam', desc: 'Professional male voice' },
    { value: 'bella', label: '✨ Bella', desc: 'Young, energetic female' },
    { value: 'josh', label: '📖 Josh', desc: 'Deep, storyteller male' },
    { value: 'random', label: '🎲 Surprise Me', desc: 'AI picks the best match' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg mx-4 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-brand-400" />
                {step === 1 ? 'Welcome to SirTrav!' : 
                 step === 2 ? 'Your Video Style' :
                 step === 3 ? 'Preferences' : 'Almost Done!'}
              </h2>
              <p className="text-sm text-zinc-400 mt-1">
                Step {step} of {totalSteps}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* Progress bar */}
          <div className="mt-4 h-1 bg-white/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="text-center mb-6">
                <div className="text-4xl mb-2">👋</div>
                <p className="text-zinc-300">Let's personalize your video experience</p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm text-zinc-400">What should we call you?</label>
                <input
                  type="text"
                  value={prefs.displayName}
                  onChange={(e) => updatePref('displayName', e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-zinc-500 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-zinc-400">What type of videos do you create?</label>
                <div className="grid grid-cols-2 gap-2">
                  {videoTypes.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updatePref('videoType', opt.value as UserPreferences['videoType'])}
                      className={`p-3 rounded-xl text-left transition-all ${
                        prefs.videoType === opt.value
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

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400 flex items-center gap-2">
                  <Film className="w-4 h-4" /> Preferred video style
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {styleOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updatePref('preferredStyle', opt.value as UserPreferences['preferredStyle'])}
                      className={`p-3 rounded-xl text-left transition-all ${
                        prefs.preferredStyle === opt.value
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

              <div className="space-y-2">
                <label className="text-sm text-zinc-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Typical video length
                </label>
                <div className="space-y-2">
                  {lengthOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updatePref('preferredLength', opt.value as UserPreferences['preferredLength'])}
                      className={`w-full p-3 rounded-xl text-left transition-all flex justify-between items-center ${
                        prefs.preferredLength === opt.value
                          ? 'bg-brand-500/20 border-brand-500 text-white'
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                      } border`}
                    >
                      <div>
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-zinc-500">{opt.desc}</div>
                      </div>
                      <span className="text-xs text-brand-400">{opt.platform}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <label className="text-sm text-zinc-400 flex items-center gap-2">
                  <Mic className="w-4 h-4" /> Default narrator voice
                </label>
                <div className="space-y-2">
                  {voiceOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updatePref('defaultVoice', opt.value as UserPreferences['defaultVoice'])}
                      className={`w-full p-3 rounded-xl text-left transition-all ${
                        prefs.defaultVoice === opt.value
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

              <div className="space-y-2">
                <label className="text-sm text-zinc-400 flex items-center gap-2">
                  <Palette className="w-4 h-4" /> Color theme preference
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'warm', label: '🌅 Warm', color: 'bg-orange-500' },
                    { value: 'cool', label: '🌊 Cool', color: 'bg-blue-500' },
                    { value: 'neutral', label: '⚪ Neutral', color: 'bg-gray-500' },
                    { value: 'vibrant', label: '🌈 Vibrant', color: 'bg-purple-500' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => updatePref('colorTheme', opt.value as UserPreferences['colorTheme'])}
                      className={`p-3 rounded-xl text-center transition-all ${
                        prefs.colorTheme === opt.value
                          ? 'bg-brand-500/20 border-brand-500 text-white'
                          : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'
                      } border`}
                    >
                      <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${opt.color}`} />
                      <div className="text-xs font-medium">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4 animate-fade-in text-center">
              <div className="text-5xl mb-4">🎬</div>
              <h3 className="text-xl font-bold text-white">You're all set, {prefs.displayName || 'Creator'}!</h3>
              <p className="text-zinc-400">
                Your preferences are saved. The AI agents will use these to create 
                videos tailored just for you.
              </p>
              
              <div className="bg-white/5 rounded-xl p-4 text-left space-y-2 mt-6">
                <div className="text-sm text-zinc-400">Your preferences:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-zinc-500">Type:</span> <span className="text-white">{prefs.videoType}</span></div>
                  <div><span className="text-zinc-500">Style:</span> <span className="text-white">{prefs.preferredStyle}</span></div>
                  <div><span className="text-zinc-500">Length:</span> <span className="text-white">{prefs.preferredLength}</span></div>
                  <div><span className="text-zinc-500">Voice:</span> <span className="text-white">{prefs.defaultVoice}</span></div>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-center mt-4">
                <input
                  type="checkbox"
                  id="autoSave"
                  checked={prefs.autoSave}
                  onChange={(e) => updatePref('autoSave', e.target.checked)}
                  className="rounded border-white/20 bg-white/5 text-brand-500 focus:ring-brand-500"
                />
                <label htmlFor="autoSave" className="text-sm text-zinc-400">
                  Remember my preferences for next time
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10 flex justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep(s => s - 1)}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              ← Back
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 text-zinc-400 hover:text-white transition-colors"
            >
              Skip for now
            </button>
          )}
          
          {step < totalSteps ? (
            <button
              onClick={() => setStep(s => s + 1)}
              className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              Start Creating
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserPreferencesModal;
