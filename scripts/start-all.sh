#!/bin/bash

# NoteByPine - Start All Services Script
# This script starts PocketBase, API Server, and Web Admin React in the correct order

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}🚀 Starting NoteByPine Development Environment...${NC}"
echo "=========================================="
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Check if PocketBase binary exists
if [ ! -f "$PROJECT_ROOT/pocketbase" ]; then
    echo -e "${RED}❌ PocketBase binary not found at $PROJECT_ROOT/pocketbase${NC}"
    echo "Please download PocketBase from https://pocketbase.io/docs/"
    exit 1
fi

# Check if bun is available
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Bun is not installed or not in PATH${NC}"
    echo "Please install Bun from https://bun.sh"
    exit 1
fi

# Function to check if a port is in use
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        return 0  # Port is in use
    else
        return 1  # Port is free
    fi
}

# Check if ports are already in use
if check_port 8090; then
    echo -e "${YELLOW}⚠️  Port 8090 is already in use (PocketBase)${NC}"
    echo "   Continuing anyway..."
fi

if check_port 3000; then
    echo -e "${YELLOW}⚠️  Port 3000 is already in use (API Server)${NC}"
    echo "   Continuing anyway..."
fi

if check_port 5173; then
    echo -e "${YELLOW}⚠️  Port 5173 is already in use (Web Admin React)${NC}"
    echo "   Continuing anyway..."
fi

echo ""
echo -e "${BLUE}📦 Step 1/4: Starting PocketBase server...${NC}"
cd "$PROJECT_ROOT"
./pocketbase serve --dir ./pb_data > /tmp/pocketbase.log 2>&1 &
PB_PID=$!
echo "   PocketBase PID: $PB_PID"

# Wait for PocketBase to be ready
echo -e "${BLUE}⏳ Waiting for PocketBase to start...${NC}"
MAX_WAIT=30
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if curl -s http://localhost:8090/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PocketBase is running on http://localhost:8090${NC}"
        break
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -n "."
done
echo ""

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    echo -e "${RED}❌ PocketBase failed to start after ${MAX_WAIT} seconds${NC}"
    echo "   Check logs: tail -f /tmp/pocketbase.log"
    kill $PB_PID 2>/dev/null || true
    exit 1
fi

# Initialize database if needed
echo ""
echo -e "${BLUE}📦 Step 2/4: Checking database setup...${NC}"
if bun run scripts/setup-pocketbase.ts > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database setup verified${NC}"
else
    echo -e "${YELLOW}⚠️  Database setup encountered issues, but continuing...${NC}"
fi

# Start API Server
echo ""
echo -e "${BLUE}📦 Step 3/4: Starting API Server...${NC}"
cd "$PROJECT_ROOT/api"
if [ ! -d "node_modules" ]; then
    echo "   Installing API dependencies..."
    bun install > /dev/null 2>&1
fi

bun run dev > /tmp/api-server.log 2>&1 &
API_PID=$!
echo "   API Server PID: $API_PID"

# Wait for API Server to be ready
echo -e "${BLUE}⏳ Waiting for API Server to start...${NC}"
MAX_WAIT=30
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if curl -s http://localhost:3000/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ API Server is running on http://localhost:3000${NC}"
        break
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -n "."
done
echo ""

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    echo -e "${RED}❌ API Server failed to start after ${MAX_WAIT} seconds${NC}"
    echo "   Check logs: tail -f /tmp/api-server.log"
    kill $PB_PID $API_PID 2>/dev/null || true
    exit 1
fi

# Start Web Admin React
echo ""
echo -e "${BLUE}📦 Step 4/4: Starting Web Admin React...${NC}"
cd "$PROJECT_ROOT/web-admin-react"
if [ ! -d "node_modules" ]; then
    echo "   Installing React dependencies..."
    bun install > /dev/null 2>&1
fi

bun run dev > /tmp/web-admin.log 2>&1 &
WEB_PID=$!
echo "   Web Admin PID: $WEB_PID"

# Wait for Web Admin to be ready
echo -e "${BLUE}⏳ Waiting for Web Admin to start...${NC}"
MAX_WAIT=30
WAIT_COUNT=0
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Web Admin React is running on http://localhost:5173${NC}"
        break
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
    echo -n "."
done
echo ""

if [ $WAIT_COUNT -eq $MAX_WAIT ]; then
    echo -e "${YELLOW}⚠️  Web Admin React may still be starting...${NC}"
    echo "   Check logs: tail -f /tmp/web-admin.log"
fi

# Summary
echo ""
echo -e "${GREEN}🎉 All services started successfully!${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}📊 Services Status:${NC}"
echo "   🗄️  PocketBase:     http://localhost:8090"
echo "   🔧 PocketBase Admin: http://localhost:8090/_/"
echo "   🔌 API Server:      http://localhost:3000"
echo "   🌐 Web Admin:       http://localhost:5173"
echo ""
echo -e "${BLUE}📝 Service PIDs:${NC}"
echo "   PocketBase:  $PB_PID"
echo "   API Server:  $API_PID"
echo "   Web Admin:   $WEB_PID"
echo ""
echo -e "${BLUE}📋 Log Files:${NC}"
echo "   PocketBase:  tail -f /tmp/pocketbase.log"
echo "   API Server:  tail -f /tmp/api-server.log"
echo "   Web Admin:   tail -f /tmp/web-admin.log"
echo ""
echo -e "${YELLOW}🛑 To stop all services:${NC}"
echo "   kill $PB_PID $API_PID $WEB_PID"
echo "   Or press Ctrl+C"
echo ""
echo -e "${BLUE}💡 Next Steps:${NC}"
echo "   1. Open http://localhost:5173 in your browser"
echo "   2. Login with: admin@example.com / admin123456"
echo "   3. Start managing incidents and solutions!"
echo ""

# Handle graceful shutdown
trap 'echo ""; echo -e "${YELLOW}🛑 Stopping services...${NC}"; kill $PB_PID $API_PID $WEB_PID 2>/dev/null || true; echo -e "${GREEN}✅ All services stopped${NC}"; exit 0' INT TERM

# Keep script running to maintain services
echo -e "${BLUE}Press Ctrl+C to stop all services...${NC}"
echo ""

# Wait for all processes
wait
