# Copilot Instructions for GreenChainz B2B Platform

This repository contains the GreenChainz B2B platform - a verified sustainable sourcing platform that serves as the global trust layer for sustainable commerce. The platform is deployed **exclusively on Microsoft Azure** using Azure Container Apps, Azure PostgreSQL, Azure Blob Storage, Azure AD authentication, and Azure OpenAI.

## Architecture and Source of Truth

### Production Stack (Azure-Only)

**GreenChainz is 100% Azure-native. We do NOT use Vercel or Supabase.**

**Infrastructure:**
- **Frontend Hosting:** Azure Container Apps (Next.js 15)
- **Backend Hosting:** Azure Container Apps (Node.js 20 + Express)
- **Database:** Azure Database for PostgreSQL (Flexible Server)
- **Storage:** Azure Blob Storage
- **Authentication:** Azure AD B2C (Multi-tenant + Personal Accounts)
- **AI Services:** Azure OpenAI (GPT-4)
- **Email:** Zoho Mail
- **Container Registry:** Azure Container Registry
- **CI/CD:** GitHub Actions with Federated Identity
- **Monitoring:** Azure Application Insights

**Production URLs:**
- Frontend: `https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io`
- Backend: `https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io`

### Local Development Stack

For local development, we use Docker Compose to simulate the Azure environment:

- **`app/`** - Next.js 15 application (Frontend)
  - **Current state**: Full-featured Next.js app with TypeScript
  - **Tech stack**: 
    - Build tool: Next.js 15
    - Framework: React 19.x with TypeScript
    - Routing: Next.js App Router
    - Styling: Tailwind CSS 4.x
    - Icons: Lucide React
    - Database client: `mssql` (Azure SQL), `pg` (PostgreSQL)
    - AI: Azure OpenAI SDK
    - Storage: Azure Storage SDK
  - **Dev server**: Runs on port 3000
  - **Build command**: `npm run build`
  - **Linting**: ESLint with TypeScript support

- **`backend/`** - Node.js + Express API server (Legacy, being migrated to Next.js API routes)
  - Entry point: `backend/index.js`
  - **Tech stack**: Express 4.18, PostgreSQL (via `pg`), JWT auth
  - **Note**: New features should use Next.js API routes in `app/api/` instead

- **`lib/azure/`** - Azure service integrations
  - `config.ts` - Centralized Azure SDK configuration
  - Azure Blob Storage client
  - Azure SQL/PostgreSQL connection pool
  - **Note**: This replaces any Supabase or Vercel-specific code

- **`database-schemas/`** - PostgreSQL schema definitions and migrations
  - **Current state**: Contains production schema with migrations
  - **Files**:
    - `schema.sql` - Full database schema
    - `migrations/` - Migration scripts with timestamps
  - **Pattern**: Raw SQL files with manual migration tracking

- **`docker-compose.yml`** - Local development infrastructure
  - **Services**:
    - `db` (PostgreSQL 15) - Port 5432
  - **Note**: Frontend and backend run natively during local dev, not in containers

### Repository Structure Gotcha
⚠️ **Important**: This is a Next.js monorepo. The main application code is in the top-level `app/`, `lib/`, and `components/` directories. The `backend/` directory contains legacy code being phased out.

## Runtime Configuration and Ports

### Database (Azure PostgreSQL Flexible Server)

**Production (Azure):**
- **Service**: Azure Database for PostgreSQL (Flexible Server)
- **Server**: `greenchainz-db-prod.postgres.database.azure.com`
- **Version**: PostgreSQL 15
- **Connection**: Via `DATABASE_URL` environment variable
- **SSL**: Required (`sslmode=require`)

**Local Development (Docker):**
- **Service name**: `db`
- **Container name**: `greenchainz-db`
- **Image**: `postgres:15`
- **Port mapping**: `5432:5432` (host:container)
- **Environment variables** (from `.env` or defaults):
  - `POSTGRES_USER=${DB_USER:-user}`
  - `POSTGRES_PASSWORD=${DB_PASSWORD:-password}`
  - `POSTGRES_DB=${DB_NAME:-greenchainz_dev}`
- **Connection strings**:
  - From host: `postgres://user:password@localhost:5432/greenchainz_dev`
  - From docker services: `postgres://user:password@db:5432/greenchainz_dev`

