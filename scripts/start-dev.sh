#!/bin/bash

echo "🚀 Starting NoteByPine Development Environment..."
echo "=========================================="

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📁 Project Root: $PROJECT_ROOT"

# Check if PocketBase binary exists
if [ ! -f "$PROJECT_ROOT/pocketbase" ]; then
    echo "❌ PocketBase binary not found at $PROJECT_ROOT/pocketbase"
    echo "Please download PocketBase from https://pocketbase.io/docs/"
    exit 1
fi

# Start PocketBase in background
echo "🔧 Starting PocketBase server..."
cd "$PROJECT_ROOT"
./pocketbase serve --dir ./pb_data &
PB_PID=$!

# Wait for PocketBase to be ready
echo "⏳ Waiting for PocketBase to start..."
sleep 3

# Check if PocketBase is running
if curl -s http://localhost:8090/api/health > /dev/null 2>&1; then
    echo "✅ PocketBase is running on http://localhost:8090"
else
    echo "❌ PocketBase failed to start"
    kill $PB_PID 2>/dev/null
    exit 1
fi

# Initialize database if needed
echo "🔧 Checking database setup..."
if bun run scripts/setup-pocketbase.ts > /dev/null 2>&1; then
    echo "✅ Database setup verified"
else
    echo "⚠️ Database setup encountered issues, but continuing..."
fi

# Start MCP Server
echo "🔧 Starting MCP server..."
bun run src/index.ts &
MCP_PID=$!

# Give MCP server a moment to start
sleep 2

echo ""
echo "🎉 All services started successfully!"
echo "=========================================="
echo "📊 Services Status:"
echo "   🗄️  PocketBase: http://localhost:8090"
echo "   🔧 Admin UI: http://localhost:8090/_/"
echo "   🤖 MCP Server: Running on stdio"
echo ""
echo "📝 Next Steps:"
echo "   1. Open Cursor IDE"
echo "   2. The NoteByPine MCP server should connect automatically"
echo "   3. Use the tools in Cursor to manage incidents"
echo ""
echo "🛑 To stop all services:"
echo "   kill $PB_PID $MCP_PID"
echo ""
echo "💡 To test manually:"
echo "   curl http://localhost:8090/api/collections/incidents/records"
echo ""

# Keep script running to maintain services
echo "Press Ctrl+C to stop all services..."

# Handle graceful shutdown
trap 'echo ""; echo "🛑 Stopping services..."; kill $PB_PID $MCP_PID 2>/dev/null; echo "✅ All services stopped"; exit 0' INT

# Wait indefinitely (or until interrupted)
wait