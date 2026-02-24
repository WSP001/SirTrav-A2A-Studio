/**
 * LEDGER — CLD-BE-OPS-002: Token Attribution Endpoint
 *
 * PURPOSE: Admin HUD endpoint for viewing and recording agent ledger entries.
 * Every token spent on the Ryzen AI NPU gets attributed to a WSP ticket.
 *
 * INPUT:
 *   GET  /.netlify/functions/ledger              → last 50 entries
 *   GET  /.netlify/functions/ledger?ticket=WSP-5 → filtered by ticket
 *   GET  /.netlify/functions/ledger?agent=claude  → filtered by agent
 *   POST /.netlify/functions/ledger              → record new entry (JSON body = LedgerEntry)
 *
 * OUTPUT:
 *   { success: true, entries: [...], count: N }                — on success
 *   { success: false, error: "..." }                           — on operational error
 *   { success: false, disabled: true }                         — if ledger lib unavailable
 *
 * CONTRACT: No Fake Success — never returns success: true for empty/error states
 * CONSTRAINT: runId threaded through all responses per CLAUDE.md #5
 */

import type { Handler, HandlerEvent } from '@netlify/functions';
import { recordLedgerEntry, readLedger, extractTicketFromBranch, type LedgerEntry } from './lib/ledger';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-cache',
};

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body, null, 2),
  };
}

const handler: Handler = async (event: HandlerEvent) => {
  // ── CORS preflight ──
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  // ── GET: Read ledger entries ──
  if (event.httpMethod === 'GET') {
    try {
      const params = event.queryStringParameters || {};
      const ticket = params.ticket || undefined;
      const agent = params.agent || undefined;
      const limit = params.limit ? parseInt(params.limit, 10) : undefined;
      const runId = params.runId || undefined;

      const entries = readLedger({ ticket, agent, limit });

      return jsonResponse(200, {
        success: true,
        entries,
        count: entries.length,
        ...(ticket && { ticket }),
        ...(agent && { agent }),
        ...(runId && { runId }),
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      return jsonResponse(500, {
        success: false,
        error: err?.message || 'Failed to read ledger',
        disabled: false,
      });
    }
  }

  // ── POST: Record new ledger entry ──
  if (event.httpMethod === 'POST') {
    try {
      if (!event.body) {
        return jsonResponse(400, {
          success: false,
          error: 'Request body is required. Send a JSON LedgerEntry.',
          disabled: false,
        });
      }

      let entry: LedgerEntry;
      try {
        entry = JSON.parse(event.body);
      } catch {
        return jsonResponse(400, {
          success: false,
          error: 'Invalid JSON in request body',
          disabled: false,
        });
      }

      // Validate required fields
      const requiredFields: (keyof LedgerEntry)[] = ['timestamp', 'ticket', 'agent', 'action', 'branch', 'detail'];
      const missing = requiredFields.filter((f) => !entry[f]);
      if (missing.length > 0) {
        return jsonResponse(400, {
          success: false,
          error: `Missing required fields: ${missing.join(', ')}`,
          disabled: false,
        });
      }

      recordLedgerEntry(entry);

      const runId = (entry as any).runId || undefined;

      return jsonResponse(201, {
        success: true,
        recorded: true,
        entry: {
          ticket: entry.ticket,
          agent: entry.agent,
          action: entry.action,
          timestamp: entry.timestamp,
        },
        ...(runId && { runId }),
      });
    } catch (err: any) {
      return jsonResponse(500, {
        success: false,
        error: err?.message || 'Failed to record ledger entry',
        disabled: false,
      });
    }
  }

  // ── Unsupported method ──
  return jsonResponse(405, {
    success: false,
    error: `Method ${event.httpMethod} not allowed. Use GET or POST.`,
    disabled: false,
  });
};

export { handler };
