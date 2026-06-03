export interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  role?: string;
  ownerId?: string;
  memberCount: number;
  createdAt: string;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  role: string;
  joinedAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  createdBy?: { id: string; username: string } | null;
  boards?: Board[];
  boardCount?: number;
  createdAt: string;
}

export interface Board {
  id: string;
  projectId?: string;
  name: string;
  position: number;
}

export interface Task {
  id: string;
  boardId: string;
  title: string;
  description?: string | null;
  assignee?: { id: string; username: string; fullName?: string; avatarUrl?: string } | null;
  board?: { id: string; name: string; projectId: string } | null;
  creator?: { id: string; username: string; avatarUrl?: string } | null;
  createdBy?: { id: string; username: string } | null;
  priority: string;
  status: string;
  dueDate?: string | null;
  tags: string[];
  position: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  content: string;
  author: { id: string; username: string; avatarUrl?: string } | null;
  parentId?: string | null;
  mentions?: string[];
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  action: string;
  actor?: { id: string; username: string; avatarUrl?: string } | null;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface AnalyticsSummary {
  period: { startDate: string; endDate: string };
  summary: {
    totalTasksCreated: number;
    totalTasksCompleted: number;
    completionRate: number;
    avgCompletionTimeHours: number;
    overdueTasksCount: number;
    activeMembers: number;
  };
  tasksByPriority: Record<string, number>;
  tasksByStatus: Record<string, number>;
  tasksByMember: Array<{
    user: { id: string; username: string };
    assigned: number;
    completed: number;
    avgCompletionTimeHours: number;
  }>;
  completionTrend: Array<{ date: string; created: number; completed: number }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details: Array<{ field: string; message: string }>;
  };
  requestId: string;
}
