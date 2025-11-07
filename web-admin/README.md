# NoteByPine Web Admin Dashboard

A comprehensive web administration interface for the NoteByPine MCP server, built with Bun.js, Express.js, and PocketBase.

## Features

### 🚀 Core Functionality
- **Real-time Dashboard**: Live statistics and system monitoring
- **Incident Management**: Create, update, and resolve incidents
- **Solution Repository**: Manage and search troubleshooting solutions
- **Knowledge Base**: Organize and search technical documentation
- **ChatOps Interface**: Natural language commands for system management

### 🛡️ Security & Performance
- **Authentication**: JWT-based user authentication
- **Rate Limiting**: Configurable rate limits for API protection
- **CORS Protection**: Secure cross-origin resource sharing
- **File Uploads**: Secure file handling with validation
- **Real-time Updates**: WebSocket support for live updates

### 🔧 Technical Stack
- **Runtime**: Bun.js
- **Framework**: Express.js
- **Database**: PocketBase
- **Real-time**: WebSocket
- **Authentication**: JWT
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

## Quick Start

### Prerequisites
- Node.js 18+ or Bun runtime
- PocketBase server running on `http://localhost:8090`
- Git

### Installation

1. **Clone and setup**
   ```bash
   cd web-admin
   cp .env.example .env
   ```

2. **Configure environment**
   ```bash
   # Edit .env with your configuration
   POCKETBASE_URL=http://localhost:8090
   POCKETBASE_ADMIN_EMAIL=your-email@example.com
   POCKETBASE_ADMIN_PASSWORD=your-secure-password
   JWT_SECRET=your-super-secure-jwt-secret
   ```

3. **Install dependencies**
   ```bash
   bun install
   ```

4. **Start development server**
   ```bash
   bun run dev
   ```

5. **Access the application**
   - Web Interface: http://localhost:3000/index.html
   - API Base: http://localhost:3000/api/v1
   - WebSocket: ws://localhost:3000/ws

## API Documentation

### Authentication

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "your-password"
}
```

### Incidents

#### Get All Incidents
```http
GET /api/v1/incidents?page=1&limit=20
Authorization: Bearer <token>
```

#### Create Incident
```http
POST /api/v1/incidents
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Server Outage",
  "description": "Main web server is not responding",
  "severity": "high",
  "status": "new",
  "tags": ["server", "downtime"]
}
```

#### Update Incident
```http
PUT /api/v1/incidents/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "resolved",
  "tags": ["server", "downtime", "resolved"]
}
```

### Solutions

#### Create Solution
```http
POST /api/v1/solutions
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Restart Web Server",
  "description": "Steps to restart the nginx web server",
  "steps": [
    "SSH to the server",
    "Run: sudo systemctl restart nginx",
    "Verify service status"
  ],
  "category": "troubleshooting"
}
```

### Knowledge Base

#### Search Knowledge
```http
GET /api/v1/search/knowledge?q=database&page=1&limit=10
Authorization: Bearer <token>
```

### ChatOps

#### Send Command
```http
POST /api/v1/chat/message
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Create incident: Database slow - The main database is responding slowly"
}
```

#### Available Commands
- `Create incident: [title] - [description]`
- `Search incidents: [query]`
- `Create solution: [title] - [steps]`
- `Search knowledge: [query]`
- `Get stats`

## WebSocket Events

### Real-time Updates
Connect to `ws://localhost:3000/ws` for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

// Subscribe to events
ws.send(JSON.stringify({
  type: 'subscribe',
  data: { channels: ['incident_created', 'solution_updated'] }
}));
```

### Event Types
- `incident_created`: New incident created
- `incident_updated`: Incident modified
- `incident_deleted`: Incident removed
- `solution_created`: New solution added
- `solution_updated`: Solution modified
- `knowledge_created`: New knowledge item
- `chat_message`: New chat message

## Development

### Scripts
```bash
# Development with hot reload
bun run dev

# Production build
bun run build

# Start production server
bun run start

# Run tests
bun run test

# Lint code
bun run lint

# Format code
bun run format
```

### Project Structure
```
web-admin/
├── src/
│   ├── config/
│   │   └── database.ts          # PocketBase configuration
│   ├── middleware/
│   │   ├── auth.ts              # Authentication middleware
│   │   ├── validation.ts        # Request validation
│   │   ├── errorHandler.ts      # Error handling
│   │   └── rateLimiter.ts       # Rate limiting
│   ├── routes/
│   │   ├── api.ts               # API route aggregator
│   │   ├── incidents.ts         # Incident management
│   │   ├── solutions.ts         # Solution management
│   │   ├── knowledge.ts         # Knowledge base
│   │   ├── search.ts            # Search functionality
│   │   ├── chat.ts              # ChatOps interface
│   │   ├── upload.ts            # File uploads
│   │   └── health.ts            # Health checks
│   ├── services/
│   │   └── websocket.ts         # WebSocket management
│   └── server.ts                # Main server file
├── docs/html/                   # Static web interface
├── uploads/                     # File upload directory
├── logs/                        # Application logs
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

### Environment Variables
```bash
# Server
PORT=3000
NODE_ENV=development

# Database
POCKETBASE_URL=http://localhost:8090
POCKETBASE_ADMIN_EMAIL=admin@example.com
POCKETBASE_ADMIN_PASSWORD=your-password

# Security
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d

# File Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760

# CORS
CORS_ORIGIN=http://localhost:8080

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

## Security Features

- ✅ JWT Authentication
- ✅ Rate Limiting
- ✅ CORS Protection
- ✅ Input Validation
- ✅ File Upload Security
- ✅ SQL Injection Prevention
- ✅ XSS Protection
- ✅ Compression Middleware

## Production Deployment

### Docker Deployment
```dockerfile
FROM oven/bun:1-alpine

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install --production

COPY . .
RUN bun run build

EXPOSE 3000
CMD ["bun", "run", "start"]
```

### Environment Setup
1. Set `NODE_ENV=production`
2. Configure secure `JWT_SECRET`
3. Set up proper CORS origins
4. Configure reverse proxy (nginx/Apache)
5. Set up SSL/TLS certificates
6. Configure backup for PocketBase

## Monitoring

### Health Endpoints
- `/health` - Basic health check
- `/api/v1/health/status` - Detailed system status
- `/api/v1/health/info` - System information and statistics

### Logs
- Application logs: `./logs/app.log`
- Error logs: Console output
- Access logs: Request logging middleware

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

- 📧 Email: support@notebypine.com
- 📖 Documentation: [Main Documentation](../README.md)
- 🐛 Issues: Create an issue in the repository
- 💬 Chat: Use the in-app chat interface

## License

MIT License - see LICENSE file for details.

---

**NoteByPine Web Admin** - Comprehensive incident management and knowledge base solution.
Built with ❤️ using Bun.js, Express.js, and PocketBase.