import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(100, 'Name must be at most 100 characters.'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters.')
    .max(50, 'Slug must be at most 50 characters.')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens.'),
});

export const addMemberSchema = z.object({
  email: z.string().email('Invalid email format.'),
  role: z.enum(['admin', 'manager', 'member', 'guest'], { message: 'Role must be one of: admin, manager, member, guest.' }),
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'member', 'guest'], { message: 'Role must be one of: admin, manager, member, guest.' }),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.').max(100, 'Name must be at most 100 characters.').optional(),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters.')
    .max(50, 'Slug must be at most 50 characters.')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens.')
    .optional(),
});
