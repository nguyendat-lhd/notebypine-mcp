## extract_lessons Tool Spec

**Summary:** Captures post-incident learnings by writing a lessons-learned record and updating the source incident with root-cause notes.

**Inputs:**
- `incident_id` (string, required): Source incident identifier.
- `problem_summary` (string, required): Concise recap of what failed.
- `root_cause` (string, required): Confirmed root cause narrative.
- `prevention` (string, required): Preventative guidance for future runs.
- `lesson_type` (string, optional): One of `prevention`, `detection`, `response`, `recovery`, `general`; defaults to `general`.

**Responses:**
- Successful calls return a `text` block summarizing the created lesson ID and contents.
- Validation errors occur if required fields are omitted or the incident does not exist.
- The handler updates the incident record’s `root_cause` field in the same flow.

**Usage Notes:**
- Pair with `export_knowledge` to circulate markdown summaries to the broader org.
- Collect `problem_summary` right after resolution while context is fresh.
- `lesson_type` allows simple categorization for dashboards and scoring.

**Sample Payload:**

```json
{
  "incident_id": "recmwzzg5o0o8m3",
  "problem_summary": "Cache invalidation mismatch left stale billing rules in production",
  "root_cause": "Feature rollout skipped warmup step for Redis cluster",
  "prevention": "Update rollout checklist with cache warmup verification",
  "lesson_type": "prevention"
}
```

