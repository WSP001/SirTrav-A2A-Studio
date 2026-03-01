# Postman + Postbot SOP (Contract-Locked)

## Purpose
Run SirTrav function checks in a repeatable way without exposing secrets.

## Environment Variables
Create two Postman environments (`SirTrav Local`, `SirTrav Cloud`) with:

- `baseUrl`
  - Local: `http://localhost:8888/.netlify/functions`
  - Cloud: `https://sirtrav-a2a-studio.netlify.app/.netlify/functions`
- `projectId` = `sirtrav-test`
- `runId` = `manual-{{$timestamp}}`
- `dryRun` = `true`
- `bearerToken` = empty by default (only needed if `start-pipeline` auth is enabled)

## Guardrails
- Never store API keys in collection variables.
- Use Postman Vault for secrets.
- Keep social tests in `dryRun=true` unless explicitly approved.
- No Fake Success rule:
  - if `success === true`, require platform identifier (`tweetId`, `linkedinId`, `urn`, `videoId`, etc.)
  - if `disabled === true`, require `reason` or `error`.

## Postbot Prompt Templates

### Healthcheck Request
`Generate tests: status 200, JSON body, body.status exists, body.services exists.`

### Publish-X DRY
`Generate tests enforcing No Fake Success: success=true requires tweetId; disabled=true requires reason/error; status 200.`

### Publish-LinkedIn DRY
`Generate tests enforcing No Fake Success: success=true requires linkedinId/urn; disabled=true requires reason/error; status 200.`

### Progress GET/POST
`Generate tests: status 200, JSON parse, expected shape keys exist.`

## Team Run Order
1. Start local dev: `netlify dev`
2. Run collection against `SirTrav Local`
3. Run collection against `SirTrav Cloud`
4. Save run results as evidence in `runbooks/`
