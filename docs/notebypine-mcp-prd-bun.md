# PRD & ARCHITECTURE - NoteByPine MCP Server PoC
## Knowledge Extraction & Experience Management via MCP

**Version**: 1.0  
**Date**: November 7, 2025  
**Status**: Ready for Development  
**Runtime**: Bun

---

## 1. PROJECT OVERVIEW

### 1.1 Objective
Build a **lightweight, fast MCP (Model Context Protocol) Server** using Bun + PocketBase that:
- Stores experiences, troubleshooting notes, lessons learned, solutions from real-world problems
- Provides structured API for Cursor IDE (or any AI client) to query & retrieve knowledge
- Supports local-first usage, team LAN, and future cloud sync
- Acts as "AI Secretary" to help users extract & organize knowledge automatically
- Runs with superior performance using Bun runtime

### 1.2 Scope (PoC Phase)
- **MVP Core**: Single MCP instance with PocketBase backend
- **Clients**: Cursor IDE integration (via MCP protocol)
- **Deployment**: Local machine or LAN team server
- **Database**: PocketBase (SQLite) with predefined schema for incidents/knowledge
- **Runtime**: Bun (all-in-one JavaScript runtime, faster than Node.js)

### 1.3 Success Criteria
- MCP server runs locally via Bun, listens on configurable port
- Cursor can connect via MCP spec and query knowledge base
- CRUD operations for incidents, solutions, lessons learned work smoothly
- Response time < 300ms for typical queries (Bun's advantage)
- Basic semantic search functional
- Startup time < 2 seconds

---

## 2. CORE PROBLEM & VALUE PROPOSITION

### Problem
- When developers/users solve problems, they move on immediately – **knowledge is lost**
- Next time same problem occurs, they repeat 100% of the struggle
- No structured way to capture lessons learned automatically
- Traditional setups require multiple tools and complex configuration

### Our Solution
- **MCP Server as Knowledge Extractor**: Structured API to capture, organize, retrieve problem-solving journeys
- **Cursor Integration**: Ask AI directly inside IDE about past solutions
- **Local-First Privacy**: Data lives on your machine, optional cloud sync later
- **Bun Advantage**: Single runtime for everything (no npm bloat, faster bundling, better performance)

### Why NoteByPine?
- **Pine**: Symbol of resilience, sustainability, deep roots – knowledge that endures and grows
- **Evergreen knowledge**: Problems stay relevant like evergreen trees in forest
- **Knowledge forest grows together**: Community wisdom builds over time

---

## 3. ARCHITECTURE

### 3.1 High-Level System Design

```
┌────────────────────────────────────────────────────────────┐
│                    Cursor IDE                              │
│            (or any MCP-compatible client)                  │
└────────────────────────────┬─────────────────────────────┘
                             │ (MCP Protocol)
                             │
                    ┌────────▼────────┐
                    │   MCP Server    │
                    │  (Bun/TypeScript)
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
  │ MCP Tools    │  │ MCP Resources│  │ MCP Prompts  │
  │ • create     │  │ • incidents  │  │ • ask_kb     │
  │ • search     │  │ • solutions  │  │ • document   │
  │ • update     │  │ • lessons    │  │ • analyze    │
  └──────────────┘  └──────────────┘  └──────────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  PocketBase API │
                    │  (REST + Hooks) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ PocketBase DB   │
                    │ (SQLite + Local │
                    │  Collections)   │
                    └─────────────────┘
```

### 3.2 Component Breakdown

#### **MCP Server (Bun/TypeScript)**
- Implements MCP specification
- Exposes Tools, Resources, Prompts for Cursor
- Handles authentication, request validation
- Manages PocketBase API calls
- Ultra-fast startup and response times (Bun advantage)

#### **PocketBase Backend**
- Lightweight, single-file backend
- REST API out of the box
- Built-in auth, file upload, real-time webhooks
- SQLite database (file-based, portable)

#### **Collections/Schema** (in PocketBase)
- `incidents`: Problem records
- `solutions`: Step-by-step fixes
- `lessons_learned`: Extracted wisdom
- `tags`: Knowledge organization
- `feedback`: User ratings & success tracking

---

## 4. DETAILED FEATURE SET

### 4.1 MCP Tools (exposed to Cursor)

#### Tool 1: **create_incident**
```
Input:
- title: "PostgreSQL connection timeout in production"
- category: "Backend"
- description: "Long description of problem"
- context: { environment, timing, who, what, why }
- symptoms: ["timeout error", "connection refused"]

Output:
- incident_id: "uuid"
- status: "created"
- auto_tags: ["postgresql", "timeout", "production"]
- similar_incidents: [{ id, title, similarity_score }]
```

#### Tool 2: **search_incidents**
```
Input:
- query: "connection timeout"
- category: "Backend" (optional)
- tags: ["postgresql"] (optional)
- search_type: "hybrid" | "keyword" | "semantic"

Output:
- results: [
    {
      incident_id, title, description, 
      solutions: [ {steps, effectiveness} ],
      lessons_learned: [],
      matched_score
    }
  ]
```

#### Tool 3: **add_solution**
```
Input:
- incident_id: "uuid"
- solution_title: "Increase connection pool"
- steps: [ {order, action, expected_result} ]
- resources_needed: ["postgresql config"]
- warnings: ["Requires restart"]

Output:
- solution_id: "uuid"
- incident updated with solution
```

#### Tool 4: **extract_lessons**
```
Input:
- incident_id: "uuid"
- problem_summary: "what was the issue"
- root_cause: "why it happened"
- prevention: "how to avoid next time"

Output:
- lessons_id: "uuid"
- Auto-linked to incident
- Visibility set by user
```

#### Tool 5: **get_similar_incidents**
```
Input:
- incident_id: "uuid"
- limit: 5

Output:
- similar_incidents with cosine similarity score
- Useful for finding related problems
```

#### Tool 6: **update_incident_status**
```
Input:
- incident_id: "uuid"
- status: "open" | "investigating" | "resolved"
- notes: "optional update notes"

Output:
- incident updated
```

#### Tool 7: **export_knowledge**
```
Input:
- format: "json" | "csv" | "markdown"
- filter: { category, date_range, tags }

Output:
- File stream or data export
```

### 4.2 MCP Resources (for read-only context)

- `incident://recent` - Latest incidents
- `incident://by-category` - Organized by category
- `incident://stats` - Overall statistics

### 4.3 MCP Prompts (templates for AI)

- `troubleshoot` - Guide user through problem diagnosis
- `document_solution` - Help extract & document solution
- `analyze_pattern` - Identify recurring issues

---

## 5. DATA MODEL (PocketBase Collections)

### Collection: **incidents**
```
Fields:
- id (primary key, uuid)
- title (text, required, indexed)
- category (select: Backend, Frontend, DevOps, Health, Finance, etc.)
- description (text, required, full-text indexed)
- symptoms (array of strings)
- context (json: who, what, when, where, why, how)
- environment (json: os, version, tools)
- severity (select: low, medium, high, critical)
- status (select: open, investigating, resolved, archived)
- root_cause (text, nullable)
- frequency (select: one-time, occasional, frequent, recurring)
- created_by (relation to users, nullable)
- created_at (timestamp)
- updated_at (timestamp)
- resolved_at (timestamp, nullable)
- visibility (select: private, team, public)
```

### Collection: **solutions**
```
Fields:
- id (primary key, uuid)
- incident_id (relation to incidents, required)
- solution_title (text, required)
- solution_description (text, required)
- steps (json: [ {order, action, expected_result, tips} ])
- resources_needed (array of strings)
- time_estimate (text, e.g., "30 minutes")
- effectiveness_score (number 0-1, calculated from feedback)
- warnings (array of strings)
- alternatives (array of strings with descriptions)
- created_by (relation to users)
- created_at (timestamp)
- is_verified (boolean)
```

### Collection: **lessons_learned**
```
Fields:
- id (primary key, uuid)
- incident_id (relation to incidents)
- lesson_text (text, required)
- lesson_type (select: prevention, detection, response, recovery, general)
- applies_to (array: who/what this lesson applies to)
- importance (number 1-5)
- created_at (timestamp)
```

### Collection: **tags**
```
Fields:
- id (primary key, uuid)
- tag_name (text, required, unique, indexed)
- tag_type (select: symptom, technology, skill, emotion, context)
- usage_count (number)
- created_at (timestamp)
```

### Collection: **feedback**
```
Fields:
- id (primary key, uuid)
- solution_id (relation to solutions)
- user_id (relation to users, nullable)
- rating (number 1-5)
- worked (boolean)
- comment (text, nullable)
- time_spent (text, nullable)
- created_at (timestamp)
```

---

## 6. IMPLEMENTATION ROADMAP

### Phase 1: Core Infrastructure (Week 1-2)
- [ ] Setup Bun project with TypeScript config
- [ ] Integrate PocketBase SDK/API with Bun
- [ ] Implement basic MCP server with minimal tools
- [ ] Test local connection from Cursor
- [ ] Benchmark Bun vs Node.js performance

### Phase 2: Core Tools & Search (Week 2-3)
- [ ] Implement all 7 core tools (create, search, update, etc.)
- [ ] Add keyword search in PocketBase
- [ ] Add basic tags/categorization
- [ ] Test CRUD workflows with Bun's native file system
- [ ] Optimize response times

### Phase 3: AI Integration (Week 3-4)
- [ ] Add semantic search (optional: embedding via OpenAI API)
- [ ] Implement similarity detection for related incidents
- [ ] Auto-tag suggestions for new incidents
- [ ] Cursor integration testing
- [ ] Performance profiling with Bun tooling

### Phase 4: Polish & Documentation (Week 4)
- [ ] Error handling & validation
- [ ] Logging & monitoring (Bun's built-in)
- [ ] Documentation for Cursor setup
- [ ] PoC demo & feedback
- [ ] Docker/container support (Bun container)

---

## 7. TECHNOLOGY STACK

### Backend
- **Runtime**: Bun (all-in-one JavaScript runtime, faster than Node.js)
- **Language**: TypeScript (native support in Bun)
- **MCP Framework**: `@modelcontextprotocol/sdk` (Bun compatible)
- **Backend Service**: PocketBase (binary, self-contained)
- **API Client**: Bun's native `fetch` or `pocketbase` npm package
- **Validation**: Zod (works great with Bun)
- **Build Tool**: Bun's built-in bundler (ultra-fast)

### Database
- **PocketBase**: SQLite (file-based, portable)
- **Default Location**: `./pb_data/` directory
- **Optional Future**: PostgreSQL migration path

### Dev Tools
- **Editor**: VS Code + MCP debug extension
- **Version Control**: Git
- **Package Manager**: Bun (built-in, faster than npm)
- **Runtime**: Bun 1.0+ (`https://bun.sh`)

### Bun-specific Advantages
- **No node_modules**: Bunfig.toml replaces package.json complexity
- **Native TypeScript**: No tsc compilation needed
- **Built-in test runner**: `bun test` for unit tests
- **Native SQLite support**: Can use Bun's built-in sqlite lib if needed
- **Faster startup**: ~200ms vs Node.js ~1000ms
- **Lower memory footprint**: ~30MB vs Node.js ~80MB+

---

## 8. DEPLOYMENT SCENARIOS

### Scenario A: Personal PoC (Single Machine)
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Setup project
bun create elysia notebypine-mcp
cd notebypine-mcp
bun install

# Start PocketBase
./pocketbase serve --dir ./pb_data

# Start MCP Server (separate terminal)
bun run start:mcp

# Cursor connects to: ws://localhost:3000/mcp
```

### Scenario B: Team LAN
```bash
# Deploy PocketBase on team server (192.168.1.100:8090)
# Deploy MCP on same server or on developer machine
# Configure endpoint in Cursor: ws://192.168.1.100:3000/mcp
```

### Scenario C: Docker (using Bun container)
```dockerfile
FROM oven/bun:latest

WORKDIR /app

COPY package.json .
COPY bun.lockb .
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 3000 8090

CMD ["bun", "run", "dev:docker"]
```

### Scenario D: Standalone Binary (Bun compile)
```bash
# Bun can compile to standalone binary (future)
bun build --compile ./src/index.ts --outfile notebypine

# Then run:
./notebypine
```

---

## 9. CURSOR IDE INTEGRATION

### Step 1: Install MCP Server
- User downloads/installs MCP server locally using Bun

### Step 2: Configure Cursor
```json
{
  "mcpServers": {
    "notebypine": {
      "command": "bun",
      "args": ["run", "/path/to/notebypine-mcp/src/index.ts"],
      "env": {
        "POCKETBASE_URL": "http://localhost:8090",
        "MCP_PORT": "3000"
      }
    }
  }
}
```

### Step 3: Use in Cursor
```
User in Cursor: "Search my knowledge base for PostgreSQL timeout solutions"
↓
MCP Tool: search_incidents({ query: "PostgreSQL timeout" })
↓
Results shown in Cursor AI context (ultra-fast with Bun)
↓
User can then ask: "Add this new solution I just discovered"
↓
MCP Tool: add_solution(...)
```

---

## 10. API EXAMPLES

### Example 1: Create Incident (via MCP Tool)
```typescript
// Cursor calls this internally via MCP
await mcp.callTool("create_incident", {
  title: "React Native app crashes on Android 13",
  category: "Mobile",
  description: "App force closes when...",
  symptoms: ["force close", "crash log shows native method call"],
  context: {
    who: "mobile team",
    what: "production app",
    when: "after React Native upgrade",
    where: "Android 13 devices only",
    why: "API compatibility issue",
    how: "tried reverting version"
  }
})
```

### Example 2: Search Knowledge Base
```typescript
await mcp.callTool("search_incidents", {
  query: "how to fix connection timeout",
  search_type: "hybrid"
})

// Returns:
// - incident: PostgreSQL connection pool exhaustion (89% match)
// - solutions: [step-by-step guide]
// - lessons: [prevention, monitoring tips]
```

### Example 3: Extract Lessons
```typescript
await mcp.callTool("extract_lessons", {
  incident_id: "abc123",
  problem_summary: "App crashed due to API timeout",
  root_cause: "Connection pool too small for production traffic",
  prevention: "Monitor pool usage, auto-scale, set alerts"
})
```

---

## 11. SECURITY & PRIVACY

### Local-First by Default
- All data stored locally in SQLite file (.pb)
- No cloud upload unless explicitly requested
- User owns the file, can backup/move anytime
- Bun's native file system operations are optimized for security

### Optional Authentication
- PocketBase provides basic auth
- Can be extended with API keys for team access
- Bun supports native crypto operations for additional security

### Visibility Control
- Incidents marked as: private, team, public
- MCP respects visibility when searching

---

## 12. PERFORMANCE BENCHMARKS (Expected)

### Bun vs Node.js
| Metric | Bun | Node.js | Advantage |
|--------|-----|---------|-----------|
| Startup time | ~200ms | ~1000ms | 5x faster |
| Memory (idle) | ~30MB | ~80MB+ | 70% less |
| Request latency | ~50ms | ~150ms | 3x faster |
| Bundle size | ~5MB | ~40MB+ | 8x smaller |
| File I/O | Native optimized | Node APIs | Faster |

---

## 13. SUCCESS METRICS (PoC)

- [ ] MCP server starts within 500ms via Bun
- [ ] Cursor connects and lists available tools instantly
- [ ] Create incident tool works end-to-end (< 100ms)
- [ ] Search returns relevant results within 300ms
- [ ] Can add solution & extract lessons (< 100ms each)
- [ ] 10+ test incidents stored successfully
- [ ] No data loss on restart
- [ ] Cursor can autocomplete based on stored knowledge
- [ ] Memory footprint stays under 50MB during operation
- [ ] Bun bundle size under 10MB

---

## 14. FUTURE ENHANCEMENTS (Post-PoC)

- Multi-tier knowledge (local + LAN team + cloud)
- Semantic search with embeddings
- Realtime sync via WebSocket (Bun's WS support)
- Mobile app (React Native)
- Auto-categorization via AI
- Conflict resolution & multi-device sync
- Export/import for backup
- Public knowledge marketplace
- Credit/gamification system
- Bun's native test runner for comprehensive test suite
- Bun plugin system for extensibility

---

## 15. PROJECT STRUCTURE

```
notebypine-mcp/
├── src/
│   ├── index.ts                 # MCP server entry (Bun entry point)
│   ├── mcp/
│   │   ├── tools.ts            # Tool definitions
│   │   ├── resources.ts         # Resource definitions
│   │   ├── prompts.ts          # Prompt templates
│   │   └── handlers.ts         # Tool handlers
│   ├── db/
│   │   ├── pocketbase.ts       # PocketBase client
│   │   ├── schema.ts           # Collection definitions
│   │   └── queries.ts          # Common queries
│   ├── services/
│   │   ├── incident.ts         # Incident logic
│   │   ├── search.ts           # Search logic
│   │   └── ai.ts               # AI helpers (future)
│   └── config.ts               # Configuration
├── pb_data/                     # PocketBase data (git ignored)
├── bunfig.toml                  # Bun configuration
├── .env                         # Environment variables
├── package.json                 # Dependencies
├── tsconfig.json               # TypeScript config
├── Dockerfile                  # Docker setup (Bun container)
└── README.md
```

---

## 16. QUICK START GUIDE

### Installation
```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Clone and setup
git clone https://github.com/yourusername/notebypine-mcp
cd notebypine-mcp
bun install

# Download PocketBase
bun run setup:pocketbase
```

### Running
```bash
# Terminal 1: Start PocketBase
bun run pb:serve

# Terminal 2: Start MCP Server
bun run dev

# Terminal 3: Connect Cursor (copy config from Step 9)
```

### Testing
```bash
# Run tests
bun test

# Test MCP tools directly
bun run test:mcp
```

---

## 17. NEXT STEPS

1. **Install Bun** from `https://bun.sh`
2. **Validate schema** with stakeholders
3. **Setup project scaffold** (using Bun)
4. **Download PocketBase** for your OS
5. **Implement MCP server** with core tools
6. **Test with Cursor** IDE
7. **Iterate based on feedback**

---

**END OF PRD & ARCHITECTURE DOCUMENT**

*"Knowledge grows like pines – deep roots, steady growth, timeless wisdom"*

---

## APPENDIX: Why Bun for NoteByPine?

1. **Performance**: 3-5x faster than Node.js for typical operations
2. **Developer Experience**: Zero config, batteries included
3. **All-in-one**: No need for multiple tools (npm, tsc, ts-node, etc.)
4. **Modern JavaScript**: Full ESM support, top-level await
5. **Production-ready**: Companies using Bun in production (Vercel, Figma, etc.)
6. **Future-proof**: Actively developed, great community support
7. **Cost**: Lower memory footprint = cheaper hosting later
8. **Alignment**: You already use Bun for other projects (from your profile)
