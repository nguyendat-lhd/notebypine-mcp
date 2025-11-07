## search_incidents Tool Spec

**Summary:** Queries incident records in PocketBase using keyword and metadata filters. Ideal for triage and impact assessment before logging new work.

**Inputs:**
- `query` (string, required): Keyword string applied to title and description with PocketBase full-text operators.
- `category`, `severity`, `status` (strings, optional): Filter facets; each must match the server enum values.
- `limit` (number, optional): 1-100, defaults to 10. Larger limits increase token usage; prefer follow-up pagination via additional calls.

**Responses:**
- Success includes a `text` block summarizing match count and truncated descriptions.
- Empty results surface a friendly notice instead of an error.
- Validation failures return `isError: true` with a hint (e.g., limit out of range).

**Usage Notes:**
- Combine with `get_similar_incidents` when you already know an anchor incident ID.
- Truncation keeps outputs manageable; use dataset exports for raw payloads.
- Server caches recent searches and will reuse responses for identical argument objects.

**Sample Payload:**

```json
{
  "query": "database timeout",
  "category": "Backend",
  "severity": "high",
  "limit": 5
}
```

