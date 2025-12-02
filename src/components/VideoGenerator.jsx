import React, { useEffect, useMemo, useState } from "react";
import { Play, AlertCircle, CheckCircle, Loader2, Key, Plus, Trash2, Film, Settings } from "lucide-react";

const STORAGE_KEY = "sirtrav-video-api-keys";

const STATUS = {
  idle: { label: "Ready to Generate", tone: "text-gray-500", icon: Film },
  preparing: { label: "Validating request...", tone: "text-blue-500", icon: Loader2 },
  generating: { label: "Generating Video...", tone: "text-purple-500", icon: Loader2 },
  processing: { label: "Processing Assets...", tone: "text-indigo-500", icon: Loader2 },
  completed: { label: "Generation Complete", tone: "text-green-500", icon: CheckCircle },
  error: { label: "Generation Failed", tone: "text-red-500", icon: AlertCircle },
};

const maskKey = (value) => {
  if (!value) return "";
  const tail = value.slice(-4);
  return `${"*".repeat(Math.max(value.length - 4, 0))}${tail}`;
};

const generateId = () => {
  try {
    if (typeof globalThis !== "undefined" && typeof globalThis.crypto?.randomUUID === "function") {
      return globalThis.crypto.randomUUID();
    }
  } catch (err) {
    // Fallback
  }
  return `key-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

function VideoGenerator({ projectId }) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [selectedKeyId, setSelectedKeyId] = useState("");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [newKeyLabel, setNewKeyLabel] = useState("");
  const [showKeyManager, setShowKeyManager] = useState(false);

  // Load API Keys
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setApiKeys(parsed);
          if (parsed[0]?.id) setSelectedKeyId(parsed[0].id);
        }
      }
    } catch (err) {
      console.warn("Failed to read stored API keys", err);
    }
  }, []);

  // Save API Keys
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(apiKeys));
    } catch (err) {
      console.warn("Failed to persist API keys", err);
    }
  }, [apiKeys]);

  // Auto-fill prompt from projectId if available and prompt is empty
  useEffect(() => {
    if (projectId && !prompt) {
      setPrompt(`Generate a travel memory video for project: ${projectId}`);
    }
  }, [projectId]);

  const selectedKey = useMemo(
    () => apiKeys.find((item) => item.id === selectedKeyId),
    [apiKeys, selectedKeyId]
  );

  const handleSaveKey = () => {
    const trimmedValue = newKeyValue.trim();
    if (!trimmedValue) {
      setError("Provide an API key value before saving.");
      return;
    }
    const id = generateId();
    const label = newKeyLabel.trim() || `Key ${apiKeys.length + 1}`;
    const newKey = { id, label, value: trimmedValue, created: Date.now() };
    
    setApiKeys((prev) => [...prev, newKey]);
    setSelectedKeyId(id);
    setNewKeyValue("");
    setNewKeyLabel("");
    setError("");
    setShowKeyManager(false);
  };

  const handleDeleteKey = (id) => {
    setApiKeys((prev) => prev.filter((k) => k.id !== id));
    if (selectedKeyId === id) setSelectedKeyId("");
  };

  const handleGenerate = async () => {
    if (!selectedKey) {
      setError("Please select or add a valid API Key.");
      return;
    }
    if (!prompt.trim()) {
      setError("Please enter a prompt for the video.");
      return;
    }

    setError("");
    setStatus("preparing");
    setResult(null);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      setStatus("generating");
      await new Promise(resolve => setTimeout(resolve, 2000));
      setStatus("processing");
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setResult({
        url: "https://example.com/video.mp4", // Mock URL
        thumbnail: "https://placehold.co/600x400/1a1a1a/purple?text=Video+Preview",
        duration: "00:15"
      });
      setStatus("completed");
    } catch (err) {
      setError(err.message || "Generation failed");
      setStatus("error");
    }
  };

  const StatusIcon = STATUS[status].icon;

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
      <div className="p-6 space-y-6">
        
        {/* API Key Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-[var(--color-text-secondary)] flex items-center gap-2">
              <Key className="w-4 h-4" /> API Configuration
            </label>
            <button 
              onClick={() => setShowKeyManager(!showKeyManager)}
              className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              {showKeyManager ? "Hide Manager" : "Manage Keys"}
            </button>
          </div>

          {showKeyManager ? (
            <div className="p-4 bg-[var(--color-bg-primary)] rounded-lg border border-[var(--color-border)] space-y-4 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Key Label (e.g. Production Key)"
                  value={newKeyLabel}
                  onChange={(e) => setNewKeyLabel(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="sk-..."
                    value={newKeyValue}
                    onChange={(e) => setNewKeyValue(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <button
                    onClick={handleSaveKey}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Add
                  </button>
                </div>
              </div>
              
              {apiKeys.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[var(--color-border)]">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-2 hover:bg-[var(--color-bg-secondary)] rounded-md group">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{key.label}</span>
                        <span className="text-xs text-[var(--color-text-secondary)] font-mono">{maskKey(key.value)}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteKey(key.id)}
                        className="p-1 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <select
              value={selectedKeyId}
              onChange={(e) => setSelectedKeyId(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="">Select an API Key...</option>
              {apiKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.label} ({maskKey(key.value)})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Prompt Section */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Video Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video you want to generate..."
            className="w-full h-32 px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
          />
          {projectId && (
            <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              Linked to Project: <span className="font-mono text-[var(--color-text-primary)]">{projectId}</span>
            </p>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={status !== "idle" && status !== "completed" && status !== "error"}
          className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
            status === "idle" || status === "completed" || status === "error"
              ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/20"
              : "bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed"
          }`}
        >
          {status === "idle" || status === "completed" || status === "error" ? (
            <>
              <Play className="w-4 h-4 fill-current" /> Generate Video
            </>
          ) : (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {STATUS[status].label}
            </>
          )}
        </button>

        {/* Result Preview */}
        {(status !== "idle" || result) && (
          <div className="pt-6 border-t border-[var(--color-border)] animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${status === "completed" ? "bg-green-500/10 text-green-500" : "bg-blue-500/10 text-blue-500"}`}>
                <StatusIcon className={`w-5 h-5 ${status === "generating" || status === "processing" || status === "preparing" ? "animate-spin" : ""}`} />
              </div>
              <div>
                <h3 className="font-medium">{STATUS[status].label}</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {status === "completed" ? "Video is ready to view" : "Please wait while we process your request"}
                </p>
              </div>
            </div>

            {result && status === "completed" && (
              <div className="relative aspect-video bg-black rounded-lg overflow-hidden group border border-[var(--color-border)]">
                <img src={result.thumbnail} alt="Video Preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <button className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center hover:bg-white/20 transition-colors">
                    <Play className="w-8 h-8 text-white fill-white ml-1" />
                  </button>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 rounded text-xs font-mono text-white">
                  {result.duration}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoGenerator;
