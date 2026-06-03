import { z } from 'zod';

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email format.')
    .max(255, 'Email must be at most 255 characters.'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(30, 'Username must be at most 30 characters.')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter.')
    .regex(/[0-9]/, 'Password must contain at least one digit.')
    .regex(/[!@#$%^&*]/, 'Password must contain at least one special character (!@#$%^&*).'),
  fullName: z.string().max(255).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format.'),
  password: z.string().min(1, 'Password is required.'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required.'),
});

export const updateProfileSchema = z.object({
  fullName: z.string().max(255).optional().nullable(),
  avatarUrl: z.string().max(500).optional().nullable(),
});
