import React, { useEffect, useState } from "react";
import { Play, AlertCircle, CheckCircle, Loader2, Film, ExternalLink } from "lucide-react";

const STATUS = {
  idle: { label: "Ready to Generate", tone: "text-gray-500", icon: Film },
  preparing: { label: "Dispatching Renderer", tone: "text-blue-500", icon: Loader2 },
  generating: { label: "Rendering Video", tone: "text-sky-500", icon: Loader2 },
  completed: { label: "Generation Complete", tone: "text-green-500", icon: CheckCircle },
  error: { label: "Generation Failed", tone: "text-red-500", icon: AlertCircle },
};

const rendererLabel = (backend) => {
  if (backend === "veo2") return "Veo 2";
  if (backend === "gemini_storyboard") return "Gemini Storyboard";
  if (backend === "remotion") return "Remotion";
  if (backend === "none") return "Disabled";
  return backend || "Unknown";
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollRender(pollUrl) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const response = await fetch(pollUrl);
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Render progress failed (${response.status})`);
    }

    if (data.done && data.outputFile) {
      return data;
    }

    if (data.done && data.error) {
      throw new Error(data.error);
    }

    await sleep(8000);
  }

  throw new Error("Render did not finish before the polling window expired.");
}

function VideoGenerator({ projectId }) {
  const [prompt, setPrompt] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (projectId && !prompt) {
      setPrompt(`Generate a travel memory video for project: ${projectId}`);
    }
  }, [projectId, prompt]);

  const handleGenerate = async () => {
    const narrative = prompt.trim();
    if (!narrative) {
      setError("Enter a video prompt before dispatching the renderer.");
      return;
    }

    const effectiveProjectId = projectId || `video-${Date.now()}`;
    const runId = `video-${Date.now()}`;

    setError("");
    setStatus("preparing");
    setResult(null);

    try {
      const response = await fetch("/.netlify/functions/compile-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: effectiveProjectId,
          runId,
          narrative,
          resolution: "1080p",
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok && response.status !== 202) {
        throw new Error(data.message || data.error || data.reason || `Renderer failed (${response.status})`);
      }

      if (data.disabled === true || data.editor_backend === "gemini_storyboard") {
        throw new Error(data.message || data.reason || "Renderer did not produce a video file.");
      }

      if (data.status === "rendering" && data.pollUrl) {
        setStatus("generating");
        setResult({
          runId,
          pollUrl: data.pollUrl,
          renderer: rendererLabel(data.editor_backend),
          jobId: data.jobId,
        });
        const done = await pollRender(data.pollUrl);
        setResult({
          runId,
          url: done.outputFile,
          renderer: rendererLabel(done.backend || data.editor_backend),
          jobId: data.jobId || done.operationName,
          duration: data.duration,
        });
        setStatus("completed");
        return;
      }

      if (!data.videoUrl) {
        throw new Error("Renderer returned without a videoUrl or pollUrl.");
      }

      setResult({
        runId,
        url: data.videoUrl,
        renderer: rendererLabel(data.editor_backend),
        duration: data.duration,
      });
      setStatus("completed");
    } catch (err) {
      setError(err.message || "Generation failed");
      setStatus("error");
    }
  };

  const StatusIcon = STATUS[status].icon;
  const busy = status === "preparing" || status === "generating";

  return (
    <div className="bg-[var(--color-bg-secondary)] rounded-xl border border-[var(--color-border)] shadow-sm overflow-hidden">
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-[var(--color-text-secondary)]">
            Video Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe the video you want to generate..."
            className="w-full h-32 px-4 py-3 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
          />
          {projectId && (
            <p className="text-xs text-[var(--color-text-secondary)] flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Linked to Project: <span className="font-mono text-[var(--color-text-primary)]">{projectId}</span>
            </p>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-sm text-red-400">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={busy}
          className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
            busy
              ? "bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] cursor-not-allowed"
              : "bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-500/20"
          }`}
        >
          {busy ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {STATUS[status].label}
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" /> Generate Video
            </>
          )}
        </button>

        {(status !== "idle" || result) && (
          <div className="pt-6 border-t border-[var(--color-border)] animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-2 rounded-full ${status === "completed" ? "bg-green-500/10 text-green-500" : "bg-sky-500/10 text-sky-500"}`}>
                <StatusIcon className={`w-5 h-5 ${busy ? "animate-spin" : ""}`} />
              </div>
              <div>
                <h3 className="font-medium">{STATUS[status].label}</h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {result?.renderer ? `Renderer: ${result.renderer}` : "Waiting for renderer response"}
                </p>
              </div>
            </div>

            {result?.jobId && (
              <div className="mb-4 rounded-lg bg-[var(--color-bg-primary)] border border-[var(--color-border)] p-3 text-xs">
                <span className="text-[var(--color-text-secondary)]">Job:</span>{" "}
                <span className="font-mono break-all">{result.jobId}</span>
              </div>
            )}

            {result?.url && status === "completed" && (
              <div className="space-y-3">
                <video
                  src={result.url}
                  controls
                  className="w-full aspect-video bg-black rounded-lg border border-[var(--color-border)]"
                />
                <a
                  href={result.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-sky-400 hover:text-sky-300"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open rendered video
                </a>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default VideoGenerator;
