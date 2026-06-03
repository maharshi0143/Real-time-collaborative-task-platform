import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { Socket as NetSocket } from 'net';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { redis } from '../utils/redis';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { JwtPayload } from '../middleware/auth';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

export class WebSocketService {
  private io: Server;
  private editingTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      path: '/socket',
      cors: {
        origin: config.corsOrigins,
        credentials: true,
      },
      pingInterval: 20000,
      pingTimeout: 10000,
    });

    this.setupAuth();
    this.setupRedisSubscriber();
  }

  private setupAuth() {
    this.io.use((socket: AuthenticatedSocket, next) => {
      const authTimeout = setTimeout(() => {
        socket.emit('auth_error', { code: 'UNAUTHORIZED', message: 'Authentication required' });
        try {
          const ws = (socket as any).conn?.transport?.socket;
          if (ws?.close) {
            ws.close(4001, 'Authentication timeout');
          } else {
            socket.disconnect(true);
          }
        } catch {
          logger.warn({ message: 'WS auth timeout disconnect failed', socketId: socket.id });
          socket.disconnect(true);
        }
      }, 5000);

      socket.once('auth', async (data: { token?: string }) => {
        clearTimeout(authTimeout);

        if (!data?.token) {
          socket.emit('auth_error', { code: 'UNAUTHORIZED' });
          socket.disconnect(true);
          return;
        }

        try {
          const decoded = jwt.verify(data.token, config.jwtSecret) as JwtPayload;
          socket.userId = decoded.sub;
          socket.userEmail = decoded.email;
          socket.join(`user:${decoded.sub}`);
          socket.emit('auth_success', { userId: decoded.sub });
          next();
        } catch (err) {
          socket.emit('auth_error', { code: 'UNAUTHORIZED' });
          socket.disconnect(true);
        }
      });

      socket.on('disconnect', () => {
        clearTimeout(authTimeout);
      });
    });

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      logger.info({ message: `WS client connected: ${socket.id}`, userId: socket.userId });

      this.setupEventHandlers(socket);

      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  private setupEventHandlers(socket: AuthenticatedSocket) {
    socket.on('join_board', async (data: { boardId?: string }) => {
      if (!data?.boardId) return;

      try {
        const board = await prisma.board.findUnique({
          where: { id: data.boardId },
          include: { project: true },
        });
        if (!board) {
          socket.emit('error', { code: 'RESOURCE_NOT_FOUND', message: 'Board not found.' });
          return;
        }

        const membership = await prisma.workspaceMember.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: board.project.workspaceId,
              userId: socket.userId!,
            },
          },
        });
        if (!membership) {
          socket.emit('error', { code: 'FORBIDDEN', message: 'You are not a member of this workspace.' });
          return;
        }

        const room = `board:${board.id}`;
        await socket.join(room);

        await redis.setex(
          `presence:board:${board.id}:${socket.userId}`,
          35,
          JSON.stringify({ id: socket.userId, username: '' })
        );

        socket.emit('joined', { boardId: board.id });

        socket.to(room).emit('user:joined_board', {
          user: { id: socket.userId, username: '', avatarUrl: null },
        });

        logger.info({ message: `User ${socket.userId} joined board ${board.id}` });
      } catch (err: any) {
        socket.emit('error', { code: 'INTERNAL_ERROR', message: err.message });
      }
    });

    socket.on('leave_board', async (data: { boardId?: string }) => {
      if (!data?.boardId) return;
      await socket.leave(`board:${data.boardId}`);

      await redis.del(`presence:board:${data.boardId}:${socket.userId}`);
      socket.to(`board:${data.boardId}`).emit('user:left_board', {
        user: { id: socket.userId },
      });
    });

    socket.on('heartbeat', async () => {
      socket.emit('pong', { timestamp: new Date().toISOString() });
    });

    socket.on('task:editing_start', (data: { taskId?: string }) => {
      if (!data?.taskId || !socket.userId) return;

      const userId = socket.userId;
      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('board:'));

      for (const room of rooms) {
        socket.to(room).emit('task:being_edited', {
          taskId: data.taskId,
          by: { userId, username: '' },
        });
      }
    });

    socket.on('task:editing_stop', (data: { taskId?: string }) => {
      if (!data?.taskId || !socket.userId) return;

      const rooms = Array.from(socket.rooms).filter((r) => r.startsWith('board:'));

      for (const room of rooms) {
        socket.to(room).emit('task:editing_released', {
          taskId: data.taskId,
          by: { userId: socket.userId },
        });
      }
    });
  }

  private handleDisconnect(socket: AuthenticatedSocket) {
    if (socket.userId) {
      const presenceKeyPattern = `presence:board:*:${socket.userId}`;
      // Clean up presence - in production use SCAN
      logger.info({ message: `WS client disconnected: ${socket.id}`, userId: socket.userId });
    }
  }

  private setupRedisSubscriber() {
    const subscriber = redis.duplicate();

    subscriber.on('pmessage', (_pattern: string, channel: string, message: string) => {
      try {
        const parsed = JSON.parse(message);
        const type = parsed.type;

        if (type === 'notification:new' && parsed.userId) {
          this.io.to(`user:${parsed.userId}`).emit('notification:new', parsed.notification);
          return;
        }

        if (parsed.boardId) {
          const room = `board:${parsed.boardId}`;
          this.io.to(room).emit(type, parsed);
        }
      } catch {
        logger.warn({ message: 'Malformed Redis pub/sub message', channel });
      }
    });

    subscriber.psubscribe('board:*:events', (err) => {
      if (err) {
        logger.error({ message: 'Redis psubscribe board failed', error: err.message });
      }
    });

    subscriber.psubscribe('user:*:events', (err) => {
      if (err) {
        logger.error({ message: 'Redis user psubscribe failed', error: err.message });
      }
    });

    logger.info({ message: 'Redis Pub/Sub subscriber ready' });
  }

  getIO(): Server {
    return this.io;
  }

  getActiveConnections(): number {
    return this.io.engine?.clientsCount || 0;
  }
}
