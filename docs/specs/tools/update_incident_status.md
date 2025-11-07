## update_incident_status Tool Spec

**Summary:** Updates the lifecycle status of an incident, optionally recording resolution metadata when moving to `resolved`.

**Inputs:**
- `incident_id` (string, required): Target incident record ID.
- `status` (string, required): One of `open`, `investigating`, `resolved`, `archived`.
- `notes` (string, optional): Additional context for the status change.

**Responses:**
- Successful calls return a `text` summary showing the new status and resolved timestamp if applicable.
- Validation covers status enum values and ensures the incident exists.
- Errors include descriptive hints when PocketBase rejects the update.

**Usage Notes:**
- Transitioning to `resolved` automatically sets `resolved_at` on the PocketBase record.
- Use `notes` to capture post-mortem reminders or follow-up owners.
- Consider pairing with `extract_lessons` to capture learnings after resolution.

**Sample Payload:**

```json
{
  "incident_id": "recmwzzg5o0o8m3",
  "status": "investigating",
  "notes": "Tracking down Redis cache invalidation bug"
}
```

