#!/usr/bin/env node
/**
 * seed-producer-brief.mjs
 * CV → Studio producer brief bridge
 *
 * Reads ONLY knowledge_base/public/cv/ from the CV repo.
 * Writes artifacts/producer-brief.json for Studio harness consumption.
 *
 * COST:        $0 — local file reads only, no API calls
 * IDEMPOTENT:  safe to re-run, always overwrites output
 * GOVERNANCE:  business/ partitions are EXPLICITLY EXCLUDED (enforced below)
 * SCHEMA:      v1.0 — see artifacts/producer-brief.json for shape
 *
 * Usage:
 *   node scripts/seed-producer-brief.mjs
 *   just seed-brief
 *
 * Architecture: Scott Echols / WSP001 — For the Commons Good
 * Engineering:  Claude Code (CC-IAM-OPS, 2026-04-05)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'

// ─── PATH RESOLUTION ──────────────────────────────────────────────────────────

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const STUDIO_ROOT = resolve(__dirname, '..')

// CV repo canonical path — WSP001 write source only (per CLAUDE.md lane rules)
// Worktree depth makes relative resolution unreliable — use canonical absolute path
const CV_REPO_CANONICAL = 'C:\\WSP001\\R.-Scott-Echols-CV'
// Fallback: try relative resolution for non-Windows or alternative setups
const CV_REPO_RELATIVE  = resolve(STUDIO_ROOT, '../../../../R.-Scott-Echols-CV')
const CV_REPO = existsSync(CV_REPO_CANONICAL) ? CV_REPO_CANONICAL : CV_REPO_RELATIVE

// ─── GOVERNANCE GUARD — NEVER READ FROM THESE PATHS ──────────────────────────

const FORBIDDEN_PATTERNS = [
  'knowledge_base/business',
  'knowledge_base/private',
  'business/',
  '/proposals/',
  '/seatrace/' // only in business/ — public seatrace_four_pillars_summary.md is allowed
]

function assertNotForbidden(filePath) {
  const normalized = filePath.replace(/\\/g, '/')
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (normalized.includes(pattern)) {
      throw new Error(
        `GOVERNANCE VIOLATION: Attempted to read forbidden path: ${filePath}\n` +
        `Pattern matched: ${pattern}\n` +
        `Only knowledge_base/public/cv/ is allowed in the producer brief.`
      )
    }
  }
}

// ─── SAFE FILE READER ────────────────────────────────────────────────────────

function safeRead(relPath) {
  const fullPath = join(CV_REPO, relPath)
  assertNotForbidden(fullPath)

  if (!existsSync(fullPath)) {
    console.warn(`  ⚠️  Missing source: ${relPath} → field will be null`)
    return null
  }

  try {
    return readFileSync(fullPath, 'utf-8')
  } catch (err) {
    console.warn(`  ⚠️  Could not read ${relPath}: ${err.message} → field will be null`)
    return null
  }
}

// ─── PUBLIC SOURCES (ONLY these are allowed) ─────────────────────────────────

const PUBLIC_SOURCES = {
  identity:   'knowledge_base/public/cv/identity_verified.md',
  repos:      'knowledge_base/public/cv/github_repos_live.md',
  seatrace:   'knowledge_base/public/cv/seatrace_four_pillars_summary.md',
}

// ─── PARSERS ─────────────────────────────────────────────────────────────────

function parseIdentity(md) {
  if (!md) return null
  const lines = md.split('\n')
  const get = (label) => {
    const line = lines.find(l => l.includes(label))
    return line ? line.split(':').slice(1).join(':').trim() : null
  }
  return {
    name:       get('Public name:') || get('Name:'),
    title:      get('Public title:'),
    contact:    get('Contact:'),
    github:     get('GitHub:'),
    activeWork: lines
      .filter(l => l.match(/^-\s+\w/) && !l.includes(':'))
      .map(l => l.replace(/^-\s+/, '').trim())
      .filter(Boolean)
      .slice(0, 6),
    identityBoundaries: {
      professional: 'SirScott',
      business:     'SeaTrace',
      personal:     'SirTrav',
      creative:     'SirJames'
    },
    truthPolicy: 'identity_verified.md is the highest-trust public anchor. ' +
                 'If early-career details are unavailable, note source package is under review.'
  }
}

function parseRepos(md) {
  if (!md) return []
  const repos = []
  const blocks = md.split('###').slice(1)
  for (const block of blocks.slice(0, 8)) { // max 8 repos in brief
    const nameMatch = block.match(/^([^\n]+)/)
    const urlMatch  = block.match(/\*\*URL:\*\*\s*([^\n]+)/)
    const langMatch = block.match(/\*\*Language:\*\*\s*([^\n]+)/)
    const privMatch = block.match(/\*\*Private:\*\*\s*([^\n]+)/)
    if (nameMatch) {
      repos.push({
        name:     nameMatch[1].trim(),
        url:      urlMatch  ? urlMatch[1].trim()  : null,
        language: langMatch ? langMatch[1].trim() : null,
        public:   privMatch ? !privMatch[1].toLowerCase().includes('yes') : true
      })
    }
  }
  return repos
}

function parseSeaTracePillars(md) {
  if (!md) return []
  const pillars = []
  const matches = md.matchAll(/\*\*Pillar (\d+)[^*]+\*\*([^\n]+)\n([^*]+)/g)
  for (const m of matches) {
    pillars.push({
      number:      parseInt(m[1]),
      name:        m[2].trim().replace(/^—\s*/, ''),
      description: m[3].trim().replace(/\n/g, ' ').slice(0, 200)
    })
  }
  return pillars
}

