## export_knowledge Tool Spec

**Summary:** Generates a knowledge-base export across incidents, solutions, and lessons in JSON, CSV, or Markdown formats for downstream analytics or publishing.

**Inputs:**
- `format` (string, required): `json`, `csv`, or `markdown`.
- `filter` (object, optional): Supports `category`, `status`, and `severity` keys that mirror the PocketBase enums. Omit for a full export.

**Responses:**
- Returns a `json` or `text` payload depending on format. Markdown exports truncate long fields for token safety.
- Read operations are cached per `{format, filter}` tuple; repeat requests are fast.
- Validation enforces allowed formats before contacting PocketBase.

**Usage Notes:**
- Markdown exports are ideal for sharing in incident reviews; JSON powers automation pipelines.
- Large exports may exceed message limits—write results to disk when orchestrating in Code Mode.
- Combine with upcoming helper `saveSheetAsCSV` to persist outputs for BI tools.

**Sample Payload:**

```json
{
  "format": "markdown",
  "filter": {
    "category": "Backend",
    "severity": "high"
  }
}
```

