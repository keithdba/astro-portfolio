/**
 * auth.model.ts
 * 
 * Zod schemas and types for the Admin Authentication system.
 */

import { z } from 'zod';

/** Admin account record stored in admins.json */
export const AdminRecordSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(50).toLowerCase().trim(),
  passwordHash: z.string(), // scrypt hash
  salt: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastLoginAt: z.string().datetime().nullable().optional(),
  failedAttempts: z.number().default(0),
  lockedUntil: z.string().datetime().nullable().optional(),
});

export type AdminRecord = z.infer<typeof AdminRecordSchema>;

/** Login request payload */
export const LoginInputSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  captchaToken: z.string().min(1, "Security verification is required"),
});



export type LoginInput = z.infer<typeof LoginInputSchema>;

/** Session record stored in sessions.json */
export const SessionRecordSchema = z.object({
  id: z.string().uuid(),
  adminId: z.string().uuid(),
  token: z.string(), // Secure random token
  csrfToken: z.string(), // Synchronizer token
  expiresAt: z.string().datetime(), // Absolute expiry
  lastActiveAt: z.string().datetime(), // For idle timeout
  createdAt: z.string().datetime(),
  userAgent: z.string().optional(),
  ipAddress: z.string().optional(),
});

export type SessionRecord = z.infer<typeof SessionRecordSchema>;

/** Password rotation payload */
export const PasswordRotationSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(12, "New password must be at least 12 characters"),
});

export type PasswordRotation = z.infer<typeof PasswordRotationSchema>;
