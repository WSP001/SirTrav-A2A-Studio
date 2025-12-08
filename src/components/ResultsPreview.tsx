import React, { useState } from 'react';
import { Download, Share2, FileText, ThumbsUp, ThumbsDown, X, ExternalLink, Play, Loader } from 'lucide-react';

/**
 * ResultsPreview - Video player with feedback buttons for EGO-Prompt learning
 * 
 * v1.8.0-FORMAT Features:
 * - Video player with controls
 * - Output format display (Personal/Social + platform info)
 * - Download button with format-aware filename
 * - 👍/👎 feedback buttons that close the learning loop
 * - Credits display
 * - Share options
 */

type OutputObjective = 'personal' | 'social';
type SocialPlatform = 'tiktok' | 'youtube_shorts' | 'instagram' | 'youtube_full';

interface OutputFormat {
  objective: OutputObjective;
  platform?: SocialPlatform;
  aspectRatio: string;
  maxDuration?: number;
}

interface ResultsPreviewProps {
  projectId: string;
  videoUrl: string;
  creditsUrl?: string;
  outputFormat?: OutputFormat;
  onFeedback?: (rating: 'good' | 'bad') => void;
  onClose?: () => void;
}

interface Credits {
  version: string;
  project_id: string;
  generated_at: string;
  ai_services: Array<{
    service: string;
    role: string;
    model?: string;
  }>;
  commons_good_statement: string;
}

// Platform display configs
const PLATFORM_DISPLAY = {
  tiktok: { name: 'TikTok', icon: '📱', color: 'from-pink-500 to-cyan-400' },
  youtube_shorts: { name: 'YouTube Shorts', icon: '▶️', color: 'from-red-500 to-red-600' },
  instagram: { name: 'Instagram Reels', icon: '📸', color: 'from-purple-500 to-pink-500' },
  youtube_full: { name: 'YouTube', icon: '🎬', color: 'from-red-600 to-red-700' },
};

