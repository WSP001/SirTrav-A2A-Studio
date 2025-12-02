import React, { useState } from "react";
import VideoGenerator from "./components/VideoGenerator";
import CreativeHub from "./components/CreativeHub";
import { BookOpen, Database, Github, LayoutDashboard, Wand2 } from "lucide-react";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [projectId, setProjectId] = useState("");

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/10 rounded-lg">
              <LayoutDashboard className="w-6 h-6 text-blue-500" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">SirTrav Memory Channel</h1>
          </div>
          
          <nav className="hidden md:flex items-center gap-1" role="navigation" aria-label="Main Navigation">
            <button
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === "dashboard" 
                  ? "bg-[var(--color-bg-primary)] text-blue-500 shadow-sm" 
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]/50"
              }`}
              onClick={() => setActiveTab("dashboard")}
              aria-current={activeTab === "dashboard" ? "page" : undefined}
            >
              <Wand2 className="w-4 h-4" /> Studio
            </button>
            <a href="/docs" className="px-4 py-2 rounded-md text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]/50 flex items-center gap-2 transition-colors">
              <BookOpen className="w-4 h-4" /> Docs
            </a>
            <a href="/vault" className="px-4 py-2 rounded-md text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]/50 flex items-center gap-2 transition-colors">
              <Database className="w-4 h-4" /> Vault
            </a>
            <a 
              href="https://github.com/WSP001/SirTrav-A2A-Studio" 
              className="px-4 py-2 rounded-md text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]/50 flex items-center gap-2 transition-colors"
              target="_blank" 
              rel="noopener noreferrer"
            >
              <Github className="w-4 h-4" /> GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8" role="main">
        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Panel: Creative Hub (Input) */}
            <section className="lg:col-span-5 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 text-xs">1</span>
                  Ingest & Context
                </h2>
              </div>
              <CreativeHub onProjectIdChange={setProjectId} />
            </section>

            {/* Right Panel: Video Generator (Output/Control) */}
            <section className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500/10 text-purple-500 text-xs">2</span>
                  Generation Pipeline
                </h2>
                {projectId && (
                  <span className="text-xs font-mono px-2 py-1 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)]">
                    Active: {projectId}
                  </span>
                )}
              </div>
              <VideoGenerator projectId={projectId} />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
