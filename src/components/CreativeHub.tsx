import React, { useState } from 'react';
import './ I I.css';

/**
 * Creative Hub - Multi-step AI-powered video creation workflow
 * 
 * Steps:
 * 1. Upload - Media intake
 * 2. Storyboard - AI-curated scene selection
 * 3. Script - AI-generated narration
 * 4. Music - AI music brief
 * 5. Launch - Kick off full pipeline
 */

type Step = 'upload' | 'storyboard' | 'script' | 'music' | 'launch';

interface Scene {
  id: string;
  imageUrl: string;
  caption: string;
  order: number;
}

interface CreativeHubProps {
  onPipelineStart?: (projectId: string) => void;
}

export default function CreativeHub({ onPipelineStart }: CreativeHubProps) {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [projectId, setProjectId] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [storyboard, setStoryboard] = useState<Scene[]>([]);
  const [script, setScript] = useState<string>('');
  const [musicBrief, setMusicBrief] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Chaos Monkey Simulation Helper
  const runStep = async (stepName: string, action: () => Promise<void>) => {
    setIsProcessing(true);
    setError(null);
    
    try {
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Chaos Monkey: 20% chance of failure
      if (Math.random() < 0.2) {
        throw new Error(`Chaos Monkey struck during ${stepName}! Agent unresponsive.`);
      }

      await action();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Mock AI-generated storyboard (replace with actual API call)
  const generateStoryboard = () => {
    runStep('Storyboard Generation', async () => {
      // Mock storyboard data
      const mockScenes: Scene[] = [
        {
          id: '1',
          imageUrl: '/placeholder-scene-1.jpg',
          caption: 'Opening shot: Family gathered around the kitchen table',
          order: 1,
        },
        {
          id: '2',
          imageUrl: '/placeholder-scene-2.jpg',
          caption: 'Close-up: Laughter and warm smiles',
          order: 2,
        },
        {
          id: '3',
          imageUrl: '/placeholder-scene-3.jpg',
          caption: 'Wide shot: Sunset walk in the park',
          order: 3,
        },
      ];
      
      setStoryboard(mockScenes);
      setCurrentStep('storyboard');
    });
  };

  // Mock AI script generation
  const generateScript = () => {
    runStep('Script Generation', async () => {
      const mockScript = `This week brought us together in ways both simple and profound.

The kitchen became our gathering place, where stories flowed as freely as the coffee. Those moments of laughter reminded us why we cherish these times together.

As the sun began its descent, we found ourselves walking familiar paths, yet seeing them through new eyes. The golden hour painted everything in warmth, a perfect reflection of the week we shared.`;
      
      setScript(mockScript);
      setCurrentStep('script');
    });
  };

  // Mock music brief generation
  const generateMusicBrief = () => {
    runStep('Music Brief Creation', async () => {
      const mockBrief = `Genre: Ambient / Acoustic
Mood: Warm, Reflective, Uplifting
Tempo: 85 BPM
Instruments: Piano, Acoustic Guitar, Strings
Style: Cinematic underscore with gentle build`;
      
      setMusicBrief(mockBrief);
      setCurrentStep('music');
    });
  };

  // Launch full pipeline
  const launchPipeline = () => {
    runStep('Pipeline Launch', async () => {
      const newProjectId = 'week-001';
      setProjectId(newProjectId);
      
      // 1. Trigger the pipeline via intake-upload
      const response = await fetch('/.netlify/functions/intake-upload', {
        method: 'POST',
        body: JSON.stringify({
          projectId: newProjectId,
          files: uploadedFiles.map(f => f.name), // In real app, upload to S3 first
          mock: true // Force mock mode for now
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start pipeline');
      }

      // Call parent callback to switch view
      if (onPipelineStart) {
        onPipelineStart(newProjectId);
      }
      
      // We don't set currentStep to 'launch' here because the parent component switches the view
    });
  };

  // File upload handler
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setUploadedFiles(Array.from(files));
    }
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { id: 'upload', label: 'Upload' },
      { id: 'storyboard', label: 'Storyboard' },
      { id: 'script', label: 'Script' },
      { id: 'music', label: 'Music' },
      { id: 'launch', label: 'Launch' },
    ];
    const currentStepIndex = steps.findIndex((s) => s.id === currentStep);

    return (
      <div className="step-indicator">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`step ${currentStep === step.id ? 'active' : ''} ${index < currentStepIndex ? 'completed' : ''}`.trim()}
          >
            <div className="step-number">{index + 1}</div>
            <div className="step-label">{step.label}</div>
          </div>
        ))}
      </div>
    );
  };

  // Render current step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'upload':
        return (
          <div className="step-content upload-step">
            <h2>Upload This Week's Media</h2>
            <p>Select photos and videos from your weekly memories</p>
            
            <div className="upload-zone">
              <input
                type="file"
                id="file-input"
                multiple
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="file-input"
              />
              <label htmlFor="file-input" className="upload-label">
                <div className="upload-icon">📁</div>
                <p>Click to browse or drag files here</p>
                <p className="upload-hint">Images, videos - all formats welcome</p>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="file-list">
                <h3>{uploadedFiles.length} files selected</h3>
                {error && <div className="error-message" style={{color: 'red', marginBottom: '10px'}}>⚠️ {error}</div>}
                <button
                  onClick={generateStoryboard}
                  className="btn-primary"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : error ? '🔄 Retry Production' : 'Generate Storyboard →'}
                </button>
              </div>
            )}
          </div>
        );

      case 'storyboard':
        return (
          <div className="step-content storyboard-step">
            <h2>AI-Generated Storyboard</h2>
            <p>Review and reorder the selected scenes</p>

            <div className="storyboard-grid">
              {storyboard.map((scene) => (
                <div key={scene.id} className="scene-card">
                  <div className="scene-number">{scene.order}</div>
                  <div className="scene-preview">
                    <div className="placeholder-image">📷</div>
                  </div>
                  <p className="scene-caption">{scene.caption}</p>
                </div>
              ))}
            </div>

            <div className="step-actions">
              <button onClick={() => setCurrentStep('upload')} className="btn-secondary" disabled={isProcessing}>
                ← Back
              </button>
              {error && <div className="error-message" style={{color: 'red', margin: '0 10px'}}>⚠️ {error}</div>}
              <button
                onClick={generateScript}
                className="btn-primary"
                disabled={isProcessing}
              >
                {isProcessing ? 'Generating...' : error ? '🔄 Retry Production' : 'Generate Script →'}
              </button>
            </div>
          </div>
        );

      case 'script':
        return (
          <div className="step-content script-step">
            <h2>AI-Generated Script</h2>
            <p>Edit the narration to match your voice</p>

            <textarea
              className="script-editor"
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={12}
            />

            <div className="step-actions">
              <button onClick={() => setCurrentStep('storyboard')} className="btn-secondary" disabled={isProcessing}>
                ← Back
              </button>
              {error && <div className="error-message" style={{color: 'red', margin: '0 10px'}}>⚠️ {error}</div>}
              <button
                onClick={generateMusicBrief}
                className="btn-primary"
                disabled={isProcessing}
              >
                {isProcessing ? 'Creating...' : error ? '🔄 Retry Production' : 'Create Music Brief →'}
              </button>
            </div>
          </div>
        );

      case 'music':
        return (
          <div className="step-content music-step">
            <h2>Music Brief</h2>
            <p>AI-selected soundtrack style based on your content</p>

            <div className="music-brief">
              <pre>{musicBrief}</pre>
            </div>

            <div className="step-actions">
              <button onClick={() => setCurrentStep('script')} className="btn-secondary" disabled={isProcessing}>
                ← Back
              </button>
              {error && <div className="error-message" style={{color: 'red', margin: '0 10px'}}>⚠️ {error}</div>}
              <button onClick={launchPipeline} className="btn-primary btn-launch" disabled={isProcessing}>
                {isProcessing ? 'Launching...' : error ? '🔄 Retry Production' : '🚀 Launch Pipeline'}
              </button>
            </div>
          </div>
        );

      case 'launch':
        return (
          <div className="step-content launch-step">
            <h2>🎬 Pipeline Launched!</h2>
            <p>Project ID: <code>{projectId}</code></p>
            <p className="launch-message">
              All six agents are now working on your video. Check the Pipeline Progress panel for
              real-time updates.
            </p>
            
            <button onClick={() => setCurrentStep('upload')} className="btn-primary">
              Create Another Video
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="creative-hub">
      <div className="hub-header">
        <h1>Creative Hub</h1>
        <p>Collaborate with AI to craft your weekly video</p>
      </div>

      {renderStepIndicator()}
      {renderStepContent()}
    </div>
  );
}
