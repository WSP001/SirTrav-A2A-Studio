#!/usr/bin/env bun
// Council Flash v1.5.0 — Memory Vault Initialization
// Uses Bun's built-in SQLite (zero dependencies)
// Owner: Windsurf Master (operator-grade local memory receipt)

import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";

const VAULT_PATH = "artifacts/memory_vault.sqlite";
const RECEIPT_DIR = "artifacts/council";
const RECEIPT_PATH = `${RECEIPT_DIR}/vault.status.json`;

// Ensure directories exist
mkdirSync("artifacts", { recursive: true });
mkdirSync(RECEIPT_DIR, { recursive: true });

const db = new Database(VAULT_PATH);

// Performance pragmas
db.exec("PRAGMA journal_mode=WAL;");
db.exec("PRAGMA synchronous=NORMAL;");

// --- vault_assets: RAG-ingestible content store ---
db.exec(`
  CREATE TABLE IF NOT EXISTS vault_assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_url TEXT NOT NULL,
    source_type TEXT NOT NULL,            -- url | thread | doc | note
    title TEXT,
    entities_json TEXT NOT NULL DEFAULT '[]',
    concepts_json TEXT NOT NULL DEFAULT '[]',
    attribution TEXT,                     -- human-readable credit line
    content TEXT NOT NULL,                -- extracted text
    content_sha256 TEXT NOT NULL,          -- dedupe anchor
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
db.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_assets_sha
  ON vault_assets(content_sha256);
`);

// --- job_packets: cost tracking + logic fingerprinting ---
db.exec(`
  CREATE TABLE IF NOT EXISTS job_packets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_type TEXT NOT NULL,               -- x_publish | video_idea | render | audit | ingest
    logic_fingerprint TEXT NOT NULL,       -- commit sha or semantic version tag
    inputs_json TEXT NOT NULL DEFAULT '{}',
    outputs_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL,                 -- queued | running | pass | fail
    cost_tokens INTEGER NOT NULL DEFAULT 0,
    cost_usd REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_job_packets_type_time
  ON job_packets(job_type, created_at);
`);

// --- council_events: persona switch, click2kick, sentinel, gate logs ---
db.exec(`
  CREATE TABLE IF NOT EXISTS council_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,             -- persona_switch | click2kick | sentinel | gate
    payload_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Verify tables exist
const tables = db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
const tableNames = tables.map(t => t.name);

const expected = ["council_events", "job_packets", "vault_assets"];
const missing = expected.filter(t => !tableNames.includes(t));

if (missing.length > 0) {
  console.error(`FAIL: Missing tables: ${missing.join(", ")}`);
  process.exit(1);
}

// Write machine-readable receipt
const receipt = {
  ok: true,
  path: VAULT_PATH,
  tables: tableNames,
  version: "1.5.0",
  timestamp: new Date().toISOString(),
};
writeFileSync(RECEIPT_PATH, JSON.stringify(receipt, null, 2) + "\n");

db.close();

console.log(`vault_assets, job_packets, council_events — 3 tables OK`);
console.log(`Receipt: ${RECEIPT_PATH}`);