### Frontend (Next.js on Azure Container Apps)

**Production (Azure):**
- **Container App**: `greenchainz-frontend`
- **URL**: `https://greenchainz-frontend.jollyrock-a66f2da6.eastus.azurecontainerapps.io`
- **Technology**: Next.js 15.5.9, React 19.2.3
- **Port**: 3000
- **Container Image**: `acrgreenchainzprod916.azurecr.io/greenchainz-frontend:latest`
- **Resources**: 0.5 vCPU, 1.0Gi memory, 1-3 replicas

**Local Development:**
- **Port**: 3000
- **Start command**: `npm run dev`
- **Environment variables**:
  - `NODE_ENV=development`
  - `NEXT_PUBLIC_API_URL=http://localhost:3000` (Next.js API routes)
  - `DATABASE_URL=postgres://user:password@localhost:5432/greenchainz_dev`
  - Azure credentials for local development (optional)
- **HMR (Hot Module Replacement)**: Enabled for instant UI updates

### Backend API (Node.js on Azure Container Apps)

**Production (Azure):**
- **Container App**: `greenchainz-container`
- **URL**: `https://greenchainz-container.jollyrock-a66f2da6.eastus.azurecontainerapps.io`
- **Technology**: Node.js 20, Express
- **Port**: 8080
- **Container Image**: `acrgreenchainzprod916.azurecr.io/greenchainz-backend:latest`
- **Resources**: 0.5 vCPU, 1.0Gi memory, 1-3 replicas

**Local Development (Legacy):**
- **Port**: 3001 (if running legacy backend)
- **Note**: New features should use Next.js API routes (`app/api/`) instead of the legacy Express backend

### Azure Services Integration

**Azure Blob Storage:**
- **Account**: `greenchainzscraper`, `revitfiles`
- **Connection**: Via `AZURE_STORAGE_CONNECTION_STRING`
- **SDK**: `@azure/storage-blob`

**Azure OpenAI:**
- **Endpoint**: Configured via `AZURE_OPENAI_ENDPOINT`
- **API Key**: `AZURE_OPENAI_API_KEY`
- **Model**: GPT-4
- **SDK**: `@azure/openai`

**Azure AD Authentication:**
- **App ID**: `479e2a01-70ab-4df9-baa4-560d317c3423`
- **Tenant**: `ca4f78d4-c753-4893-9cd8-1b309922b4dc`
- **Client Secret**: Stored in Azure Key Vault
- **SDK**: `@azure/identity`

## Developer Workflows

### Initial Setup

1. **Copy environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env with your actual credentials (Azure, database, etc.)
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local database** (optional - can use Azure PostgreSQL):
   ```bash
   docker compose up -d db
   ```

4. **Start Next.js development server**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Frontend: http://localhost:3000
   - API Routes: http://localhost:3000/api/...
   - Database: localhost:5432 (if using local Docker)

### Making Code Changes

**Frontend/UI changes**:
- Edit files in `app/`, `components/`, or `lib/`
- Next.js has hot module replacement (HMR) - changes appear instantly
- No restart needed

**API changes**:
- Edit files in `app/api/`
- Next.js API routes have hot reload
- Test with `curl`, Postman, or browser

**Database changes**:
1. Create migration file in `database-schemas/migrations/`:
   ```bash
   cd database-schemas/migrations
   # Use naming: YYYYMMDD_HHMMSS_description.sql
   ```

2. Apply migration:
   ```bash
   # Local database
   docker exec -i greenchainz-db psql -U user -d greenchainz_dev < database-schemas/migrations/your-migration.sql
   
   # Azure PostgreSQL
   psql "$DATABASE_URL" < database-schemas/migrations/your-migration.sql
   ```

### Database Access and Management

**Connect to local PostgreSQL using psql**:
```bash
docker exec -it greenchainz-db psql -U user -d greenchainz_dev
```

**Connect to Azure PostgreSQL**:
```bash
psql "$DATABASE_URL"
```

**Useful psql commands**:
```sql
\dt              -- List all tables
\d table_name    -- Describe table structure
\dt+             -- List tables with sizes
\dn              -- List schemas
\df              -- List functions
\l               -- List databases
\q               -- Quit psql
```

