import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socket: Socket | null = null;

export function getSocket(): Socket | null {
  return socket;
}

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  socket = io('/', {
    path: '/socket',
    transports: ['websocket', 'polling'],
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      socket?.emit('auth', { token });
    }
  });

  socket.on('auth_success', () => {
    console.log('WebSocket authenticated');
  });

  socket.on('auth_error', () => {
    console.error('WebSocket auth failed');
    socket?.disconnect();
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
    if (reason === 'io server disconnect') {
      setTimeout(() => {
        socket?.connect();
      }, 1000);
    }
  });

  socket.connect();
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinBoard(boardId: string) {
  socket?.emit('join_board', { boardId });
}

export function leaveBoard(boardId: string) {
  socket?.emit('leave_board', { boardId });
}

export function sendHeartbeat() {
  socket?.emit('heartbeat');
}

export function startEditing(taskId: string) {
  socket?.emit('task:editing_start', { taskId });
}

export function stopEditing(taskId: string) {
  socket?.emit('task:editing_stop', { taskId });
}
