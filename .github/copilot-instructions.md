# Copilot Instructions for GreenChainz B2B Platform

This repository contains a minimal, multi-folder skeleton for the GreenChainz B2B platform - a verified sustainable sourcing platform that serves as the global trust layer for sustainable commerce. The stack uses Node.js/Express backend, React frontend (planned), and PostgreSQL database orchestrated via Docker Compose.

## Architecture and Source of Truth

### Primary Working Tree
**Always prefer these top-level directories** when making changes:

- **`backend/`** - Node.js + Express API server
  - Entry point: `backend/index.js` (currently a minimal Express app listening on port 3001)
  - **Current state**: No `package.json` exists yet; must be initialized before adding features
  - **Code example**:
    ```javascript
    const express = require('express');
    const app = express();
    const port = 3001;
    app.get('/', (req, res) => {
      res.send('GreenChainz Backend API is running!');
    });
    ```
  - **Pattern**: Single-file Express app with inline route definitions

- **`frontend/`** - React application placeholder
  - **Current state**: Empty directory with only README.md
  - **Intent**: Future home for React-based UI for sustainable sourcing workflows
  - **Not yet scaffolded**: Use `create-react-app` or `vite` when initializing

- **`database-schemas/`** - PostgreSQL schema definitions and migrations
  - **Current state**: Empty directory with only README.md
  - **Intent**: Will contain SQL DDL files, migration scripts
  - **Future pattern**: Use migration tools like `knex`, `sequelize`, or raw SQL files

- **`docker-compose.yml`** - Infrastructure orchestration
  - **Current state**: Defines only PostgreSQL database service (`greenchainz_db`)
  - **Future enhancement**: Should include backend API service with `depends_on: [db]`

### Repository Structure Gotcha
⚠️ **Important**: There is an empty nested directory `green-sourcing-b2b-app/` at the repository root. This is a structural artifact - **always work in the top-level directories** (`backend/`, `frontend/`, `database-schemas/`) to avoid confusion and drift between duplicate structures.

## Runtime Configuration and Ports

### Database (PostgreSQL 15)
Managed via `docker-compose.yml`:
- **Service name**: `greenchainz_db`
- **Container name**: `greenchainz_db`
- **Image**: `postgres:15`
- **Environment variables**:
  - `POSTGRES_USER=user`
  - `POSTGRES_PASSWORD=password`
  - `POSTGRES_DB=greenchainz_dev`
- **Port mapping**: `5432:5432` (host:container)
- **Volume**: `postgres_data` (persistent storage)
- **Connection string**: `postgres://user:password@localhost:5432/greenchainz_dev`

### Backend API Server
Currently runs directly with Node.js (not containerized):
- **Port**: `3001`
- **Start command** (after creating package.json): `node backend/index.js`
- **Not yet in docker-compose**: Should be added with service definition when ready for containerization

## Developer Workflows

### Initial Setup (Windows PowerShell / Bash)

1. **Start the database**:
   ```bash
   docker compose up -d
   ```
   This starts PostgreSQL in detached mode.

2. **Verify database is running**:
   ```bash
   docker ps
   # Look for greenchainz_db container
   ```

3. **Initialize backend (first time only)**:
   ```bash
   cd backend
   npm init -y
   npm install express
   # Pin versions in package.json for consistency
   ```

4. **Run the backend server**:
   ```bash
   node backend/index.js
   # Server will start on http://localhost:3001
   ```

5. **Test the API**:
   ```bash
   curl http://localhost:3001/
   # Should return: "GreenChainz Backend API is running!"
   ```

### Database Access and Management

**Connect to PostgreSQL using psql**:
```bash
docker exec -it greenchainz_db psql -U user -d greenchainz_dev
```

**Or from host** (if PostgreSQL client installed):
```bash
psql postgres://user:password@localhost:5432/greenchainz_dev
```

**Check database contents**:
```sql
\dt              -- List tables
\d table_name    -- Describe table structure
```

### Typical Development Cycle

1. Make code changes in `backend/index.js` or add new route files
2. Restart the Node.js server (`Ctrl+C` and `node backend/index.js`)
3. Test endpoints with `curl`, Postman, or browser
4. For database changes:
   - Write SQL migrations in `database-schemas/`
   - Apply migrations via psql or migration tool
