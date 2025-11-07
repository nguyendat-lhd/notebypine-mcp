## create_incident Tool Spec

**Summary:** Creates a new incident record in PocketBase and automatically opens downstream workflows for solutions and lessons. Best for kicking off structured triage when you have enough context to log the issue.

**Inputs:**
- `title` (string, required): Human-readable headline, max 200 characters.
- `category` (string, required): One of `Backend`, `Frontend`, `DevOps`, `Health`, `Finance`, `Mobile`.
- `description` (string, required): Detailed problem statement.
- `severity` (string, required): One of `low`, `medium`, `high`, `critical`.
- `symptoms`, `context`, `environment`, `visibility`, `frequency` (strings, optional): Enrich the record for later search and reporting.

**Responses:**
- Success returns a `text` block summarizing the record, including the PocketBase ID.
- Errors are returned as `text` with `isError: true`; review validation hints in the message.

**Usage Notes:**
- Always capture severity; the server enforces the enum before touching PocketBase.
- Use `visibility` when collaborating with partners; defaults to `private`.
- Follow-up actions typically call `add_solution` or `extract_lessons` with the new ID.

**Sample Payload:**

```json
{
  "title": "API 500s when billing flag enabled",
  "category": "Backend",
  "description": "High error rate after enabling billing guard. Incidents started at 08:14 UTC.",
  "severity": "high",
  "environment": "prod-us-east-1"
}
```

