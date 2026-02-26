import React, { useState, useEffect } from "react";
import {
    Key,
    Plus,
    Trash2,
    Clock,
    RotateCcw,
    ShieldCheck,
    AlertCircle,
    User,
    Lock,
    ChevronRight,
    MoreHorizontal,
    Search,
    CheckCircle2,
    XCircle
} from "lucide-react";

const STORAGE_KEY = "sirtrav-persona-vault";

const PERSONAS = [
    { id: 'SeaTrace003', label: 'SeaTrace003', type: 'Agent', expired: true, created: '2025-07-20', expires: '2025-09-18' },
    { id: 'OAUTH', label: 'OAUTH', type: 'System', expired: true, created: '2025-11-17', expires: '2026-02-15' },
    { id: 'SirJames-Book002-Deploy', label: 'SirJames-Book002-Deploy', type: 'Admin', expired: true, created: '2025-11-19', expires: '2026-02-17' },
    { id: 'PROGRAMMING_TEAMS_SHARED', label: 'PROGRAMMING TEAMS SHARED TOKEN', type: 'Shared', expired: false, created: '2026-02-21', expires: '2026-05-22' }
];

const maskKey = (value) => {
    if (!value) return "";
    return `ghp_${"*".repeat(12)}${value.slice(-4)}`;
};

