import React, { useState } from 'react';
import './CreativeHub.css';

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

  // Mock AI-generated storyboard (replace with actual API call)
  const generateStoryboard = async () => {
    setIsProcessing(true);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
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
    setIsProcessing(false);
    setCurrentStep('storyboard');
  };

  // Mock AI script generation
  const generateScript = async () => {
    setIsProcessing(true);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockScript = `This week brought us together in ways both simple and profound.

The kitchen became our gathering place, where stories flowed as freely as the coffee. Those moments of laughter reminded us why we cherish these times together.

As the sun began its descent, we found ourselves walking familiar paths, yet seeing them through new eyes. The golden hour painted everything in warmth, a perfect reflection of the week we shared.`;
    
    setScript(mockScript);
    setIsProcessing(false);
    setCurrentStep('script');
  };

  // Mock music brief generation
  const generateMusicBrief = async () => {
    setIsProcessing(true);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const mockBrief = `Genre: Ambient / Acoustic
Mood: Warm, Reflective, Uplifting
Tempo: 85 BPM
Instruments: Piano, Acoustic Guitar, Strings
Style: Cinematic underscore with gentle build`;
    
    setMusicBrief(mockBrief);
    setIsProcessing(false);
    setCurrentStep('music');
  };

  // Launch full pipeline
  const launchPipeline = async () => {
    const newProjectId = `week-${Date.now()}`;
    setProjectId(newProjectId);
    setCurrentStep('launch');
    
    // Call parent callback to start pipeline
    if (onPipelineStart) {
      onPipelineStart(newProjectId);
    }
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

    return (
      <div className="step-indicator">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`step ${currentStep === step.id ? 'active' : ''} ${
              steps.findIndex(s => s.id === currentStep) > index ? 'completed' : ''
            }`}
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
                <button
                  onClick={generateStoryboard}
                  className="btn-primary"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Generate Storyboard →'}
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
              <button onClick={() => setCurrentStep('upload')} className="btn-secondary">
                ← Back
              </button>
              <button
                onClick={generateScript}
                className="btn-primary"
                disabled={isProcessing}
              >
                {isProcessing ? 'Generating...' : 'Generate Script →'}
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
              <button onClick={() => setCurrentStep('storyboard')} className="btn-secondary">
                ← Back
              </button>
              <button
                onClick={generateMusicBrief}
                className="btn-primary"
                disabled={isProcessing}
              >
                {isProcessing ? 'Creating...' : 'Create Music Brief →'}
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
              <button onClick={() => setCurrentStep('script')} className="btn-secondary">
                ← Back
              </button>
              <button onClick={launchPipeline} className="btn-primary btn-launch">
                🚀 Launch Pipeline
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
