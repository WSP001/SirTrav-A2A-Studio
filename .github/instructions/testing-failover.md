# Testing & Failover Instructions

## Testing Philosophy
"Every agent must gracefully degrade. No single point of failure should break the pipeline."

## Test Hierarchy

### 1. Smoke Tests (Fast, CI-ready)
```bash
# Run all endpoint health checks
bash scripts/smoke-test.sh $BASE_URL

# Expected: All 7 endpoints return 200
# Time: < 30 seconds
```

### 2. Integration Tests (Agent-by-agent)
```bash
# Test individual agent with mock input
curl -X POST $BASE_URL/curate-media \
  -H "Content-Type: application/json" \
  -d '{"projectId":"test","mediaUrls":["https://example.com/photo.jpg"]}'
```

### 3. End-to-End Tests (Full pipeline)
```bash
# Trigger complete pipeline
curl -X POST $BASE_URL/start-pipeline \
  -H "Content-Type: application/json" \
  -d '{"projectId":"e2e-test","mediaUrls":[...]}'

# Monitor progress via SSE
curl -N $BASE_URL/progress?projectId=e2e-test&runId=...
```

## Failover Testing Matrix

| Agent | API Dependency | Failover Behavior |
|-------|----------------|-------------------|
| Director | OpenAI Vision | Return basic metadata |
| Writer | OpenAI GPT-4 | Use template script |
| Voice | ElevenLabs | Return mock audio URL |
| Composer | Suno | Return royalty-free track |
| Editor | FFmpeg | Return slideshow |
| Attribution | None | Always succeeds |
| Publisher | Platform APIs | Queue for retry |

## Testing Failover

### Remove API key and verify graceful degradation:
```bash
# Unset key temporarily
unset ELEVENLABS_API_KEY

# Call agent
curl -X POST $BASE_URL/text-to-speech -d '{"script":"Test"}'

# Expected: 200 with fallback audio URL, not 500
```

### Simulate network failure:
```bash
# Add to function for testing
if (process.env.SIMULATE_FAILURE === 'true') {
  throw new Error('Simulated network failure');
}
```

## Progress Event Testing

Verify SSE stream emits correct events:
```bash
# Start listening
curl -N "$BASE_URL/progress?projectId=test&runId=run1" &

# Trigger agent
curl -X POST $BASE_URL/curate-media -d '{"projectId":"test","runId":"run1"}'

# Expected events:
# data: {"agent":"director","status":"started"}
# data: {"agent":"director","status":"processing","progress":50}
# data: {"agent":"director","status":"complete"}
```

## Blobs Persistence Testing

Verify data survives function cold starts:
```bash
# Write data
curl -X POST $BASE_URL/submit-evaluation \
  -d '{"projectId":"test","runId":"run1","rating":"good"}'

# Wait for cold start (60+ seconds)
sleep 70

# Read data back
curl "$BASE_URL/progress?projectId=test&runId=run1"

# Expected: Previous evaluation data still present
```

## CI/CD Integration

Add to `.github/workflows/test.yml`:
```yaml
jobs:
  smoke-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - run: npx netlify dev &
      - run: sleep 10
      - run: bash scripts/smoke-test.sh http://localhost:8888/.netlify/functions
```

## Mean Time To Recovery (MTTR) Goals

| Failure Type | Target MTTR | Strategy |
|--------------|-------------|----------|
| Single agent fail | 0s | Auto-fallback |
| API rate limit | 60s | Exponential backoff |
| Storage unavailable | 5m | Queue + retry |
| Full outage | 15m | Alert + manual |
