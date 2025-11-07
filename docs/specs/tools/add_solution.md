## add_solution Tool Spec

**Summary:** Appends a structured remediation record to an existing incident. Use after verifying the fix or to draft remediation plans for review.

**Inputs:**
- `incident_id` (string, required): PocketBase record ID from `create_incident` or search results.
- `solution_title` (string, required): Short label for quick browsing.
- `solution_description` (string, required): Narrative covering context and scope.
- `steps` (string, required): Ordered instructions; pass JSON array text when possible for downstream parsing.
- Optional fields: `resources_needed`, `time_estimate`, `warnings`, `alternatives` (strings).

**Responses:**
- Success returns a summary `text` block with the new solution ID.
- Missing fields raise validation errors before network calls.
- PocketBase failures (e.g., missing incident) bubble up with explicit error messaging.

**Usage Notes:**
- Always verify the `incident_id` exists; the server performs a lookup and will fail fast if not found.
- `steps` accepts either Markdown or JSON; maintain consistency for later automation.
- After adding a solution, consider triggering `update_incident_status` to mark progress.

**Sample Payload:**

```json
{
  "incident_id": "recmwzzg5o0o8m3",
  "solution_title": "Rollback billing switch",
  "solution_description": "Temporarily disable billing guard while investigating caching bug.",
  "steps": "[\"Disable feature flag\", \"Verify error rate\", \"Capture logs\"]",
  "warnings": "Customers see stale invoices for 10 minutes after rollback"
}
```

