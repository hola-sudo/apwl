# APWL - Multi-Agent SaaS Platform

A full-stack application for managing AI agents and contract processing, built with Node.js/Express backend and React/Vite frontend.

## 📁 Project Structure

```
apwl/
├── backend/              # Node.js + Express + Prisma backend
│   ├── src/             # Source code
│   ├── prisma/          # Prisma schema and migrations
│   └── railway.toml     # Railway deployment config
├── apwl-dashboard/       # React + Vite frontend
│   ├── src/             # React components and services
│   └── railway.toml     # Railway deployment config
└── scripts/             # Deployment and utility scripts
```

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- PostgreSQL database (for production)
- Railway account (for deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/hola-sudo/apwl.git
   cd apwl
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your DATABASE_URL and OPENAI_API_KEY
   npx prisma generate
   npx prisma migrate dev
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd apwl-dashboard
   npm install
   cp .env.example .env
   # Edit .env with your VITE_API_BASE_URL and VITE_API_KEY
   npm run dev
   ```

## 🚢 Deployment to Railway

### Automated Deployment

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed step-by-step instructions.

### Quick Deployment Steps

1. **Create Railway Project**
   - Go to [Railway Dashboard](https://railway.app/dashboard)
   - Create new project from GitHub repo: `hola-sudo/apwl`

2. **Set Up PostgreSQL Database**
   - Add PostgreSQL service in Railway
   - Copy the `DATABASE_URL` connection string

3. **Deploy Backend**
   - Create service with root directory: `backend`
   - Set environment variables:
     - `DATABASE_URL` (from PostgreSQL service)
     - `OPENAI_API_KEY` (your OpenAI API key)
     - `PORT=8080`
   - Run migrations: `railway run npx prisma migrate deploy`
   - Deploy: `railway up` or via GitHub auto-deploy

4. **Deploy Frontend**
   - Create service with root directory: `apwl-dashboard`
   - Set environment variables:
     - `VITE_API_BASE_URL` (your backend URL)
     - `VITE_API_KEY` (admin API key)
   - Deploy: `railway up` or via GitHub auto-deploy

### Deployment Scripts

Use the provided scripts for easier deployment:

```bash
# Deploy backend
./scripts/deploy-railway.sh backend

# Deploy frontend
./scripts/deploy-railway.sh frontend

# Deploy both
./scripts/deploy-railway.sh all

# Verify deployment
./scripts/verify-deployment.sh
```

## 🔧 Configuration

### Backend Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `OPENAI_API_KEY`: OpenAI API key for agent processing
- `PORT`: Server port (default: 8080)
- `NODE_ENV`: Environment (development/production)

### Frontend Environment Variables

- `VITE_API_BASE_URL`: Backend API URL
- `VITE_API_KEY`: Admin API key for authentication

See `.env.example` files in each directory for reference.

## 📚 API Documentation

### Health Endpoints

- `GET /health` - Basic health check
- `GET /api/health` - API health check
- `GET /api/admin/health` - Admin health check (requires API key)

### Admin Endpoints (require `x-api-key` header)

- `GET /api/admin/clients` - List all clients
- `GET /api/admin/agents` - List all agents
- `GET /api/admin/sessions` - List sessions
- `POST /api/admin/clients` - Create client
- `POST /api/admin/agents` - Create agent

### Agent Endpoints

- `POST /api/agent/run` - Run agent workflow (requires agent API key)
- `GET /api/agent/session/:id` - Get session status

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend build test
cd apwl-dashboard
npm run build
```

## 📝 Database Migrations

```bash
# Create new migration
cd backend
npx prisma migrate dev --name migration-name

# Apply migrations in production
npx prisma migrate deploy

# Generate Prisma Client
npx prisma generate
```

## 🐛 Troubleshooting

### Backend Issues

- **Database connection errors**: Verify `DATABASE_URL` is correct
- **Migration errors**: Run `npx prisma migrate deploy` again
- **Build errors**: Check TypeScript compilation with `npm run build`

### Frontend Issues

- **API connection errors**: Verify `VITE_API_BASE_URL` is correct
- **CORS errors**: Check backend CORS configuration
- **Build errors**: Ensure all dependencies are installed

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Deployment Status**: See [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md) for current deployment information.