export default function PersonaVault() {
    const [tokens, setTokens] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTokenName, setNewTokenName] = useState("");
    const [newTokenExpiry, setNewTokenExpiry] = useState("90"); // days

    // Initial load
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            setTokens(JSON.parse(stored));
        } else {
            setTokens(PERSONAS);
        }
    }, []);

    // Save to storage
    useEffect(() => {
        if (tokens.length > 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
        }
    }, [tokens]);

    const handleAddToken = () => {
        if (!newTokenName.trim()) return;

        const createdDate = new Date();
        const expiryDate = new Date();
        expiryDate.setDate(createdDate.getDate() + parseInt(newTokenExpiry));

        const newToken = {
            id: `token-${Date.now()}`,
            label: newTokenName,
            type: 'User',
            expired: false,
            created: createdDate.toISOString().split('T')[0],
            expires: expiryDate.toISOString().split('T')[0],
            value: Math.random().toString(36).substring(7)
        };

        setTokens([newToken, ...tokens]);
        setNewTokenName("");
        setShowAddModal(false);
    };

    const handleRotate = (id) => {
        setTokens(tokens.map(t => {
            if (t.id === id) {
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + 90);
                return {
                    ...t,
                    expired: false,
                    created: new Date().toISOString().split('T')[0],
                    expires: expiryDate.toISOString().split('T')[0]
                };
            }
            return t;
        }));
    };

    const handleDelete = (id) => {
        setTokens(tokens.filter(t => t.id !== id));
    };

    const filteredTokens = tokens.filter(t =>
        t.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="persona-vault-container animate-in fade-in duration-700">
            {/* Premium Header */}
            <div className="vault-header">
                <div className="flex items-center gap-4 mb-2">
                    <div className="genie-orb">
                        <Key className="w-6 h-6 text-amber-400" />
                        <div className="orb-glow"></div>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-200">
                            Personal Access Tokens
                        </h1>
                        <p className="text-gray-400 text-sm">
                            Create personal access tokens for use in shell scripts and API access.
                        </p>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-8 pb-4 border-b border-white/10">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search tokens..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="vault-search-input"
                        />
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="generate-token-btn"
                    >
                        <Plus className="w-4 h-4" /> Generate new token
                    </button>
                </div>
            </div>

            {/* Token List */}
            <div className="token-list space-y-4 mt-6">
                {filteredTokens.map((token) => (
                    <div
                        key={token.id}
                        className={`token-card group ${token.expired ? 'token-expired' : 'token-active'}`}
                    >
                        <div className="flex items-start justify-between p-5">
                            <div className="flex items-start gap-4">
                                <div className={`status-orb ${token.expired ? 'bg-red-500/20' : 'bg-green-500/20'}`}>
                                    {token.expired ? (
                                        <XCircle className="w-5 h-5 text-red-400" />
                                    ) : (
                                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-lg font-semibold text-white group-hover:text-amber-200 transition-colors">
                                            {token.label}
                                        </h3>
                                        {token.expired && (
                                            <span className="expired-badge">Expired</span>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-gray-500 font-mono">
                                        <span className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" /> Created on {new Date(token.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                        <span className="text-gray-700">•</span>
                                        <span className="flex items-center gap-1">
                                            {token.expired ? 'Expired on' : 'Expires on'} {new Date(token.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleRotate(token.id)}
                                    title="Rotate Token"
                                    className="icon-btn-vault hover:bg-amber-500/10 hover:text-amber-400"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                </button>
                                <div className="dropdown-vault relative">
                                    <button className="icon-btn-vault hover:bg-white/5">
                                        <MoreHorizontal className="w-4 h-4" />
                                    </button>
                                    {/* Options Menu */}
                                    <div className="dropdown-menu-vault">
                                        <button onClick={() => handleDelete(token.id)} className="dropdown-item-vault text-red-400">
                                            <Trash2 className="w-3.5 h-3.5" /> Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add Token Modal */}
            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal-content animate-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-white mb-4">New Personal Access Token</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Token Name</label>
                                <input
                                    type="text"
                                    value={newTokenName}
                                    onChange={(e) => setNewTokenName(e.target.value)}
                                    placeholder="What's this token for?"
                                    className="vault-input"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Expiration</label>
                                <select
                                    value={newTokenExpiry}
                                    onChange={(e) => setNewTokenExpiry(e.target.value)}
                                    className="vault-select"
                                >
                                    <option value="30">30 days</option>
                                    <option value="60">60 days</option>
                                    <option value="90">90 days</option>
                                    <option value="365">1 year</option>
                                </select>
                            </div>
                            <div className="flex items-center justify-end gap-3 pt-4">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="btn-cancel"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddToken}
                                    className="btn-confirm"
                                >
                                    Create Token
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
        .persona-vault-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
          font-family: 'Inter', system-ui, sans-serif;
        }
        
        .genie-orb {
          position: relative;
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(212, 175, 55, 0.1);
          border: 1px solid rgba(212, 175, 55, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.1);
        }
        
        .orb-glow {
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212, 175, 55, 0.2) 0%, transparent 70%);
          animation: pulse 2s ease-in-out infinite;
        }
        
        .vault-search-input {
          width: 100%;
          background: rgba(15, 15, 15, 0.8);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.6rem 1rem 0.6rem 2.5rem;
          color: white;
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        
        .vault-search-input:focus {
          border-color: rgba(212, 175, 55, 0.5);
        }
        
        .generate-token-btn {
          background: #238636;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: background 0.2s;
        }
        
        .generate-token-btn:hover {
          background: #2ea043;
        }
        
        .token-card {
          background: rgba(25, 25, 25, 0.5);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          transition: all 0.2s ease-out;
        }
        
        .token-card:hover {
          background: rgba(30, 30, 30, 0.8);
          border-color: rgba(212, 175, 55, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .token-expired {
          opacity: 0.7;
        }
        
        .status-orb {
          padding: 0.6rem;
          border-radius: 10px;
        }
        
        .expired-badge {
          background: rgba(248, 81, 73, 0.1);
          color: #f85149;
          border: 1px solid rgba(248, 81, 73, 0.2);
          padding: 0.1rem 0.5rem;
          border-radius: 10px;
          font-size: 0.7rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        
        .icon-btn-vault {
          padding: 0.5rem;
          border-radius: 6px;
          color: #8b949e;
          transition: all 0.2s;
        }
        
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal-content {
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 12px;
          width: 100%;
          max-width: 450px;
          padding: 2rem;
          box-shadow: 0 20px 50px rgba(0,0,0,0.5);
        }
        
        .vault-input, .vault-select {
          width: 100%;
          background: #0d1117;
          border: 1px solid #30363d;
          border-radius: 6px;
          padding: 0.6rem;
          color: white;
          outline: none;
        }
        
        .vault-input:focus {
          border-color: #58a6ff;
        }
        
        .btn-confirm {
          background: #238636;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
        }
        
        .btn-cancel {
          color: #8b949e;
          padding: 0.5rem 1rem;
        }
        
        .btn-cancel:hover {
          color: white;
        }

        .dropdown-vault:hover .dropdown-menu-vault {
          display: block;
        }

        .dropdown-menu-vault {
          display: none;
          position: absolute;
          right: 0;
          top: 100%;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 6px;
          min-width: 120px;
          z-index: 10;
          box-shadow: 0 5px 20px rgba(0,0,0,0.5);
          overflow: hidden;
        }

        .dropdown-item-vault {
          width: 100%;
          padding: 0.6rem 1rem;
          text-align: left;
          font-size: 0.8rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .dropdown-item-vault:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.2); opacity: 0.4; }
        }

        /* Kid-friendly Premium - Softening shapes with subtle glows */
        .token-card {
          border-radius: 16px;
        }
      `}} />
        </div>
    );
}
