## get_similar_incidents Tool Spec

**Summary:** Retrieves incidents with matching category and overlapping keywords to the source incident, helping identify historical fixes or related cases.

**Inputs:**
- `incident_id` (string, required): The anchor incident to compare against.
- `limit` (number, optional): 1-20, defaults to 5.

**Responses:**
- Success returns a `text` block listing similar records with truncated descriptions.
- If no matches exist, the tool returns a friendly notice instead of failing.
- Validation ensures the `incident_id` exists and the limit stays within range.

**Usage Notes:**
- Call after `create_incident` to surface prior art before drafting a solution.
- Pair with `search_incidents` when you need broader, keyword-driven discovery.
- Cached results speed up repeated calls for the same incident ID.

**Sample Payload:**

```json
{
  "incident_id": "recmwzzg5o0o8m3",
  "limit": 3
}
```

