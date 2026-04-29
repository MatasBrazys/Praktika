# IT Services Portal

A full-stack web application for managing IT service requests through structured forms with LDAP-based authentication and a role-based approval workflow.

---

## Overview

Users fill out forms (e.g., device registration, network requests). Submissions go through a confirmation workflow — a designated confirmer approves or declines each one. Admins manage forms, users, and external API lookup integrations. All authentication and role assignment is driven by OpenLDAP.

---

## Architecture

```
┌─────────────┐     HTTPS      ┌──────────────────────────────┐
│   Browser   │ ─────────────► │  Nginx (frontend container)  │
└─────────────┘                │  React SPA + /api proxy       │
                                └──────────┬───────────────────┘
                                           │ /api/*
                                           ▼
                                ┌──────────────────┐
                                │  FastAPI backend  │
                                └───┬──────────┬───┘
                                    │          │
                              ┌─────▼──┐  ┌────▼──────┐
                              │Postgres│  │ OpenLDAP  │
                              └────────┘  └───────────┘
                                               │
                                    ┌──────────▼──────────┐
                                    │    Mock API          │
                                    │  (Netbox-like REST)  │
                                    └─────────────────────┘
```

| Service | Description |
|---|---|
| **Frontend** | React 19 + TypeScript, built with Vite, served via Nginx |
| **Backend** | FastAPI (Python), SQLAlchemy ORM, PostgreSQL |
| **Database** | PostgreSQL 15 |
| **LDAP** | OpenLDAP — authentication and role assignment |
| **Mock API** | Simulates a Netbox REST API for lookup field testing |
| **phpLDAPadmin** | Web UI for managing LDAP entries (localhost only) |
| **Dozzle** | Docker log viewer (localhost only) |

---

## Roles

| Role | Permissions |
|---|---|
| `admin` | Manage forms, view all submissions, approve/decline, manage lookup configs |
| `form_confirmer` | View assigned forms, approve/decline submissions |
| `user` | Fill out forms, view and edit own submissions |

Roles are assigned via LDAP group membership (`FormAdmin`, `FormConfirmer`, `FormUser`) and synced automatically every 5 minutes.

---

## Prerequisites

- Docker & Docker Compose
- TLS certificates for LDAP in `./certs/`:
  - `ldap.crt` — LDAP server certificate
  - `ldap.key` — LDAP server private key
  - `ldap-ca.pem` — CA certificate

---

## Setup

### 1. Configure environment

Copy the example and fill in all values:

```bash
cp .env.example .env
```

Key variables:

```env
# Database
POSTGRES_USER=praktika
POSTGRES_PASSWORD=yourpassword
POSTGRES_DB=praktika_db
DATABASE_URL_DOCKER=postgresql://praktika:yourpassword@db:5432/praktika_db

# Security
JWT_SECRET=                  # openssl rand -hex 32
CORS_ORIGINS=https://yourdomain.com
APP_URL=https://yourdomain.com

# LDAP
LDAP_DOMAIN=company.local
LDAP_ADMIN_PASSWORD=
LDAP_BIND_USER=svc-readonly
LDAP_BIND_PASSWORD=
LDAP_PORT=636
LDAP_USE_SSL=true

# Email (optional)
EMAIL_ENABLED=false
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=noreply@yourdomain.com
```

### 2. Bootstrap LDAP

On first run, import the base LDAP structure:

```bash
ldapadd -x -H ldap://localhost:389 -D "cn=admin,dc=company,dc=local" \
  -w yourpassword -f ldap/bootstrap.ldif
```

### 3. Start production

```bash
docker compose up --build
```

The application will be available at `http://localhost` (or your configured domain).

---

## Development

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service | URL |
|---|---|
| Frontend (Vite HMR) | http://localhost:5173 |
| Backend (auto-reload) | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| phpLDAPadmin | http://localhost:8081 |
| Dozzle (logs) | http://localhost:9999 |
| Mock API | http://localhost:9000/docs |

### Seed test users (dev only)

```bash
curl -X POST http://localhost:8000/api/auth/seed
```

Creates default users: `admin`, `confirmer`, `user` — all with password `password`.

---

## Project Structure

```
├── backend/
│   ├── app/
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routers/        # API route handlers
│   │   ├── schemas/        # Pydantic request/response schemas
│   │   └── services/       # Business logic
│   ├── alembic/            # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/     # Shared + admin + public UI components
│   │   ├── pages/          # Route-level page components
│   │   ├── services/       # API client functions
│   │   └── styles/         # CSS per component/page
│   └── Dockerfile          # Production: tsc + vite build → nginx
├── mock_api/               # Fake Netbox API for lookup testing
├── ldap/                   # LDAP bootstrap LDIF
├── certs/                  # TLS certificates (not committed)
├── docker-compose.yml      # Production
└── docker-compose.dev.yml  # Development overrides
```

---

## API Overview

All endpoints are under `/api`.

| Prefix | Purpose |
|---|---|
| `/auth` | Login, current user, LDAP sync |
| `/forms` | Form CRUD, submissions, status updates, events |
| `/dashboard` | Role-aware stats |
| `/lookup` | External API config management and query proxy |

Full interactive docs available at `/docs` when running locally.

---

## Database Migrations

```bash
# Inside the backend container or with DATABASE_URL set locally
alembic upgrade head
```

New tables (e.g. `submission_events`) are created automatically on startup via `Base.metadata.create_all`.

---

## Lookup Configs (API Integration)

Admins can configure external REST APIs (e.g. Netbox) as lookup sources for form fields. When a user types in a lookup field, the backend proxies the query to the configured API and returns matching results for auto-fill.

The included **Mock API** (`mock_api/`) simulates a Netbox instance with devices, prefixes, and tenants — useful for development and testing lookup fields without a real Netbox server.