5. Commit changes with descriptive messages

## Coding Patterns and Conventions

### Backend API Development

**Current Pattern** - Simple Express routes directly in `backend/index.js`:
```javascript
// Example: Health check endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// Example: RESTful API endpoint (future)
app.get('/api/suppliers', async (req, res) => {
  // TODO: Query database for suppliers
  res.json({ suppliers: [] });
});
```

**Future Pattern** - Modular structure as app grows:
```
backend/
├── index.js           # App entry point, middleware setup
├── routes/
│   ├── suppliers.js   # Supplier-related routes
│   └── products.js    # Product-related routes
├── controllers/       # Business logic
├── models/            # Database models
└── middleware/        # Custom middleware
```

### Database Access Patterns

**Not yet implemented** - When adding database connectivity:

1. **Use environment variables** for connection config:
   ```javascript
   const dbConfig = {
     user: process.env.POSTGRES_USER || 'user',
     password: process.env.POSTGRES_PASSWORD || 'password',
     host: process.env.POSTGRES_HOST || 'localhost',
     database: process.env.POSTGRES_DB || 'greenchainz_dev',
     port: process.env.POSTGRES_PORT || 5432
   };
   ```

2. **Prefer connection pooling** (using `pg` library):
   ```javascript
   const { Pool } = require('pg');
   const pool = new Pool(dbConfig);
   ```

3. **Use parameterized queries** to prevent SQL injection:
   ```javascript
   const result = await pool.query(
     'SELECT * FROM suppliers WHERE id = $1',
     [supplierId]
   );
   ```

### Frontend Development

**When scaffolding the React app**:
- Initialize in `frontend/` directory
- Use modern React (hooks, functional components)
- Configure proxy to backend API (`http://localhost:3001`)
- Document dev server port in this file

### Environment Configuration

**Current state**: Credentials are hardcoded in `docker-compose.yml`

**Best practice for future**:
1. Create `.env` file at repository root (add to `.gitignore`)
2. Reference in `docker-compose.yml`:
   ```yaml
   environment:
     POSTGRES_USER: ${POSTGRES_USER}
     POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
   ```
3. Document required variables in `README.md`
4. Provide `.env.example` template

## Integration Points and Dependencies

### Current Dependencies
- **Backend**: `express` (must be installed manually - no package.json yet)
- **Database**: PostgreSQL 15 (via Docker image)
- **Container orchestration**: Docker Compose v3.8

### Future Integration Points
- **Authentication**: Consider JWT tokens, OAuth 2.0 for B2B partners
- **API Gateway**: May need rate limiting, request validation
- **Message Queue**: For async tasks (e.g., RabbitMQ, Redis)
- **File Storage**: For product images, certifications (S3-compatible)
- **Search**: Elasticsearch for product/supplier search
- **Analytics**: Integration with sustainability data providers

## Cross-Cutting Conventions

### Version Control
- **Branch strategy**: Feature branches, pull requests for review
- **Commit messages**: Use conventional commits (feat:, fix:, docs:, etc.)
- **Never commit**: `.env` files, `node_modules/`, build artifacts

### Code Style
- **JavaScript**: Use ES6+ features, async/await over callbacks
- **Indentation**: 2 spaces (matches existing `backend/index.js`)
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **API routes**: RESTful conventions (`/api/resources`, use HTTP verbs correctly)

### Docker and Infrastructure
- **docker-compose.yml is the source of truth** for all service configuration
- When adding new services, use `depends_on` to define service dependencies
- Use named volumes for persistence (like `postgres_data`)
- Pin image versions (e.g., `postgres:15` not `postgres:latest`)

### Testing Strategy (Not Yet Implemented)
When adding tests:
- Unit tests: `jest` or `mocha` + `chai`
- API integration tests: `supertest`
- E2E tests: `cypress` or `playwright`
- Place tests alongside source files or in `__tests__/` directories

## Key Files Reference Guide

