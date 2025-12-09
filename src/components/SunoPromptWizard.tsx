import React, { useEffect, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { setTheme } from "../lib/theme";

/**
 * SunoPromptWizard v1.1.0-THEME
 * -------------------------------------------------------------
 * A compact React panel that:
 * 1) Renders copy-ready Suno prompts from a YAML-like config
 * 2) Provides a file-drop for MP3/WAV
 * 3) Generates a naive beat-grid in-browser (WebAudio) and lets you
 *    download the grid JSON **or** POST it to a Netlify function
 *    (/.netlify/functions/register-music) for auto-registration.
 * 4) Persists theme attachment to localStorage for CreativeHub sync
 *
 * Usage: <SunoPromptWizard projectId={projectId} defaultTemplate="weekly_reflective" />
 * Tailwind recommended. No external UI deps required.
 */

type Template = {
  id: string;
  title: string;
  overrides?: Partial<Defaults>;
};

type Defaults = {
  bpm: number;
  key: string;
  genre: string;
  mood: string;
  structure: string;
  instruments: string;
  mix_notes: string;
  usage: string;
  ducking_cue: string;
};

type PromptPack = {
  version: number;
  defaults: Defaults;
  templates: Template[];
  prompts: { prose: string; tags: string };
};

const FALLBACK_PACK: PromptPack = {
  version: 1,
  defaults: {
    bpm: 92,
    key: "D major",
    genre: "cinematic folk",
    mood: "warm, hopeful, adventurous",
    structure: "intro(4), A(8), A'(8), bridge(8), outro(4)",
    instruments: "acoustic guitar, hand drums, upright bass, light strings, glockenspiel sprinkles",
    mix_notes: "gentle low-end, no pumping, soft tape saturation",
    usage: "background bed for weekly recap voiceover; should never fight narration",
    ducking_cue: "allow 400ms space before phrases; avoid sharp transients at :00, :15, :30 marks",
  },
  templates: [
    {
      id: "weekly_reflective",
      title: "Weekly Reflective Bed",
      overrides: {
        bpm: 88,
        mood: "reflective, grateful, sunset",
        genre: "acoustic cinematic",
        instruments: "fingerstyle guitar, brushed kit, soft pads",
      },
    },
    {
      id: "upbeat_rider",
      title: "Upbeat Rider Cut",
      overrides: {
        bpm: 104,
        mood: "confident, forward, light swagger",
        genre: "indie folk",
        instruments: "strummed acoustic, claps, tambourine, bass walk",
      },
    },
    {
      id: "tender_moment",
      title: "Tender Moment",
      overrides: {
        bpm: 76,
        mood: "gentle, intimate, lullaby",
        instruments: "piano, soft strings, subtle bells",
      },
    },
  ],
  prompts: {
    prose:
      "Create a {genre} instrumental at {bpm} BPM in {key}.\nMood: {mood}. Use {instruments}. Structure: {structure}.\nMix: {mix_notes}. Usage: {usage}. {ducking_cue}.\nNo vocals, no chanting, no risers that drown spoken voice.",
    tags: "instrumental, {genre}, {mood}, bed, no vocals",
  },
};

const packFetchCandidates = [
  "/prompts/suno/prompt_pack.yml",
  "/prompts/suno/prompt_pack.yaml",
  "/prompts/suno/prompt_pack.json",
];

function interpolate(template: string, ctx: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(ctx[k] ?? `{${k}}`));
}

function makeGrid(bpm: number, durationSec: number) {
  const spb = 60 / bpm;
  const beats: { t: number; downbeat: boolean }[] = [];
  for (let t = 0, i = 0; t <= durationSec; t += spb, i++) {
    beats.push({ t: Number(t.toFixed(3)), downbeat: i % 4 === 0 });
  }
  return beats;
}

async function decodeDuration(file: File): Promise<number> {
  try {
    const arrayBuf = await file.arrayBuffer();
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
    return audioBuf.duration;
  } catch (e) {
    // fallback: estimate from size @ ~192kbps mp3
    const approx = Math.round((file.size * 8) / 192000);
    return Math.max(30, Math.min(300, approx));
  }
}

interface SunoPromptWizardProps {
  projectId: string;
  defaultTemplate?: string;
  defaultDuration?: number;
  onMusicRegistered?: (result: { file: string; grid: string; bpm: number }) => void;
}

