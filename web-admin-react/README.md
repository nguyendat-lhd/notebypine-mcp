# NoteByPine Web Admin - React Version

A modern React-based admin dashboard built with Bun, TypeScript, Tailwind CSS, and Shadcn UI for the NoteByPine MCP system.

## 🚀 Features

- **Modern Tech Stack**: React 19 + TypeScript + Vite + Bun
- **Beautiful UI**: Shadcn UI + Tailwind CSS with design system
- **Authentication**: Secure JWT-based authentication
- **Dashboard**: Real-time statistics and system health monitoring
- **Responsive**: Mobile-first responsive design
- **Dark Mode**: Built-in dark/light mode support
- **Type Safety**: Full TypeScript support

## 🛠️ Tech Stack

- **Runtime**: Bun
- **Framework**: React 19 with TypeScript
- **Bundler**: Vite
- **Styling**: Tailwind CSS + Shadcn UI
- **Icons**: Lucide React
- **State Management**: React hooks
- **API Client**: Custom service with axios-like interface

## 📦 Dependencies

### Core Dependencies
- `react` ^19.2.0
- `react-dom` ^19.2.0
- `typescript` ^5.9.3
- `vite` ^7.2.2

### UI Dependencies
- `tailwindcss` ^4.1.17
- `@radix-ui/react-slot` ^1.2.4
- `@radix-ui/react-label` ^2.1.8
- `class-variance-authority` ^0.7.1
- `clsx` ^2.1.1
- `tailwind-merge` ^3.3.1
- `lucide-react` ^0.552.0

## 🏁 Getting Started

### Prerequisites
- Node.js 18+ or Bun 1.3+
- PocketBase server running on http://localhost:8090
- NoteByPine API server running on http://localhost:3000

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd notebypine-mcp/web-admin-react
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Start development server**
   ```bash
   bun dev
   ```

4. **Open your browser**
   Navigate to http://localhost:5173

### Build for Production

```bash
bun build
```

## 🔐 Authentication

The application uses JWT-based authentication. Demo credentials are provided:

- **Email**: admin@example.com
- **Password**: admin123456

## 📁 Project Structure

```
src/
├── components/           # React components
│   ├── auth/            # Authentication components
│   ├── dashboard/       # Dashboard components
│   ├── layout/          # Layout components
│   └── ui/              # Shadcn UI components
├── services/            # API services
├── types/               # TypeScript type definitions
├── lib/                 # Utility functions
└── App.tsx              # Main application component
```

## 🎨 UI Components

The application uses Shadcn UI components for a consistent design system:

- **Button**: Customizable button with variants
- **Card**: Flexible card container
- **Input**: Form input with validation
- **Label**: Form label component
- **Form**: Form components (to be added)

## 📊 Dashboard Features

### Statistics Cards
- Total Incidents
- Solutions Count
- Knowledge Base Articles
- Recent Activity
- High Severity Alerts

### System Health
- Server status
- Uptime monitoring
- Memory usage
- Database connectivity
- Environment info

### Recent Incidents
- Real-time incident list
- Severity indicators
- Status badges
- Date tracking

## 🔧 Available Pages

- **Dashboard**: Overview with statistics and health
- **Incidents**: Incident management (coming soon)
- **Solutions**: Solution tracking (coming soon)
- **Knowledge Base**: Documentation management (coming soon)
- **ChatOps**: Natural language interface (coming soon)
- **Settings**: System configuration (coming soon)

## 🎯 API Integration

The application integrates with the NoteByPine API server:

- **Base URL**: http://localhost:3000
- **Authentication**: Bearer token
- **Endpoints**:
  - `/api/auth/login` - Authentication
  - `/api/v1/incidents/stats/summary` - Dashboard stats
  - `/api/v1/health/status` - System health
  - `/api/v1/incidents` - Incident management
  - `/api/v1/solutions` - Solution management
  - `/api/v1/knowledge` - Knowledge base

## 🎨 Customization

### Colors and Theme
The application uses CSS custom properties for theming. Modify `src/index.css` to customize:

```css
:root {
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96%;
  /* Add more custom colors */
}
```

### Component Variants
Components use `class-variance-authority` for variants. Customize in component files.

## 🚀 Deployment

### Production Build
```bash
bun run build
```

### Preview
```bash
bun run preview
```

### Environment Variables
Create `.env.production` for production settings:

```env
VITE_API_BASE_URL=https://your-api.com
VITE_APP_NAME=NoteByPine Admin
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

1. **API Connection Error**
   - Ensure PocketBase server is running on port 8090
   - Check API server is running on port 3000

2. **CORS Issues**
   - Verify CORS configuration in API server
   - Check environment variables

3. **Build Errors**
   - Clear node_modules and reinstall: `bun install`
   - Check TypeScript configuration

4. **Styling Issues**
   - Verify Tailwind CSS configuration
   - Check CSS import order

### Getting Help

- Check the console for error messages
- Verify API endpoints are accessible
- Ensure all dependencies are installed
- Check network connectivity

---

**NoteByPine Web Admin** - Modern React-based admin interface for MCP system management.