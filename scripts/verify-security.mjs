const SITE_URL = process.env.URL || 'http://127.0.0.1:8888';
const FUNCTIONS_BASE = `${SITE_URL.replace(/\/$/, '')}/.netlify/functions`;
const START_ENDPOINT = `${FUNCTIONS_BASE}/start-pipeline`;

const request = async (token) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(START_ENDPOINT, {
    method: 'POST',
    headers,
    body: JSON.stringify({ projectId: 'security-demo' }),
  });
  const bodyText = await response.text();
  return { status: response.status, bodyText };
};

const run = async () => {
  const results = [];
  results.push({ label: 'no_token', ...(await request(null)) });
  results.push({ label: 'bad_token', ...(await request('bad-token')) });
  results.push({ label: 'good_token', ...(await request(process.env.PUBLISH_TOKEN_SECRET || 'demo')) });

  const failures = [];
  if (results[0].status !== 401) failures.push('Expected 401 for no_token');
  if (results[1].status !== 403) failures.push('Expected 403 for bad_token');
  if (results[2].status !== 202) failures.push('Expected 202 for good_token');

  console.log('Security handshake results:');
  for (const result of results) {
    console.log(`- ${result.label}: ${result.status}`);
  }

  if (failures.length) {
    console.error('Security verification failed:', failures.join('; '));
    process.exit(1);
  }

  console.log('Security verification passed.');
};

run().catch((error) => {
  console.error('Security verification error:', error);
  process.exit(1);
});
