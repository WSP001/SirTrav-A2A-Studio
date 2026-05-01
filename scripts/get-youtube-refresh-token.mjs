#!/usr/bin/env node
/**
 * One-time helper for generating a YouTube OAuth2 refresh token.
 *
 * Required env:
 *   YOUTUBE_CLIENT_ID
 *   YOUTUBE_CLIENT_SECRET
 *
 * Optional env:
 *   YOUTUBE_REDIRECT_URI (default: http://localhost:8787/oauth2/callback)
 *
 * The token is printed for manual entry into Netlify Dashboard. Nothing is
 * written to disk.
 */

import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { URL } from 'node:url';

const clientId = process.env.YOUTUBE_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
const redirectUri = process.env.YOUTUBE_REDIRECT_URI || 'http://localhost:8787/oauth2/callback';

if (!clientId || !clientSecret) {
  console.error('Missing YOUTUBE_CLIENT_ID and/or YOUTUBE_CLIENT_SECRET.');
  process.exit(1);
}

const callbackUrl = new URL(redirectUri);
if (!['localhost', '127.0.0.1'].includes(callbackUrl.hostname)) {
  console.error('YOUTUBE_REDIRECT_URI must point to localhost or 127.0.0.1 for this helper.');
  process.exit(1);
}

const state = randomBytes(16).toString('hex');
const scope = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube',
].join(' ');

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('access_type', 'offline');
authUrl.searchParams.set('prompt', 'consent');
authUrl.searchParams.set('scope', scope);
authUrl.searchParams.set('state', state);

const port = Number(callbackUrl.port || 8787);
const callbackPath = callbackUrl.pathname;

console.log('\nYouTube Refresh Token Helper');
console.log('\nOpen this URL in your browser and approve access:\n');
console.log(authUrl.toString());
console.log(`\nListening on ${redirectUri} for the OAuth callback...\n`);

let closed = false;
function closeServer(server) {
  if (closed) return;
  closed = true;
  server.close();
}

const server = http.createServer(async (req, res) => {
  try {
    const reqUrl = new URL(req.url || '/', `http://127.0.0.1:${port}`);
    if (reqUrl.pathname !== callbackPath) {
      res.statusCode = 404;
      res.end('Not found');
      return;
    }

    const returnedState = reqUrl.searchParams.get('state');
    const code = reqUrl.searchParams.get('code');
    const oauthError = reqUrl.searchParams.get('error');

    if (oauthError) {
      res.statusCode = 400;
      res.end(`OAuth error: ${oauthError}`);
      console.error(`OAuth error: ${oauthError}`);
      closeServer(server);
      process.exitCode = 1;
      return;
    }

    if (!code || returnedState !== state) {
      res.statusCode = 400;
      res.end('Invalid callback: missing code or state mismatch.');
      console.error('Invalid callback: missing code or state mismatch.');
      closeServer(server);
      process.exitCode = 1;
      return;
    }

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenJson = await tokenResp.json().catch(() => ({}));
    if (!tokenResp.ok) {
      res.statusCode = 500;
      res.end('Token exchange failed. Check terminal output.');
      console.error('Token exchange failed:', tokenJson);
      closeServer(server);
      process.exitCode = 1;
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Success. You can close this tab and return to the terminal.');

    if (tokenJson.refresh_token) {
      console.log('\nSet this in Netlify Dashboard. Do not commit it:\n');
      console.log(`YOUTUBE_REFRESH_TOKEN=${tokenJson.refresh_token}\n`);
    } else {
      console.log('\nNo refresh_token was returned.');
      console.log('Revoke the test grant for this app/user, then rerun this helper with prompt=consent.\n');
    }

    closeServer(server);
  } catch (error) {
    res.statusCode = 500;
    res.end('Unexpected server error. Check terminal output.');
    console.error('Unexpected error:', error);
    closeServer(server);
    process.exitCode = 1;
  }
});

server.listen(port, '127.0.0.1');
