# Tech Stack Choices

## Frontend: React 18 + Vite + TypeScript
- **Reasoning**: React 18 has mature ecosystem, excellent TypeScript support, and Vite provides instant HMR for fast development. We use shadcn/ui (built on Radix UI primitives) for accessible, customizable components, and Tailwind CSS for utility-first styling.
- **State Management**: Zustand for lightweight, hook-based stores. React Query for server state (caching, invalidation).
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable — modern, accessible, and framework-agnostic DnD library.

## Backend: Node.js + Express.js + TypeScript
- **Reasoning**: Express.js is the most mature Node.js framework with the largest middleware ecosystem. TypeScript ensures type safety across the entire API layer. Socket.IO integration is seamless with Express.
- **Real-Time**: Socket.IO — provides auto-reconnection, room management, and fallback transports. Integrates with Redis adapter for horizontal scaling.
- **ORM**: Prisma — type-safe database client with declarative migrations, excellent PostgreSQL support, and a powerful query API.

## Database: PostgreSQL 15
- **Reasoning**: Required by spec. Best-in-class JSONB support for activity_logs metadata, array columns for tags, and full-text search capabilities. Superior to MySQL for analytics queries (window functions, CTEs).

## Real-Time: Socket.IO
- **Reasoning**: Built on WebSocket with automatic fallback to HTTP long-polling. Provides rooms, namespaces, and middleware out of the box. Redis adapter enables multi-instance broadcasting.

## Cloud: AWS (EKS + RDS + ElastiCache)
- **Reasoning**: EKS provides managed Kubernetes with automatic node scaling and updates. RDS PostgreSQL handles automated backups, multi-AZ failover. ElastiCache Redis for managed caching and Pub/Sub.

## Orchestration: Kubernetes (EKS)
- **Reasoning**: Declarative infrastructure, rolling updates with zero downtime, auto-scaling via HPA, and self-healing. EKS manages the control plane for high availability.

## Monitoring: Prometheus + Grafana
- **Reasoning**: Required by spec. Prometheus is the industry standard for metrics collection. Grafana provides rich dashboarding with alerting support.

## CI/CD: GitHub Actions
- **Reasoning**: Required by spec. Tight GitHub integration, matrix builds, caching, and native support for Docker and K8s deployments.
