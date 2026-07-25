# AI-Powered Smart Construction Planning Platform

Enterprise construction management platform with AI-powered building design, scheduling, cost estimation, risk prediction, and interactive 3D visualization.

## Tech Stack

- **Frontend:** React 18, Vite, Tailwind CSS, React Three Fiber, Framer Motion, Recharts
- **Backend:** Node.js, Express, JWT, Socket.io, Groq AI
- **Database:** MySQL 8
- **Deployment:** Docker, Docker Compose

## Quick Start (Local)

### Prerequisites

- Node.js 20+
- MySQL 8+ (or use Docker)

### 1. Start MySQL (Docker)

```bash
docker compose up mysql -d
```

### 2. Backend

```bash
cd backend
npm install
npm run db:setup
npm run dev
```

API: http://localhost:5001 (or 5000 in Docker)  
Health: http://localhost:5001/api/health

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Quick Start (Full Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:8081
- Backend API: http://localhost:5000

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@buildplan.ai | Admin@123 |
| Project Manager | pm@buildplan.ai | PM@123 |
| Contractor | contractor@buildplan.ai | Contractor@123 |

## Modules

### Admin
Dashboard, Users, Projects, Companies, Reports, Settings, Audit Logs

### Project Manager
AI Assistant, 3D Building Generator, Blueprint Viewer, Scheduling, Cost Estimation, Risk Prediction, Project Monitoring, Contractor Assignment

### Contractor
Assigned Projects, Daily Progress, Material Requests, Issue Reporting, Messages

## Environment

Copy `.env.example` to `backend/.env` and configure:

- `GROQ_API_KEY` — AI features (Groq LLM)
- `DB_*` — MySQL connection (default port `3307` when using Docker)
- `MAIL_*` — Email (verification, password reset)
- `JWT_SECRET` / `JWT_REFRESH_SECRET` — Auth tokens

## Theme

Construction-inspired enterprise UI: Orange `#E67E22`, Steel `#2C3E50`, Concrete Gray `#7F8C8D`, Safety Yellow `#F1C40F`.