export default function SunoPromptWizard({
  projectId,
  defaultTemplate = "weekly_reflective",
  defaultDuration = 90,
  onMusicRegistered,
}: SunoPromptWizardProps) {
  const [pack, setPack] = useState<PromptPack>(FALLBACK_PACK);
  const [templateId, setTemplateId] = useState(defaultTemplate);
  const [duration, setDuration] = useState<number>(defaultDuration);
  const [bpm, setBpm] = useState<number>(FALLBACK_PACK.defaults.bpm);
  const [keySig, setKeySig] = useState<string>(FALLBACK_PACK.defaults.key);
  const [status, setStatus] = useState<string>("");
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [gridJson, setGridJson] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  // attempt to fetch a real pack (yaml or json). if unavailable, fallback.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const url of packFetchCandidates) {
        try {
          const res = await fetch(url, { cache: "no-store" });
          if (!res.ok) continue;
          const text = await res.text();
          // lazy parse: if yaml present via window.jsyaml; else try JSON
          let parsed: any = null;
          if ((window as any).jsyaml && /:\s/.test(text)) {
            parsed = (window as any).jsyaml.load(text);
          } else {
            try {
              parsed = JSON.parse(text);
            } catch {}
          }
          if (parsed && !cancelled) {
            setPack(parsed);
            if (parsed?.defaults?.bpm) setBpm(parsed.defaults.bpm);
            if (parsed?.defaults?.key) setKeySig(parsed.defaults.key);
            return;
          }
        } catch {}
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTemplate: Template = useMemo(
    () => pack.templates.find((t) => t.id === templateId) || pack.templates[0],
    [pack, templateId]
  );

  const ctx = useMemo(
    () => ({
      ...(pack.defaults || {}),
      ...(activeTemplate?.overrides || {}),
      bpm,
      key: keySig,
    }),
    [pack, activeTemplate, bpm, keySig]
  );

  const title = useMemo(
    () =>
      `[SirTrav ${projectId}] ${activeTemplate.title || activeTemplate.id} • ${ctx.genre} • ${ctx.bpm} BPM • ${duration}s`,
    [activeTemplate, ctx, duration, projectId]
  );

  const prose = useMemo(() => interpolate(pack.prompts.prose, ctx), [pack, ctx]);
  const tags = useMemo(() => interpolate(pack.prompts.tags, ctx), [pack, ctx]);
  const canonicalName = useMemo(
    () => `suno_${projectId}_${activeTemplate.id}_${ctx.bpm}bpm_${duration}s.mp3`,
    [projectId, activeTemplate, ctx, duration]
  );

  const onDrop = async (files: File[]) => {
    if (!files?.length) return;
    const file = files[0];
    setDroppedFile(file);
    setStatus("🎵 Analyzing audio duration...");
    const dur = Math.round(await decodeDuration(file));
    setDuration(dur);
    const grid = {
      project: projectId,
      template: activeTemplate.id,
      bpm: ctx.bpm,
      duration: dur,
      beats: makeGrid(ctx.bpm, dur),
    };
    setGridJson(grid);
    
    // v1.1.0-THEME: Persist theme attachment for CreativeHub sync
    setTheme(projectId, {
      url: `/music/${canonicalName}`,
      filename: canonicalName,
      bpm: ctx.bpm,
      duration: dur,
      grid,
    });
    
    setStatus(`✅ Duration ≈ ${dur}s. Beat grid ready (${grid.beats.length} beats @ ${ctx.bpm} BPM). Theme attached!`);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "audio/mpeg": [".mp3"], "audio/wav": [".wav"] },
  });

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(`${title}\n\n${prose}\n\nTags: ${tags}`);
      setStatus("✨ Prompt copied to clipboard! Paste into Suno.");
    } catch {
      setStatus("❌ Copy failed – select and copy manually.");
    }
  };

  const downloadGrid = () => {
    if (!gridJson) return;
    const blob = new Blob([JSON.stringify(gridJson, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${(droppedFile?.name || canonicalName)}.grid.json`;
    a.click();
    setStatus(`📥 Grid downloaded: ${a.download}`);
  };

  const registerViaFunction = async () => {
    if (!droppedFile || !gridJson) return;
    setStatus("⬆️ Uploading to register-music function...");
    const b64 = await droppedFile.arrayBuffer().then((buf) => {
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      return btoa(binary);
    });
    try {
      const res = await fetch("/.netlify/functions/register-music", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          filename: canonicalName,
          bpm: ctx.bpm,
          fileBase64: b64,
          grid: gridJson,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      
      // Update theme attachment with registered URL
      setTheme(projectId, {
        url: data.file || `/music/${canonicalName}`,
        filename: canonicalName,
        bpm: ctx.bpm,
        duration: gridJson.duration,
        grid: gridJson,
      });
      
      setStatus(`✅ Registered: ${data?.file || canonicalName}`);
      if (onMusicRegistered) {
        onMusicRegistered({ file: data.file, grid: data.grid, bpm: ctx.bpm });
      }
    } catch (e) {
      setStatus("⚠️ Register function unavailable. Use Download Grid + save audio in public/music/");
    }
  };

  return (
    <div className="w-full rounded-2xl shadow-lg border border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between gap-3 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎵</span>
          <h2 className="text-lg font-semibold text-white">Suno Prompt Wizard</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-1 rounded-full bg-white/20 text-white">
            Project: {projectId}
          </span>
          <span className="text-white text-xl">{isExpanded ? "▼" : "▶"}</span>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 md:p-6 space-y-4">
          {/* Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Template</span>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
              >
                {pack.templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title || t.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">BPM</span>
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                type="number"
                min={60}
                max={160}
                value={bpm}
                onChange={(e) => setBpm(parseInt(e.target.value || "0", 10) || 92)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Key</span>
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={keySig}
                onChange={(e) => setKeySig(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-gray-700">Duration (sec)</span>
              <input
                className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                type="number"
                min={30}
                max={300}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value || "0", 10) || 90)}
              />
            </label>
          </div>

          {/* Prompt preview */}
          <div className="rounded-xl border border-purple-200 p-4 bg-white shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm text-gray-800 whitespace-pre-wrap flex-1">
                <div className="font-bold text-purple-700 mb-2">{title}</div>
                <div className="leading-relaxed">{prose}</div>
                <div className="mt-3 text-indigo-600 font-medium">Tags: {tags}</div>
              </div>
              <button
                onClick={copyPrompt}
                className="shrink-0 h-10 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium text-sm hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
              >
                📋 Copy
              </button>
            </div>
          </div>

          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-all ${
              isDragActive
                ? "bg-emerald-50 border-emerald-400 scale-[1.02]"
                : "bg-white border-gray-300 hover:border-purple-400 hover:bg-purple-50"
            }`}
          >
            <input {...getInputProps()} />
            <div className="text-sm text-gray-700">
              <div className="text-3xl mb-2">{isDragActive ? "🎯" : "🎧"}</div>
              <div className="font-semibold text-gray-800">
                {isDragActive ? "Drop it!" : "Drop returned MP3/WAV here"}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                We'll infer duration locally and build a 4/4 beat grid @ current BPM
              </div>
              {droppedFile && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700">
                  <span>✅</span>
                  <span className="font-mono text-xs">{droppedFile.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={downloadGrid}
              disabled={!gridJson}
              className={`h-10 px-4 rounded-lg text-sm font-medium transition-all ${
                gridJson
                  ? "bg-gray-800 text-white hover:bg-gray-900 shadow-md"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              📥 Download Grid JSON
            </button>
            <button
              onClick={registerViaFunction}
              disabled={!gridJson || !droppedFile}
              className={`h-10 px-4 rounded-lg text-sm font-medium transition-all ${
                gridJson && droppedFile
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-md"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              ⬆️ Register via Function
            </button>
            <div className="text-xs text-gray-600 ml-auto hidden md:block">
              Save as: <span className="font-mono bg-gray-100 px-2 py-1 rounded">public/music/{canonicalName}</span>
            </div>
          </div>

          {/* Status */}
          {!!status && (
            <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200 text-sm text-indigo-800">
              {status}
            </div>
          )}

          {/* Helper footer */}
          <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs p-4">
            <div className="font-bold mb-2 flex items-center gap-2">
              <span>📖</span> Manual Flow (always works)
            </div>
            <ol className="list-decimal ml-5 space-y-1.5">
              <li>
                Click <span className="font-semibold text-purple-700">Copy</span> → paste into{" "}
                <a href="https://suno.ai" target="_blank" rel="noopener" className="underline">
                  Suno.ai
                </a>{" "}
                → generate → download MP3
              </li>
              <li>
                Rename to <span className="font-mono bg-amber-100 px-1 rounded">{canonicalName}</span> and place in{" "}
                <span className="font-mono bg-amber-100 px-1 rounded">public/music/</span>
              </li>
              <li>
                Drop it here → <span className="font-semibold text-purple-700">Download Grid JSON</span> → save as{" "}
                <span className="font-mono bg-amber-100 px-1 rounded">data/beat-grids/{canonicalName}.json</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
