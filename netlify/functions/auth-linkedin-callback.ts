import type { Handler, HandlerEvent, HandlerResponse } from '@netlify/functions';

/**
 * LinkedIn OAuth Callback Handler
 * 
 * When user clicks "Allow" on LinkedIn's consent screen, LinkedIn redirects to:
 *   https://sirtrav-a2a-studio.netlify.app/.netlify/functions/auth-linkedin-callback?code=XXX&state=YYY
 * 
 * This function:
 *   1. Exchanges the code for an access token
 *   2. Calls /v2/userinfo to get the Person URN
 *   3. Displays all values the user needs to paste into Netlify env vars
 * 
 * Required env vars (already in Netlify):
 *   - LINKEDIN_CLIENT_ID
 *   - LINKEDIN_CLIENT_SECRET
 */

const REDIRECT_PATH = '/auth/linkedin/callback';

function getBaseUrl(event: HandlerEvent): string {
  const host = event.headers['host'] || 'sirtrav-a2a-studio.netlify.app';
  const proto = event.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
}

function htmlPage(title: string, body: string): HandlerResponse {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title} — SirTrav LinkedIn Setup</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
           background: #0f0a1e; color: #e0d6f0; min-height: 100vh; padding: 2rem; }
    .container { max-width: 700px; margin: 0 auto; }
    h1 { color: #c084fc; margin-bottom: 1rem; font-size: 1.5rem; }
    h2 { color: #a78bfa; margin: 1.5rem 0 0.5rem; font-size: 1.1rem; }
    .card { background: #1a1130; border: 1px solid #2d2050; border-radius: 12px;
            padding: 1.5rem; margin: 1rem 0; }
    .success { border-color: #22c55e; }
    .error { border-color: #ef4444; }
    .env-var { background: #0d0820; border: 1px solid #3b2d60; border-radius: 8px;
               padding: 0.75rem 1rem; margin: 0.5rem 0; font-family: 'Cascadia Code', monospace;
               font-size: 0.85rem; word-break: break-all; position: relative; }
    .env-var .label { color: #a78bfa; font-size: 0.75rem; margin-bottom: 0.25rem; }
    .env-var .value { color: #4ade80; user-select: all; }
    .copy-btn { position: absolute; top: 0.5rem; right: 0.5rem; background: #7c3aed;
                color: white; border: none; border-radius: 6px; padding: 0.3rem 0.6rem;
                font-size: 0.7rem; cursor: pointer; }
    .copy-btn:hover { background: #6d28d9; }
    .step { display: flex; gap: 0.75rem; margin: 0.75rem 0; align-items: flex-start; }
    .step-num { background: #7c3aed; color: white; border-radius: 50%; min-width: 28px;
                height: 28px; display: flex; align-items: center; justify-content: center;
                font-size: 0.8rem; font-weight: bold; }
    .step-text { font-size: 0.9rem; line-height: 1.5; }
    .warning { background: #422006; border: 1px solid #f59e0b; border-radius: 8px;
               padding: 0.75rem 1rem; margin: 1rem 0; font-size: 0.85rem; }
    a { color: #c084fc; }
    code { background: #0d0820; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.85rem; }
    .footer { margin-top: 2rem; text-align: center; color: #6b5b8a; font-size: 0.8rem; }
  </style>
  <script>
    function copyVal(id) {
      const el = document.getElementById(id);
      navigator.clipboard.writeText(el.textContent);
      const btn = el.parentElement.querySelector('.copy-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    }
  </script>
</head>
<body>
  <div class="container">
    ${body}
    <div class="footer">SirTrav A2A Studio — For the Commons Good 🌍</div>
  </div>
</body>
</html>`,
  };
}

const handler: Handler = async (event: HandlerEvent) => {
  const params = event.queryStringParameters || {};
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const baseUrl = getBaseUrl(event);
  const fullRedirectUri = `${baseUrl}${REDIRECT_PATH}`;

  // If no code param, show the "start" page with auth link
  if (!params.code) {
    if (!clientId) {
      return htmlPage('Setup Error', `
        <h1>⚠️ LinkedIn Setup</h1>
        <div class="card error">
          <p><strong>LINKEDIN_CLIENT_ID</strong> is not set in Netlify environment variables.</p>
          <p>Set it first, redeploy, then try again.</p>
        </div>
      `);
    }

    const scopes = encodeURIComponent('openid profile w_member_social');
    const redirect = encodeURIComponent(fullRedirectUri);
    const state = `sirtrav-${Date.now()}`;
    const authUrl = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${redirect}&scope=${scopes}&state=${state}`;

    return htmlPage('Start LinkedIn Setup', `
      <h1>🔗 LinkedIn OAuth Setup</h1>
      <div class="card">
        <p>Click the button below to authorize SirTrav with LinkedIn.</p>
        <p style="margin-top:1rem">
          <a href="${authUrl}" style="display:inline-block;background:#0a66c2;color:white;
            padding:0.75rem 1.5rem;border-radius:8px;text-decoration:none;font-weight:bold;">
            🔐 Authorize with LinkedIn
          </a>
        </p>
        <p style="margin-top:1rem;font-size:0.85rem;color:#8b7ba0;">
          Scopes: <code>openid profile w_member_social</code><br>
          Redirect: <code>${fullRedirectUri}</code>
        </p>
      </div>
      <div class="warning">
        ⚠️ Make sure these LinkedIn Developer Products are enabled:<br>
        • <strong>Sign In with LinkedIn using OpenID Connect</strong><br>
        • <strong>Share on LinkedIn</strong>
      </div>
    `);
  }

  // We have a code — exchange it
  if (!clientId || !clientSecret) {
    return htmlPage('Setup Error', `
      <h1>⚠️ Missing Credentials</h1>
      <div class="card error">
        <p><strong>LINKEDIN_CLIENT_ID</strong>: ${clientId ? '✅' : '❌ missing'}</p>
        <p><strong>LINKEDIN_CLIENT_SECRET</strong>: ${clientSecret ? '✅' : '❌ missing'}</p>
        <p style="margin-top:1rem">Set both in Netlify → Environment variables, redeploy, and try again.</p>
      </div>
    `);
  }

  const code = params.code;

  // Step 1: Exchange code for token
  let tokenData: any;
  try {
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code!,
      redirect_uri: fullRedirectUri,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      return htmlPage('Token Exchange Failed', `
        <h1>❌ Token Exchange Failed</h1>
        <div class="card error">
          <p>LinkedIn returned an error when exchanging the authorization code.</p>
          <p style="margin-top:0.5rem"><strong>Status:</strong> ${tokenResponse.status}</p>
          <p><strong>Error:</strong> ${tokenData.error || 'unknown'}</p>
          <p><strong>Description:</strong> ${tokenData.error_description || 'none'}</p>
        </div>
        <div class="card">
          <h2>Common causes:</h2>
          <ul style="margin:0.5rem 0 0 1.5rem;font-size:0.9rem">
            <li>Authorization code expired (they last ~30 seconds)</li>
            <li>Code was already used (each code is single-use)</li>
            <li>Redirect URI mismatch — must be exactly: <code>${fullRedirectUri}</code></li>
            <li>Client secret is wrong</li>
          </ul>
          <p style="margin-top:1rem"><a href="${baseUrl}${REDIRECT_PATH}">🔄 Try again</a></p>
        </div>
      `);
    }
  } catch (err: any) {
    return htmlPage('Network Error', `
      <h1>❌ Network Error</h1>
      <div class="card error">
        <p>Could not reach LinkedIn token endpoint.</p>
        <p>${err.message}</p>
      </div>
    `);
  }

  const accessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in;
  const scope = tokenData.scope || '(not reported)';

  // Step 2: Fetch person URN
  let personUrn = '';
  let personName = '';
  let urnSource = '';

  // Try /v2/userinfo first
  try {
    const uiRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (uiRes.ok) {
      const uiData = await uiRes.json();
      personUrn = `urn:li:person:${uiData.sub}`;
      personName = uiData.name || '';
      urnSource = '/v2/userinfo';
    }
  } catch { /* continue to fallback */ }

  // Fallback: /v2/me
  if (!personUrn) {
    try {
      const meRes = await fetch('https://api.linkedin.com/v2/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (meRes.ok) {
        const meData = await meRes.json();
        personUrn = `urn:li:person:${meData.id}`;
        personName = `${meData.localizedFirstName || ''} ${meData.localizedLastName || ''}`.trim();
        urnSource = '/v2/me';
      }
    } catch { /* both failed */ }
  }

  const expiryDays = Math.round((expiresIn || 0) / 86400);

  return htmlPage('LinkedIn Setup Complete', `
    <h1>✅ LinkedIn OAuth — Success!</h1>
    ${personName ? `<p style="font-size:1.1rem;margin:0.5rem 0">Welcome, <strong>${personName}</strong></p>` : ''}

    <div class="card success">
      <h2>Your Netlify Environment Variables</h2>
      <p style="font-size:0.85rem;color:#8b7ba0;margin-bottom:1rem">
        Copy each value below and paste into Netlify → Site configuration → Environment variables
      </p>

      <div class="env-var">
        <div class="label">LINKEDIN_CLIENT_ID</div>
        <div class="value" id="v1">${clientId}</div>
        <button class="copy-btn" onclick="copyVal('v1')">Copy</button>
      </div>

      <div class="env-var">
        <div class="label">LINKEDIN_CLIENT_SECRET</div>
        <div class="value">••••••• (already set in Netlify ✅)</div>
      </div>

      <div class="env-var">
        <div class="label">LINKEDIN_ACCESS_TOKEN</div>
        <div class="value" id="v3">${accessToken}</div>
        <button class="copy-btn" onclick="copyVal('v3')">Copy</button>
      </div>

      ${personUrn ? `
      <div class="env-var">
        <div class="label">LINKEDIN_PERSON_URN</div>
        <div class="value" id="v4">${personUrn}</div>
        <button class="copy-btn" onclick="copyVal('v4')">Copy</button>
      </div>
      ` : `
      <div class="env-var" style="border-color:#ef4444">
        <div class="label">LINKEDIN_PERSON_URN</div>
        <div class="value" style="color:#f87171">⚠️ Could not fetch — both /v2/userinfo and /v2/me failed.
          You may need to enable "Sign In with LinkedIn using OpenID Connect" in Products.</div>
      </div>
      `}
    </div>

    <div class="card">
      <h2>Token Details</h2>
      <p><strong>Scopes:</strong> <code>${scope}</code></p>
      <p><strong>Expires in:</strong> ${expiresIn} seconds (~${expiryDays} days)</p>
      ${urnSource ? `<p><strong>URN source:</strong> <code>${urnSource}</code></p>` : ''}
    </div>

    <div class="card">
      <h2>Next Steps</h2>
      <div class="step"><div class="step-num">1</div><div class="step-text">
        Copy <strong>LINKEDIN_ACCESS_TOKEN</strong> and <strong>LINKEDIN_PERSON_URN</strong> above
      </div></div>
      <div class="step"><div class="step-num">2</div><div class="step-text">
        Paste into <a href="https://app.netlify.com" target="_blank">Netlify Dashboard</a> →
        Site configuration → Environment variables
      </div></div>
      <div class="step"><div class="step-num">3</div><div class="step-text">
        Trigger a <strong>redeploy</strong> (Deploys → Trigger deploy → Deploy site)
      </div></div>
      <div class="step"><div class="step-num">4</div><div class="step-text">
        Run proof: <code>just council-flash-linkedin</code>
      </div></div>
    </div>

    <div class="warning">
      🔒 <strong>Security:</strong> This page contains your access token. Close this tab after copying.
      Do not share screenshots of this page.
    </div>
  `);
};

export { handler };
