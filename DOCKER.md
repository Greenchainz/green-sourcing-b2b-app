# GreenChainz Docker Setup Guide

## Architecture Overview

The GreenChainz platform runs as a **multi-container Docker environment** with three services:

1. **PostgreSQL Database** (port 5432) - Persistent data layer
2. **Backend API** (port 3001) - Node.js/Express REST API
3. **Frontend** (port 5173) - React + Vite UI

All services are orchestrated via `docker-compose.yml` for seamless local development with production parity.

---

## Quick Start (First Time Setup)

### Prerequisites
- Docker Desktop installed and running
- Git repository cloned locally

### Step 1: Create Environment File

Copy the example environment file and customize your credentials:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS/Linux
cp .env.example .env
```

**Edit `.env`** and update the database password:

```env
DB_USER=user
DB_PASSWORD=your_secure_password_here
DB_NAME=greenchainz_dev
```

⚠️ **Security Note**: The `.env` file is in `.gitignore` and will never be committed to Git.

### Step 2: Build and Launch

From the repository root, run:

```powershell
docker compose up --build
```

This command will:
- Build Docker images for backend and frontend
- Start PostgreSQL database
- Initialize database schema automatically
- Launch all three services

### Step 3: Verify Services

Open your browser and test:

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Database**: Available on localhost:5432

You should see the GreenChainz Sustainability Passport interface displaying supplier data.

---

## Daily Development Workflow

### Start All Services

```powershell
docker compose up
```

Add `-d` flag to run in detached mode (background):

```powershell
docker compose up -d
```

### Stop All Services

```powershell
docker compose down
```

To also remove database volumes (⚠️ **destroys all data**):

```powershell
docker compose down -v
```

### View Logs

```powershell
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### Rebuild After Code Changes

```powershell
# Rebuild all services
docker compose up --build

# Rebuild specific service
docker compose up --build backend
```

---

## Service Details

### Database (PostgreSQL 15)

- **Container**: `greenchainz-db`
- **Port**: 5432
- **Volume**: `greenchainz-db-data` (persistent storage)
- **Schema**: Auto-initialized from `database-schemas/schema.sql`

**Connect via psql**:
```powershell
docker exec -it greenchainz-db psql -U user -d greenchainz_dev
```

### Backend (Node.js + Express)

- **Container**: `greenchainz-backend`
- **Port**: 3001
- **Source**: `backend/`
- **Entry Point**: `backend/index.js`

**Key Features**:
- Automatic schema initialization on startup
- Connection pooling via `pg` library
- RESTful API endpoints for Sustainability Passport

**Environment Variables**:
- `POSTGRES_HOST=db` (uses Docker network)
- `PORT=3001`
- Database credentials from `.env`

### Frontend (React + Vite)

- **Container**: `greenchainz-frontend`
- **Port**: 5173
- **Source**: `frontend/`
- **Build**: Optimized production build served via `serve`

**Key Features**:
- Tailwind CSS with GreenChainz branding
- TypeScript type safety
- Axios API integration

---

## Troubleshooting

### Port Conflicts

**Error**: "Port 5432/3001/5173 is already in use"

**Solution**: Stop conflicting services:
```powershell
# Check what's using the port
netstat -ano | findstr :5432

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### Database Connection Refused

**Error**: "ECONNREFUSED ::1:5432"

**Solution**: Ensure Docker Desktop is running and database container is up:
```powershell
docker ps
docker compose logs db
```

### Build Failures

**Error**: npm install fails or missing dependencies

**Solution**: Clear Docker cache and rebuild:
```powershell
docker compose down
docker system prune -a
docker compose up --build
```

### Database Schema Not Initialized

**Error**: Tables don't exist

**Solution**: Backend auto-initializes schema on startup. Check logs:
```powershell
docker compose logs backend | Select-String "schema"
```

Look for: `✅ Database schema ensured.`

---

## Development Best Practices

### Environment Variables

- **Never commit `.env`** - Already in `.gitignore`
- Use `.env.example` as template for team members
- Rotate passwords regularly

### Hot Reload

**Backend**: Restart container after code changes:
```powershell
docker compose restart backend
```

**Frontend**: Vite supports hot module replacement, but container runs production build. For dev with HMR:
```powershell
# Stop Docker frontend
docker compose stop frontend

# Run Vite dev server locally
cd frontend
npm run dev
```

### Database Migrations

For schema changes:

1. Update `database-schemas/schema.sql`
2. Restart backend to apply changes:
   ```powershell
   docker compose restart backend
   ```

For production, consider migration tools like `knex` or `sequelize`.

---

## Production Deployment Notes

This Docker setup is optimized for **local development**. For production:

### Security Hardening

- [ ] Use Docker secrets instead of `.env` files
- [ ] Enable SSL/TLS for all services
- [ ] Use non-root users in containers
- [ ] Scan images with `docker scout`

### Optimization

- [ ] Use multi-stage builds (already implemented)
- [ ] Enable Docker BuildKit caching
- [ ] Configure health checks
- [ ] Set resource limits (CPU/memory)

### Orchestration

- [ ] Deploy to Kubernetes or AWS ECS
- [ ] Use managed PostgreSQL (AWS RDS, Supabase)
- [ ] Configure auto-scaling
- [ ] Set up monitoring (Datadog, New Relic)

---

## File Structure Reference

```
green-sourcing-b2b-app/
├── docker-compose.yml          # Orchestrator (this file defines all services)
├── .env                        # Local secrets (DO NOT COMMIT)
├── .env.example                # Template for .env
├── .gitignore                  # Prevents .env from being committed
│
├── backend/
│   ├── Dockerfile              # Multi-stage build for API
│   ├── .dockerignore           # Excludes junk from image
│   ├── package.json
│   ├── index.js                # Express app entry point
│   └── db.js                   # PostgreSQL connection pool
│
├── frontend/
│   ├── Dockerfile              # Multi-stage build for React
│   ├── .dockerignore           # Excludes junk from image
│   ├── package.json
│   ├── vite.config.ts          # Dev server + API proxy
│   └── src/
│       ├── App.tsx
│       └── components/
│           └── SupplierProfile.tsx
│
└── database-schemas/
    └── schema.sql              # Idempotent DDL (CREATE TABLE IF NOT EXISTS)
```

---

## Next Steps

Once your Docker environment is running:

1. **Test API Endpoints** (see Copilot instructions in `.github/copilot-instructions.md`)
2. **Add New Features** (reference the Blueprint document)
3. **Commit Changes** (ensure `.env` is not included)
4. **Deploy to Staging** (update environment variables for cloud)

---

**Questions or Issues?** Check the main `README.md` or consult the development team.

**Last Updated**: November 1, 2025
