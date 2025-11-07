# NoteByPine API Server

Backend API server for the NoteByPine React Admin Dashboard. Provides REST API endpoints and WebSocket support for managing incidents, solutions, and knowledge base.

## 🚀 Features

- **REST API**: Full CRUD operations for incidents, solutions, and knowledge base
- **Authentication**: JWT-based authentication with fallback for development
- **WebSocket**: Real-time updates and notifications
- **Database**: PocketBase integration with fallback to mock data
- **Security**: CORS, Helmet, Rate Limiting
- **Validation**: Joi schema validation

## 🏁 Quick Start

### Prerequisites
- Bun 1.0+ or Node.js 18+
- PocketBase server (optional, will use mock data if not available)

### Installation

```bash
cd api
bun install
```

### Configuration

Create a `.env` file (optional):

```bash
PORT=3000
POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=password
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

### Start Server

```bash
# Development with hot reload
bun run dev

# Production
bun run start
```

The API server will start on `http://localhost:3000`

## 📡 API Endpoints

### Authentication
- `POST /api/auth/login` - Login and get JWT token

### Incidents
- `GET /api/v1/incidents` - List incidents
- `POST /api/v1/incidents` - Create incident
- `GET /api/v1/incidents/:id` - Get incident
- `PUT /api/v1/incidents/:id` - Update incident
- `DELETE /api/v1/incidents/:id` - Delete incident

### Solutions
- `GET /api/v1/solutions` - List solutions
- `POST /api/v1/solutions` - Create solution
- `GET /api/v1/solutions/:id` - Get solution
- `PUT /api/v1/solutions/:id` - Update solution
- `DELETE /api/v1/solutions/:id` - Delete solution

### Knowledge Base
- `GET /api/v1/knowledge` - List knowledge items
- `POST /api/v1/knowledge` - Create knowledge item
- `GET /api/v1/knowledge/:id` - Get knowledge item
- `PUT /api/v1/knowledge/:id` - Update knowledge item
- `DELETE /api/v1/knowledge/:id` - Delete knowledge item

### Health
- `GET /health` - Health check
- `GET /api/v1/health/status` - Detailed health status

## 🔌 WebSocket

Connect to `ws://localhost:3000/ws` for real-time updates.

### Event Types
- `incident_created`, `incident_updated`, `incident_deleted`
- `solution_created`, `solution_updated`, `solution_deleted`
- `knowledge_created`, `knowledge_updated`, `knowledge_deleted`

## 🔐 Authentication

For development, use these demo credentials:
- Email: `admin@example.com`
- Password: `admin123456`

Include the JWT token in requests:
```
Authorization: Bearer <token>
```

## 📁 Project Structure

```
api/
├── src/
│   ├── config/
│   │   ├── database.ts      # PocketBase configuration
│   │   └── mockData.ts      # Mock data fallback
│   ├── middleware/
│   │   ├── auth.ts          # JWT authentication
│   │   ├── validation.ts    # Request validation
│   │   ├── errorHandler.ts  # Error handling
│   │   └── rateLimiter.ts   # Rate limiting
│   ├── routes/
│   │   ├── api.ts           # Route aggregator
│   │   ├── incidents.ts     # Incident routes
│   │   ├── solutions.ts     # Solution routes
│   │   ├── knowledge.ts     # Knowledge routes
│   │   └── health.ts        # Health routes
│   ├── services/
│   │   └── websocket.ts     # WebSocket server
│   └── server.ts            # Main server file
├── package.json
└── tsconfig.json
```
