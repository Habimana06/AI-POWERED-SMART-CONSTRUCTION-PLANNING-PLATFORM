# BuildPlan AI

**AI-powered smart construction planning platform** — plan, design in 3D, estimate costs, schedule work, assign contractors, and monitor sites from one workspace.

Public repo: [github.com/Habimana06/AI-POWERED-SMART-CONSTRUCTION-PLANNING-PLATFORM](https://github.com/Habimana06/AI-POWERED-SMART-CONSTRUCTION-PLANNING-PLATFORM)

---

## What it does

| Area | Highlights |
|------|------------|
| **Marketing site** | Home hero slides, testimonials (admin-approved), contact form, leadership from live user profiles |
| **3D & documents** | Building Editor, floor plans, full-house exterior renders, PDF/PPT exports |
| **AI** | Groq assistant, cost/schedule/risk insights tied to saved design geometry |
| **Roles** | Admin, Project Manager, Contractor — separate dashboards and permissions |
| **Operations** | Gantt scheduling, materials, daily logs, issues, messages, notifications |
| **Security** | JWT auth, optional TOTP 2FA, email + optional Twilio SMS |

---

## Tech stack

| Layer | Technologies |
|-------|----------------|
| Frontend | React 18, Vite, Tailwind CSS, React Three Fiber, Framer Motion, TanStack Query, Recharts |
| Backend | Node.js, Express, JWT, Socket.io, MySQL (`mysql2`) |
| AI / images | Groq (LLM), optional xAI / Gemini / Pollinations for renders |
| Data | MySQL 8 |
| Deploy | Docker Compose (MySQL + API + Nginx frontend) |

**Brand colors:** Primary `#E67E22`, Steel `#2C3E50`, Concrete `#7F8C8D`.

---

## Repository layout

```
├── backend/          Express API, migrations, seed
├── frontend/         React SPA (Vite)
├── resources/hero/   Source hero/login JPGs → synced to frontend/public on build
├── docker-compose.yml
└── .env              Local secrets (gitignored — never commit)
```

Hero images: place files in `resources/hero/` (e.g. `hero1.jpg`–`hero4.jpg`, `login1.jpg`). Run `npm run sync:hero` in `frontend/` or rely on `predev` / `prebuild`.

---

## Quick start — Docker (recommended)

**Prerequisites:** Docker Desktop, Git

1. Clone the repo and create env files (see [Environment](#environment) below). At minimum, copy values into a root `.env` and `backend/.env` for Docker Compose.

2. From the project root:

```bash
docker compose up --build
```

3. Open the app:

| Service | URL |
|---------|-----|
| Web UI | http://localhost:8081 |
| API | http://localhost:5000/api |
| Health | http://localhost:5000/api/health |

4. Seed data (first time, with MySQL running):

```bash
docker compose exec backend npm run db:setup
```

Or locally: `cd backend && npm run db:setup`.

---

## Quick start — local development

**Prerequisites:** Node.js 20+, MySQL 8+

### Database

```bash
docker compose up mysql -d
```

MySQL is exposed on host port **3307** (container 3306). Default compose credentials: user `buildplan`, password `buildplan2026`, database `buildplan_ai`.

### Backend

```bash
cd backend
npm install
# Configure backend/.env (DB_*, JWT_*, optional AI/mail/SMS)
npm run db:setup
npm run dev
```

API default: http://localhost:5000

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set VITE_API_URL=http://localhost:5000/api
npm run dev
```

App default: http://localhost:5173 or `3000` depending on Vite config.

---

## Environment

**Never commit real `.env` files.** They are listed in `.gitignore`. Use placeholders locally.

### Root `.env` (used by Docker Compose for `backend` service)

Typical variables (adjust to your machine):

```env
NODE_ENV=development
JWT_SECRET=change-me-long-random-string
JWT_REFRESH_SECRET=change-me-another-long-string
GROQ_API_KEY=
DB_HOST=mysql
DB_PORT=3306
DB_NAME=buildplan_ai
DB_USER=buildplan
DB_PASSWORD=buildplan2026
MAIL_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
NOTIFICATION_ADMIN_EMAIL=
APP_SMS_ENABLED=false
APP_SMS_TWILIO_ACCOUNT_SID=
APP_SMS_TWILIO_AUTH_TOKEN=
APP_SMS_TWILIO_FROM_NUMBER=
```

### `backend/.env`

Same DB and auth keys as above when running API outside Docker (`DB_HOST=localhost`, `DB_PORT=3307`).

Optional:

- `XAI_API_KEY`, `GEMINI_API_KEY` — alternate image generation
- `FRONTEND_URL` — comma-separated origins for CORS (e.g. `http://localhost:3000,http://localhost:8081`)

### `frontend/.env`

See `frontend/.env.example`:

```env
VITE_API_URL=http://localhost:5000/api
```

For Docker/nginx on port 8081, the image is built with `VITE_API_URL=/api` (same host, proxied).

---

## Demo accounts (after seed)

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@buildplan.ai | Admin@123 |
| Project Manager | pm@buildplan.ai | PM@123 |
| Contractor | contractor@buildplan.ai | Contractor@123 |

Change passwords in production. PM accounts may require admin verification before creating projects.

---

## Role capabilities (summary)

### Admin

Platform dashboard, users, companies, all projects, analytics, audit logs, settings, **Landing Inbox** (testimonials + contact replies).

### Project Manager

Create projects, **Building Editor**, blueprints & full-house output, AI assistant, cost estimation, scheduling, risk prediction, contractor assignment, monitoring.

### Contractor

Assigned projects (including **read-only floor plan & full-house** on project detail), tasks, material requests, daily progress, issues, messages.

---

## API & real-time

- REST base path: `/api`
- WebSocket: Socket.io on the same server (auth via JWT in handshake)
- Public routes: `/api/public/*` (landing stats, showcase, testimonials, contact)

---

## Useful scripts

| Command | Where | Purpose |
|---------|--------|---------|
| `npm run db:setup` | `backend/` | Migrate + seed |
| `npm run dev` | `backend/`, `frontend/` | Development servers |
| `npm run sync:hero` | `frontend/` | Copy `resources/hero` → `public/resources/hero` |
| `node src/db/ensure-user-security.js` | `backend/` | Create `user_security` table (2FA / notification prefs) |
| `docker compose up --build` | root | Full stack |

---

## Security notes

- Keep **JWT secrets**, **SMTP**, **Twilio**, and **AI API keys** only in local or server env — not in Git.
- Enable 2FA from **Profile → 2FA** after the API has created the `user_security` table (automatic on backend startup when MySQL is available).
- SMS notifications require Twilio vars and a phone number on the user profile.

---

## License

MIT (see package metadata). Built for learning and production-style demos — harden secrets and auth before public deployment.

---

## Contributing

Issues and pull requests welcome on GitHub. For large changes, open an issue first to align on scope.
