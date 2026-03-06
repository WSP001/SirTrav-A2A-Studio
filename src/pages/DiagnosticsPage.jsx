import React, { useEffect, useMemo, useState } from "react";
import SystemStatusEmblem from "../components/SystemStatusEmblem";

function verdictClass(verdict) {
  if (verdict === "GREEN") return "diag-badge diag-green";
  if (verdict === "YELLOW") return "diag-badge diag-yellow";
  if (verdict === "RED") return "diag-badge diag-red";
  return "diag-badge diag-gray";
}

function serviceClass(status) {
  if (status === "ok") return "diag-green";
  if (status === "degraded") return "diag-yellow";
  if (status === "disabled") return "diag-gray";
  return "diag-red";
}

function remotionModeClass(mode) {
  if (mode === "real") return "diag-badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
  if (mode === "fallback") return "diag-badge bg-amber-500/10 text-amber-400 border border-amber-500/20";
  return "diag-badge diag-gray";
}

export default function DiagnosticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      try {
        const res = await fetch("/.netlify/functions/control-plane");
        if (!res.ok) throw new Error(`control-plane failed (${res.status})`);
        const json = await res.json();
        if (!mounted) return;
        setData(json);
        setError("");
      } catch (e) {
        if (!mounted) return;
        setError(e.message || "Failed to load diagnostics");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    run();
    const t = setInterval(run, 15000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const wiredAgents = useMemo(() => {
    const agents = data?.pipeline?.agents || {};
    return Object.entries(agents).map(([name, wired]) => ({ name, wired: !!wired }));
  }, [data]);

  return (
    <div className="app min-h-screen relative">
      <header className="header">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-white">Diagnostics Console</span>
            <span className="version-badge">CX-018</span>
          </div>
          <div className="flex items-center gap-3">
            <SystemStatusEmblem />
            <a href="/" className="btn-secondary">Back to Studio</a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {loading && <div className="glass-card p-4 text-gray-300">Loading control-plane diagnostics...</div>}
        {error && <div className="glass-card p-4 text-red-300">Diagnostics Error: {error}</div>}

        {data && (
          <>
            <section className="glass-card p-6">
              <h2 className="section-title mb-4">Split Verdict</h2>
              <div className="diag-grid-3">
                <div className="diag-tile">
                  <p className="diag-label">Local Verdict</p>
                  <span className={verdictClass(data.verdict?.local)}>{data.verdict?.local || "UNKNOWN"}</span>
                </div>
                <div className="diag-tile">
                  <p className="diag-label">Cloud Verdict</p>
                  <span className={verdictClass(data.verdict?.cloud)}>{data.verdict?.cloud || "UNKNOWN"}</span>
                </div>
                <div className="diag-tile">
                  <p className="diag-label">Combined Verdict</p>
                  <span className={verdictClass(data.verdict?.combined)}>{data.verdict?.combined || "UNKNOWN"}</span>
                </div>
              </div>
              <p className="diag-meta mt-3">{(data.verdict?.reasons || []).join(" | ")}</p>
            </section>

            {data.remotion && (
              <section className="glass-card p-6">
                <h2 className="section-title mb-4">Render Pipeline (Remotion)</h2>
                <div className="diag-grid-4">
                  <div className="diag-tile">
                    <p className="diag-label">Mode</p>
                    <span className={remotionModeClass(data.remotion.mode)}>
                      {(data.remotion.mode || "unknown").toUpperCase()}
                    </span>
                  </div>
                  <div className="diag-tile">
                    <p className="diag-label">Configured</p>
                    <span className={data.remotion.configured ? "diag-badge diag-green" : "diag-badge diag-red"}>
                      {data.remotion.configured ? "YES" : "NO"}
                    </span>
                  </div>
                  <div className="diag-tile">
                    <p className="diag-label">Compositions</p>
                    <span className="diag-badge diag-gray">{data.remotion.compositions ?? "—"}</span>
                  </div>
                  <div className="diag-tile">
                    <p className="diag-label">Region</p>
                    <span className="diag-badge diag-gray">{data.remotion.region || "N/A"}</span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 border-t border-white/5 pt-4">
                  <div className="diag-tile">
                    <p className="diag-label">Serve URL</p>
                    <span className={data.remotion.serveUrl ? "diag-badge diag-green" : "diag-badge diag-red"}>
                      {data.remotion.serveUrl ? "PRESENT" : "MISSING"}
                    </span>
                  </div>
                  <div className="diag-tile">
                    <p className="diag-label">Function Name</p>
                    <span className={data.remotion.functionName ? "diag-badge diag-green" : "diag-badge diag-red"}>
                      {data.remotion.functionName ? "PRESENT" : "MISSING"}
                    </span>
                  </div>
                  <div className="diag-tile">
                    <p className="diag-label">AWS Keys</p>
                    <span className={data.remotion.awsKeys ? "diag-badge diag-green" : "diag-badge diag-red"}>
                      {data.remotion.awsKeys ? "PRESENT" : "MISSING"}
                    </span>
                  </div>
                </div>
                {data.remotion.blocker && (
                  <div className="mt-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
                    ⚠️ {data.remotion.blocker}
                  </div>
                )}
              </section>
            )}

            <section className="glass-card p-6">
              <h2 className="section-title mb-4">7-Agent Pipeline Wiring</h2>
              <div className="diag-grid-4">
                {wiredAgents.map((a) => (
                  <div key={a.name} className="diag-tile">
                    <p className="diag-label">{a.name}</p>
                    <span className={a.wired ? "diag-badge diag-green" : "diag-badge diag-red"}>
                      {a.wired ? "WIRED" : "MISSING"}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-card p-6">
              <h2 className="section-title mb-4">Service Health</h2>
              <div className="diag-grid-4">
                {(data.services || []).map((svc) => (
                  <div key={svc.name} className="diag-tile">
                    <p className="diag-label">{svc.name}</p>
                    <span className={`diag-badge ${serviceClass(svc.status)}`}>{svc.status.toUpperCase()}</span>
                    {svc.error ? <p className="diag-meta mt-2">{svc.error}</p> : null}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
