import { useMemo, useState } from 'react';
import Upload from './Upload';
import './CreativeHub.css';

type StepKey = 'intake' | 'storyboard' | 'script' | 'music' | 'launch';

type Step = {
  key: StepKey;
  label: string;
  description: string;
};

type SceneCard = {
  id: string;
  title: string;
  description: string;
  asset: string;
  beat: 'Establishing' | 'Action' | 'Human Moment' | 'Reflective';
  duration: string;
  include: boolean;
};

type ScriptSegment = {
  id: string;
  heading: string;
  text: string;
};

type MusicBrief = {
  mood: string;
  tempo: string;
  palette: string;
  notes: string[];
};

type U2APreferences = {
  voiceStyle: 'serious' | 'friendly' | 'energetic';
  musicMood: 'contemplative' | 'upbeat' | 'dramatic' | 'nostalgic';
  videoLength: 'short' | 'medium' | 'long';
  attribution: 'full' | 'minimal';
};

type PlatformOption = {
  id: string;
  label: string;
  helper: string;
  aspect: string;
};

const steps: Step[] = [
  {
    key: 'intake',
    label: '1 · Intake',
    description: 'Upload or simulate weekly media for the recap.',
  },
  {
    key: 'storyboard',
    label: '2 · Storyboard',
    description: 'Gemini Director selects the strongest shots.',
  },
  {
    key: 'script',
    label: '3 · Script',
    description: 'AI writer drafts narration matched to the scenes.',
  },
  {
    key: 'music',
    label: '4 · Music Brief',
    description: 'Music agent proposes tempo, energy, and palette.',
  },
  {
    key: 'launch',
    label: '5 · Launch Pipeline',
    description: 'Hand control to the automation crew.',
  },
];

const defaultScenes: SceneCard[] = [
  {
    id: 'scene-01',
    title: 'Dawn Patrol',
    description: 'Wide drone shot of the bay just before sunrise to set the mood.',
    asset: 'DJI_0045.mp4',
    beat: 'Establishing',
    duration: '5s',
    include: true,
  },
  {
    id: 'scene-02',
    title: 'First Splash',
    description: 'Slow-motion launch from the dock with water droplets catching the light.',
    asset: 'GOPR1123.mp4',
    beat: 'Action',
    duration: '7s',
    include: true,
  },
  {
    id: 'scene-03',
    title: 'Charlie on Deck',
    description: 'Close-up of Charlie laughing while securing gear—human connection moment.',
    asset: 'IMG_9720.jpg',
    beat: 'Human Moment',
    duration: '4s',
    include: true,
  },
  {
    id: 'scene-04',
    title: 'Glide Path',
    description: 'Tracking shot of the efoil weaving between pylons, synced to beat grid.',
    asset: 'FPV_2211.mp4',
    beat: 'Action',
    duration: '8s',
    include: true,
  },
  {
    id: 'scene-05',
    title: 'Golden Hour Wrap',
    description: 'Sunset hug and high-five to close the recap on a reflective note.',
    asset: 'A7SIII_5634.mov',
    beat: 'Reflective',
    duration: '6s',
    include: true,
  },
];

const defaultScript: ScriptSegment[] = [
  {
    id: 'segment-01',
    heading: 'Opening Beat',
    text: 'Every Saturday starts before sunrise. The bay is calm, the boards are lined up, and the crew is buzzing.',
  },
  {
    id: 'segment-02',
    heading: 'Momentum',
    text: 'Charlie calls the line. Within seconds we are carving glass—each pass faster, tighter, cleaner.',
  },
  {
    id: 'segment-03',
    heading: 'Highlight',
    text: 'We pushed the tempo, replayed the best takes, and locked the beat grid to Charlie’s laugh.',
  },
  {
    id: 'segment-04',
    heading: 'Final Note',
    text: 'Another week, another story to tell. Sunset seals the reel; see you at week forty-five.',
  },
];

const defaultMusicBrief: MusicBrief = {
  mood: 'Energetic optimism with cinematic lift',
  tempo: '122 BPM (4/4)',
  palette: 'Suno electronic kit, layered guitars, side-chained pads, vocal chops',
  notes: [
    'Intro should swell into the first beat drop at 0:08 to match the dock launch.',
    'Layer subtle crowd ambience beneath the human moments.',
    'Beat grid exported to keep edits aligned with bar transitions.',
  ],
};

