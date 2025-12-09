/**
 * ResultsPreview Component
 *
 * Displays completed video with playback controls, download button,
 * and thumbs up/down feedback buttons for the learning loop.
 *
 * Version: 1.0.0
 * Last Updated: 2025-12-09
 */

import React, { useState } from 'react';
import './ResultsPreview.css';

export interface VideoResult {
  videoUrl: string;
  projectId: string;
  metadata?: {
    duration?: number;
    resolution?: string;
    platform?: string;
    fileSize?: number;
  };
  credits?: {
    music?: string;
    voice?: string;
    platform?: string;
  };
}

export interface ResultsPreviewProps {
  result: VideoResult;
  onClose: () => void;
  onFeedback?: (projectId: string, rating: 'good' | 'bad', comments?: string) => Promise<void>;
}

export const ResultsPreview: React.FC<ResultsPreviewProps> = ({
  result,
  onClose,
  onFeedback,
}) => {
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState('');
  const [selectedRating, setSelectedRating] = useState<'good' | 'bad' | null>(null);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = result.videoUrl;
    link.download = `${result.projectId}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFeedback = async (rating: 'good' | 'bad') => {
    if (!onFeedback) return;

    setSelectedRating(rating);

    // If rating is bad, show comments box
    if (rating === 'bad') {
      setShowComments(true);
      return;
    }

    // For good ratings, submit immediately
    await submitFeedback(rating);
  };

  const submitFeedback = async (rating: 'good' | 'bad') => {
    if (!onFeedback) return;

    setSubmittingFeedback(true);

    try {
      await onFeedback(result.projectId, rating, comments || undefined);
      setFeedbackSubmitted(true);
      setShowComments(false);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('Failed to submit feedback. Please try again.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (selectedRating) {
      await submitFeedback(selectedRating);
    }
  };

  return (
    <div className="results-preview-overlay" onClick={onClose}>
      <div className="results-preview-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="results-preview-header">
          <h2>🎉 Your Video is Ready!</h2>
          <button className="close-button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        {/* Video Player */}
        <div className="video-player-container">
          <video
            controls
            autoPlay
            className="video-player"
            src={result.videoUrl}
            aria-label="Generated video preview"
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Metadata */}
        {result.metadata && (
          <div className="video-metadata">
            {result.metadata.duration && (
              <span className="metadata-item">
                ⏱️ {Math.round(result.metadata.duration)}s
              </span>
            )}
            {result.metadata.resolution && (
              <span className="metadata-item">
                📐 {result.metadata.resolution}
              </span>
            )}
            {result.metadata.platform && (
              <span className="metadata-item">
                📱 {result.metadata.platform}
              </span>
            )}
            {result.metadata.fileSize && (
              <span className="metadata-item">
                💾 {(result.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          <button className="download-button" onClick={handleDownload}>
            📥 Download Video
          </button>

          <a
            href={result.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="share-button"
          >
            🔗 Open in New Tab
          </a>
        </div>

        {/* Feedback Section */}
        {!feedbackSubmitted && onFeedback && (
          <div className="feedback-section">
            <h3>How did we do?</h3>
            <p className="feedback-description">
              Your feedback helps the AI learn your preferences for future videos.
            </p>

            <div className="feedback-buttons">
              <button
                className={`feedback-button thumbs-up ${selectedRating === 'good' ? 'selected' : ''}`}
                onClick={() => handleFeedback('good')}
                disabled={submittingFeedback}
                aria-label="Good video"
              >
                👍 Keep It (Good)
              </button>

              <button
                className={`feedback-button thumbs-down ${selectedRating === 'bad' ? 'selected' : ''}`}
                onClick={() => handleFeedback('bad')}
                disabled={submittingFeedback}
                aria-label="Bad video"
              >
                👎 Discard (Bad)
              </button>
            </div>

            {/* Comments Box (shown when thumbs down) */}
            {showComments && (
              <div className="feedback-comments">
                <label htmlFor="feedback-comments-input">
                  What could be improved? (optional)
                </label>
                <textarea
                  id="feedback-comments-input"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="e.g., 'Too fast pacing', 'Music too loud', 'Wrong mood'..."
                  rows={4}
                  disabled={submittingFeedback}
                />
                <div className="comment-actions">
                  <button
                    onClick={() => {
                      setShowComments(false);
                      setSelectedRating(null);
                      setComments('');
                    }}
                    disabled={submittingFeedback}
                    className="cancel-button"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCommentSubmit}
                    disabled={submittingFeedback}
                    className="submit-button"
                  >
                    {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Feedback Success Message */}
        {feedbackSubmitted && (
          <div className="feedback-success">
            <div className="success-icon">✅</div>
            <h3>Thank you for your feedback!</h3>
            <p>
              The AI will learn from your preferences to make even better videos next time.
            </p>
          </div>
        )}

        {/* Credits */}
        {result.credits && (
          <div className="credits-section">
            <h4>Credits</h4>
            <div className="credits-content">
              {result.credits.music && (
                <p>🎵 Music by {result.credits.music}</p>
              )}
              {result.credits.voice && (
                <p>🎙️ Voice by {result.credits.voice}</p>
              )}
              {result.credits.platform && (
                <p>🤖 Generated with {result.credits.platform}</p>
              )}
              <p className="commons-good-notice">
                For the Commons Good - Open Access Content Creation
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResultsPreview;
