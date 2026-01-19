# SKILL_TEMPLATE.md
> Copy this file and customize for each new agent skill.

## Skill Identity
| Field | Value |
|-------|-------|
| **Name** | `{AgentName}Agent` |
| **Type** | `generator` / `transformer` / `validator` |
| **Pipeline Stage** | (1-7) |
| **Upstream** | Who provides input? |
| **Downstream** | Who consumes output? |

---

## Contract

### Input Schema
```typescript
interface {AgentName}Input {
  runId: string;
  projectId: string;
  // ... add required fields
}
```

### Output Schema
```typescript
interface {AgentName}Output {
  ok: boolean;
  // ... add output fields
  cost?: number;  // Base API cost for manifest
}
```

### Artifacts Produced
| Artifact | Location | Format |
|----------|----------|--------|
| `{output_file}` | `artifacts/{name}.json` | JSON |

---

## Implementation

### Entry Point
```
netlify/functions/lib/{agent-name}.ts
```

### External Dependencies
| Service | Env Var | Purpose |
|---------|---------|---------|
| OpenAI | `OPENAI_API_KEY` | GPT-4 Vision |

### Error Codes
| Code | Meaning | Recovery |
|------|---------|----------|
| `E001` | API timeout | Retry with backoff |
| `E002` | Invalid input | Fail fast |

---

## Quality Gate Checks
- [ ] Output validates against schema
- [ ] No API error strings in output
- [ ] Required fields populated
- [ ] Cost recorded in manifest

---

## Example Invocation
```typescript
const result = await {agentName}Agent({
  runId: 'run_123',
  projectId: 'proj_456',
  // ...
});
```

---

## Notes
- Add implementation notes, gotchas, performance considerations
- Link to related skills or documentation
