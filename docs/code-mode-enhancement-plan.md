## Code Mode Enhancement Plan

- **Objective:** Adopt a Code Mode workflow that keeps the current MCP server intact while moving orchestration into repo-hosted code, improving token efficiency, observability, and developer ergonomics for Cursor and Claude users.

### 1. Server Registration & Tool Schema

- Shorten MCP tool descriptions to 1–2 sentences plus a docs URI; provide long-form guidance via repository files instead of inline tool metadata.
- Add a lightweight `list_tools` MCP method that returns `{ name, briefDescription, specPath }` for discovery-first agent flows.

### 2. Repository Restructure

- Create `/agent/` with subdirectories: `helpers/`, `servers/`, `skills/`, `examples/`.
- Under `helpers/`, implement:
  - `callMCPTool.ts` for invoking tools with chunked handling and summary logging.
  - `searchTools.ts` for keyword-based tool discovery using `list_tools` responses.
  - `redact.ts` middleware to sanitize sensitive values prior to logging.
- Under `servers/notebypine/`, scaffold thin wrappers (`createIncident.ts`, `searchIncidents.ts`, `addSolution.ts`, `extractLessons.ts`, `exportKnowledge.ts`) plus `index.ts` that exports the namespace.
- Under `skills/`, add reusable scripts (`saveSheetAsCSV.ts`, `triageFromLogfile.ts`).
- Under `examples/`, add `incident_to_kb.ts` demonstrating end-to-end orchestration.

### 3. Progressive Disclosure Flow

- Document canonical usage: `searchTools("incident|solution|export")` → import only required wrappers → execute and log summaries (top 3 rows/items).
- Ensure wrappers default to redacted, sample-sized logging; large outputs should stay in runtime buffers or files.

### 4. Skill Library

- Convert recurring operational flows into pure functions inside `/agent/skills/` with clear I/O contracts.
- Initial skills:
  - `triageFromLogfile.ts`: parse logs, create incident, attach draft solution, apply tags.
  - `exportAndPublish.ts`: run `exportKnowledge({ format: "markdown" })`, save to `/out/*.md`, optionally push to wiki repository.

### 5. Security & Token Efficiency

- Integrate `redact.ts` into all helper logging layers; mask emails, phone numbers, API keys before console output.
- Standardize “sample logging” (default 5–10 rows) with opt-in verbose modes handled via code, not prompt context.

### 6. Developer Experience (Cursor & Claude)

- Extend README with a "Run in Code Mode" section covering:
  - Cursor setup (enable Code Execution, mount repo read/write).
  - Claude Desktop configuration (`claude_desktop_config.json`) to launch the MCP server and allow `/agent` execution.
  - New scripts: `bun run agent:demo` for `incident_to_kb.ts`, `bun run agent:test` for the e2e flow (create → similar → add_solution → export).
- Add `.cursorrules` (or project instructions) reminding agents to route calls through the helper stack and to avoid logging raw payloads.

### 7. Router & Mode Selection

- Introduce `mcp.routing.json` with per-server `mode` (`auto | code | direct`), defaulting to `auto`.
- Implement `/agent/helpers/router.ts` that selects between wrapper imports and direct MCP calls based on config, wrapper existence, and optional server capability hints (`mcp.capabilities`).
- Update usage docs to require `routeCall(serverId, toolName, args)` for all agent-driven invocations.

### 8. Server Responsibilities

- Keep PocketBase-specific logic (auth, schema, caching, access control) inside the existing MCP server for stability and testing.
- Position Code Mode as an orchestration layer that sequences tools, performs retries, adds control flow, and manages large data payloads outside the LLM context.

### 9. Benchmark & Validation

- After implementing wrappers and skills, benchmark token usage and latency for:
  - `A`: Direct MCP tool calls (current baseline).
  - `B`: Code Mode wrappers via `callMCPTool`.
- Summarize findings in README under "Why Code Mode" (target: ~98% token reduction per Anthropic guidance).
- Add automated verification via `bun run agent:test` to ensure wrappers, skills, and examples stay green.

### 10. Rollout Sequence

- Phase 1: Reduce tool descriptions, ship `list_tools`, land repo restructure with scaffolding helpers/wrappers.
- Phase 2: Implement redaction + sample logging, flesh out initial skills, update README and `.cursorrules`.
- Phase 3: Deliver router, routing config, and demo/test scripts; run benchmarks and record metrics.
- Phase 4: Iterate on additional skills, expand wrapper coverage, and socialize best practices across agents using Cursor/Claude.

### Action Plan Checklist

- [ ] **Phase 1: Server & Repo Setup**
  - [ ] Trim MCP tool descriptions to concise summaries with doc references.
  - [ ] Implement `list_tools` in the MCP server and expose spec paths.
  - [ ] Scaffold `/agent` directories (`helpers`, `servers/notebypine`, `skills`, `examples`).
  - [ ] Port existing tool wrappers into `/agent/servers/notebypine/*.ts` and export via `index.ts`.

- [ ] **Phase 2: Logging, Security, and Skills**
  - [ ] Implement `helpers/callMCPTool.ts` with chunked responses and summary logging.
  - [ ] Add `helpers/redact.ts` and wrap all logging paths.
  - [ ] Add `helpers/searchTools.ts` consuming `list_tools`.
  - [ ] Author initial skills (`triageFromLogfile.ts`, `saveSheetAsCSV.ts`) with pure I/O signatures.

- [ ] **Phase 3: Routing & Developer Experience**
  - [ ] Introduce `mcp.routing.json` and `.cursorrules` with Code Mode guidance.
  - [ ] Implement `helpers/router.ts` honoring config + server capability hints.
  - [ ] Provide Cursor and Claude setup snippets in README (“Run in Code Mode”).
  - [ ] Add scripts `bun run agent:demo` and `bun run agent:test` for examples/e2e validation.

- [ ] **Phase 4: Validation & Continuous Improvement**
  - [ ] Benchmark direct MCP vs Code Mode calls; document savings in README (“Why Code Mode”).
  - [ ] Extend skill catalog (e.g., `exportAndPublish.ts`) and add regression tests.
  - [ ] Collect feedback from Cursor/Claude users and iterate on wrappers/policies.
  - [ ] Schedule periodic audits for redaction coverage and logging hygiene.

