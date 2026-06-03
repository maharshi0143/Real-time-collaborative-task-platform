# Real-Time Collaborative Task Management Platform

A production-ready Kanban-style task management application with real-time collaboration, role-based access control (RBAC), comprehensive analytics, and full CI/CD pipeline.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Default Credentials](#default-credentials)
- [API Documentation](#api-documentation)
- [Database Schema](#database-schema)
- [Real-Time Architecture](#real-time-architecture)
- [Role-Based Access Control](#role-based-access-control)
- [Testing](#testing)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment](#deployment)
- [Monitoring](#monitoring)
- [Known Deviations](#known-deviations)

---

## Tech Stack

### Frontend
| Technology | Purpose |
|---|---|
| **React 18** | UI framework with hooks and concurrent features |
| **TypeScript** | Type safety and developer experience |
| **Vite** | Fast build tool and dev server with HMR |
| **Tailwind CSS** | Utility-first styling with responsive design |
| **shadcn/ui** | Accessible, customizable component primitives (Radix UI) |
| **Zustand** | Lightweight state management for auth store |
| **React Router v6** | Client-side routing with nested layouts |
| **Recharts** | Analytics charting (completion trends, priority distribution) |
| **@dnd-kit** | Drag-and-drop Kanban board (core + sortable) |
| **Socket.IO Client** | Real-time WebSocket communication |
| **Axios** | HTTP client with interceptors for JWT auth |
| **Sonner** | Toast notifications for success/error feedback |
| **Lucide React** | Icon library |
| **date-fns** | Date formatting and manipulation |
| **Playwright** | End-to-end browser testing |

### Backend
| Technology | Purpose |
|---|---|
| **Node.js 20** | JavaScript runtime |
| **Express.js** | HTTP framework with middleware ecosystem |
| **TypeScript** | Type safety across the entire API layer |
| **Prisma ORM** | Type-safe database client with declarative migrations |
| **PostgreSQL 15** | Primary database with JSONB, arrays, full-text search |
| **Redis 7** | Caching, session store, Pub/Sub for real-time events |
| **ioredis** | Redis client with cluster support |
| **Socket.IO** | WebSocket with auto-reconnection, rooms, fallback transports |
| **Socket.IO Redis Adapter** | Multi-instance WebSocket broadcasting |
| **Zod** | Request validation with TypeScript inference |
| **Winston** | Structured logging with multiple transports |
| **jsonwebtoken** | JWT access + refresh token auth |
| **bcrypt** | Password hashing |
| **node-cron** | Scheduled job runner (due-soon/overdue notifications) |
| **prom-client** | Prometheus metrics for monitoring |
| **Helmet** | HTTP security headers |
| **UUID** | Unique ID generation |
| **Vitest** | Unit and integration test runner |
| **Supertest** | HTTP integration testing |

### Infrastructure
| Technology | Purpose |
|---|---|
| **Docker Compose** | Local development orchestration (7 services) |
| **Docker** | Containerization for all components |
| **Kubernetes (EKS)** | Production orchestration with HPA |
| **Nginx** | Reverse proxy, SSL termination, static serving |
| **Prometheus** | Metrics collection and alerting |
| **Grafana** | Dashboard visualization and alert management |
| **GitHub Actions** | CI/CD pipelines (lint, test, security, deploy) |
| **Trivy** | Container vulnerability scanning |

---

## Architecture

```
┌──────────────┐        ┌─────────────────────────────────────────────────────┐
│   Browser    │──HTTP──▶│                     Nginx (80/443)                  │
└──────────────┘        │  /api/v1/*  → Backend:4000                          │
                        │  /socket    → Backend:4000 (WebSocket upgrade)      │
                        │  /metrics   → Backend:4000 (Prometheus scrape)      │
                        │  /*         → Frontend:3000 (or static files)       │
                        └──────────┬──────────────────────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────────────────────┐
              │                    │                                    │
              ▼                    ▼                                    ▼
     ┌────────────────┐   ┌──────────────────┐               ┌─────────────────┐
     │   Frontend     │   │    Backend        │               │   Prometheus    │
     │   React 18     │   │    Express.js     │◀────metrics──▶│   :9090         │
     │   Vite/Static  │   │    Socket.IO      │               └────────┬────────┘
     │   :3000        │   │    :4000          │                        │
     └────────────────┘   └────────┬──────────┘                        │
                                   │                              ┌────▼────┐
                          ┌────────┼────────┐                    │ Grafana │
                          │        │        │                    │ :3001   │
                          ▼        ▼        ▼                    └─────────┘
                   ┌──────────┐ ┌──────┐ ┌──────────┐
                   │PostgreSQL│ │Redis │ │  node-   │
                   │  :5432   │ │:6379 │ │  cron    │
                   └──────────┘ └──┬───┘ │  jobs    │
                                   │     └──────────┘
                                   │ Pub/Sub
                                   ▼
                          ┌──────────────────┐
                          │  WebSocket       │
                          │  Broadcast       │
                          │  (via Redis)     │
                          └──────────────────┘
```

### Request Flow

1. **Browser** sends request to Nginx on port 80 (HTTP) or 443 (HTTPS)
2. **Nginx** routes based on path prefix:
   - `/api/v1/*` → Backend Express server (port 4000)
   - `/socket` → Backend Socket.IO server (WebSocket upgrade, 86400s timeout)
   - `/metrics` → Backend Prometheus metrics endpoint (port 4000)
   - `/*` → Frontend (Vite dev server or Nginx-served static files)
3. **Backend** processes API requests through middleware pipeline:
   - Helmet (security headers)
   - CORS (configured origins)
   - Request ID generation (UUID)
   - Request logging (Winston)
   - Metrics middleware (request count, duration)
   - Route handler → Controller → Service → Prisma (PostgreSQL) / ioredis (Redis)
   - Error handler (catches and formats all errors)
4. **WebSocket** connections authenticate within 5 seconds, join user-specific rooms, receive real-time board and notification events via Redis Pub/Sub

---

## Project Structure

```
task-platform/
│
├── backend/                          # Express.js API server
│   ├── prisma/
│   │   └── schema.prisma             # Database schema (6 models, 12 indexes)
│   ├── migrations/                   # Prisma migration files (copy of prisma/migrations/)
│   ├── seeds/
│   │   └── seed.ts                   # Seed script (alice, bob, charlie)
│   ├── src/
│   │   ├── index.ts                  # Server entry point (HTTP + Socket.IO)
│   │   ├── app.ts                    # Express app setup (middleware, routes)
│   │   ├── config/
│   │   │   └── index.ts              # Environment config with defaults
│   │   ├── controllers/
│   │   │   └── auth.controller.ts    # Auth handlers (health, ready)
│   │   ├── middleware/
│   │   │   ├── auth.ts               # JWT verification middleware
│   │   │   ├── errorHandler.ts       # Global error handler (envelope format)
│   │   │   ├── rbac.ts               # Role-based access middleware
│   │   │   ├── requestId.ts          # UUID request ID middleware
│   │   │   └── requestLogger.ts      # Structured request logging
│   │   ├── routes/
│   │   │   ├── auth.routes.ts        # POST /register, /login, /refresh, /logout, GET /me
│   │   │   ├── workspace.routes.ts   # CRUD + members + nested project routes
│   │   │   ├── project.routes.ts     # CRUD (admin-only delete)
│   │   │   ├── board.routes.ts       # CRUD + task creation
│   │   │   ├── task.routes.ts        # CRUD + comments + move
│   │   │   └── notification.routes.ts # GET /, PATCH /:id/read, POST /read-all
│   │   ├── services/
│   │   │   ├── auth.service.ts       # Auth logic (register, login, refresh, logout)
│   │   │   ├── workspace.service.ts  # Workspace CRUD + membership
│   │   │   ├── project.service.ts    # Project CRUD
│   │   │   ├── task.service.ts       # Task CRUD + comments + notifications
│   │   │   ├── notification.service.ts # Notification creation + publishing
│   │   │   ├── analytics.service.ts   # Workspace analytics queries
│   │   │   └── websocket.service.ts   # Socket.IO setup + Redis Pub/Sub
│   │   ├── jobs/
│   │   │   ├── dueSoonNotifier.ts    # Cron: tasks due within 24h
│   │   │   └── overdueNotifier.ts    # Cron: past-due tasks
│   │   ├── utils/
│   │   │   ├── logger.ts             # Winston logger
│   │   │   ├── redis.ts              # ioredis client + Pub/Sub
│   │   │   ├── metrics.ts            # Prometheus metrics
│   │   │   └── prisma.ts             # Prisma client singleton
│   │   └── validators/
│   │       └── index.ts              # Zod schemas
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── auth.service.test.ts  # Auth service unit tests
│   │   │   └── rbac.test.ts          # RBAC middleware tests
│   │   └── integration/
│   │       └── ...                   # Integration tests (require running server)
│   ├── Dockerfile                    # Multi-stage build (builder → production)
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── package.json
│
├── frontend/                         # React application
│   ├── e2e/
│   │   ├── auth.spec.ts              # Login, register, validation, redirect
│   │   ├── workspace.spec.ts         # Workspace navigation tests
│   │   └── board.spec.ts             # Board CRUD + task creation tests
│   ├── public/                       # Static assets
│   ├── src/
│   │   ├── main.tsx                  # Entry point
│   │   ├── App.tsx                   # Router setup (protected/public routes)
│   │   ├── index.css                 # Tailwind imports + global styles
│   │   ├── components/
│   │   │   ├── analytics/            # Charts (LineChart, BarChart)
│   │   │   ├── auth/                 # Login/Register form components
│   │   │   ├── kanban/               # Board columns, task cards, TaskDrawer
│   │   │   ├── layout/               # AppShell, Breadcrumb, Sidebar
│   │   │   ├── notifications/        # NotificationBell, NotificationList
│   │   │   ├── shared/               # Reusable components
│   │   │   ├── task-drawer/          # Task detail drawer with @mentions
│   │   │   └── ui/                   # shadcn/ui primitives
│   │   ├── hooks/
│   │   │   ├── useSocket.ts          # WebSocket connection hook
│   │   │   ├── useNotifications.ts   # Real-time notification hook
│   │   │   └── useWorkspaceRole.ts   # Workspace role fetching hook
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx         # Login with redirect support
│   │   │   ├── RegisterPage.tsx      # Registration → redirect to /login
│   │   │   ├── DashboardPage.tsx     # Workspace list with welcome banner
│   │   │   ├── WorkspacePage.tsx     # Projects list with role badge
│   │   │   ├── ProjectPage.tsx       # Boards list with breadcrumb
│   │   │   ├── BoardPage.tsx         # Kanban board with DnD
│   │   │   ├── AnalyticsPage.tsx     # Charts and workspace stats
│   │   │   ├── NotificationsPage.tsx # Notification list with filters
│   │   │   └── ProfilePage.tsx       # Profile edit (username, full name)
│   │   ├── services/
│   │   │   ├── api.ts                # Axios instance with JWT interceptor
│   │   │   └── socket.ts             # Socket.IO client with heartbeat
│   │   ├── store/
│   │   │   └── authStore.ts          # Zustand auth state
│   │   ├── types/
│   │   │   └── index.ts              # TypeScript interfaces
│   │   └── utils/
│   │       └── roles.ts              # Role checking helpers
│   ├── Dockerfile                    # Multi-stage: development → builder → production (Nginx)
│   ├── nginx.prod.conf               # Production Nginx config for SPA
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── playwright.config.ts
│   ├── tsconfig.json
│   └── package.json
│
├── infra/
│   ├── docker-compose.yml            # 7 services (postgres, redis, backend, frontend, nginx, prometheus, grafana)
│   ├── docker-compose.test.yml       # Test-specific compose overrides
│   ├── nginx/
│   │   └── nginx.conf                # Reverse proxy with WebSocket support
│   ├── k8s/                          # Kubernetes manifests
│   │   ├── namespace.yaml
│   │   ├── backend-config.yaml
│   │   ├── backend-secrets.yaml
│   │   ├── backend-deployment.yaml
│   │   ├── backend-hpa.yaml
│   │   ├── backend-service.yaml
│   │   ├── frontend-deployment.yaml
│   │   ├── frontend-service.yaml
│   │   └── taskplatform-ingress.yaml
│   └── monitoring/
│       ├── prometheus.yml            # Scrape config for backend
│       ├── alerts.yml                # Alerting rules
│       ├── grafana-dashboard.json    # Pre-configured dashboard
│       └── provisioning/
│           ├── dashboards/           # Dashboard provisioning
│           └── datasources/          # Datasource provisioning
│
└── .github/
    └── workflows/
        ├── ci.yml                    # Lint → test-backend → test-frontend → security-scan → docker-build
        └── cd.yml                    # deploy-staging → smoke-test → deploy-production → notify
```

---

## Quick Start

### Prerequisites

- Docker Desktop 4.25+ (with Docker Compose v2)
- Git
- Node.js 20+ (for local development without Docker)

### Local Development (Docker)

```bash
# 1. Clone the repository
git clone <repo-url>
cd task-platform

# 2. Copy environment variables
cp .env.example .env

# 3. Start all services
cd infra
docker compose up --build -d

# 4. Wait for services to be ready (~30 seconds)
# 5. Open http://localhost in your browser
```

### Local Development (Without Docker)

```bash
# Terminal 1: Backend
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
npm run db:seed
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### Verify Installation

- **Frontend**: http://localhost:3000 (or http://localhost via Nginx)
- **Backend API**: http://localhost:4000/api/v1/health
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)

---

## Environment Variables

### Backend (`backend/.env` or root `.env`)

| Variable | Default | Description |
|---|---|---|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `4000` | API server port |
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `REDIS_URL` | `redis://redis:6379` | Redis connection string |
| `JWT_SECRET` | `change-me-in-production-min-32-chars!!` | JWT signing secret |
| `JWT_EXPIRES_IN` | `900` | Access token TTL (seconds, 15 min) |
| `REFRESH_TOKEN_EXPIRES_IN` | `604800` | Refresh token TTL (seconds, 7 days) |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated allowed origins |
| `LOG_LEVEL` | `info` | Winston log level |
| `SMTP_HOST` | `smtp.mailtrap.io` | Mailtrap SMTP host (stubbed) |
| `SMTP_PORT` | `587` | SMTP port |
| `SMTP_USER` | `` | SMTP username |
| `SMTP_PASS` | `` | SMTP password |
| `FROM_EMAIL` | `noreply@taskplatform.dev` | Outbound email sender |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:4000` | Backend API base URL |
| `VITE_WS_URL` | `ws://localhost:4000` | WebSocket server URL |

---

## Default Credentials

| Username | Password | Role |
|---|---|---|
| alice | Alice@12345 | Admin |
| bob | Bob@12345 | Manager |
| charlie | Charlie@12345 | Member |

Seed users are created on first startup via `npx tsx seeds/seed.ts`. Each user gets a personal workspace on registration.

---

## API Documentation

All API routes are prefixed with `/api/v1`. Every response follows the envelope format:

```json
{
  "success": true,
  "data": { ... },
  "requestId": "uuid"
}
```

Error responses:

```json
{
  "success": false,
  "error": { "message": "...", "code": "..." },
  "requestId": "uuid"
}
```

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/auth/register` | No | Register new user |
| `POST` | `/auth/login` | No | Login, returns access+refresh tokens |
| `POST` | `/auth/refresh` | No | Refresh access token |
| `POST` | `/auth/logout` | Yes | Revoke refresh token |
| `GET` | `/auth/me` | Yes | Get current user profile |

### Workspaces

| Method | Endpoint | Auth | Role Required | Description |
|---|---|---|---|---|
| `POST` | `/workspaces` | Yes | Any | Create workspace |
| `GET` | `/workspaces` | Yes | Any | List user workspaces |
| `GET` | `/workspaces/:workspaceId` | Yes | Member+ | Get workspace details |
| `PATCH` | `/workspaces/:workspaceId` | Yes | Admin | Update workspace |
| `DELETE` | `/workspaces/:workspaceId` | Yes | Admin | Delete workspace |
| `GET` | `/workspaces/:workspaceId/members` | Yes | Member+ | List workspace members |
| `POST` | `/workspaces/:workspaceId/members` | Yes | Admin | Add workspace member |
| `PATCH` | `/workspaces/:workspaceId/members/:userId` | Yes | Admin | Update member role |
| `DELETE` | `/workspaces/:workspaceId/members/:userId` | Yes | Admin | Remove member |
| `GET` | `/workspaces/:workspaceId/projects` | Yes | Member+ | List projects in workspace |
| `POST` | `/workspaces/:workspaceId/projects` | Yes | Admin, Manager | Create project |
| `GET` | `/workspaces/:workspaceId/projects/:projectId` | Yes | Member+ | Get project details |
| `PATCH` | `/workspaces/:workspaceId/projects/:projectId` | Yes | Member+ | Update project |
| `DELETE` | `/workspaces/:workspaceId/projects/:projectId` | Yes | Admin | Delete project |

### Projects (Direct Routes)

| Method | Endpoint | Auth | Role Required | Description |
|---|---|---|---|---|
| `GET` | `/projects/:projectId` | Yes | Member+ | Get project details |
| `PATCH` | `/projects/:projectId` | Yes | Member+ | Update project |
| `DELETE` | `/projects/:projectId` | Yes | Admin | Delete project |

### Boards

| Method | Endpoint | Auth | Role Required | Description |
|---|---|---|---|---|
| `POST` | `/projects/:projectId/boards` | Yes | Admin, Manager | Create board |
| `GET` | `/projects/:projectId/boards` | Yes | Member+ | List boards in project |
| `PATCH` | `/boards/:boardId` | Yes | Admin, Manager | Update board |
| `DELETE` | `/boards/:boardId` | Yes | Admin, Manager | Delete board |
| `POST` | `/boards/:boardId/tasks` | Yes | Admin, Manager, Member | Create task in board |

### Tasks

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/tasks/:taskId` | Yes | Get task details |
| `PATCH` | `/tasks/:taskId` | Yes | Update task fields |
| `DELETE` | `/tasks/:taskId` | Yes | Delete task |
| `PATCH` | `/tasks/:taskId/move` | Yes | Move task to new board/position |
| `GET` | `/tasks/:taskId/comments` | Yes | List task comments |
| `POST` | `/tasks/:taskId/comments` | Yes | Add comment to task |

### Comments

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `PATCH` | `/comments/:commentId` | Yes | Update comment (member+ of workspace) |
| `DELETE` | `/comments/:commentId` | Yes | Delete comment (member+ of workspace) |

### Notifications

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/notifications` | Yes | List user notifications |
| `PATCH` | `/notifications/:id/read` | Yes | Mark notification as read |
| `POST` | `/notifications/read-all` | Yes | Mark all notifications as read |

### Health

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Health check (DB + Redis status) |
| `GET` | `/ready` | No | Readiness check |

### Metrics

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/metrics` | No | Prometheus metrics (scrape target) |

---

## Database Schema

### Entity Relationship Diagram

```
users (1) ──── (N) workspace_members (N) ──── (1) workspaces
  │                                              │
  │                                              │
  └─────────── (N) workspaces (owner)            │
  │                                              │
  ├─────────── (N) projects (created_by)        │
  │                                              │
  ├─────────── (N) tasks (created_by)            │
  │                                              │
  ├─────────── (N) tasks (assignee)             │
  │                                              │
  ├─────────── (N) comments (author)            │
  │                                              │
  ├─────────── (N) activity_logs (actor)        │
  │                                              │
  └─────────── (N) notifications                │
                                                │
workspaces (1) ──── (N) projects (1) ──── (N) boards (1) ──── (N) tasks
       │                                                          │
       │                                                          │
       └─────────── (N) activity_logs         (1) ──── (N) comments

users (1) ──── (N) refresh_tokens
```

### Models (6 total)

| Model | Key Fields | Notes |
|---|---|---|
| `User` | id, email (unique), username (unique), passwordHash, avatarUrl, fullName, isVerified | Core user identity |
| `Workspace` | id, name, slug (unique), ownerId | Tenant/organization container |
| `WorkspaceMember` | id, workspaceId, userId, role (admin\|manager\|member\|guest) | Many-to-many with role |
| `Project` | id, workspaceId, name, description, createdBy | Groups boards |
| `Board` | id, projectId, name, position | Kanban column |
| `Task` | id, boardId, title, description, assigneeId, createdBy, priority, status, dueDate, position, tags[] | Core work item |
| `Comment` | id, taskId, authorId, content, parentId (threaded replies) | Task discussion |
| `ActivityLog` | id, workspaceId, projectId?, taskId?, actorId?, action, metadata (JSONB) | Audit trail |
| `Notification` | id, userId, type, title, body, link, isRead | User alerts |
| `RefreshToken` | id, token (unique), userId, expiresAt, isRevoked | JWT refresh |

### Indexes (12 named)

| Index Name | Table | Columns |
|---|---|---|
| `idx_workspace_members_workspace` | workspace_members | workspaceId |
| `idx_workspace_members_user_id` | workspace_members | userId |
| `idx_tasks_board_id` | tasks | boardId |
| `idx_tasks_assignee_id` | tasks | assigneeId |
| `idx_tasks_status` | tasks | status |
| `idx_tasks_due_date` | tasks | dueDate |
| `idx_notifications_user_id` | notifications | userId |
| `idx_notifications_user_is_read` | notifications | userId, isRead |
| `idx_refresh_tokens_token` | refresh_tokens | token |
| `idx_activity_logs_workspace_id` | activity_logs | workspaceId |
| `idx_activity_logs_task_id` | activity_logs | taskId |
| `idx_activity_logs_created_at` | activity_logs | createdAt (DESC) |

---

## Real-Time Architecture

### WebSocket Connection

1. **Client** connects to `ws://host/socket` with `auth.token` (JWT) in handshake
2. **Server** validates JWT within 5 seconds — closes with code `4001` on timeout
3. On success, client socket joins `user:{userId}` room for personal notifications
4. Heartbeat every 25 seconds keeps the connection alive

### Redis Pub/Sub Flow

```
Task Created/Updated/Deleted
        │
        ▼
Backend publishes to Redis channel:
  board:{boardId}:events
        │
        ▼
Redis broadcasts to all backend instances
(via psubscribe 'board:*:events')
        │
        ▼
Each instance emits Socket.IO event to
clients in the board's Socket.IO room:
  'board:updated'
  'task:created'
  'task:updated'
  'task:deleted'
```

### Notification Flow

```
Due-soon check (cron)
  or
Task assigned/comment added
        │
        ▼
notification.service.ts creates Notification row in DB
        │
        ▼
publishUserNotification() publishes to Redis:
  user:{userId}:events
        │
        ▼
  ┌─────┴─────┐
  │           │
  ▼           ▼
Redis PMSG    incrementNotificationsSent()
→ WebSocket   (Prometheus metric)
→ 'notification:new' event
→ client's NotificationBell
  updates badge count
```

### Socket.IO Events

| Event | Direction | Payload | Description |
|---|---|---|---|
| `board:updated` | Server → Client | `{ boardId, ... }` | Board metadata changed |
| `task:created` | Server → Client | `{ task, boardId }` | New task in board |
| `task:updated` | Server → Client | `{ task, boardId }` | Task fields changed |
| `task:deleted` | Server → Client | `{ taskId, boardId }` | Task removed |
| `notification:new` | Server → Client | `{ id, type, title, body }` | New notification |
| `task:editing` | Bidirectional | `{ taskId, userId, username }` | Editing awareness |

---

## Role-Based Access Control

### Role Hierarchy

```
Admin (full access)
  │
  ▼
Manager (manage projects, boards, tasks)
  │
  ▼
Member (create tasks, comments, view)
  │
  ▼
Guest (view only)
```

### Permissions Matrix

| Action | Admin | Manager | Member | Guest |
|---|---|---|---|---|
| Create workspace | ✅ | ✅ | ✅ | ✅ |
| Delete workspace | ✅ | ❌ | ❌ | ❌ |
| Add/remove members | ✅ | ❌ | ❌ | ❌ |
| Update member role | ✅ | ❌ | ❌ | ❌ |
| Create project | ✅ | ✅ | ❌ | ❌ |
| Update project | ✅ | ✅ | ✅ | ✅ |
| Delete project | ✅ | ❌ | ❌ | ❌ |
| Create board | ✅ | ✅ | ❌ | ❌ |
| Update board | ✅ | ✅ | ❌ | ❌ |
| Delete board | ✅ | ✅ | ❌ | ❌ |
| Create task | ✅ | ✅ | ✅ | ❌ |
| Update task | ✅ | ✅ | ✅ | ✅ |
| Delete task | ✅ | ✅ | ✅ | ✅ |
| Move task | ✅ | ✅ | ✅ | ✅ |
| Add comment | ✅ | ✅ | ✅ | ✅ |
| Update/delete comment | ✅ | ✅ | ✅ | ✅ |
| View workspace/project/board | ✅ | ✅ | ✅ | ✅ |
| View analytics | ✅ | ✅ | ✅ | ✅ |

### Middleware

| Middleware | Applied To | Logic |
|---|---|---|
| `authMiddleware` | All protected routes | Verifies JWT from `Authorization: Bearer <token>` header |
| `requireWorkspaceRole(...roles)` | Workspace routes, nested project routes | Checks `WorkspaceMember.role` for the authenticated user in the workspace |
| `checkProjectAccess` | Project routes | Ensures user is a member of the project's workspace |
| `requireProjectRole(...roles)` | Project-level mutations | Checks role on project's workspace |
| `requireBoardRole(...roles)` | Board mutation routes | Checks role on board's parent project's workspace |
| `checkCommentAccess` | Comment PATCH/DELETE | Ensures user is a workspace member of the comment's task's board's project's workspace |

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage (threshold: 60% lines)
npm run test:coverage

# Watch mode
npm run test:watch
```

**Test Files:**
- `tests/unit/auth.service.test.ts` — Auth service logic (registration, login, token refresh)
- `tests/unit/rbac.test.ts` — RBAC middleware (role checking, access control)

### Frontend Tests (E2E with Playwright)

```bash
cd frontend

# Run all E2E tests
npm run test:e2e

# Run with visible browser
npm run test:e2e:ui

# View report
npm run test:e2e:report
```

**Test Files:**
- `e2e/auth.spec.ts` — Login flow, registration, form validation, redirect after auth
- `e2e/workspace.spec.ts` — Workspace navigation, project listing
- `e2e/board.spec.ts` — Board CRUD (create board, create task, delete board)

### CI Test Pipeline

```
lint (backend + frontend)
    │
    ▼
test-backend (PostgreSQL + Redis service containers, vitest, coverage ≥ 60%)
    │
    ▼
test-frontend (build verification)
    │
    ▼
security-scan (npm audit + Trivy container scan)
```

---

## CI/CD Pipeline

### CI (`ci.yml`) — Triggered on PR to `main` or `develop`

```
┌─────────────────┐
│     Lint        │  eslint + typecheck (backend + frontend)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  test-backend   │  vitest with coverage ≥ 60%
│                 │  (PostgreSQL + Redis service containers)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ test-frontend   │  npm run build (TypeScript + Vite)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ security-scan   │  npm audit + Trivy vulnerability scanner (CRITICAL only)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  docker-build   │  Build & push backend + frontend images to GHCR
└─────────────────┘
```

### CD (`cd.yml`) — Triggered on push to `main`

```
┌───────────────────┐
│  deploy-staging   │  kubectl set image for backend + frontend
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│    smoke-test     │  4 HTTP checks:
│                   │    1. GET /api/v1/health → {"status":"ok"}
│                   │    2. POST /api/v1/auth/register → success:true
│                   │    3. POST /api/v1/auth/login → accessToken present
│                   │    4. GET /api/v1/auth/me (with Bearer token) → success:true
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ deploy-production │  Manual approval required (GitHub Environments)
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│      notify       │  ✅ or ❌ deployment status message
└───────────────────┘
```

---

## Deployment

### Docker Compose (Development / Staging)

```bash
cd infra
docker compose up --build -d
```

This starts 7 services:

| Service | Image | Port | Dependencies |
|---|---|---|---|
| `postgres` | postgres:15-alpine | 5432 | — |
| `redis` | redis:7-alpine | 6379 | — |
| `backend` | Custom (multi-stage) | 4000 | postgres (healthy), redis (healthy) |
| `frontend` | Custom (dev mode) | 3000 | backend |
| `nginx` | nginx:alpine | 80 | backend, frontend |
| `prometheus` | prom/prometheus | 9090 | — |
| `grafana` | grafana/grafana | 3001 | prometheus |

### Kubernetes (Production)

Manifests in `infra/k8s/` provide:

- **Namespace**: `taskplatform`
- **Backend**: Deployment (3 replicas), HPA (CPU > 70%), Service (ClusterIP), ConfigMap, Secrets
- **Frontend**: Deployment (2 replicas), Service (ClusterIP)
- **Ingress**: `taskplatform.dev` and `api.taskplatform.dev` routing

```bash
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/
```

### Infrastructure Requirements (Production)

- **PostgreSQL 15** — RDS with Multi-AZ failover
- **Redis 7** — ElastiCache for caching + Pub/Sub
- **EKS Cluster** — Managed Kubernetes control plane
- **ECR/GHCR** — Container registry for Docker images

---

## Monitoring

### Prometheus Metrics

Exposed at `GET /metrics` on the backend:

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | method, route, status | Total HTTP requests |
| `http_request_duration_ms` | Histogram | method, route | Request duration in ms |
| `notifications_sent_total` | Counter | type | Total notifications sent |

### Grafana

- **URL**: http://localhost:3001 (dev) or https://monitoring.taskplatform.dev (prod)
- **Credentials**: admin/admin (dev) or viewer/viewer123 (prod)
- **Pre-configured dashboard**: Task Platform Overview (CPU, memory, request rate, error rate, notification count)

### Alerting Rules

- Backend down (absent for 1m)
- Error rate > 5% in 5m window
- Notification rate spike anomaly

---

## Known Deviations

| Spec Item | Implementation | Reason |
|---|---|---|
| Email verification | Stubbed (Mailtrap config present, no sending) | Requires transactional email service (SendGrid, SES) |
| Background job queue | In-process node-cron | Dedicated queue (Bull, Sidekiq) adds operational complexity; acceptable for current scale |
| WebSocket presence scanning | Redis-based but not optimized for large-scale | Would need Redis-backed presence service for 1000+ concurrent users |

---

## License

MIT
