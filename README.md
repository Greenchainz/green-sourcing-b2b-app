# GreenChainz B2B Platform

The B2B platform for verified sustainable sourcing. The global trust layer for sustainable commerce.

## Overview

GreenChainz is a comprehensive platform that connects businesses with verified sustainable suppliers, providing transparency and trust in the sustainable sourcing process.

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL 15
- **Frontend**: React (planned)
- **Infrastructure**: Docker + Docker Compose

## Prerequisites

- Docker and Docker Compose
- Node.js 16+ (for local development)
- Git

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/jnorvi5/green-sourcing-b2b-app.git
cd green-sourcing-b2b-app
```

2. Start all services:
```bash
docker compose up -d
```

3. The backend API will be available at `http://localhost:3001`

4. Check the health status:
```bash
curl http://localhost:3001/health
```

### Option 2: Local Development

1. Start the database:
```bash
docker compose up -d db
```

2. Install backend dependencies:
```bash
cd backend
npm install
```

3. Create a `.env` file in the root directory (copy from `.env.example`):
```bash
cp .env.example .env
```

4. Run the backend server:
```bash
npm start
```

## API Endpoints

### Root Endpoint
- **GET** `/` - Welcome message and API information

### Health Check
- **GET** `/health` - Health check endpoint with database connection status

### Suppliers
- **GET** `/api/suppliers` - Get list of suppliers (returns sample data)

## Database Schema

The initial database schema includes:

- **suppliers** - Verified sustainable suppliers
- **products** - Sustainable products offered by suppliers
- **certifications** - Sustainability certifications held by suppliers

Sample data is automatically loaded when the database is first initialized.

## Project Structure

```
green-sourcing-b2b-app/
├── backend/              # Node.js Express backend
│   ├── index.js         # Main application file
│   ├── package.json     # Backend dependencies
│   └── Dockerfile       # Backend container configuration
├── database-schemas/     # Database schema definitions
│   └── init.sql         # Initial schema and sample data
├── frontend/            # React frontend (planned)
├── docker-compose.yml   # Docker orchestration
├── .env.example         # Environment variables template
└── README.md           # This file
```

## Development

### Testing the Backend

Test the root endpoint:
```bash
curl http://localhost:3001/
```

Test the health check:
```bash
curl http://localhost:3001/health
```

Test the suppliers API:
```bash
curl http://localhost:3001/api/suppliers
```

### Accessing the Database

Connect to PostgreSQL using psql:
```bash
docker exec -it greenchainz_db psql -U user -d greenchainz_dev
```

View tables:
```sql
\dt
```

Query suppliers:
```sql
SELECT * FROM suppliers;
```

### Stopping Services

Stop all services:
```bash
docker compose down
```

Stop and remove all data:
```bash
docker compose down -v
```

## Environment Variables

Key environment variables (see `.env.example`):

- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `POSTGRES_HOST` - Database host (localhost for local dev, db for Docker)
- `POSTGRES_DB` - Database name
- `POSTGRES_PORT` - Database port (default: 5432)
- `PORT` - Backend API port (default: 3001)
- `NODE_ENV` - Environment (development/production)

## Features

- ✅ RESTful API with Express
- ✅ PostgreSQL database with connection pooling
- ✅ CORS enabled for frontend integration
- ✅ Health check endpoint
- ✅ Docker containerization
- ✅ Database initialization with sample data
- ✅ Error handling and logging

## Roadmap

- [ ] Frontend React application
- [ ] User authentication and authorization
- [ ] Advanced supplier search and filtering
- [ ] Sustainability scoring algorithms
- [ ] Document verification system
- [ ] Real-time notifications
- [ ] Analytics dashboard

## Contributing

This is a private project. For questions or issues, please contact the repository owner.

## License

Proprietary - All rights reserved