| File | Purpose | Current State |
|------|---------|---------------|
| `docker-compose.yml` | Infrastructure definition, DB config | Defines PostgreSQL only |
| `backend/index.js` | Express API entry point | Minimal "Hello World" server |
| `backend/README.md` | Backend documentation | Placeholder text |
| `frontend/README.md` | Frontend documentation | Placeholder text |
| `database-schemas/README.md` | Schema documentation | Placeholder text |
| `README.md` | Project overview | Brief description of platform |

## Common Pitfalls and Gotchas

### ⚠️ Backend Has No package.json
**Problem**: Running `node backend/index.js` will fail with "Cannot find module 'express'"

**Solution**: Initialize npm first:
```bash
cd backend
npm init -y
npm install express
```

**Best practice**: Pin dependency versions in `package.json`:
```json
{
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

### ⚠️ Duplicate Directory Structure
**Problem**: There's a confusing empty `green-sourcing-b2b-app/` directory at repo root

**Solution**: **Always work in top-level directories** (`backend/`, `frontend/`, `database-schemas/`). Ignore the nested directory unless specifically instructed otherwise.

### ⚠️ Database Connection from Backend
**Problem**: Backend can't connect to database with error "connection refused"

**Checklist**:
1. Is the database running? (`docker ps` should show `greenchainz_db`)
2. Is the connection string correct? (`postgres://user:password@localhost:5432/greenchainz_dev`)
3. Are you using the right host? (`localhost` from host, `db` from within docker-compose network)

### ⚠️ Port Conflicts
**Problem**: "Port 5432 already in use" or "Port 3001 already in use"

**Solution**:
- For PostgreSQL: Stop existing postgres service or change port in `docker-compose.yml`
- For backend: Change `const port = 3001` in `backend/index.js` or stop other process

### ⚠️ Docker Compose Version
**Problem**: `docker-compose` command not found or version too old

**Solution**: Use `docker compose` (without hyphen) - built into Docker Desktop. Requires Docker 20.10+

## Quick Validation Checklist

### After Backend Changes
1. ✅ Database is running: `docker ps | grep greenchainz_db`
2. ✅ Backend starts without errors: `node backend/index.js`
3. ✅ Root endpoint responds: `curl http://localhost:3001/`
4. ✅ New endpoints return expected responses
5. ✅ No sensitive data in code (use environment variables)

### After Database Changes
1. ✅ Migration scripts are in `database-schemas/`
2. ✅ Can connect via psql: `docker exec -it greenchainz_db psql -U user -d greenchainz_dev`
3. ✅ Tables created successfully: `\dt` in psql
4. ✅ Sample data can be inserted and queried

### Before Committing
1. ✅ No `.env` files in commit
2. ✅ No `node_modules/` in commit
3. ✅ README updated if adding new features
4. ✅ This file updated if changing architecture or workflows

## Getting Help and Debugging

### Database Issues
```bash
# Check database logs
docker logs greenchainz_db

# Check if database is accepting connections
docker exec greenchainz_db pg_isready -U user

# Reset database (⚠️ destroys all data)
docker compose down -v
docker compose up -d
```

### Backend Issues
```bash
# Check what's using port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Enable debug logging
DEBUG=express:* node backend/index.js
```

### Container Issues
```bash
# View all containers
docker ps -a

# Restart specific service
docker compose restart db

# View resource usage
docker stats
```

## Next Steps and Future Enhancements

As the platform evolves, update this file when you:

1. **Add package.json to backend** - Document npm scripts, dependencies
2. **Containerize backend** - Update docker-compose.yml, document networking
3. **Scaffold frontend** - Document dev server port, build process, proxy configuration
4. **Add database migrations** - Document migration tool and workflow
5. **Implement authentication** - Document auth flow, token management
6. **Add testing** - Document test commands, coverage targets
7. **Set up CI/CD** - Document build/deploy pipeline
8. **Add API documentation** - Link to Swagger/OpenAPI specs

---

**Last Updated**: 2025-10-29  
**Repository**: [jnorvi5/green-sourcing-b2b-app](https://github.com/jnorvi5/green-sourcing-b2b-app)  
**Platform**: GreenChainz - Global Trust Layer for Sustainable Commerce
