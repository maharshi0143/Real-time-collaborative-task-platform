import { z } from 'zod';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(255, 'Name must be at most 255 characters.'),
  description: z.string().max(5000, 'Description must be at most 5000 characters.').optional().nullable(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).optional().nullable(),
});

export const createBoardSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(255, 'Name must be at most 255 characters.'),
  position: z.number().int().optional(),
});

export const updateBoardSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  position: z.number().int().optional(),
});
