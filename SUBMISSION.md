# Submission

## Repository
GitHub URL: https://github.com/your-username/task-platform

## Tech Stack Choices
- **Frontend**: React 18 + Vite + TypeScript
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: PostgreSQL 15
- **Real-time**: Socket.IO
- **Cloud**: AWS (EKS)
- **Orchestration**: Kubernetes

## Live URLs
- **Production Frontend**: https://taskplatform.dev
- **Production API Base**: https://api.taskplatform.dev
- **Staging Frontend**: https://staging.taskplatform.dev
- **Staging API Base**: https://api.staging.taskplatform.dev
- **Grafana (read-only)**: https://monitoring.taskplatform.dev — Username: viewer — Password: viewer123

## Known Deviations from Spec
- Email verification is stubbed (Mailtrap config present but no actual sending implemented)
- Background jobs use in-process node-cron instead of a dedicated job queue like Bull
- WebSocket rooms presence is tracked via Redis but scanning presence keys is not optimized for large-scale

## Known Issues
- ~~Frontend analytics charts are placeholder containers (chart library rendering not fully implemented)~~ — **Fixed**: Completion Trend (LineChart) and Tasks by Priority (BarChart) now render with Recharts
- ~~Frontend Task Drawer is not yet implemented~~ — **Fixed**: Clicking a task card opens a slide-in drawer with task details, editable fields (title, description, priority, due date), comments section with add/display, and activity log
- ~~No E2E tests yet~~ — **Fixed**: Added Playwright E2E tests covering auth (login, register, validation, redirect), workspace navigation, and board/task-drawer interaction

## How to Run
```bash
cd infra
docker compose up --build -d
```
Then open http://localhost

## Seed Credentials
| Username | Password | Role |
|----------|----------|------|
| alice    | Alice@12345 | Admin |
| bob      | Bob@12345   | Manager |
| charlie  | Charlie@12345 | Member |