### Typical Development Cycle

1. **Make code changes**:
   - Frontend: Edit files in `app/`, `components/`, `lib/`
   - API: Edit files in `app/api/`
   - Database: Create migration in `database-schemas/migrations/`

2. **Test changes**:
   - Next.js dev server auto-reloads
   - API: Test with `curl` or browser
   - Database: Query with psql

3. **Run linter**:
   ```bash
   npm run lint
   ```

4. **Type check**:
   ```bash
   npm run type-check
   ```

5. **Build for production** (test build integrity):
   ```bash
   npm run build
   ```

6. **Commit changes**:
   ```bash
   git add .
   git commit -m "feat: descriptive message"
   git push
   ```
## Coding Patterns and Conventions

### Next.js API Routes

**Current Pattern** - API routes in `app/api/`:
```typescript
// app/api/suppliers/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { runQueryOne } from '@/lib/azure/config';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  
  // Query Azure SQL/PostgreSQL
  const supplier = await runQueryOne(
    'SELECT * FROM suppliers WHERE id = @id',
    { id }
  );
  
  return NextResponse.json(supplier);
}
```

**API Structure**:
- All API routes in `app/api/` directory
- RESTful conventions: GET (read), POST (create), PUT/PATCH (update), DELETE (delete)
- Use Next.js built-in API route handlers

**Database Access**:
- Use Azure connection pool from `lib/azure/config.ts`:
  ```typescript
  import { runQuery, runQueryOne } from '@/lib/azure/config';
  
  const users = await runQuery<User>('SELECT * FROM users WHERE id = @id', { id: userId });
  ```
- Always use parameterized queries to prevent SQL injection
- Handle errors gracefully with try-catch

**Authentication & Authorization**:
- Azure AD for authentication (via NextAuth or custom)
- JWT tokens for API authentication
- Middleware for protected routes
- Multi-tenant + personal account support

**Azure Services Integration**:
```typescript
// lib/azure/config.ts provides:
import { 
  getBlobServiceClient,      // Azure Blob Storage
  uploadFileToBlob,           // File uploads
  getAzureSQLPool,           // Azure SQL connection
  runQuery                   // Parameterized queries
} from '@/lib/azure/config';
```

### Frontend Development

**Next.js + TypeScript Patterns**:
```tsx
// app/suppliers/[id]/page.tsx
import { Suspense } from 'react';

interface Supplier {
  id: string;
  name: string;
}

async function SupplierDetails({ id }: { id: string }) {
  // Server-side data fetching
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/suppliers/${id}`);
  const supplier: Supplier = await res.json();
  
  return <div>{supplier.name}</div>;
}

export default function SupplierPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SupplierDetails id={params.id} />
    </Suspense>
  );
}
```

**Styling**:
- Use Tailwind CSS utility classes
- Common patterns:
  ```tsx
  <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">
    Click Me
  </button>
  ```

**Routing** (Next.js App Router):
```
app/
├── page.tsx                    # / (homepage)
├── suppliers/
│   ├── page.tsx                # /suppliers (list)
│   └── [id]/
│       └── page.tsx            # /suppliers/:id (details)
└── api/
    └── suppliers/
        └── [id]/
            └── route.ts        # API endpoint
