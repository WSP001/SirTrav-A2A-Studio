import React, { useState } from "react";
import VideoGenerator from "./components/VideoGenerator";
import CreativeHub from "./components/CreativeHub";
import { BookOpen, Database, Github, LayoutDashboard, Wand2 } from "lucide-react";
import "./App.css";

function App() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="app">
      <header className="app__header" role="banner">
        <div className="header__content">
          <div className="header__logo">
            <LayoutDashboard className="icon" aria-hidden="true" />
            <h1>SirTrav Memory Channel</h1>
          </div>
          <nav className="header__nav" role="navigation" aria-label="Main Navigation">
            <button 
              className={`nav-link ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
              aria-current={activeTab === "dashboard" ? "page" : undefined}
            >
              <Wand2 className="icon-sm" /> Studio
            </button>
            <a href="/docs" className="nav-link">
              <BookOpen className="icon-sm" /> Docs
            </a>
            <a href="/vault" className="nav-link">
              <Database className="icon-sm" /> Vault
            </a>
            <a href="https://github.com/WSP001/SirTrav-A2A-Studio" className="nav-link" target="_blank" rel="noopener noreferrer">
              <Github className="icon-sm" /> GitHub
            </a>
          </nav>
        </div>
      </header>

      <main className="app__main" role="main">
        {activeTab === "dashboard" && (
          <div className="dashboard-grid">
            <section className="panel creative-hub">
              <CreativeHub />
            </section>
            <section className="panel video-gen">
              <VideoGenerator />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