export default function ResultsPreview({ 
  projectId, 
  videoUrl, 
  creditsUrl,
  outputFormat,
  onFeedback,
  onClose 
}: ResultsPreviewProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<'good' | 'bad' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCredits, setShowCredits] = useState(false);
  const [credits, setCredits] = useState<Credits | null>(null);

  const handleFeedback = async (rating: 'good' | 'bad') => {
    if (feedbackGiven || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const response = await fetch('/.netlify/functions/submit-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          rating,
          outputFormat,
          theme: 'reflection',
          mood: 'contemplative'
        })
      });

      if (response.ok) {
        setFeedbackGiven(rating);
        onFeedback?.(rating);
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadCredits = async () => {
    if (credits || !creditsUrl) return;
    
    try {
      const response = await fetch(creditsUrl);
      if (response.ok) {
        const data = await response.json();
        setCredits(data);
      }
    } catch (err) {
      console.error('Failed to load credits:', err);
    }
  };

  const handleShowCredits = () => {
    setShowCredits(!showCredits);
    if (!showCredits) {
      loadCredits();
    }
  };

  const getDownloadFilename = () => {
    const base = `${projectId}_FINAL_RECAP`;
    if (outputFormat?.objective === 'social' && outputFormat.platform) {
      return `${base}_${outputFormat.platform.toUpperCase()}.mp4`;
    }
    return `${base}_PERSONAL.mp4`;
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = getDownloadFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Determine aspect ratio class for video container
  const getAspectRatioClass = () => {
    if (outputFormat?.aspectRatio === '9:16') {
      return 'aspect-[9/16] max-w-sm mx-auto';
    }
    return 'aspect-video';
  };

  return (
    <div className="glass-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-2xl">🎬</span> Your Video is Ready!
          </h2>
          <p className="text-sm text-gray-400 mt-1">Project: {projectId}</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Output Format Badge */}
      {outputFormat && (
        <div className="px-4 py-3 bg-white/5 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {outputFormat.objective === 'personal' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                  <span>🔒</span>
                  <span className="text-sm font-medium text-emerald-300">Personal / Family</span>
                </div>
              ) : (
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${
                  PLATFORM_DISPLAY[outputFormat.platform || 'tiktok'].color
                } bg-opacity-20`}>
                  <span>{PLATFORM_DISPLAY[outputFormat.platform || 'tiktok'].icon}</span>
                  <span className="text-sm font-medium text-white">
                    {PLATFORM_DISPLAY[outputFormat.platform || 'tiktok'].name}
                  </span>
                </div>
              )}
              <span className="text-xs px-2 py-1 rounded bg-white/10 text-gray-400">
                {outputFormat.aspectRatio}
              </span>
              {outputFormat.maxDuration && (
                <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">
                  {outputFormat.maxDuration}s
                </span>
              )}
            </div>
            <span className={`text-xs px-2 py-1 rounded ${
              outputFormat.objective === 'personal' 
                ? 'bg-emerald-500/20 text-emerald-300' 
                : 'bg-brand-500/20 text-brand-300'
            }`}>
              {outputFormat.objective === 'personal' ? '🔒 Private' : '🌐 Public'}
            </span>
          </div>
        </div>
      )}

      {/* Video Player */}
      <div className="relative bg-black p-4">
        <div className={`${getAspectRatioClass()} bg-gray-900 rounded-lg overflow-hidden`}>
          <video 
            src={videoUrl}
            controls
            className="w-full h-full object-contain"
            poster="/test-assets/video-poster.jpg"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-4">
        {/* Feedback Section */}
        <div className="glass-card p-4">
          <p className="text-center text-gray-400 mb-3">
            {feedbackGiven 
              ? `Thanks for your feedback! You rated this video as "${feedbackGiven}".`
              : 'How did we do? Your feedback helps the AI learn your preferences.'
            }
          </p>
          
          {!feedbackGiven && (
            <div className="flex justify-center gap-4">
              <button
                onClick={() => handleFeedback('good')}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg shadow-emerald-500/20"
              >
                {isSubmitting ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <ThumbsUp className="w-5 h-5" />
                )}
                <span>Keep (Good)</span>
              </button>
              <button
                onClick={() => handleFeedback('bad')}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 disabled:opacity-50 rounded-lg font-medium transition-all shadow-lg shadow-red-500/20"
              >
                {isSubmitting ? (
                  <Loader className="w-5 h-5 animate-spin" />
                ) : (
                  <ThumbsDown className="w-5 h-5" />
                )}
                <span>Discard (Bad)</span>
              </button>
            </div>
          )}

          {feedbackGiven && (
            <div className={`text-center p-3 rounded-lg ${
              feedbackGiven === 'good' ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-red-500/20 border border-red-500/30'
            }`}>
              <span className="text-2xl mr-2">{feedbackGiven === 'good' ? '✅' : '🔄'}</span>
              <span className={feedbackGiven === 'good' ? 'text-emerald-300' : 'text-red-300'}>
                {feedbackGiven === 'good' 
                  ? 'Great! We\'ll remember your preferences for next time.'
                  : 'Got it. We\'ll adjust our approach for future videos.'
                }
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 rounded-lg font-medium transition-all shadow-lg shadow-blue-500/20"
          >
            <Download className="w-5 h-5" />
            <span>Download</span>
          </button>

          <button
            onClick={handleShowCredits}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 rounded-lg font-medium transition-all shadow-lg shadow-purple-500/20"
          >
            <FileText className="w-5 h-5" />
            <span>{showCredits ? 'Hide Credits' : 'View Credits'}</span>
          </button>

          <button
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 glass-card hover:bg-white/10 rounded-lg font-medium transition-all"
          >
            <Share2 className="w-5 h-5" />
            <span>Share</span>
          </button>
        </div>

        {/* Platform-specific publish button for social media */}
        {outputFormat?.objective === 'social' && outputFormat.platform && (
          <button className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r ${
            PLATFORM_DISPLAY[outputFormat.platform].color
          } rounded-lg font-medium transition-all shadow-lg`}>
            <ExternalLink className="w-5 h-5" />
            <span>Publish to {PLATFORM_DISPLAY[outputFormat.platform].name}</span>
          </button>
        )}

        {/* Credits Panel */}
        {showCredits && (
          <div className="glass-card p-4 animate-fade-in">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-white">
              <span>📜</span> Credits & Attribution
            </h3>
            
            {credits ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-400">
                  <p><strong className="text-gray-300">Project:</strong> {credits.project_id}</p>
                  <p><strong className="text-gray-300">Generated:</strong> {new Date(credits.generated_at).toLocaleString()}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-gray-300">AI Services Used:</h4>
                  <ul className="space-y-1">
                    {credits.ai_services?.map((service, idx) => (
                      <li key={idx} className="text-sm text-gray-400 flex items-center gap-2">
                        <span className="w-2 h-2 bg-brand-500 rounded-full"></span>
                        <strong className="text-gray-300">{service.service}</strong> - {service.role}
                        {service.model && <span className="text-xs opacity-60">({service.model})</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                {credits.commons_good_statement && (
                  <div className="mt-4 p-3 bg-brand-500/10 border border-brand-500/30 rounded-lg">
                    <h4 className="font-medium text-brand-400 mb-1">🌍 For the Commons Good</h4>
                    <p className="text-sm text-gray-400">
                      {credits.commons_good_statement}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <Loader className="w-6 h-6 text-brand-500 animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-400">Loading credits...</p>
              </div>
            )}

            {!credits && !creditsUrl && (
              <p className="text-sm text-gray-400 text-center py-4">
                Credits information not available for this video.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export { ResultsPreview };