```

**State Management**:
- Zustand for global state (`lib/store/`)
- Local state with `useState` for component-specific state
- Server components for data fetching (no useEffect needed)

**Icons**: Use Lucide React
```tsx
import { User } from 'lucide-react';
<User className="h-6 w-6" />
```

### Environment Configuration

**Environment variables are managed via `.env` file** (never commit this file!):

1. **Copy the template**:
   ```bash
   cp .env.example .env
   ```

2. **Required variables** (see `.env.example` for full list):
   - `DATABASE_URL` - PostgreSQL connection string
   - `AZURE_SQL_SERVER`, `AZURE_SQL_DATABASE`, `AZURE_SQL_USER`, `AZURE_SQL_PASSWORD` - Azure SQL credentials
   - `AZURE_STORAGE_CONNECTION_STRING` - Blob storage connection
   - `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT` - Azure OpenAI
   - `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID` - Azure AD auth
   - `NEXTAUTH_URL`, `NEXTAUTH_SECRET` - NextAuth configuration

3. **Environment-specific configs**:
   - Development: Use `.env.local` with localhost/Docker database
   - Production: Set all variables in Azure Container Apps environment

4. **Frontend variables**:
   - Must be prefixed with `NEXT_PUBLIC_` to be accessible in browser
   - Access via `process.env.NEXT_PUBLIC_API_URL`
   - Embedded at build time

5. **Backend variables**:
   - Access via `process.env.VARIABLE_NAME`
   - Available at runtime

## Integration Points and Dependencies

### Current Dependencies

**Main Application** (`package.json`):
- **Core**: Next.js 15, React 19, TypeScript
- **Database**: `mssql` (Azure SQL), `pg` (PostgreSQL)
- **Azure SDKs**: 
  - `@azure/storage-blob` - Blob Storage
  - `@azure/storage-queue` - Queue Storage
  - `@azure/openai` - Azure OpenAI
  - `@azure/identity` - Authentication
  - `@azure/search-documents` - Cognitive Search
- **Email**: `resend` for transactional emails
- **UI**: Tailwind CSS 4.x, Lucide React icons
- **State**: Zustand
- **Payments**: Stripe SDK

**Infrastructure**:
- **Hosting**: Azure Container Apps
- **Database**: Azure PostgreSQL Flexible Server
- **Storage**: Azure Blob Storage
- **CI/CD**: GitHub Actions with Federated Identity

### Active Integrations

1. **Azure OpenAI** - AI/ML Services
   - GPT-4 for content generation
   - Embeddings for semantic search
   - Environment: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`

2. **Azure AD** - Authentication
   - Multi-tenant application
   - OAuth 2.0 / OpenID Connect
   - Environment: `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`

3. **Azure Blob Storage** - File Storage
   - EPD documents, product images
   - Environment: `AZURE_STORAGE_CONNECTION_STRING`

4. **Email Service** (Zoho Mail via Resend)
   - Transactional emails (user notifications, admin alerts)
   - Environment: `RESEND_API_KEY`

5. **Stripe** - Payment Processing
   - Subscription management
   - Environment: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

### Future Integration Points
- **Search**: Azure Cognitive Search for full-text search
- **Analytics**: Application Insights for usage tracking
- **Message Queue**: Azure Queue Storage or Service Bus for background jobs
- **CDN**: Azure Front Door for global content delivery

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

### Testing Strategy

**Current State**: Testing framework configuration in progress

**When adding tests**:

**Backend Testing**:
- Unit tests: `jest`
- Add scripts to `backend/package.json`:
  ```json
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
  ```
- Place tests: `backend/__tests__/` or alongside files as `*.test.js`

**Frontend Testing**:
- Unit/Component tests: `jest` + `@testing-library/react`
- E2E tests: `playwright`
- Add scripts to `package.json`:
  ```json
  "scripts": {
    "test": "jest",
    "test:e2e": "playwright test"
  }
  ```
- Place tests: `tests/unit/` or `tests/e2e/`

**Database Testing**:
- Create test database: `greenchainz_test`
- Use transactions in tests (rollback after each test)
- Seed test data in `database-schemas/test-data.sql`

## Key Files Reference Guide

| File | Purpose | Current State |
|------|---------|---------------|
| `docker-compose.yml` | Infrastructure definition | Defines 3 services: db, backend, frontend |
| `backend/index.js` | Express API entry point | Full REST API with auth, OAuth, database |
| `backend/db.js` | PostgreSQL connection pool | Database connection configuration |
| `backend/openapi.yaml` | API specification | OpenAPI 3.0 spec for all endpoints |
| `backend/middleware/auth.js` | Auth middleware | JWT verification, role-based access |
| `backend/services/` | Business logic | Verification scoring, email, monitoring |
| `app/layout.tsx` | Root component | Main app component |
| `next.config.js` | Next.js configuration | Build tool configuration |
| `tailwind.config.js` | Tailwind config | CSS framework configuration |
| `database-schemas/schema.sql` | Main database schema | Full table definitions (26KB+) |
| `database-schemas/migrations/` | Database migrations | Timestamped migration scripts |
| `.env.example` | Environment template | All required env variables documented |
| `README.md` | Project overview | Platform mission, tech stack, status |