// ─── STUDIO PERSONA (mirrors src/config/studioPersona.js) ────────────────────

const STUDIO_PERSONA = {
  displayName:       'SirScott A2A Studio',
  shortName:         'A2A Studio',
  operatorName:      'R. Scott Echols',
  tagline:           'For the Commons Good',
  producerCredit:    'Produced by SirScott Studio | Directed by R. Scott Echols',
  githubRepoUrl:     'https://github.com/WSP001/SirTrav-A2A-Studio',
  publicAppUrl:      'https://sirtrav-a2a-studio.netlify.app'
}

// ─── PARTITION MAP ───────────────────────────────────────────────────────────

const PARTITION_MAP = {
  public:   ['cv_verified_public', 'cv_projects_public'],
  business: ['seatrace_business'],   // NOT in this brief — governance enforced
  personal: ['sirtrav_personal'],
  creative: ['sirjames_creative']
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

console.log('╔══════════════════════════════════════════════╗')
console.log('║     seed-producer-brief.mjs  v1.0           ║')
console.log('║     CV → Studio brief bridge                ║')
console.log('╚══════════════════════════════════════════════╝')
console.log()

// Verify CV repo exists
if (!existsSync(CV_REPO)) {
  console.error(`❌ CV repo not found at: ${CV_REPO}`)
  console.error('   Expected: C:\\WSP001\\R.-Scott-Echols-CV')
  console.error('   Run from C:\\WSP001\\SirTrav-A2A-Studio worktree')
  process.exit(1)
}

console.log(`📂 CV repo: ${CV_REPO}`)
console.log()

// Read public sources
const sourcesUsed = []
const sourcesMissing = []

const identityRaw  = safeRead(PUBLIC_SOURCES.identity)
const reposRaw     = safeRead(PUBLIC_SOURCES.repos)
const seaTraceRaw  = safeRead(PUBLIC_SOURCES.seatrace)

if (identityRaw)  { sourcesUsed.push(PUBLIC_SOURCES.identity);  console.log(`  ✅ ${PUBLIC_SOURCES.identity}`) }
else               { sourcesMissing.push(PUBLIC_SOURCES.identity); }

if (reposRaw)     { sourcesUsed.push(PUBLIC_SOURCES.repos);     console.log(`  ✅ ${PUBLIC_SOURCES.repos}`) }
else               { sourcesMissing.push(PUBLIC_SOURCES.repos); }

if (seaTraceRaw)  { sourcesUsed.push(PUBLIC_SOURCES.seatrace);  console.log(`  ✅ ${PUBLIC_SOURCES.seatrace}`) }
else               { sourcesMissing.push(PUBLIC_SOURCES.seatrace); }

// Parse
const identity      = parseIdentity(identityRaw)
const activeProjects = parseRepos(reposRaw)
const seaTracePillars = parseSeaTracePillars(seaTraceRaw)

// Build brief
const brief = {
  version:        '1.0',
  generatedAt:    new Date().toISOString(),
  sourceTier:     'public',
  sourceRepo:     CV_REPO,
  sourceFiles:    sourcesUsed,
  missingFiles:   sourcesMissing,
  conflicts:      [], // populated if contradictions found across sources

  identity,
  activeProjects,
  seaTracePillars,

  voiceHints: [
    'Pacific Northwest cadence — direct, thoughtful, unhurried',
    'Marine domain authority — speaks to fisheries, traceability, supply chains with precision',
    'Builder mindset — explains systems, not just concepts',
    'For the Commons Good — grounded in public benefit, not just commercial value'
  ],

  approvedClaims: [
    'Founder, World Seafood Producers / WorldSeafoodProducers.com',
    'Architect, SeaTrace fisheries traceability platform',
    'Solutions Architect / Senior Software Developer & Technical Lead',
    'AI-assisted workflows, agent orchestration, and knowledge tooling'
  ],

  partitionMap:   PARTITION_MAP,
  studioPersona:  STUDIO_PERSONA
}

// Governance final check — no business content in output
const briefStr = JSON.stringify(brief, null, 2)
for (const pattern of FORBIDDEN_PATTERNS) {
  if (briefStr.toLowerCase().includes(pattern.toLowerCase())) {
    console.error(`❌ GOVERNANCE VIOLATION: Forbidden pattern "${pattern}" found in output`)
    console.error('   Brief NOT written. Fix source parsers.')
    process.exit(2)
  }
}

// Write output
const artifactsDir = join(STUDIO_ROOT, 'artifacts')
if (!existsSync(artifactsDir)) mkdirSync(artifactsDir, { recursive: true })

const outputPath = join(artifactsDir, 'producer-brief.json')
writeFileSync(outputPath, briefStr, 'utf-8')

// Report
console.log()
console.log('─── Results ───────────────────────────────────')
console.log(`  ✅ Wrote: artifacts/producer-brief.json`)
console.log(`  Sources used:    ${sourcesUsed.length}/${Object.keys(PUBLIC_SOURCES).length}`)
if (sourcesMissing.length > 0) {
  console.log(`  Sources missing: ${sourcesMissing.join(', ')}`)
  console.log(`  (Missing fields set to null — not invented)`)
}
console.log(`  Identity:        ${identity?.name ?? 'null'}`)
console.log(`  Active projects: ${activeProjects.length}`)
console.log(`  SeaTrace pillars: ${seaTracePillars.length}`)
console.log(`  ⚠️  Business leak check: PASSED (0 forbidden patterns in output)`)
console.log()
console.log('  For the Commons Good 🎬')
console.log()
