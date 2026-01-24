# Agent Skills Registry
## SirTrav-A2A-Studio - Progressive Disclosure Learning

**Purpose:** Each agent teaches skills they learn. This file grows as agents complete tasks.
**Last Updated:** 2026-01-23
**Contributing:** Claude Code (Backend), Codex (UI), Antigravity (Tests), X Agent (Ops)

---

## 🔐 OAuth 1.0a Signing (Claude Code - fc96ceb)

### Critical Discovery
Healthcheck checks `TWITTER_API_KEY` + `TWITTER_ACCESS_TOKEN` (not X_ prefix).
Publish function supports BOTH prefixes. X_ takes priority if both set.
**Set TWITTER_* vars in Netlify for healthcheck to report "configured".**

### Package: oauth-1.0a (lighter than twitter-api-v2)
```bash
npm list oauth-1.0a  # => oauth-1.0a@2.2.6
```

### Verified Working (from netlify/functions/publish-x.ts)
```typescript
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

function getAuthHeader(url: string, method: string) {
  const oauth = new OAuth({
    consumer: {
      key: process.env.X_API_KEY || process.env.TWITTER_API_KEY || '',
      secret: process.env.X_API_SECRET || process.env.TWITTER_API_SECRET || '',
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto.createHmac('sha1', key).update(base_string).digest('base64');
    },
  });
  const token = {
    key: process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN || '',
    secret: process.env.X_ACCESS_TOKEN_SECRET || process.env.TWITTER_ACCESS_SECRET || '',
  };
  return oauth.toHeader(oauth.authorize({ url, method }, token));
}
```

### No Fake Success (Verified)
```typescript
if (!hasKeys) {
  return { success: false, disabled: true, platform: 'x', error: "X/Twitter disabled" };
}
```

### Edge Cases
- App permissions must be "Read and Write" (403 if Read-only)
- Free tier: 1,500 tweets/month
- User context required (not App-only Bearer)
- Rate limit: parse `x-rate-limit-reset` header for backoff timing

---

## 💰 Costing Manifest (Claude Code - Commons Good Fairness)

### 20% Markup Pattern (Verified)
```typescript
const invoiceEntry = {
  endpoint: 'tweets',
  cost: 0.001,
  total_due: 0.001 * 1.2,  // 20% Commons Good markup
  timestamp: new Date().toISOString()
};
```

### Response includes invoice
```json
{ "success": true, "tweetId": "...", "url": "...", "invoice": { "endpoint": "tweets", "cost": 0.001, "total_due": 0.0012 } }
```

---

## 🎨 Button State Machine (Codex - MG-002/MG-008)

### States: idle -> loading -> success | error | disabled

### U2A Toggle (fc96ceb)
```jsx
<label className="u2a-toggle">
  <input type="checkbox" checked={xEnabled} onChange={e => setXEnabled(e.target.checked)} />
  <span>Publish to X</span>
</label>
```

### Toast Pattern
```typescript
showToast('success', 'Posted to X!');
setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
```

### CSS (No Layout Shift)
```css
.twitter-button:hover:not(:disabled) { transform: scale(1.05); box-shadow: 0 0 20px rgba(29,161,242,0.5); }
.twitter-button.success { background: linear-gradient(135deg, #17bf63, #1da1f2); }
```

---

## 🧪 Test Modes (Antigravity - MG-X-LIVE)

### Script: scripts/test-x-publish.mjs
```bash
node scripts/test-x-publish.mjs              # Disabled-state verification
node scripts/test-x-publish.mjs --verify-only # Config check only
node scripts/test-x-publish.mjs --live        # Real post (keys required)
```

### Assertion: No Fake Success
```javascript
if (data.disabled) assert(data.success === false, 'No fake success');
if (data.success) assert(data.invoice, 'Invoice present on success');
```

---

## 📊 Engagement (X Agent - Future MG-X-003)

### Formula
```
engagementRate = ((likes + retweets + replies) / impressions) * 100
```
- \> 5%: Reinforce pattern in memory
- < 1%: Flag for review

---

## 🎬 Remotion (Future - MG-004)

### Ocean Smoothing
```typescript
const oceanWave = interpolate(frame, [0, fps * 3], [0, Math.PI * 2]);
const translateY = Math.sin(oceanWave) * 10;
```

---

## 📝 Protocol

1. Document with **verified working code** (not templates)
2. Reference commit hash or ticket
3. Note edge cases
4. Add date and agent name
