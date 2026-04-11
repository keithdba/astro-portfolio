import { z } from 'zod';

export const ErrorLogSchema = z.object({
  id: z.string().uuid(),
  correlationId: z.string(),
  timestamp: z.string().datetime(),
  message: z.string(),
  stack: z.string().optional(),
  path: z.string(),
  method: z.string(),
  userAgent: z.string().optional(),
  adminId: z.string().optional(),
  metadata: z.record(z.any()).default({}),
});

export type ErrorLog = z.infer<typeof ErrorLogSchema>;

export const LogFilterSchema = z.object({
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  errorType: z.string().optional(),
  path: z.string().optional(),
  limit: z.number().default(50),
  offset: z.number().default(0),
});

export type LogFilter = z.infer<typeof LogFilterSchema>;