const defaultPreferences: U2APreferences = {
  voiceStyle: 'serious',
  musicMood: 'contemplative',
  videoLength: 'short',
  attribution: 'full',
};

const platforms: PlatformOption[] = [
  { id: 'tiktok', label: 'TikTok', helper: 'Short vertical', aspect: '9:16' },
  { id: 'reels', label: 'Reels', helper: 'Instagram', aspect: '9:16' },
  { id: 'shorts', label: 'Shorts', helper: 'YouTube', aspect: '9:16' },
  { id: 'linkedin', label: 'LinkedIn', helper: 'Professional', aspect: '16:9' },
  { id: 'x', label: 'X / Twitter', helper: 'Community', aspect: '16:9' },
];

const CreativeHub = () => {
  const [activeStep, setActiveStep] = useState<StepKey>('intake');
  const [scenes, setScenes] = useState<SceneCard[]>(defaultScenes);
  const [storyboardApproved, setStoryboardApproved] = useState(false);
  const [scriptApproved, setScriptApproved] = useState(false);
  const [musicApproved, setMusicApproved] = useState(false);
  const [queuedFiles, setQueuedFiles] = useState<File[]>([]);
  const [projectId, setProjectId] = useState('week44-example');
  const [launching, setLaunching] = useState(false);
  const [launchMessage, setLaunchMessage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<U2APreferences>(defaultPreferences);
  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0]?.id ?? 'tiktok');
  const [u2aBrief, setU2aBrief] = useState('');

  const unlocked: Record<StepKey, boolean> = useMemo(
    () => ({
      intake: true,
      storyboard: queuedFiles.length > 0,
      script: storyboardApproved,
      music: scriptApproved,
      launch: musicApproved,
    }),
    [musicApproved, queuedFiles.length, scriptApproved, storyboardApproved]
  );

  const activeIndex = steps.findIndex((step) => step.key === activeStep);

  const handleUploadCommitted = ({ projectId: id, files }: { projectId: string; files: File[] }) => {
    setProjectId(id);
    setQueuedFiles(files);
    setActiveStep('storyboard');
    setStoryboardApproved(false);
    setScriptApproved(false);
    setMusicApproved(false);
    setLaunchMessage(null);
  };

  const toggleScene = (sceneId: string) => {
    setScenes((current) =>
      current.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              include: !scene.include,
            }
          : scene
      )
    );
  };

  const handleApproveStoryboard = () => {
    setStoryboardApproved(true);
    setActiveStep('script');
  };

  const handleApproveScript = () => {
    setScriptApproved(true);
    setActiveStep('music');
  };

  const handleApproveMusic = () => {
    setMusicApproved(true);
    setActiveStep('launch');
  };

  const handleLaunchPipeline = async () => {
    setLaunching(true);
    setLaunchMessage(null);
    try {
      const response = await fetch('/.netlify/functions/start-pipeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer demo',
        },
        body: JSON.stringify({
          projectId,
          payload: {
            approvedScenes: scenes.filter((scene) => scene.include).length,
            preferences,
            platform: selectedPlatform,
            brief: u2aBrief,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Start-pipeline responded with ${response.status}`);
      }

      setLaunchMessage('Pipeline queued. Switch to Pipeline Monitor to watch narration, music, and compile steps execute.');
    } catch (error) {
      const details = error instanceof Error ? error.message : 'Unable to reach pipeline.';
      setLaunchMessage(details);
    } finally {
      setLaunching(false);
    }
  };

  const handlePreferenceChange = (key: keyof U2APreferences, value: U2APreferences[keyof U2APreferences]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  };

  const renderPreferences = () => (
    <div className="u2a-preferences">
      <h4>🎛️ Agent Preferences</h4>
      <div className="preference-row">
        <label htmlFor="voice-style">Narrator Voice</label>
        <select
          id="voice-style"
          value={preferences.voiceStyle}
          onChange={(event) => handlePreferenceChange('voiceStyle', event.target.value as U2APreferences['voiceStyle'])}
        >
          <option value="serious">Serious (Adam)</option>
          <option value="friendly">Friendly (Rachel)</option>
          <option value="energetic">Energetic (Josh)</option>
        </select>
      </div>
      <div className="preference-row">
        <label htmlFor="music-mood">Music Mood</label>
        <select
          id="music-mood"
          value={preferences.musicMood}
          onChange={(event) => handlePreferenceChange('musicMood', event.target.value as U2APreferences['musicMood'])}
        >
          <option value="contemplative">Contemplative</option>
          <option value="upbeat">Upbeat</option>
          <option value="dramatic">Dramatic</option>
          <option value="nostalgic">Nostalgic</option>
        </select>
      </div>
      <div className="preference-row">
        <label htmlFor="video-length">Video Length</label>
        <select
          id="video-length"
          value={preferences.videoLength}
          onChange={(event) => handlePreferenceChange('videoLength', event.target.value as U2APreferences['videoLength'])}
        >
          <option value="short">Short (30s)</option>
          <option value="medium">Medium (60s)</option>
          <option value="long">Long (90s)</option>
        </select>
      </div>
      <div className="preference-row">
        <label htmlFor="attribution">Credits Attribution</label>
        <select
          id="attribution"
          value={preferences.attribution}
          onChange={(event) => handlePreferenceChange('attribution', event.target.value as U2APreferences['attribution'])}
        >
          <option value="full">Full (Commons Good)</option>
          <option value="minimal">Minimal</option>
        </select>
      </div>
      <div className="preference-row preference-brief">
        <label htmlFor="u2a-brief">U2A Brief</label>
        <textarea
          id="u2a-brief"
          value={u2aBrief}
          onChange={(event) => setU2aBrief(event.target.value)}
          placeholder="Tell the agents the tone, call-to-action, or special notes for the release."
          rows={3}
        />
      </div>
    </div>
  );

  const useSampleIntake = () => {
    if (typeof File === 'undefined') {
      return;
    }
    const sampleFiles = ['DJI_0045.mp4', 'GOPR1123.mp4', 'IMG_9720.jpg'].map(
      (name) => new File([''], name, { type: 'application/octet-stream' })
    );
    setQueuedFiles(sampleFiles);
    setProjectId('week44-demo');
    setActiveStep('storyboard');
    setStoryboardApproved(false);
    setScriptApproved(false);
    setMusicApproved(false);
    setLaunchMessage(null);
  };

  const renderIntakeStep = () => (
    <div className="hub-panel">
      <Upload
        heading="Step 1 · Intake Upload"
        description="Stage weekly footage in the private vault. The Creative Hub will analyse it immediately."
        onCommitted={handleUploadCommitted}
        onQueueChange={(files) => setQueuedFiles(files)}
        defaultProjectId={projectId}
      />
      <div className="hub-panel-footer">
        <button type="button" className="link-btn" onClick={useSampleIntake}>
          Load sample intake (demo mode)
        </button>
      </div>
    </div>
  );

  const renderStoryboardStep = () => (
    <div className="hub-panel">
      <header className="panel-header">
        <h3>Gemini Director Storyboard</h3>
        <p>
          Review the suggested narrative arc. Toggle any card to include or exclude it before scripting.
        </p>
      </header>
      <div className="scene-grid">
        {scenes.map((scene) => (
          <button
            key={scene.id}
            type="button"
            className={`scene-card ${scene.include ? 'selected' : 'muted'}`}
            onClick={() => toggleScene(scene.id)}
          >
            <div className="scene-meta">
              <span className="scene-beat">{scene.beat}</span>
              <span className="scene-duration">{scene.duration}</span>
            </div>
            <h4>{scene.title}</h4>
            <p>{scene.description}</p>
            <footer>{scene.asset}</footer>
          </button>
        ))}
      </div>
      <div className="hub-actions">
        <button
          type="button"
          className="primary-btn"
          onClick={handleApproveStoryboard}
          disabled={!scenes.some((scene) => scene.include)}
        >
          Approve Storyboard
        </button>
        <p className="hint-text">{scenes.filter((scene) => scene.include).length} scenes selected.</p>
      </div>
    </div>
  );

  const renderScriptStep = () => (
    <div className="hub-panel">
      <header className="panel-header">
        <h3>AI Narration Draft</h3>
        <p>Each block aligns with a storyboard beat. Edit copy as needed before locking.</p>
      </header>
      <ol className="script-list">
        {defaultScript.map((segment) => (
          <li key={segment.id} className="script-block">
            <h4>{segment.heading}</h4>
            <p>{segment.text}</p>
          </li>
        ))}
      </ol>
      <div className="hub-actions">
        <button type="button" className="primary-btn" onClick={handleApproveScript}>
          Approve Script
        </button>
        <p className="hint-text">Locking the script primes ElevenLabs for narration.</p>
      </div>
    </div>
  );

  const renderMusicStep = () => (
    <div className="hub-panel">
      <header className="panel-header">
        <h3>Music Direction</h3>
        <p>Approve the beat grid brief that will be delivered to the Suno agent.</p>
      </header>
      <div className="brief-card">
        <dl>
          <div>
            <dt>Mood</dt>
            <dd>{defaultMusicBrief.mood}</dd>
          </div>
          <div>
            <dt>Tempo</dt>
            <dd>{defaultMusicBrief.tempo}</dd>
          </div>
          <div>
            <dt>Palette</dt>
            <dd>{defaultMusicBrief.palette}</dd>
          </div>
        </dl>
        <ul>
          {defaultMusicBrief.notes.map((note, index) => (
            <li key={index}>{note}</li>
          ))}
        </ul>
      </div>
      <div className="hub-actions">
        <button type="button" className="primary-btn" onClick={handleApproveMusic}>
          Approve Music Brief
        </button>
        <p className="hint-text">This brief seeds tempo, mood, and downbeat grid.</p>
      </div>
    </div>
  );

  const renderLaunchStep = () => (
    <div className="hub-panel">
      <header className="panel-header">
        <h3>Launch Automation</h3>
        <p>All creative inputs are locked. Launch the manifest to narrate, compose, and compile.</p>
      </header>
      <div className="launchpad">
        <div className="launchpad-header">
          <div>
            <h4>Click-to-Kick Launchpad</h4>
            <p>Select a primary channel so the agents align format, tone, and specs.</p>
          </div>
          <span className="launchpad-badge">Alignment Ready</span>
        </div>
        <div className="platform-grid">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              type="button"
              className={`platform-card ${selectedPlatform === platform.id ? 'selected' : ''}`}
              onClick={() => setSelectedPlatform(platform.id)}
            >
              <div className="platform-title">
                <span>{platform.label}</span>
                <span className="platform-aspect">{platform.aspect}</span>
              </div>
              <span className="platform-helper">{platform.helper}</span>
            </button>
          ))}
        </div>
      </div>
      {renderPreferences()}
      <div className="summary-card">
        <h4>Ready for Week {projectId.replace(/\D/g, '') || projectId}</h4>
        <ul>
          <li>{queuedFiles.length} intake files staged for the vault.</li>
          <li>{scenes.filter((scene) => scene.include).length} storyboard beats approved.</li>
          <li>Script and music brief synced with pronunciation dictionary.</li>
        </ul>
      </div>
      <div className="hub-actions">
        <button type="button" className="primary-btn" onClick={handleLaunchPipeline} disabled={launching}>
          {launching ? 'Notifying Agents…' : 'Launch Pipeline'}
        </button>
        {launchMessage && <p className="hint-text status-message">{launchMessage}</p>}
      </div>
    </div>
  );

  const renderActivePanel = () => {
    switch (activeStep) {
      case 'intake':
        return renderIntakeStep();
      case 'storyboard':
        return renderStoryboardStep();
      case 'script':
        return renderScriptStep();
      case 'music':
        return renderMusicStep();
      case 'launch':
        return renderLaunchStep();
      default:
        return null;
    }
  };

  return (
    <section className="creative-hub card">
      <header className="hub-header">
        <h2>Creative Hub</h2>
        <p>
          Collaborate with the AI Director before kicking off automation. Approve the storyboard,
          script, and music brief to hand a complete creative vision to the pipeline.
        </p>
      </header>
      <div className="hub-grid">
        <nav className="hub-steps" aria-label="Creative hub steps">
          {steps.map((step, index) => {
            const status = index < activeIndex ? 'complete' : step.key === activeStep ? 'active' : 'upcoming';
            const disabled = !unlocked[step.key];
            return (
              <button
                key={step.key}
                type="button"
                className={`hub-step ${status}`}
                onClick={() => unlocked[step.key] && setActiveStep(step.key)}
                disabled={disabled && step.key !== activeStep}
              >
                <span className="hub-step-label">{step.label}</span>
                <span className="hub-step-description">{step.description}</span>
              </button>
            );
          })}
        </nav>
        {renderActivePanel()}
      </div>
    </section>
  );
};

export default CreativeHub;
