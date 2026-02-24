#!/usr/bin/env node
// File: scripts/linear-branch-sync.mjs
// Purpose: CLD-BE-OPS-002 — Branch → Linear Ticket ID validation
// Pattern: Follows flag-hardening style from test-linkedin-publish.mjs
//
// Usage:
//   node scripts/linear-branch-sync.mjs                  # Validate current branch
//   node scripts/linear-branch-sync.mjs --dry-run        # Print what would happen, no API calls
//   node scripts/linear-branch-sync.mjs --json           # Output machine-readable JSON
//   node scripts/linear-branch-sync.mjs --help           # Show usage

import { execSync } from 'child_process';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const JSON_OUT = args.includes('--json');
const HELP = args.includes('--help') || args.includes('-h');

// ── Flag hardening (same pattern as test-linkedin-publish.mjs) ──
const knownFlags = new Set(['--dry-run', '--json', '--help', '-h']);
const unknownFlags = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a.startsWith('--') || a.startsWith('-')) {
    if (!knownFlags.has(a)) {
      unknownFlags.push(a);
    }
  }
}

// ── Mutual exclusion ──
if (DRY_RUN && JSON_OUT) {
  console.log('\n❌ Use only one output flag: --dry-run OR --json');
  process.exit(1);
}

function printUsage() {
  console.log('Linear Branch Sync — WSP Ticket Validator');
  console.log('');
  console.log('Usage:');
  console.log('  node scripts/linear-branch-sync.mjs                  # Validate current branch');
  console.log('  node scripts/linear-branch-sync.mjs --dry-run        # Print what would happen');
  console.log('  node scripts/linear-branch-sync.mjs --json           # Machine-readable output');
  console.log('  node scripts/linear-branch-sync.mjs --help           # Show this help');
  console.log('');
  console.log('Environment:');
  console.log('  LINEAR_API_KEY    If set, validates ticket exists on Linear API');
  console.log('                    If not set, prints the Linear URL for manual check');
}

if (HELP) {
  printUsage();
  process.exit(0);
}

if (unknownFlags.length > 0) {
  console.log(`\n❌ Unknown flags: ${unknownFlags.join(', ')}`);
  printUsage();
  process.exit(1);
}

// ─── Main Logic ───────────────────────────────────────────────────────────────

const LINEAR_WORKSPACE = 'wsp2agent';

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function extractTicket(branch) {
  const match = branch.match(/WSP-(\d+)/i);
  if (match) return `WSP-${match[1]}`;
  return null;
}

function getLinearUrl(ticket) {
  return `https://linear.app/${LINEAR_WORKSPACE}/issue/${ticket}`;
}

async function validateOnLinear(ticket) {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return null; // No API key — skip validation

  try {
    const query = `
      query {
        issue(id: "${ticket}") {
          id
          title
          state { name }
          assignee { name }
        }
      }
    `;
    const res = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiKey,
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) {
      return { error: `Linear API returned ${res.status}` };
    }
    const data = await res.json();
    if (data.errors) {
      return { error: data.errors[0]?.message || 'GraphQL error' };
    }
    if (!data.data?.issue) {
      return { error: `Ticket ${ticket} not found on Linear` };
    }
    return {
      id: data.data.issue.id,
      title: data.data.issue.title,
      state: data.data.issue.state?.name,
      assignee: data.data.issue.assignee?.name,
    };
  } catch (err) {
    return { error: err.message || 'Linear API request failed' };
  }
}

async function main() {
  const branch = getCurrentBranch();
  if (!branch) {
    const result = { ticket: null, branch: null, valid: false, url: null, error: 'Not in a git repository' };
    if (JSON_OUT) { console.log(JSON.stringify(result, null, 2)); }
    else { console.log('❌ Not in a git repository'); }
    process.exit(1);
  }

  const ticket = extractTicket(branch);
  const valid = ticket !== null;
  const url = valid ? getLinearUrl(ticket) : null;

  if (DRY_RUN) {
    console.log('🔍 Linear Branch Sync — DRY RUN');
    console.log('─'.repeat(50));
    console.log(`  Branch:  ${branch}`);
    console.log(`  Ticket:  ${ticket || '(none detected)'}`);
    console.log(`  Valid:   ${valid ? '✅ YES' : '❌ NO'}`);
    if (url) console.log(`  URL:     ${url}`);
    if (process.env.LINEAR_API_KEY) {
      console.log(`  API:     Would validate on Linear (LINEAR_API_KEY present)`);
    } else {
      console.log(`  API:     Skipped (no LINEAR_API_KEY)`);
    }
    process.exit(valid ? 0 : 1);
  }

  if (JSON_OUT) {
    const result = { ticket, branch, valid, url };
    if (valid && process.env.LINEAR_API_KEY) {
      const linear = await validateOnLinear(ticket);
      if (linear) result.linear = linear;
    }
    console.log(JSON.stringify(result, null, 2));
    process.exit(valid ? 0 : 1);
  }

  // ── Default: human-readable output ──
  console.log('🔗 Linear Branch Sync');
  console.log('─'.repeat(50));
  console.log(`  Branch:  ${branch}`);
  console.log(`  Ticket:  ${ticket || '(none detected)'}`);

  if (!valid) {
    console.log('  Result:  ❌ INVALID — branch does not contain a WSP-N ticket ID');
    console.log('');
    console.log('  Expected pattern: feature/WSP-<number>-<description>');
    console.log('  Example:          feature/WSP-6-ledger-gate');
    process.exit(1);
  }

  console.log(`  Result:  ✅ VALID`);
  console.log(`  URL:     ${url}`);

  if (process.env.LINEAR_API_KEY) {
    console.log('  Linear:  Checking API...');
    const linear = await validateOnLinear(ticket);
    if (!linear) {
      console.log('  Linear:  ⚠️  No response (API key may be invalid)');
    } else if (linear.error) {
      console.log(`  Linear:  ❌ ${linear.error}`);
    } else {
      console.log(`  Linear:  ✅ Found — "${linear.title}"`);
      console.log(`  State:   ${linear.state || 'unknown'}`);
      if (linear.assignee) console.log(`  Assignee: ${linear.assignee}`);
    }
  } else {
    console.log('  Linear:  ℹ️  No LINEAR_API_KEY — check manually:');
    console.log(`           ${url}`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
});
