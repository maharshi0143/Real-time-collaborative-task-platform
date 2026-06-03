import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Title is required.').max(500, 'Title must be at most 500 characters.'),
  description: z.string().max(5000, 'Description must be at most 5000 characters.').optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional().default('medium'),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional().default([]),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  tags: z.array(z.string().min(1).max(50)).max(10).optional(),
});

export const moveTaskSchema = z.object({
  boardId: z.string().uuid('Invalid board ID.'),
  position: z.number().min(0, 'Position must be a positive number.'),
});

export const addCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required.').max(10000, 'Comment must be at most 10000 characters.'),
  parentId: z.string().uuid().optional().nullable(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required.').max(10000),
});