## Common Pitfalls and Gotchas

### ⚠️ Missing .env File
**Problem**: Services fail to start with errors about missing environment variables

**Solution**: 
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

### ⚠️ Wrong POSTGRES_HOST
**Problem**: Backend can't connect to database

**Checklist**:
- Docker Compose: Use `POSTGRES_HOST=db` (service name)
- Local development: Use `POSTGRES_HOST=localhost`
- Connection refused: Is database running? (`docker ps | grep greenchainz-db`)

### ⚠️ Frontend VITE_ Variables Not Working
**Problem**: `import.meta.env.VITE_API_BASE_URL` is undefined

**Solution**: 
- We are using Next.js. Use `process.env.NEXT_PUBLIC_API_URL`.
- Variables are embedded at build time

### ⚠️ OAuth Redirect Mismatch
**Problem**: OAuth login fails with "redirect_uri_mismatch"

**Solution**:
- Callback URLs must match exactly in OAuth provider settings
- Development: `http://localhost:3000/auth/{provider}/callback`
- Update `.env`: `GOOGLE_CALLBACK_URL`, `GITHUB_CALLBACK_URL`, etc.
- No trailing slash!

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
**Problem**: "Port 5432/3001/3000 already in use"

**Solution**:
```bash
# Find and kill process using the port
lsof -ti:3001 | xargs kill -9  # macOS/Linux
# Or change port in docker-compose.yml
```

### ⚠️ Docker Compose Version
**Problem**: `docker-compose` command not found or version too old

**Solution**: Use `docker compose` (without hyphen) - built into Docker Desktop. Requires Docker 20.10+

### ⚠️ TypeScript Errors in Frontend
**Problem**: Build fails with TypeScript errors

**Solution**:
```bash
npm run type-check  # Type-check before building
# Fix type errors in your code
```

### ⚠️ CORS Errors in Browser
**Problem**: API calls fail with CORS errors

**Checklist**:
- Is `FRONTEND_URL` set correctly in backend `.env`?
- Backend CORS config allows credentials: `credentials: true`
- Frontend axios calls include: `withCredentials: true` (for cookies/sessions)

### ⚠️ Port Already in Use
**Problem**: "Port 5432/3001/3000 already in use"

**Solution**:
```bash
# Find and kill process using the port
lsof -ti:3000 | xargs kill -9  # macOS/Linux
# Or change port in docker-compose.yml
```

## Quick Validation Checklist

### After Backend Changes
1. ✅ Backend builds without errors: `docker compose up --build backend`
2. ✅ Backend starts successfully: `docker compose logs backend`
3. ✅ API responds: `curl http://localhost:3001/api/v1/health` (or similar endpoint)
4. ✅ OpenAPI spec updated: Edit `backend/openapi.yaml` if routes changed
5. ✅ Check Swagger UI: http://localhost:3001/api-docs
6. ✅ No sensitive data in code (use environment variables)
7. ✅ Database queries use parameterized syntax (prevent SQL injection)

### After Frontend Changes
1. ✅ TypeScript compiles: `npm run type-check`
2. ✅ Linter passes: `npm run lint`
3. ✅ Production build succeeds: `npm run build`
4. ✅ UI displays correctly in browser: http://localhost:3000
5. ✅ Console has no errors: Check browser dev tools
6. ✅ API calls work: Check network tab for 200 responses

### After Database Changes
1. ✅ Migration script created: `database-schemas/migrations/YYYYMMDD_HHMMSS_description.sql`
2. ✅ Migration applied successfully
3. ✅ Can connect: `docker exec -it greenchainz-db psql -U user -d greenchainz_dev`
4. ✅ Tables exist: `\dt` in psql
5. ✅ Sample queries work
6. ✅ Backend can connect and query new schema

### Before Committing
1. ✅ No `.env` files in commit (check `.gitignore`)
2. ✅ No `node_modules/` in commit
3. ✅ No `dist/` or `build/` artifacts
4. ✅ No sensitive credentials in code
5. ✅ README.md updated if public API changed
6. ✅ This file (copilot-instructions.md) updated if architecture changed
7. ✅ OpenAPI spec updated if API routes changed
8. ✅ Commit message follows convention: `feat:`, `fix:`, `docs:`, etc.

