import React, { useState } from 'react';

/**
 * ResultsPreview - Video player with feedback buttons for EGO-Prompt learning
 * 
 * Features:
 * - Video player with controls
 * - Download button
 * - 👍/👎 feedback buttons that close the learning loop
 * - Credits display
 * - Share options
 */

interface ResultsPreviewProps {
  projectId: string;
  videoUrl: string;
  creditsUrl?: string;
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

export default function ResultsPreview({ 
  projectId, 
  videoUrl, 
  creditsUrl,
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
          // These would come from the pipeline result in a real implementation
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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `${projectId}_FINAL_RECAP.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">🎬 Your Video is Ready!</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">Project: {projectId}</p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className="p-2 hover:bg-[var(--color-bg-primary)] rounded-lg transition-colors"
          >
            <span className="text-xl">✕</span>
          </button>
        )}
      </div>

      {/* Video Player */}
      <div className="relative bg-black aspect-video">
        <video 
          src={videoUrl}
          controls
          className="w-full h-full"
          poster="/test-assets/video-poster.jpg"
        >
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Action Buttons */}
      <div className="p-4 space-y-4">
        {/* Feedback Section */}
        <div className="bg-[var(--color-bg-primary)] rounded-lg p-4">
          <p className="text-center text-[var(--color-text-secondary)] mb-3">
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
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                <span className="text-2xl">👍</span>
                <span>Keep (Good)</span>
              </button>
              <button
                onClick={() => handleFeedback('bad')}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg font-medium transition-colors"
              >
                <span className="text-2xl">👎</span>
                <span>Discard (Bad)</span>
              </button>
            </div>
          )}

          {feedbackGiven && (
            <div className={`text-center p-3 rounded-lg ${
              feedbackGiven === 'good' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
            }`}>
              <span className="text-2xl mr-2">{feedbackGiven === 'good' ? '✅' : '🔄'}</span>
              {feedbackGiven === 'good' 
                ? 'Great! We\'ll remember your preferences for next time.'
                : 'Got it. We\'ll adjust our approach for future videos.'
              }
            </div>
          )}
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
          >
            <span>⬇️</span>
            <span>Download Video</span>
          </button>

          <button
            onClick={handleShowCredits}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-medium transition-colors"
          >
            <span>📜</span>
            <span>{showCredits ? 'Hide Credits' : 'View Credits'}</span>
          </button>

          <button
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[var(--color-bg-primary)] hover:bg-[var(--color-border)] border border-[var(--color-border)] rounded-lg font-medium transition-colors"
          >
            <span>🔗</span>
            <span>Share</span>
          </button>
        </div>

        {/* Credits Panel */}
        {showCredits && (
          <div className="bg-[var(--color-bg-primary)] rounded-lg p-4 border border-[var(--color-border)]">
            <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
              <span>📜</span> Credits & Attribution
            </h3>
            
            {credits ? (
              <div className="space-y-3">
                <div className="text-sm text-[var(--color-text-secondary)]">
                  <p><strong>Project:</strong> {credits.project_id}</p>
                  <p><strong>Generated:</strong> {new Date(credits.generated_at).toLocaleString()}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">AI Services Used:</h4>
                  <ul className="space-y-1">
                    {credits.ai_services?.map((service, idx) => (
                      <li key={idx} className="text-sm text-[var(--color-text-secondary)] flex items-center gap-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <strong>{service.service}</strong> - {service.role}
                        {service.model && <span className="text-xs opacity-60">({service.model})</span>}
                      </li>
                    ))}
                  </ul>
                </div>

                {credits.commons_good_statement && (
                  <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <h4 className="font-medium text-purple-400 mb-1">🌍 For the Commons Good</h4>
                    <p className="text-sm text-[var(--color-text-secondary)]">
                      {credits.commons_good_statement}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-[var(--color-text-secondary)]">Loading credits...</p>
              </div>
            )}

            {!credits && !creditsUrl && (
              <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">
                Credits information not available for this video.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
