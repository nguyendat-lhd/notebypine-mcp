# NoteByPine MCP Server

A Model Context Protocol (MCP) server for managing incident reports, solutions, and knowledge base using PocketBase. This server provides tools for creating incidents, searching knowledge base, managing solutions, and extracting lessons learned.

## Features

- 🔍 **Incident Management**: Create, search, and manage incident records
- 💡 **Solution Tracking**: Add and manage solutions for incidents
- 📚 **Knowledge Base**: Export knowledge in multiple formats (JSON, CSV, Markdown)
- 🏷️ **Smart Tagging**: Automatic tagging and categorization
- 🔗 **Similarity Search**: Find similar incidents based on content
- 📊 **Lessons Learned**: Extract and document lessons from incidents
- ⚡ **Performance Optimized**: Built with caching, memory management, and performance monitoring

## Prerequisites

- [Bun](https://bun.sh) v1.3.1 or later
- Node.js 20+ (if not using Bun)
- PocketBase binary (download from [pocketbase.io](https://pocketbase.io/docs/) if not included)

**Note**: If the `pocketbase` binary is not present in the repository, download it for your platform:
- macOS (Apple Silicon): `https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_darwin_arm64.zip`
- macOS (Intel): `https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_darwin_amd64.zip`
- Linux: `https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_linux_amd64.zip`
- Windows: `https://github.com/pocketbase/pocketbase/releases/latest/download/pocketbase_windows_amd64.zip`

Extract and place the `pocketbase` executable in the project root directory.

## Quick Start

```bash
# Clone the repository
git clone https://github.com/nguyendat-lhd/notebypine-mcp.git
cd notebypine-mcp

# Install dependencies
bun install

# Start PocketBase (terminal 1)
bun run pb:serve

# Apply database migrations (terminal 2, one-time setup)
bun run setup:pocketbase

# Start the MCP server (terminal 3 or after PocketBase is ready)
bun run dev
```

Then configure your MCP client (Cursor/Claude Desktop) as described in the [Configuration](#configuration) section below.

## Installation

1. **Clone the repository**:
```bash
git clone https://github.com/nguyendat-lhd/notebypine-mcp.git
cd notebypine-mcp
```

2. **Install dependencies**:
```bash
bun install
```

3. **Set up environment variables**:
Create a `.env` file in the root directory (optional, defaults are provided):
```bash
# PocketBase Configuration
POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=admin123456

# MCP Configuration
MCP_PORT=3000
MCP_HOST=localhost

# Environment
NODE_ENV=development
LOG_LEVEL=info
```

4. **Initialize PocketBase database**:
```bash
# Start PocketBase server (in a separate terminal)
bun run pb:serve

# In another terminal, set up the database schema
bun run setup:pocketbase
```

## Configuration

### MCP Server Configuration (Cursor/Claude Desktop)

Add the following to your MCP configuration file:

**For Cursor** (`~/.cursor/mcp.json`):
```json
{
  "mcpServers": {
    "notebypine": {
      "command": "bun",
      "args": ["/path/to/notebypine-mcp/src/index.ts"],
      "env": {
        "POCKETBASE_URL": "http://localhost:8090",
        "POCKETBASE_ADMIN_EMAIL": "admin@example.com",
        "POCKETBASE_ADMIN_PASSWORD": "admin123456"
      }
    }
  }
}
```

**For Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):
```json
{
  "mcpServers": {
    "notebypine": {
      "command": "bun",
      "args": ["/path/to/notebypine-mcp/src/index.ts"],
      "env": {
        "POCKETBASE_URL": "http://localhost:8090",
        "POCKETBASE_ADMIN_EMAIL": "admin@example.com",
        "POCKETBASE_ADMIN_PASSWORD": "admin123456"
      }
    }
  }
}
```

Replace `/path/to/notebypine-mcp` with the actual path to this repository.

## Usage

### Starting the Server

The MCP server runs via stdio transport and is typically started by the MCP client (Cursor/Claude Desktop). However, you can test it manually:

```bash
# Development mode with watch (after PocketBase is running)
bun run dev

# Production mode (expects PocketBase to be running)
bun run start

# Build for production
bun run build
```

### Available MCP Tools

The server provides the following tools:

1. **`create_incident`**: Create a new incident record
   - Required: `title`, `category`, `description`, `severity`
   - Optional: `symptoms`, `context`, `environment`, `frequency`, `visibility`

2. **`search_incidents`**: Search existing incidents
   - Parameters: `query` (keyword search), `category`, `severity`, `status`, `limit`

3. **`add_solution`**: Add a solution to an incident
   - Required: `incident_id`, `solution_title`, `solution_description`, `steps`
   - Optional: `resources_needed`, `time_estimate`, `warnings`, `alternatives`

4. **`extract_lessons`**: Extract lessons learned from an incident
   - Required: `incident_id`, `problem_summary`, `root_cause`, `prevention`
   - Optional: `lesson_type`

5. **`get_similar_incidents`**: Find similar incidents
   - Required: `incident_id`
   - Optional: `limit` (default: 5)

6. **`update_incident_status`**: Update incident status
   - Required: `incident_id`, `status`
   - Optional: `notes`

7. **`export_knowledge`**: Export knowledge base
   - Optional: `format` (json, csv, markdown), `filter` (category, status, severity)

### Example Usage

Once configured in your MCP client, you can use the tools through natural language:

- "Create an incident for a database connection timeout issue"
- "Search for incidents related to authentication"
- "Add a solution to incident ID abc123"
- "Export all resolved incidents as markdown"

## Development

### Project Structure

```
notebypine-mcp/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   ├── config.ts             # Configuration management
│   ├── db/
│   │   ├── pocketbase.ts     # PocketBase client
│   │   ├── queries.ts        # Database queries
│   │   └── schema.ts         # Database schema types
│   ├── mcp/
│   │   ├── tools.ts          # MCP tools registration
│   │   ├── handlers.ts       # Tool handlers
│   │   ├── resources.ts      # MCP resources
│   │   └── prompts.ts        # MCP prompts
│   ├── services/
│   │   ├── incident.ts       # Incident service
│   │   ├── search.ts         # Search service
│   │   └── tagging.ts        # Tagging service
│   ├── types/                # TypeScript type definitions
│   └── utils/                # Utility functions
├── scripts/                   # Setup and test scripts
├── tests/                     # Test files
├── pb_data/                   # PocketBase data directory
└── pb_migrations/             # PocketBase migrations
```

### Running Tests

```bash
# Run all tests
bun test

# Run MCP-specific tests
bun run test:mcp
```

### Database Migrations

PocketBase migrations are stored in `pb_migrations/`. The setup script automatically applies them when you run `bun run setup:pocketbase`.

### Performance Monitoring

The server includes built-in performance monitoring:
- Memory usage tracking
- Request performance metrics
- Cache statistics
- Memory leak detection (development mode)

## Troubleshooting

### PocketBase Connection Issues

1. Ensure PocketBase is running:
```bash
bun run pb:serve
```

2. Check the PocketBase URL in your environment variables matches the running instance

3. Verify admin credentials are correct

### MCP Server Not Starting

1. Check that Bun is installed: `bun --version`
2. Verify all dependencies are installed: `bun install`
3. Check the logs for error messages
4. Ensure PocketBase is running before starting the MCP server

### Database Schema Issues

If you encounter schema errors, reset the database:
```bash
# Stop PocketBase
# Delete pb_data directory (backup first!)
rm -rf pb_data
# Restart PocketBase and run setup again
bun run pb:serve
bun run setup:pocketbase
```

## License

This project is released under the [MIT License](./LICENSE).

## Contributing

Interested in contributing? Great! Please follow these steps:

1. Fork the repository and create a feature branch.
2. Install dependencies with `bun install` and make your changes.
3. Run `bun test` to ensure the test suite passes.
4. Open a pull request with a clear summary of the changes and context.

We also welcome bug reports and feature ideas via GitHub issues.

## Support

For issues and questions, please open an issue on the GitHub repository.