## Getting Help and Debugging

### Database Issues
```bash
# Check database logs
docker logs greenchainz-db

# Check if database is accepting connections
docker exec greenchainz-db pg_isready -U user

# View database size and connections
docker exec -it greenchainz-db psql -U user -d greenchainz_dev -c "\l+"
docker exec -it greenchainz-db psql -U user -d greenchainz_dev -c "SELECT * FROM pg_stat_activity;"

# Reset database (⚠️ destroys all data)
docker compose down -v
docker compose up -d db
# Re-apply schema
docker exec -i greenchainz-db psql -U user -d greenchainz_dev < database-schemas/schema.sql
```

### Backend Issues
```bash
# View backend logs
docker compose logs -f backend

# Check what's using port 3001
lsof -i :3001  # macOS/Linux
netstat -ano | findstr :3001  # Windows

# Restart backend
docker compose restart backend

# Rebuild backend (after package.json changes)
docker compose up -d --build backend

# Execute commands inside backend container
docker exec -it greenchainz-backend npm list  # List installed packages
docker exec -it greenchainz-backend node -v   # Check Node version
```

### Frontend Issues
```bash
# View frontend logs (Vite output)
docker compose logs -f frontend

# Clear Next.js cache
rm -rf .next

# Rebuild frontend
docker compose up -d --build frontend

# Check TypeScript errors
npm run type-check
```

### Container Issues
```bash
# View all containers
docker ps -a

# Restart all services
docker compose restart

# Rebuild everything
docker compose up -d --build

# View resource usage
docker stats

# Remove all containers and volumes (nuclear option)
docker compose down -v
docker compose up -d --build
```

### Network/Connectivity Issues
```bash
# Test backend from host
curl http://localhost:3001/api/v1/health

# Test backend from frontend container
docker exec -it greenchainz-frontend curl http://backend:3001/api/v1/health

# Check Docker networks
docker network ls
docker network inspect green-sourcing-b2b-app_default
```

### Environment Variable Debugging
```bash
# Check backend environment variables
docker exec -it greenchainz-backend env | grep -E "(POSTGRES|JWT|GOOGLE)"

# Check frontend environment variables (build-time)
docker exec -it greenchainz-frontend env | grep NEXT_PUBLIC
```

## Next Steps and Future Enhancements

As the platform evolves, update this file when you:

1. ✅ ~~Add package.json to backend~~ - DONE
2. ✅ ~~Containerize backend~~ - DONE (Docker Compose with all services)
3. ✅ ~~Scaffold frontend~~ - DONE (Next.js + React + TypeScript + Tailwind)
4. ✅ ~~Add database migrations~~ - DONE (migration scripts in database-schemas/migrations/)
5. ✅ ~~Implement authentication~~ - DONE (JWT + OAuth via Passport.js)
6. ✅ ~~Add API documentation~~ - DONE (OpenAPI 3.0 spec + Swagger UI)
7. 🔄 **Add testing framework** - IN PROGRESS
   - Add Jest for unit tests
   - Add Playwright for E2E tests
   - Add test scripts to package.json files
8. 🔄 **Set up CI/CD** - PLANNED
   - GitHub Actions for automated testing
   - Automated deployment to staging/production
   - Docker image builds and registry pushes
9. 🔄 **Production deployment** - PLANNED
   - Configure for Azure Container Apps
   - Environment-specific configurations
   - SSL/TLS certificates
   - CDN configuration
10. 🔄 **Monitoring & Logging** - PLANNED
    - Error tracking (Sentry, LogRocket)
    - Performance monitoring
    - Database query optimization
    - API rate limiting

---

**Last Updated**: 2026-01-04
**Repository**: [jnorvi5/green-sourcing-b2b-app](https://github.com/jnorvi5/green-sourcing-b2b-app)  
**Platform**: GreenChainz - Global Trust Layer for Sustainable Commerce

---

## Quick Links

- **Frontend Dev**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs
- **Database**: localhost:5432 (user/password/greenchainz_dev)
- **OpenAPI Spec**: `backend/openapi.yaml`
- **Environment Template**: `.env.example`
